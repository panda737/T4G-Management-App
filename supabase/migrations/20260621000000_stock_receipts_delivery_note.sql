/*
  # Stock receipts — supplier delivery-note attachment

  Adds nullable columns to store an uploaded supplier delivery note against a
  stock receipt, mirroring the stock_orders signed-note pattern. Files live in
  the existing private `delivery-notes` storage bucket (path prefix `receipts/`),
  whose RLS already gates writes on can_write_stock() and reads on authenticated.

  Additive and backward-compatible — existing code ignores the new columns.
*/

ALTER TABLE public.stock_receipts
  ADD COLUMN IF NOT EXISTS delivery_note_path text,
  ADD COLUMN IF NOT EXISTS delivery_note_name text,
  ADD COLUMN IF NOT EXISTS delivery_note_size_bytes bigint,
  ADD COLUMN IF NOT EXISTS delivery_note_uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS delivery_note_uploaded_at timestamptz;

NOTIFY pgrst, 'reload schema';
