/*
  # Let operators book out chemical

  Operators don't have can_write_stock, so they can't use the generic stock mover
  or the stock-gated RLS. This adds a narrow, SECURITY DEFINER RPC that any internal
  non-viewer (operators included) may call to book out ONE container of the configured
  chemical: it inserts the book-out and decrements only that chemical's stock item,
  atomically. Also relaxes the batch-photo upload policy so operators can attach a photo.
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. record_chemical_bookout() — scoped book-out for any internal non-viewer
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_chemical_bookout(
  p_chemical_id               uuid,
  p_bookout_date              date,
  p_booked_out_by             text,
  p_booked_out_by_employee_id uuid,
  p_notes                     text,
  p_photo_path                text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_stock_item_id   uuid;
  v_litres_per_unit numeric;
  v_stock_code      text;
  v_current         numeric;
  v_bookout_id      uuid;
  v_group_id        uuid := gen_random_uuid();
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  -- Any active internal non-viewer may book chemical out (operators included).
  IF NOT (public.can_write() AND NOT public.is_customer()) THEN
    RAISE EXCEPTION 'You do not have permission to book out chemical';
  END IF;

  SELECT c.stock_item_id, c.litres_per_unit
    INTO v_stock_item_id, v_litres_per_unit
    FROM public.treatment_chemicals c
    WHERE c.id = p_chemical_id AND c.active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Chemical not found';
  END IF;

  -- Lock the stock row, then block negative stock.
  SELECT current_quantity, stock_code INTO v_current, v_stock_code
    FROM public.stock_items WHERE id = v_stock_item_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stock item not found';
  END IF;
  IF v_current < 1 THEN
    RAISE EXCEPTION 'Insufficient stock — only % on hand', v_current;
  END IF;

  INSERT INTO public.treatment_chemical_bookouts (
    chemical_id, bookout_date, units, litres, booked_out_by, booked_out_by_employee_id,
    notes, photo_path, movement_group_id, created_by
  ) VALUES (
    p_chemical_id, COALESCE(p_bookout_date, CURRENT_DATE), 1, v_litres_per_unit,
    COALESCE(p_booked_out_by, ''), p_booked_out_by_employee_id, COALESCE(p_notes, ''),
    p_photo_path, v_group_id, auth.uid()
  ) RETURNING id INTO v_bookout_id;

  INSERT INTO public.stock_movements (
    movement_date, stock_item_id, stock_code, movement_type, quantity,
    reference_number, supplier_client_department, captured_by, notes,
    movement_group_id, movement_group_label, created_by_user_id
  ) VALUES (
    now(), v_stock_item_id, COALESCE(v_stock_code, ''), 'Stock Issued', 1,
    'CHEM-OUT', 'Treatment Plant', COALESCE(p_booked_out_by, ''), 'Chemical book-out',
    v_group_id, 'Chemical book-out', auth.uid()
  );

  UPDATE public.stock_items
    SET current_quantity = current_quantity - 1, updated_at = now()
    WHERE id = v_stock_item_id;

  RETURN v_bookout_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_chemical_bookout FROM anon;
GRANT  EXECUTE ON FUNCTION public.record_chemical_bookout TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Allow any internal non-viewer (operators) to upload the batch photo
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Stock writer can upload chemical book-out photos" ON storage.objects;
CREATE POLICY "Internal non-viewer can upload chemical book-out photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chemical-bookout-photos' AND public.can_write() AND NOT public.is_customer());

NOTIFY pgrst, 'reload schema';
