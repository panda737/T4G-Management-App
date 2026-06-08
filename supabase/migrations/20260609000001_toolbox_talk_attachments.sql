/*
  # Toolbox Talk Attachments

  Adds attachment support to safety_toolbox_talks and creates a dedicated
  private storage bucket for uploaded files.
*/

-- Add attachment columns to safety_toolbox_talks
ALTER TABLE safety_toolbox_talks
  ADD COLUMN IF NOT EXISTS attachment_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachment_name text NOT NULL DEFAULT '';

-- Create private storage bucket for toolbox talk attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'toolbox-talks',
  'toolbox-talks',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload toolbox attachments
CREATE POLICY "Authenticated users can upload toolbox attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'toolbox-talks');

-- Allow authenticated users to read/download toolbox attachments
CREATE POLICY "Authenticated users can read toolbox attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'toolbox-talks');

-- Allow non-viewers to delete toolbox attachments
CREATE POLICY "Non-viewer can delete toolbox attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'toolbox-talks' AND public.can_write());
