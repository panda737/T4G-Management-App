/*
  # Commercial — Received Waste (Phase 1)

  Customer-facing received/incoming waste tracking. Answers: "What waste did
  Tech4Green receive from each client/site, per month?" Received waste ONLY —
  transfer-out / external treatment / ESG math are out of scope here.

  - Reuses the existing public.clients table as the shared customer record.
  - Adds normalised lookups (waste_categories, container_types), generator sites
    (client_sites), the main records table (received_waste_records), import batch
    bookkeeping (data_imports, import_error_rows).
  - Adds a 'customer' role + user_profiles.client_id for per-client portal scoping.
  - RLS: staff (non-customer) read base tables; customers read ONLY their own rows
    and ONLY customer-safe columns via the definer view public.v_received_waste.
*/

-- ── role + per-customer linkage ─────────────────────────────────────────────
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check,
  ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('admin','management','stock_controller','production','operator','viewer','customer'));

ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id);

-- ── RLS helper functions (SECURITY INVOKER idiom) ───────────────────────────
CREATE OR REPLACE FUNCTION public.can_write_commercial()
  RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid() AND role IN ('admin','management') AND is_active = true);
$$;
REVOKE EXECUTE ON FUNCTION public.can_write_commercial() FROM anon;

CREATE OR REPLACE FUNCTION public.is_customer()
  RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_profiles
    WHERE auth_user_id = auth.uid() AND role = 'customer' AND is_active = true);
$$;
REVOKE EXECUTE ON FUNCTION public.is_customer() FROM anon;

CREATE OR REPLACE FUNCTION public.current_user_client_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT client_id FROM public.user_profiles
    WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_client_id() FROM anon;

-- ── lookup: waste_categories ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.waste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_category_name text NOT NULL UNIQUE,
  hcrw_super_category text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── lookup: container_types ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.container_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  container_type_name text NOT NULL UNIQUE,
  reusable_boolean boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── client_sites (generator facilities) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.client_sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  generator_group text DEFAULT '',
  generator_facility text NOT NULL,
  site_code text DEFAULT '',
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, generator_facility)
);
CREATE INDEX IF NOT EXISTS idx_client_sites_client ON public.client_sites (client_id);

-- ── data_imports (one row per upload) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  upload_date timestamptz DEFAULT now(),
  total_rows integer DEFAULT 0,
  imported_rows integer DEFAULT 0,
  skipped_rows integer DEFAULT 0,
  error_rows integer DEFAULT 0,
  import_status text NOT NULL DEFAULT 'pending'
    CHECK (import_status IN ('pending','completed','failed')),
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- ── received_waste_records (main) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.received_waste_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  -- customer-visible
  waste_manifest_tracking_number text DEFAULT '',
  received_date date,
  collection_date date,
  facility_receipt_date date,
  received_date_source text NOT NULL DEFAULT 'facility_receipt'
    CHECK (received_date_source IN ('facility_receipt','collection_fallback')),
  waste_category_id uuid REFERENCES public.waste_categories(id) ON DELETE SET NULL,
  hcrw_super_category text DEFAULT '',
  container_type_id uuid REFERENCES public.container_types(id) ON DELETE SET NULL,
  containers_received numeric DEFAULT 0,
  nett_weight_kg numeric DEFAULT 0,
  reusable_boolean boolean DEFAULT false,
  -- admin-only (never exposed to customers)
  manifest_id text DEFAULT '',
  waste_manifest_creation_date date,
  generator_acknowledgement_date date,
  treatment_confirmation_date date,
  transporter text DEFAULT '',
  driver text DEFAULT '',
  weight_collected_kg numeric,
  reusable_empty_weight_kg numeric,
  billed_to_client text DEFAULT '',
  invoice_ref_number text DEFAULT '',
  treatment_facility text DEFAULT '',
  -- provenance
  source_upload_id uuid REFERENCES public.data_imports(id) ON DELETE SET NULL,
  source_row_number integer,
  import_status text NOT NULL DEFAULT 'imported'
    CHECK (import_status IN ('imported','error')),
  import_error_message text DEFAULT '',
  duplicate_key text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rwr_client ON public.received_waste_records (client_id);
CREATE INDEX IF NOT EXISTS idx_rwr_site ON public.received_waste_records (site_id);
CREATE INDEX IF NOT EXISTS idx_rwr_receipt_date ON public.received_waste_records (facility_receipt_date);
CREATE INDEX IF NOT EXISTS idx_rwr_received_date ON public.received_waste_records (received_date);
CREATE INDEX IF NOT EXISTS idx_rwr_category ON public.received_waste_records (waste_category_id);

-- ── import_error_rows (rows that failed validation; raw payload for review) ──
CREATE TABLE IF NOT EXISTS public.import_error_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid NOT NULL REFERENCES public.data_imports(id) ON DELETE CASCADE,
  source_row_number integer,
  raw_data jsonb,
  error_message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_import_error_rows_import ON public.import_error_rows (import_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS waste_categories_updated_at ON public.waste_categories;
CREATE TRIGGER waste_categories_updated_at BEFORE UPDATE ON public.waste_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS container_types_updated_at ON public.container_types;
CREATE TRIGGER container_types_updated_at BEFORE UPDATE ON public.container_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS client_sites_updated_at ON public.client_sites;
CREATE TRIGGER client_sites_updated_at BEFORE UPDATE ON public.client_sites
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS received_waste_records_updated_at ON public.received_waste_records;
CREATE TRIGGER received_waste_records_updated_at BEFORE UPDATE ON public.received_waste_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.waste_categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.container_types        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_sites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_imports           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.received_waste_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_error_rows      ENABLE ROW LEVEL SECURITY;

-- Reference lookups: readable by everyone authenticated (incl. customers); writes commercial.
CREATE POLICY "Read waste_categories" ON public.waste_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write waste_categories ins" ON public.waste_categories FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write waste_categories upd" ON public.waste_categories FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write waste_categories del" ON public.waste_categories FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Read container_types" ON public.container_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Write container_types ins" ON public.container_types FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write container_types upd" ON public.container_types FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write container_types del" ON public.container_types FOR DELETE TO authenticated USING (public.can_write_commercial());

-- Staff-only base tables (customers never read these; they use v_received_waste).
CREATE POLICY "Staff read client_sites" ON public.client_sites FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write client_sites ins" ON public.client_sites FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write client_sites upd" ON public.client_sites FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write client_sites del" ON public.client_sites FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read data_imports" ON public.data_imports FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write data_imports ins" ON public.data_imports FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write data_imports upd" ON public.data_imports FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write data_imports del" ON public.data_imports FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read received_waste" ON public.received_waste_records FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write received_waste ins" ON public.received_waste_records FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write received_waste upd" ON public.received_waste_records FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write received_waste del" ON public.received_waste_records FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read import_error_rows" ON public.import_error_rows FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write import_error_rows ins" ON public.import_error_rows FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write import_error_rows del" ON public.import_error_rows FOR DELETE TO authenticated USING (public.can_write_commercial());

-- Tighten clients read: customers may read ONLY their own client row.
DROP POLICY IF EXISTS "Authenticated users can read clients" ON public.clients;
CREATE POLICY "Read clients (staff all, customer own)" ON public.clients
  FOR SELECT TO authenticated
  USING (NOT public.is_customer() OR id = public.current_user_client_id());

-- ── Customer-facing definer view (row + column security in one object) ───────
-- Default view security is DEFINER (security_invoker off): it bypasses base-table
-- RLS, so the WHERE clause is the sole row filter and only safe columns are exposed.
CREATE OR REPLACE VIEW public.v_received_waste AS
SELECT
  r.id,
  r.client_id,
  c.client_name,
  r.site_id,
  s.generator_group,
  s.generator_facility,
  r.waste_manifest_tracking_number,
  r.received_date,
  r.collection_date,
  r.facility_receipt_date,
  r.received_date_source,
  r.waste_category_id,
  wc.waste_category_name,
  r.hcrw_super_category,
  r.container_type_id,
  ct.container_type_name,
  r.containers_received,
  r.nett_weight_kg,
  r.reusable_boolean
FROM public.received_waste_records r
JOIN public.clients c ON c.id = r.client_id
LEFT JOIN public.client_sites s ON s.id = r.site_id
LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
LEFT JOIN public.container_types ct ON ct.id = r.container_type_id
WHERE r.import_status = 'imported'
  AND r.client_id = public.current_user_client_id();

GRANT SELECT ON public.v_received_waste TO authenticated;
