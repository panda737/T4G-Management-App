-- Add review_date to documents for periodic review cycle tracking
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS review_date date;

-- Track file replacement history per document
CREATE TABLE IF NOT EXISTS public.document_versions (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      uuid        NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number   integer     NOT NULL,
  file_path        text        NOT NULL,
  file_name        text        NOT NULL,
  file_size_bytes  bigint      NOT NULL DEFAULT 0,
  replaced_by      uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  replaced_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS document_versions_document_id_idx
  ON public.document_versions(document_id);

ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth users can read document versions"
  ON public.document_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "non-viewers can insert document versions"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (public.can_write());

CREATE POLICY "non-viewers can delete document versions"
  ON public.document_versions FOR DELETE
  TO authenticated
  USING (public.can_write());
