/*
  # confirm_stock_order() — the only path that moves stock for customer orders

  ## Behaviour
  Confirms a delivery against an order in 'Awaiting Confirmation' status
  (signed delivery note already uploaded). Accepts per-line delivered
  quantities; any line where qty_delivered differs from qty_ordered MUST
  carry a variance note. On success it:
    1. Updates stock_order_items with delivered quantities + variance notes
    2. Records the stock movements atomically via the existing
       record_stock_movement_group() RPC (movement_type 'Customer Delivery',
       reference = the DN number, supplier/client = the client name) —
       inheriting its row locking, negative-stock guard and audit trail
    3. Marks the order Completed with confirmed_by/at and the movement group id

  Everything runs in one transaction: a failure anywhere (e.g. insufficient
  stock) rolls back the line updates and the status change.

  ## Security
  SECURITY DEFINER with explicit auth + can_write_stock() checks, matching
  record_stock_movement_group (20260609000012).
*/

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

  RETURN jsonb_build_object(
    'success',           true,
    'movement_group_id', v_group_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Re-raise: PostgreSQL rolls back to the block's entry savepoint,
    -- undoing line updates, movements and the status change together.
    RAISE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.confirm_stock_order FROM anon;
GRANT  EXECUTE ON FUNCTION public.confirm_stock_order TO authenticated;
