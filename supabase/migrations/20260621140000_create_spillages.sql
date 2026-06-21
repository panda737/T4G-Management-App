/*
  # Spillages — Health & Safety quick-capture register

  ## Purpose
  A lightweight, mobile-first H&S log for spillages found on site: loose waste in
  a wheelie bin, blood in a wheelie bin, blood spilt on the floor, etc. Designed
  for operators to capture in seconds from a phone, with a mandatory photo.

  It is "like an incident but easier" — no investigation / status workflow, just
  a dated, photographed record of what was found and which team it belongs to.

  ## Access
    - Read   : any internal user (NOT is_customer())
    - Insert : any internal non-viewer user — can_write() AND NOT is_customer().
               This deliberately includes operators (who only write 'treatment'
               elsewhere) so any of the team can report a spill they find.
    - Update / Delete : admin / management only, via can_manage_spillages().

  Reuses existing helpers: public.can_write() (20260607000006),
  public.is_customer() (20260613140000), public.update_updated_at(). Additive &
  transaction-safe; apply via _dbrun.cjs (the migration ledger is drifted —
  not auto-pushed).
*/

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. can_manage_spillages() — admin / management write gate (edit + delete)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_manage_spillages()
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

REVOKE EXECUTE ON FUNCTION public.can_manage_spillages() FROM anon;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. spillages table
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.spillages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spillage_number text UNIQUE NOT NULL,           -- SPL-YYYY-NNNN
  spillage_date date NOT NULL DEFAULT CURRENT_DATE,
  spillage_time time,
  party text NOT NULL DEFAULT '',                 -- whose waste: Tshenolo / Phuting / Pleasant Waste / Umndeni Waste / Switch Waste
  spillage_type text NOT NULL DEFAULT '',         -- Loose waste in wheelie bin / Blood in wheelie bin / Blood spilt on floor / Other
  location text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  photo_path text,                                -- object path in the 'spillage-photos' bucket
  reported_by text NOT NULL DEFAULT '',
  reported_by_id uuid REFERENCES public.employees(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_spillages_date ON public.spillages (spillage_date);
CREATE INDEX IF NOT EXISTS idx_spillages_party ON public.spillages (party);

ALTER TABLE public.spillages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read spillages (internal)"
  ON public.spillages FOR SELECT TO authenticated
  USING (NOT public.is_customer());

CREATE POLICY "Internal non-viewer can report spillages"
  ON public.spillages FOR INSERT TO authenticated
  WITH CHECK (public.can_write() AND NOT public.is_customer());

CREATE POLICY "Manager can update spillages"
  ON public.spillages FOR UPDATE TO authenticated
  USING (public.can_manage_spillages()) WITH CHECK (public.can_manage_spillages());

CREATE POLICY "Manager can delete spillages"
  ON public.spillages FOR DELETE TO authenticated
  USING (public.can_manage_spillages());

CREATE TRIGGER spillages_updated_at
  BEFORE UPDATE ON public.spillages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. A spillage IS an incident — mirror every new spillage into the Incident
--    Register (safety_incidents). Linked via source_spillage_id; deleting the
--    spillage cascades to remove its auto-created incident, keeping them in sync.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.safety_incidents
  ADD COLUMN IF NOT EXISTS source_spillage_id uuid
    REFERENCES public.spillages(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_incidents_source_spillage
  ON public.safety_incidents (source_spillage_id);

CREATE OR REPLACE FUNCTION public.spillage_to_incident()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY INVOKER
  SET search_path = ''
AS $$
DECLARE
  v_year   text := to_char(NEW.spillage_date, 'YYYY');
  v_seq    integer;
  v_number text;
BEGIN
  -- Serialize INC-number generation so concurrent reports can't collide.
  PERFORM pg_advisory_xact_lock(hashtext('safety_incidents_number'));

  SELECT COALESCE(MAX((regexp_match(incident_number, '(\d+)$'))[1]::int), 0) + 1
    INTO v_seq
    FROM public.safety_incidents
    WHERE incident_number LIKE 'INC-' || v_year || '-%';

  v_number := 'INC-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  INSERT INTO public.safety_incidents (
    incident_number, incident_date, incident_time, incident_type, severity,
    location, description, reported_by, status, source_spillage_id
  ) VALUES (
    v_number,
    NEW.spillage_date,
    NEW.spillage_time,
    'Environmental',
    'Minor',
    NEW.location,
    'Spillage ' || NEW.spillage_number || ': ' || NEW.spillage_type
      || CASE WHEN NEW.party <> '' THEN ' (' || NEW.party || ')' ELSE '' END
      || CASE WHEN NEW.description <> '' THEN E'\n' || NEW.description ELSE '' END,
    NEW.reported_by,
    'Open',
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER spillage_creates_incident
  AFTER INSERT ON public.spillages
  FOR EACH ROW EXECUTE FUNCTION public.spillage_to_incident();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. spillage-photos private storage bucket
-- ─────────────────────────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'spillage-photos',
  'spillage-photos',
  false,
  15728640,                                       -- 15 MB — a phone photo
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Internal users can read spillage photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'spillage-photos' AND NOT public.is_customer());

CREATE POLICY "Internal non-viewer can upload spillage photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'spillage-photos' AND public.can_write() AND NOT public.is_customer());

CREATE POLICY "Manager can update spillage photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'spillage-photos' AND public.can_manage_spillages());

CREATE POLICY "Manager can delete spillage photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'spillage-photos' AND public.can_manage_spillages());

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Privilege hardening — strip anon/PUBLIC, keep authenticated (RLS gates).
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  EXECUTE 'REVOKE SELECT ON public.spillages FROM PUBLIC';
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    EXECUTE 'REVOKE SELECT ON public.spillages FROM anon';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.spillages TO authenticated';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
