/*
  # record_stock_receipt() — add p_supplier_id (no overload)

  Adding p_supplier_id changes the function signature. CREATE OR REPLACE alone
  would leave the old 7-arg function in place as a second overload (ambiguous
  resolution), so we DROP the exact current signature first, then recreate.

  The body is an UNCHANGED copy of 20260617000000's record_stock_receipt — same
  SECURITY DEFINER, search_path, can_write_stock() gate, atomic
  record_stock_movement_group() call — with two additions only:
    1. new trailing param  p_supplier_id uuid DEFAULT NULL
    2. it is written into the stock_receipts INSERT (supplier_id column)

  Note: the audit-reference separator is emitted via chr(183) (U+00B7 "·")
  rather than a literal byte to stay safe across this project's migration apply
  path; the produced string is identical to the original.

  Grants do not survive a DROP, so EXECUTE is re-revoked/granted afterward.
*/

DROP FUNCTION IF EXISTS public.record_stock_receipt(text, text, text, date, text, jsonb, text);

CREATE FUNCTION public.record_stock_receipt(
  p_receipt_number text,
  p_supplier       text,
  p_supplier_ref   text,
  p_received_date  date,
  p_notes          text,
  p_lines          jsonb,
  p_captured_by    text DEFAULT '',
  p_supplier_id    uuid DEFAULT NULL
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
    movement_group_id, created_by, supplier_id
  ) VALUES (
    p_receipt_number,
    COALESCE(p_supplier, ''),
    COALESCE(p_supplier_ref, ''),
    COALESCE(p_received_date, CURRENT_DATE),
    COALESCE(p_notes, ''),
    v_group_id,
    auth.uid(),
    p_supplier_id
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
    'Stock Received ' || chr(183) || ' ' || p_receipt_number
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

NOTIFY pgrst, 'reload schema';
