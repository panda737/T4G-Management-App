/*
  # Chemical book-out batch photo

  Each chemical book-out is one IBC and must carry a photo of the batch (taken on
  a phone camera or chosen from the library) — mirrors the spillage-photos pattern.

  Adds treatment_chemical_bookouts.photo_path and a private 'chemical-bookout-photos'
  storage bucket. Reads are internal-only; writes follow the book-out gate
  (can_write_stock). Additive & idempotent.
*/

ALTER TABLE public.treatment_chemical_bookouts
  ADD COLUMN IF NOT EXISTS photo_path text;   -- object path in 'chemical-bookout-photos'

-- Private bucket (15 MB, images only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chemical-bookout-photos',
  'chemical-bookout-photos',
  false,
  15728640,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Internal users can read chemical book-out photos" ON storage.objects;
CREATE POLICY "Internal users can read chemical book-out photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chemical-bookout-photos' AND NOT public.is_customer());

DROP POLICY IF EXISTS "Stock writer can upload chemical book-out photos" ON storage.objects;
CREATE POLICY "Stock writer can upload chemical book-out photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chemical-bookout-photos' AND public.can_write_stock());

DROP POLICY IF EXISTS "Stock writer can update chemical book-out photos" ON storage.objects;
CREATE POLICY "Stock writer can update chemical book-out photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'chemical-bookout-photos' AND public.can_write_stock());

DROP POLICY IF EXISTS "Stock writer can delete chemical book-out photos" ON storage.objects;
CREATE POLICY "Stock writer can delete chemical book-out photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chemical-bookout-photos' AND public.can_write_stock());

NOTIFY pgrst, 'reload schema';
