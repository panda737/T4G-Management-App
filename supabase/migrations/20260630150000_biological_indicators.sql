/*
  # Biological Indicators — Compliance quick-capture register

  ## Purpose
  A lightweight, mobile-first compliance log: staff photograph the biological-
  indicator (sterility) test result for a compactor and record which compactor
  (1–4) it belongs to. Mirrors the Spillage quick-capture pattern — a dated,
  photographed record captured in seconds from a phone, with a mandatory photo.
  Date & time are stamped automatically at the moment of capture.

  ## Access
    - Read   : any internal user (NOT is_customer()).
    - Insert : H&S Officer / Ops Manager (both the 'management' role) + 'operator'
               + 'admin' — gated by can_log_biological_indicator(). Deliberately
               narrower than can_write(): it encodes the explicit capture list.
    - Update / Delete : admin / management only, via can_manage_biological_indicators().

  Reuses existing helpers: public.is_customer() (20260613140000),
  public.update_updated_at(). Additive & transaction-safe; apply via _dbrun.cjs
  (the migration ledger is drifted — not auto-pushed).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Permission helpers
-- ─────────────────────────────────────────────────────────────────────────────
-- Who can capture a biological indicator: admin, management (H&S Officer /
-- Ops Manager log in as management) and operators.
CREATE OR REPLACE FUNCTION public.can_log_biological_indicator()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management', 'operator')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_log_biological_indicator() FROM anon;

-- Who can edit / delete the log: admin / management only.
CREATE OR REPLACE FUNCTION public.can_manage_biological_indicators()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY INVOKER
  SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid()
      AND role IN ('admin', 'management')
      AND is_active = true
  );
$$;

REVOKE EXECUTE ON FUNCTION public.can_manage_biological_indicators() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. biological_indicators table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.biological_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bi_number text UNIQUE NOT NULL,                 -- BI-YYYY-NNNN
  captured_date date NOT NULL DEFAULT CURRENT_DATE,
  captured_time time,
  compactor_no smallint NOT NULL CHECK (compactor_no BETWEEN 1 AND 4),
  photo_path text,                                -- object path in 'biological-indicator-photos'
  notes text NOT NULL DEFAULT '',
  captured_by text NOT NULL DEFAULT '',
  captured_by_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bio_indicators_date ON public.biological_indicators (captured_date);
CREATE INDEX IF NOT EXISTS idx_bio_indicators_compactor ON public.biological_indicators (compactor_no);

ALTER TABLE public.biological_indicators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read biological indicators (internal)"
  ON public.biological_indicators FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Capture biological indicators"
  ON public.biological_indicators FOR INSERT TO authenticated
  WITH CHECK (public.can_log_biological_indicator());

CREATE POLICY "Manager can update biological indicators"
  ON public.biological_indicators FOR UPDATE TO authenticated
  USING (public.can_manage_biological_indicators()) WITH CHECK (public.can_manage_biological_indicators());

CREATE POLICY "Manager can delete biological indicators"
  ON public.biological_indicators FOR DELETE TO authenticated
  USING (public.can_manage_biological_indicators());

CREATE TRIGGER biological_indicators_updated_at
  BEFORE UPDATE ON public.biological_indicators
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. biological-indicator-photos private storage bucket
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'biological-indicator-photos',
  'biological-indicator-photos',
  false,
  15728640,                                       -- 15 MB — a phone photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Internal users can read biological indicator photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'biological-indicator-photos' AND NOT public.is_customer());

CREATE POLICY "Loggers can upload biological indicator photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'biological-indicator-photos' AND public.can_log_biological_indicator());

CREATE POLICY "Manager can update biological indicator photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'biological-indicator-photos' AND public.can_manage_biological_indicators());

CREATE POLICY "Manager can delete biological indicator photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'biological-indicator-photos' AND public.can_manage_biological_indicators());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Privilege hardening — strip anon/PUBLIC, keep authenticated (RLS gates).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.biological_indicators FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.biological_indicators FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.biological_indicators TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
