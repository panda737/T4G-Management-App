-- ─────────────────────────────────────────────────────────────────────────────
-- Portal rebuild — Phase 0: data-carrying schema + import staging/audit
--
-- Additive only (no behaviour change to existing pages):
--   1. client_sites.province            — region for each generator site.
--   2. treatment_methods lookup         — standard methods reference list.
--      received_waste_records.treatment_method_id — set ONLY from real imported
--      data; never guessed/derived. Dashboard hides the treatment split until
--      these are populated.
--   3. data_imports staging/audit       — import_kind, source_checksum,
--      duplicate_rows so monthly-operational + sites uploads run through the same
--      checksum-guarded, duplicate-aware batch model as waste imports.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Province on generator sites ─────────────────────────────────────────────
ALTER TABLE public.client_sites
  ADD COLUMN IF NOT EXISTS province text DEFAULT '';

-- 2. Treatment methods lookup ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.treatment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_method_name text NOT NULL UNIQUE,
  display_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS treatment_methods_updated_at ON public.treatment_methods;
CREATE TRIGGER treatment_methods_updated_at BEFORE UPDATE ON public.treatment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.treatment_methods ENABLE ROW LEVEL SECURITY;

-- Reference list: readable by everyone authenticated (incl. customers); writes commercial.
CREATE POLICY "Read treatment_methods" ON public.treatment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write treatment_methods ins" ON public.treatment_methods FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write treatment_methods upd" ON public.treatment_methods FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write treatment_methods del" ON public.treatment_methods FOR DELETE TO authenticated USING (public.can_write_commercial());

-- Seed the standard reference methods (assignment to records still comes from real data).
INSERT INTO public.treatment_methods (treatment_method_name, display_order) VALUES
  ('Incineration', 1),
  ('Chemical', 2),
  ('Autoclave', 3),
  ('Tech4Green Plant', 4)
ON CONFLICT (treatment_method_name) DO NOTHING;

-- Per-record treatment method (nullable; populated only by imports).
ALTER TABLE public.received_waste_records
  ADD COLUMN IF NOT EXISTS treatment_method_id uuid
    REFERENCES public.treatment_methods(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_rwr_treatment_method
  ON public.received_waste_records (treatment_method_id);

-- 3. Import staging / audit fields ───────────────────────────────────────────
ALTER TABLE public.data_imports
  ADD COLUMN IF NOT EXISTS import_kind text NOT NULL DEFAULT 'waste'
    CHECK (import_kind IN ('waste','operational','sites')),
  ADD COLUMN IF NOT EXISTS source_checksum text DEFAULT '',
  ADD COLUMN IF NOT EXISTS duplicate_rows integer DEFAULT 0;
