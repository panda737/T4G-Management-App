/*
  # Create documents storage bucket

  Creates the 'documents' bucket for file uploads (SOPs, licences, permits, etc.)
  Max file size: 50 MB. Private bucket — access via signed URLs only.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',
  'documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to the documents bucket
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents');

-- Allow authenticated users to read/download documents
CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents');

-- Allow non-viewers to update document objects
CREATE POLICY "Non-viewer can update document objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.can_write());

-- Allow non-viewers to delete document objects
CREATE POLICY "Non-viewer can delete document objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'documents' AND public.can_write());
