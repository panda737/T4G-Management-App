/*
  # Create employee-medical storage bucket

  Private bucket for employee medical attachments (vaccination certificates,
  medical reports, etc.). Access restricted to admin + management via
  can_access_medical(). Max file size: 50 MB. Signed URLs only.
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-medical',
  'employee-medical',
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

CREATE POLICY "Medical access can read employee-medical objects"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'employee-medical' AND public.can_access_medical());

CREATE POLICY "Medical access can upload employee-medical objects"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'employee-medical' AND public.can_access_medical());

CREATE POLICY "Medical access can update employee-medical objects"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-medical' AND public.can_access_medical());

CREATE POLICY "Medical access can delete employee-medical objects"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'employee-medical' AND public.can_access_medical());
