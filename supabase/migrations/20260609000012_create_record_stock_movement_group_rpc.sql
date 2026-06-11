/*
  # Atomic stock movement RPC + created_by_user_id audit column

  ## Problem
  All stock movement saves previously made two separate API calls:
    1. INSERT into stock_movements
    2. UPDATE stock_items.current_quantity

  If either call failed or a network error occurred mid-way, the database
  could be left in an inconsistent state (movement recorded but quantity not
  updated, or vice versa). Multiple concurrent requests to the same item also
  created a race condition because quantity was read client-side, modified
  client-side, and then written back.

  Additionally, the "captured_by" field was free text with no link to the
  actual authenticated user. There was no way to verify who made a change.

  ## Fix
  1. Add created_by_user_id to stock_movements for a real audit trail.
  2. Create record_stock_movement_group() — a SECURITY DEFINER function that:
     - Performs its own explicit permission check (does not rely on table RLS)
     - Accepts an array of movements + shared header fields
     - Locks each stock_items row (SELECT FOR UPDATE) before reading quantity
     - Prevents negative stock with a clear error message
     - Inserts movement records and updates quantities inside one PL/pgSQL block
     - If anything fails, the EXCEPTION handler re-raises the error, causing
       PostgreSQL to roll back to the savepoint established at block entry —
       no partial state is possible
     - Stores auth.uid() in created_by_user_id automatically
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- Audit column
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stock_movements
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid
  REFERENCES auth.users(id) ON DELETE SET NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- Atomic movement RPC
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_stock_movement_group(
  p_movements            jsonb,
  p_movement_date        timestamptz DEFAULT now(),
  p_reference_number     text        DEFAULT '',
  p_supplier_client_dept text        DEFAULT '',
  p_captured_by          text        DEFAULT '',
  p_group_notes          text        DEFAULT '',
  p_movement_group_id    uuid        DEFAULT gen_random_uuid(),
  p_movement_group_label text        DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item             jsonb;
  v_stock_item_id    uuid;
  v_current_qty      numeric;
  v_new_qty          numeric;
  v_delta            numeric;
  v_quantity         numeric;
  v_movement_type    text;
  v_stock_code       text;
  v_item_notes       text;
  v_movement_ids     jsonb := '[]'::jsonb;
  v_movement_id      uuid;
BEGIN
  -- ─── Explicit permission check ────────────────────────────────────────────
  -- This function uses SECURITY DEFINER which bypasses table-level RLS.
  -- We enforce access control explicitly here instead.
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_write_stock() THEN
    RAISE EXCEPTION 'You do not have permission to record stock movements';
  END IF;
  -- ──────────────────────────────────────────────────────────────────────────

  -- Validate input
  IF jsonb_typeof(p_movements) != 'array' OR jsonb_array_length(p_movements) = 0 THEN
    RAISE EXCEPTION 'movements must be a non-empty array';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_movements)
  LOOP
    v_stock_item_id := (v_item->>'stock_item_id')::uuid;
    v_delta         := (v_item->>'delta')::numeric;
    v_quantity      := (v_item->>'quantity')::numeric;
    v_movement_type := v_item->>'movement_type';
    v_stock_code    := COALESCE(v_item->>'stock_code', '');
    v_item_notes    := COALESCE(NULLIF(v_item->>'notes', ''), p_group_notes);

    -- Lock the row before reading quantity.
    -- FOR UPDATE prevents any concurrent transaction from modifying this row
    -- until our transaction completes, eliminating the read-modify-write race.
    SELECT current_quantity INTO v_current_qty
    FROM public.stock_items
    WHERE id = v_stock_item_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Stock item not found: %', v_stock_item_id;
    END IF;

    v_new_qty := v_current_qty + v_delta;

    -- Block negative stock. Only triggers when delta is negative (removing stock).
    -- Positive adjustments and corrections are always allowed to proceed.
    IF v_new_qty < 0 AND v_delta < 0 THEN
      RAISE EXCEPTION 'Insufficient stock for "%" (%). Available: %, Requested: %',
        COALESCE(NULLIF(v_item->>'stock_item', ''), v_stock_code),
        v_stock_code,
        v_current_qty,
        ABS(v_delta);
    END IF;

    -- Insert the movement record
    INSERT INTO public.stock_movements (
      movement_date,
      stock_item_id,
      stock_code,
      movement_type,
      quantity,
      reference_number,
      supplier_client_department,
      captured_by,
      notes,
      movement_group_id,
      movement_group_label,
      created_by_user_id
    ) VALUES (
      p_movement_date,
      v_stock_item_id,
      v_stock_code,
      v_movement_type,
      v_quantity,
      p_reference_number,
      p_supplier_client_dept,
      p_captured_by,
      v_item_notes,
      p_movement_group_id,
      p_movement_group_label,
      auth.uid()
    ) RETURNING id INTO v_movement_id;

    v_movement_ids := v_movement_ids || to_jsonb(v_movement_id);

    -- Update the stock quantity atomically
    UPDATE public.stock_items
    SET
      current_quantity = v_new_qty,
      updated_at       = now()
    WHERE id = v_stock_item_id;

  END LOOP;

  RETURN jsonb_build_object(
    'success',      true,
    'movement_ids', v_movement_ids
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise causes PostgreSQL to roll back to the savepoint it established
    -- when entering this block's EXCEPTION clause. Every INSERT and UPDATE
    -- executed in the loop above is undone — no partial state remains.
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_stock_movement_group FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_stock_movement_group TO authenticated;
