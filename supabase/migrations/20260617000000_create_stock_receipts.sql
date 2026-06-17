/*
  # Stock Received — stock_receipts, stock_receipt_items, record_stock_receipt()

  ## Purpose
  A dedicated inbound-stock workflow, the mirror image of Orders & Deliveries but
  in a single step: creating a receipt posts its 'Stock Received' movements
  immediately and atomically through the existing record_stock_movement_group()
  RPC (inheriting its row-locking + audit trail). A receipt is the source record
  that a 'Stock Received' movement links back to (movement_group_id) — the inbound
  equivalent of a delivery note for orders.

    - stock_receipts        — one receipt header (receipt_number = GRN-YYYY-NNNN)
    - stock_receipt_items   — receipt line items (snapshot of code/name at receipt time)
    - record_stock_receipt  — creates header + lines AND posts stock in one transaction

  ## Security
  Follows the post-hardening stock posture (see 20260615000001):
    - SELECT: authenticated internal users only — NOT public.is_customer()
    - INSERT/UPDATE/DELETE: public.can_write_stock() (admin/management/stock_controller)
    - anon / PUBLIC: no access (no policy + table grants revoked)
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_receipts (header)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number text UNIQUE NOT NULL,
  supplier text DEFAULT '',
  supplier_ref text DEFAULT '',
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text DEFAULT '',
  movement_group_id uuid,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_receipts_date ON public.stock_receipts (received_date DESC);

ALTER TABLE public.stock_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read stock_receipts (internal)"
  ON public.stock_receipts FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Stock writer can insert stock_receipts"
  ON public.stock_receipts FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_receipts"
  ON public.stock_receipts FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_receipts"
  ON public.stock_receipts FOR DELETE TO authenticated
  USING (public.can_write_stock());

CREATE TRIGGER stock_receipts_updated_at
  BEFORE UPDATE ON public.stock_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- stock_receipt_items (lines)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.stock_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id uuid NOT NULL REFERENCES public.stock_receipts(id) ON DELETE CASCADE,
  stock_item_id uuid REFERENCES public.stock_items(id) ON DELETE SET NULL,
  stock_code text DEFAULT '',
  stock_item text NOT NULL,
  description text DEFAULT '',
  unit_of_measure text DEFAULT '',
  qty_received numeric NOT NULL CHECK (qty_received > 0),
  line_no integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_receipt_items_receipt ON public.stock_receipt_items (receipt_id);

ALTER TABLE public.stock_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read stock_receipt_items (internal)"
  ON public.stock_receipt_items FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Stock writer can insert stock_receipt_items"
  ON public.stock_receipt_items FOR INSERT TO authenticated
  WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can update stock_receipt_items"
  ON public.stock_receipt_items FOR UPDATE TO authenticated
  USING (public.can_write_stock()) WITH CHECK (public.can_write_stock());

CREATE POLICY "Stock writer can delete stock_receipt_items"
  ON public.stock_receipt_items FOR DELETE TO authenticated
  USING (public.can_write_stock());

-- ─────────────────────────────────────────────────────────────────────────────
-- Privilege hardening — new public tables are granted to anon by Supabase default
-- privileges, so strip anon/PUBLIC SELECT (RLS already denies it) and keep
-- authenticated grants. Mirrors 20260615000001.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.stock_receipts FROM PUBLIC';
  EXECUTE 'REVOKE SELECT ON public.stock_receipt_items FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.stock_receipts FROM anon';
    EXECUTE 'REVOKE SELECT ON public.stock_receipt_items FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_receipts TO authenticated';
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_receipt_items TO authenticated';
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- record_stock_receipt() — create receipt + post 'Stock Received' atomically
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_stock_receipt(
  p_receipt_number text,
  p_supplier       text,
  p_supplier_ref   text,
  p_received_date  date,
  p_notes          text,
  p_lines          jsonb,
  p_captured_by    text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_receipt_id uuid;
  v_group_id   uuid := gen_random_uuid();
  v_line       jsonb;
  v_line_no    integer := 0;
  v_movements  jsonb := '[]'::jsonb;
  v_qty        numeric;
BEGIN
  -- Permission checks (SECURITY DEFINER bypasses table RLS — enforce explicitly)
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_write_stock() THEN
    RAISE EXCEPTION 'You do not have permission to record stock receipts';
  END IF;

  IF jsonb_typeof(p_lines) != 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines must be a non-empty array';
  END IF;

  -- Header (the source record the movements link back to)
  INSERT INTO public.stock_receipts (
    receipt_number, supplier, supplier_ref, received_date, notes,
    movement_group_id, created_by
  ) VALUES (
    p_receipt_number,
    COALESCE(p_supplier, ''),
    COALESCE(p_supplier_ref, ''),
    COALESCE(p_received_date, CURRENT_DATE),
    COALESCE(p_notes, ''),
    v_group_id,
    auth.uid()
  ) RETURNING id INTO v_receipt_id;

  -- Lines + build the movement batch
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_qty := (v_line->>'qty_received')::numeric;
    IF v_qty IS NULL OR v_qty <= 0 THEN
      RAISE EXCEPTION 'Each receipt line quantity must be greater than zero';
    END IF;

    INSERT INTO public.stock_receipt_items (
      receipt_id, stock_item_id, stock_code, stock_item, description,
      unit_of_measure, qty_received, line_no
    ) VALUES (
      v_receipt_id,
      NULLIF(v_line->>'stock_item_id', '')::uuid,
      COALESCE(v_line->>'stock_code', ''),
      COALESCE(v_line->>'stock_item', ''),
      COALESCE(v_line->>'description', ''),
      COALESCE(v_line->>'unit_of_measure', ''),
      v_qty,
      v_line_no
    );

    v_movements := v_movements || jsonb_build_array(jsonb_build_object(
      'stock_item_id', v_line->>'stock_item_id',
      'stock_code',    COALESCE(v_line->>'stock_code', ''),
      'stock_item',    COALESCE(v_line->>'stock_item', ''),
      'movement_type', 'Stock Received',
      'quantity',      v_qty,
      'delta',         v_qty
    ));

    v_line_no := v_line_no + 1;
  END LOOP;

  -- Post stock atomically (inherits locking + audit; rolls back with us on error)
  PERFORM public.record_stock_movement_group(
    v_movements,
    now(),
    p_receipt_number,
    COALESCE(p_supplier, ''),
    p_captured_by,
    COALESCE(p_notes, ''),
    v_group_id,
    'Stock Received · ' || p_receipt_number
  );

  RETURN jsonb_build_object(
    'success',           true,
    'receipt_id',        v_receipt_id,
    'movement_group_id', v_group_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise: PostgreSQL rolls back the header, lines and movements together.
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_stock_receipt FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_stock_receipt TO authenticated;
