/*
  # Delivery notes — delivery dates + automatic back-orders

  ## Purpose
  Two additive capabilities for the Orders & Deliveries module, with no change to
  any existing behaviour:

    1. delivery_date — a planned dispatch/delivery date on each delivery note, so
       orders can be planned and separated by day (today / tomorrow / later).
    2. back_order_of — when a delivery is confirmed short (e.g. 100 ordered, 80
       delivered), the missing balance is automatically rolled into a brand-new
       'Open' delivery note dated the next day, linked back to its parent.

  ## Non-breaking guarantees
    - Both columns are nullable; existing rows stay NULL and render fine.
    - confirm_stock_order() keeps the SAME signature and identical behaviour for
      full deliveries. The back-order branch only fires when a line is short.
    - No RLS / policy / grant changes (new columns inherit the table grants;
      the function re-states its own REVOKE/GRANT).

  Reuses: public.can_write_stock() (20260609000011),
  public.record_stock_movement_group() (20260609000012), and the advisory-lock
  numbering pattern from 20260621140000_create_spillages.sql. Additive &
  transaction-safe; apply via _dbrun.cjs (the migration ledger is drifted).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New columns on stock_orders
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.stock_orders
  ADD COLUMN IF NOT EXISTS delivery_date date;

ALTER TABLE public.stock_orders
  ADD COLUMN IF NOT EXISTS back_order_of uuid
    REFERENCES public.stock_orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_stock_orders_delivery_date
  ON public.stock_orders (delivery_date);

CREATE INDEX IF NOT EXISTS idx_stock_orders_back_order_of
  ON public.stock_orders (back_order_of);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. confirm_stock_order() — unchanged confirm path + additive back-order branch
--    (same signature as 20260611100100; full deliveries behave exactly as before)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.confirm_stock_order(
  p_order_id     uuid,
  p_lines        jsonb,
  p_confirm_note text DEFAULT '',
  p_captured_by  text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order          public.stock_orders%ROWTYPE;
  v_line           jsonb;
  v_item           public.stock_order_items%ROWTYPE;
  v_item_id        uuid;
  v_qty_delivered  numeric;
  v_variance_note  text;
  v_expected_count integer;
  v_seen_ids       uuid[] := '{}';
  v_movements      jsonb := '[]'::jsonb;
  v_total_delivered numeric := 0;
  v_group_id       uuid := gen_random_uuid();
  v_line_count     integer := 0;
  -- back-order accumulation
  v_bo_lines       jsonb := '[]'::jsonb;
  v_bo_id          uuid;
  v_bo_number      text;
  v_bo_year        text;
  v_bo_seq         integer;
  v_result         jsonb;
BEGIN
  -- ─── Permission checks (SECURITY DEFINER bypasses RLS) ────────────────────
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.can_write_stock() THEN
    RAISE EXCEPTION 'You do not have permission to confirm deliveries';
  END IF;

  -- ─── Order state validation ───────────────────────────────────────────────
  SELECT * INTO v_order
  FROM public.stock_orders
  WHERE id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Order not found';
  END IF;

  IF v_order.status != 'Awaiting Confirmation' THEN
    RAISE EXCEPTION 'Order % cannot be confirmed from status "%"',
      v_order.order_number, v_order.status;
  END IF;

  IF v_order.signed_note_path IS NULL THEN
    RAISE EXCEPTION 'The signed delivery note must be uploaded before confirming';
  END IF;

  -- ─── Line validation ──────────────────────────────────────────────────────
  IF jsonb_typeof(p_lines) != 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'lines must be a non-empty array';
  END IF;

  SELECT count(*) INTO v_expected_count
  FROM public.stock_order_items
  WHERE order_id = p_order_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_line_count    := v_line_count + 1;
    v_item_id       := (v_line->>'order_item_id')::uuid;
    v_qty_delivered := (v_line->>'qty_delivered')::numeric;
    v_variance_note := COALESCE(v_line->>'variance_note', '');

    IF v_item_id = ANY(v_seen_ids) THEN
      RAISE EXCEPTION 'Duplicate line for order item %', v_item_id;
    END IF;
    v_seen_ids := v_seen_ids || v_item_id;

    SELECT * INTO v_item
    FROM public.stock_order_items
    WHERE id = v_item_id AND order_id = p_order_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Order line not found: %', v_item_id;
    END IF;

    IF v_qty_delivered IS NULL OR v_qty_delivered < 0 THEN
      RAISE EXCEPTION 'Delivered quantity for "%" must be zero or more', v_item.stock_item;
    END IF;

    IF v_qty_delivered != v_item.qty_ordered AND btrim(v_variance_note) = '' THEN
      RAISE EXCEPTION 'A variance note is required for "%" (ordered %, delivered %)',
        v_item.stock_item, v_item.qty_ordered, v_qty_delivered;
    END IF;

    UPDATE public.stock_order_items
    SET qty_delivered = v_qty_delivered,
        variance_note = v_variance_note
    WHERE id = v_item_id;

    v_total_delivered := v_total_delivered + v_qty_delivered;

    IF v_qty_delivered > 0 THEN
      v_movements := v_movements || jsonb_build_array(jsonb_build_object(
        'stock_item_id', v_item.stock_item_id,
        'stock_code',    v_item.stock_code,
        'stock_item',    v_item.stock_item,
        'movement_type', 'Customer Delivery',
        'quantity',      v_qty_delivered,
        'delta',         -v_qty_delivered,
        'notes',         v_variance_note
      ));
    END IF;

    -- Short-delivered line → collect the balance for an automatic back-order.
    IF v_qty_delivered < v_item.qty_ordered THEN
      v_bo_lines := v_bo_lines || jsonb_build_array(jsonb_build_object(
        'stock_item_id',   v_item.stock_item_id,
        'stock_code',      v_item.stock_code,
        'stock_item',      v_item.stock_item,
        'description',     v_item.description,
        'unit_of_measure', v_item.unit_of_measure,
        'qty_ordered',     v_item.qty_ordered - v_qty_delivered,
        'line_no',         v_item.line_no
      ));
    END IF;
  END LOOP;

  IF v_line_count != v_expected_count THEN
    RAISE EXCEPTION 'All % order lines must be confirmed (received %)',
      v_expected_count, v_line_count;
  END IF;

  IF v_total_delivered = 0 THEN
    RAISE EXCEPTION 'Nothing was delivered — cancel the order instead of confirming it';
  END IF;

  -- ─── Record stock movements atomically (inherits locking + stock guard) ───
  PERFORM public.record_stock_movement_group(
    v_movements,
    now(),
    v_order.order_number,
    v_order.client_name,
    p_captured_by,
    p_confirm_note,
    v_group_id,
    'Customer Delivery · ' || v_order.order_number
  );

  -- ─── Complete the order ───────────────────────────────────────────────────
  UPDATE public.stock_orders
  SET status            = 'Completed',
      confirmed_by      = auth.uid(),
      confirmed_at      = now(),
      confirmation_note = p_confirm_note,
      movement_group_id = v_group_id,
      updated_at        = now()
  WHERE id = p_order_id;

  v_result := jsonb_build_object(
    'success',           true,
    'movement_group_id', v_group_id
  );

  -- ─── Auto back-order for the short-delivered balance (additive) ───────────
  IF jsonb_array_length(v_bo_lines) > 0 THEN
    -- Serialize DN-number generation (mirrors src/lib/numberGenerator.ts:
    -- DN-<year>-NNNN, zero-padded to 4) so concurrent inserts can't collide.
    v_bo_year := to_char(CURRENT_DATE, 'YYYY');
    PERFORM pg_advisory_xact_lock(hashtext('stock_orders_dn'));

    SELECT COALESCE(MAX((regexp_match(order_number, '(\d+)$'))[1]::int), 0) + 1
      INTO v_bo_seq
      FROM public.stock_orders
      WHERE order_number LIKE 'DN-' || v_bo_year || '-%';

    v_bo_number := 'DN-' || v_bo_year || '-' || lpad(v_bo_seq::text, 4, '0');

    INSERT INTO public.stock_orders (
      order_number, client_id, client_name, site_id, site_name,
      order_date, delivery_date, source, customer_reference, status,
      notes, back_order_of, created_by
    ) VALUES (
      v_bo_number,
      v_order.client_id,
      v_order.client_name,
      v_order.site_id,
      v_order.site_name,
      CURRENT_DATE,
      CURRENT_DATE + 1,
      v_order.source,
      v_order.customer_reference,
      'Open',
      'Back-order of ' || v_order.order_number || ' — balance of short-delivered items.',
      v_order.id,
      auth.uid()
    )
    RETURNING id INTO v_bo_id;

    INSERT INTO public.stock_order_items (
      order_id, stock_item_id, stock_code, stock_item, description,
      unit_of_measure, qty_ordered, line_no
    )
    SELECT
      v_bo_id,
      (l->>'stock_item_id')::uuid,
      l->>'stock_code',
      l->>'stock_item',
      l->>'description',
      l->>'unit_of_measure',
      (l->>'qty_ordered')::numeric,
      (l->>'line_no')::integer
    FROM jsonb_array_elements(v_bo_lines) AS l;

    v_result := v_result || jsonb_build_object(
      'back_order_id',     v_bo_id,
      'back_order_number', v_bo_number
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise: PostgreSQL rolls back to the block's entry savepoint, undoing
    -- line updates, movements, the status change AND any back-order together.
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_stock_order FROM anon;
GRANT  EXECUTE ON FUNCTION public.confirm_stock_order TO authenticated;

NOTIFY pgrst, 'reload schema';
