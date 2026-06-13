/*
  # Commercial — ESG Engine (Phase 2)

  Turns Phase 1 received-waste data into client-facing carbon / water / diesel /
  treatment / credit reporting. Hybrid methodology: standard-by-default,
  configurable-by-admin, approval-controlled.

  Integrity rules enforced here:
  - No customer-facing number is shown until APPROVED. The seed below loads a
    standard, fully-sourced factor library as DRAFT (approved = false). Nothing
    reaches a customer until an admin reviews and approves it.
  - Approval is admin-only (enforced by trigger esg_require_admin_approval()).
  - Customers read ONLY approved results, ONLY customer-safe columns, ONLY their
    own client, via the definer view public.v_esg_results.

  Tables: esg_factors, esg_monthly_operational, esg_results, carbon_credit_evidence
  Views:  v_esg_readiness (staff, security_invoker), v_esg_results (customer, definer)
*/

-- ── esg_factors: master configurable factor/assumption library ──────────────
CREATE TABLE IF NOT EXISTS public.esg_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL,
  factor_name text NOT NULL,
  category text NOT NULL CHECK (category IN (
    'emission_factor','water_factor','treatment_factor','transport_assumption',
    'container_capacity','plant_benchmark','baseline','carbon_credit','allocation')),
  ghg_scope text CHECK (ghg_scope IN ('scope_1','scope_2','scope_3')),
  unit text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  text_value text DEFAULT '',           -- for non-numeric assumptions (allocation/baseline)
  source text DEFAULT '',
  effective_date date NOT NULL DEFAULT DATE '2025-01-01',
  version integer NOT NULL DEFAULT 1,
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (factor_key, version)
);
CREATE INDEX IF NOT EXISTS idx_esg_factors_key ON public.esg_factors (factor_key);
CREATE INDEX IF NOT EXISTS idx_esg_factors_cat ON public.esg_factors (category);

-- ── esg_monthly_operational: plant actuals not in the waste file ────────────
CREATE TABLE IF NOT EXISTS public.esg_monthly_operational (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL,           -- first day of month
  site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL,
  electricity_kwh numeric,
  water_kl numeric,
  diesel_litres numeric,
  effluent_kl numeric,
  treatment_energy_kwh numeric,
  trips numeric,
  kilometres numeric,
  idling_hours numeric,
  data_source text NOT NULL DEFAULT 'actual' CHECK (data_source IN ('actual','estimated')),
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text DEFAULT '',
  entered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (period_month, site_id)
);
-- one plant-wide (site_id NULL) row per month
CREATE UNIQUE INDEX IF NOT EXISTS idx_esg_op_plantwide
  ON public.esg_monthly_operational (period_month) WHERE site_id IS NULL;

-- ── esg_results: cached per-client/per-month derived output + audit ─────────
CREATE TABLE IF NOT EXISTS public.esg_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  co2e_saved_kg numeric,
  residual_tco2e numeric,
  water_saved_kl numeric,
  electricity_saved_kwh numeric,
  diesel_saved_l numeric,
  km_avoided numeric,
  trips_avoided numeric,
  indicative_carbon_credits numeric,
  total_nett_kg numeric DEFAULT 0,
  treatment_emissions_by_method jsonb DEFAULT '{}'::jsonb,
  transport_comparison jsonb DEFAULT '{}'::jsonb,
  data_basis jsonb DEFAULT '{}'::jsonb,   -- customer-safe: metric -> 'actual|admin_actual|estimated|benchmark|awaiting'
  audit jsonb DEFAULT '{}'::jsonb,        -- STAFF-ONLY: full provenance (factor keys/values/formulas)
  approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at timestamptz,
  computed_at timestamptz DEFAULT now(),
  computed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (client_id, period_month)
);
CREATE INDEX IF NOT EXISTS idx_esg_results_client ON public.esg_results (client_id);
CREATE INDEX IF NOT EXISTS idx_esg_results_period ON public.esg_results (period_month);

-- ── carbon_credit_evidence: registry/retirement proof for verified credits ──
CREATE TABLE IF NOT EXISTS public.carbon_credit_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  period_month date,
  registry_name text DEFAULT '',
  serial_ref text DEFAULT '',
  retirement_doc_path text DEFAULT '',
  quantity_tco2e numeric,
  verified boolean NOT NULL DEFAULT false,
  notes text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cce_client ON public.carbon_credit_evidence (client_id);

-- ── updated_at triggers ─────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS esg_factors_updated_at ON public.esg_factors;
CREATE TRIGGER esg_factors_updated_at BEFORE UPDATE ON public.esg_factors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS esg_monthly_operational_updated_at ON public.esg_monthly_operational;
CREATE TRIGGER esg_monthly_operational_updated_at BEFORE UPDATE ON public.esg_monthly_operational
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS esg_results_updated_at ON public.esg_results;
CREATE TRIGGER esg_results_updated_at BEFORE UPDATE ON public.esg_results
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS carbon_credit_evidence_updated_at ON public.carbon_credit_evidence;
CREATE TRIGGER carbon_credit_evidence_updated_at BEFORE UPDATE ON public.carbon_credit_evidence
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ── approval gate: only admins may flip approved -> true ────────────────────
CREATE OR REPLACE FUNCTION public.esg_require_admin_approval()
  RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF NEW.approved = true AND COALESCE(OLD.approved, false) = false THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Only administrators can approve ESG records';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  ELSIF NEW.approved = false THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.esg_require_admin_approval() FROM anon;

DROP TRIGGER IF EXISTS esg_factors_approval ON public.esg_factors;
CREATE TRIGGER esg_factors_approval BEFORE INSERT OR UPDATE ON public.esg_factors
  FOR EACH ROW EXECUTE FUNCTION public.esg_require_admin_approval();
DROP TRIGGER IF EXISTS esg_op_approval ON public.esg_monthly_operational;
CREATE TRIGGER esg_op_approval BEFORE INSERT OR UPDATE ON public.esg_monthly_operational
  FOR EACH ROW EXECUTE FUNCTION public.esg_require_admin_approval();
DROP TRIGGER IF EXISTS esg_results_approval ON public.esg_results;
CREATE TRIGGER esg_results_approval BEFORE INSERT OR UPDATE ON public.esg_results
  FOR EACH ROW EXECUTE FUNCTION public.esg_require_admin_approval();

-- ── RLS ─────────────────────────────────────────────────────────────────────
ALTER TABLE public.esg_factors             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_monthly_operational ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esg_results             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carbon_credit_evidence  ENABLE ROW LEVEL SECURITY;

-- esg_factors: staff read; writes commercial (admin/management). Approval gated by trigger.
CREATE POLICY "Staff read esg_factors" ON public.esg_factors FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write esg_factors ins" ON public.esg_factors FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_factors upd" ON public.esg_factors FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_factors del" ON public.esg_factors FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read esg_op" ON public.esg_monthly_operational FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write esg_op ins" ON public.esg_monthly_operational FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_op upd" ON public.esg_monthly_operational FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_op del" ON public.esg_monthly_operational FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read esg_results" ON public.esg_results FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write esg_results ins" ON public.esg_results FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_results upd" ON public.esg_results FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write esg_results del" ON public.esg_results FOR DELETE TO authenticated USING (public.can_write_commercial());

CREATE POLICY "Staff read cce" ON public.carbon_credit_evidence FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write cce ins" ON public.carbon_credit_evidence FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write cce upd" ON public.carbon_credit_evidence FOR UPDATE TO authenticated USING (public.can_write_commercial()) WITH CHECK (public.can_write_commercial());
CREATE POLICY "Write cce del" ON public.carbon_credit_evidence FOR DELETE TO authenticated USING (public.can_write_commercial());

-- ── staff readiness view (security_invoker: respects base-table RLS) ─────────
CREATE OR REPLACE VIEW public.v_esg_readiness
  WITH (security_invoker = on) AS
WITH periods AS (
  SELECT period_month FROM public.esg_monthly_operational
  UNION
  SELECT period_month FROM public.esg_results
)
SELECT
  p.period_month,
  (SELECT count(*) FROM public.esg_factors f WHERE f.approved AND f.active)                          AS approved_factor_count,
  EXISTS (SELECT 1 FROM public.esg_monthly_operational m WHERE m.period_month = p.period_month)        AS operational_present,
  EXISTS (SELECT 1 FROM public.esg_monthly_operational m WHERE m.period_month = p.period_month AND m.approved) AS operational_approved,
  (SELECT count(*) FROM public.esg_results r WHERE r.period_month = p.period_month)                    AS result_count,
  (SELECT count(*) FROM public.esg_results r WHERE r.period_month = p.period_month AND r.approved)     AS approved_result_count
FROM periods p;
GRANT SELECT ON public.v_esg_readiness TO authenticated;

-- ── customer-facing definer view (approved + customer-safe columns only) ────
-- Default view security is DEFINER: bypasses base RLS, so the WHERE clause is the
-- sole row filter. The internal `audit` column is NEVER selected here.
CREATE OR REPLACE VIEW public.v_esg_results AS
SELECT
  r.id,
  r.client_id,
  c.client_name,
  r.period_month,
  r.co2e_saved_kg,
  r.residual_tco2e,
  r.water_saved_kl,
  r.electricity_saved_kwh,
  r.diesel_saved_l,
  r.km_avoided,
  r.trips_avoided,
  r.indicative_carbon_credits,
  r.total_nett_kg,
  r.treatment_emissions_by_method,
  r.transport_comparison,
  r.data_basis,
  COALESCE((
    SELECT bool_or(e.verified) FROM public.carbon_credit_evidence e
    WHERE e.client_id = r.client_id
      AND (e.period_month = r.period_month OR e.period_month IS NULL)
  ), false) AS credits_verified
FROM public.esg_results r
JOIN public.clients c ON c.id = r.client_id
WHERE r.approved = true
  AND r.client_id = public.current_user_client_id();
GRANT SELECT ON public.v_esg_results TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- SEED: standard factor library as DRAFT (approved = false).
-- These are review-defaults, NOT verified figures. An admin must review the
-- value + source and approve before anything is calculated or shown to a client.
-- ════════════════════════════════════════════════════════════════════════════
INSERT INTO public.esg_factors
  (factor_key, factor_name, category, ghg_scope, unit, value, text_value, source, effective_date, version, approved, notes)
VALUES
  -- Emission factors
  ('emission_factor:diesel','Diesel combustion','emission_factor','scope_1','kg CO2e/litre',2.68,'','DEFRA 2023 GHG conversion factors (review)',DATE '2025-01-01',1,false,'Standard review-default. Confirm against current DEFRA/SA factor before approving.'),
  ('emission_factor:electricity','Electricity grid (Scope 2)','emission_factor','scope_2','kg CO2e/kWh',0.94,'','Eskom / SA national grid factor (review)',DATE '2025-01-01',1,false,'Standard review-default. Confirm latest Eskom grid emission factor before approving.'),
  ('water_factor:supply','Water supply','water_factor','scope_3','kg CO2e/kL',0.344,'','DEFRA water supply (review)',DATE '2025-01-01',1,false,'Standard review-default.'),
  ('water_factor:effluent','Effluent / wastewater treatment','water_factor','scope_3','kg CO2e/kL',0.272,'','DEFRA water treatment (review)',DATE '2025-01-01',1,false,'Standard review-default.'),
  -- Treatment-method factors (kg CO2e per kg waste)
  ('treatment_factor:incineration','Treatment — incineration','treatment_factor','scope_3','kg CO2e/kg',0.883,'','PLACEHOLDER — replace with verified factor',DATE '2025-01-01',1,false,'Placeholder estimate. Replace with a sourced incineration factor before approving.'),
  ('treatment_factor:autoclave','Treatment — conventional autoclave','treatment_factor','scope_3','kg CO2e/kg',0.270,'','PLACEHOLDER — replace with verified factor',DATE '2025-01-01',1,false,'Placeholder estimate. Replace before approving.'),
  ('treatment_factor:chemical','Treatment — conventional chemical','treatment_factor','scope_3','kg CO2e/kg',0.400,'','PLACEHOLDER — replace with verified factor',DATE '2025-01-01',1,false,'Placeholder estimate. Replace before approving.'),
  ('treatment_factor:t4g_plant','Treatment — Tech4Green plant','treatment_factor','scope_1','kg CO2e/kg',0.150,'','PLACEHOLDER — replace with measured value',DATE '2025-01-01',1,false,'Replace with Tech4Green''s measured treatment factor for an "actual" basis.'),
  ('treatment_factor:residue','Residue / landfill disposal','treatment_factor','scope_3','kg CO2e/kg',0.450,'','PLACEHOLDER — replace with verified factor',DATE '2025-01-01',1,false,'Placeholder estimate. Replace before approving.'),
  -- Transport assumptions
  ('transport_assumption:boxbody_payload_kg','Conventional box-body payload','transport_assumption',NULL,'kg/trip',4000,'','Industry assumption (review)',DATE '2025-01-01',1,false,'Effective payload per conventional collection trip. Review.'),
  ('transport_assumption:t4g_payload_kg','Tech4Green effective payload','transport_assumption',NULL,'kg/trip',6000,'','Operational assumption (review)',DATE '2025-01-01',1,false,'Effective payload per Tech4Green trip. Review.'),
  ('transport_assumption:avg_trip_km','Average distance per collection trip','transport_assumption',NULL,'km/trip',50,'','Operational assumption (review)',DATE '2025-01-01',1,false,'Used only when actual kilometres are not entered for the month.'),
  ('transport_assumption:diesel_l_per_km_t4g','Diesel consumption — Tech4Green','transport_assumption',NULL,'L/km',0.35,'','Operational assumption (review)',DATE '2025-01-01',1,false,'Review.'),
  ('transport_assumption:diesel_l_per_km_baseline','Diesel consumption — conventional baseline','transport_assumption',NULL,'L/km',0.40,'','Industry assumption (review)',DATE '2025-01-01',1,false,'Review.'),
  ('transport_assumption:idling_l_per_hr','Idling fuel consumption','transport_assumption',NULL,'L/hr',2.5,'','Industry assumption (review)',DATE '2025-01-01',1,false,'Used with idling hours from monthly operational data.'),
  -- Plant benchmarks (conventional autoclave/boiler, per kg treated)
  ('plant_benchmark:autoclave_kwh_per_kg','Conventional autoclave — electricity','plant_benchmark',NULL,'kWh/kg',0.95,'','Industry benchmark (review)',DATE '2025-01-01',1,false,'Benchmark for electricity-saved comparison. Review.'),
  ('plant_benchmark:autoclave_water_kl_per_kg','Conventional autoclave — water','plant_benchmark',NULL,'kL/kg',0.004,'','Industry benchmark (review)',DATE '2025-01-01',1,false,'Benchmark for water-saved comparison (4 L/kg). Review.'),
  ('plant_benchmark:autoclave_effluent_kl_per_kg','Conventional autoclave — effluent','plant_benchmark',NULL,'kL/kg',0.003,'','Industry benchmark (review)',DATE '2025-01-01',1,false,'Benchmark for effluent comparison. Review.'),
  -- Baselines & methodology
  ('baseline:treatment_comparator','Industry baseline comparator','baseline',NULL,'',0,'incineration','Methodology assumption',DATE '2025-01-01',1,false,'Treatment method used as the "industry" comparator for saved-vs-industry metrics.'),
  ('allocation:method','Plant-utility allocation method','allocation',NULL,'',0,'nett_kg_share','Methodology assumption',DATE '2025-01-01',1,false,'How plant utilities are split across clients. Default: share of nett kg treated.'),
  ('carbon_credit:tco2e_per_credit','Carbon credit basis','carbon_credit',NULL,'tCO2e/credit',1,'','Methodology assumption',DATE '2025-01-01',1,false,'Indicative credits = residual tCO2e ÷ this value. Default 1 credit = 1 tCO2e.')
ON CONFLICT (factor_key, version) DO NOTHING;

-- Container capacities — auto-created (as drafts) from existing container types.
INSERT INTO public.esg_factors
  (factor_key, factor_name, category, unit, value, source, effective_date, version, approved, notes)
SELECT
  'container_capacity:' || lower(regexp_replace(ct.container_type_name, '[^a-zA-Z0-9]+', '_', 'g')),
  'Container capacity — ' || ct.container_type_name,
  'container_capacity', 'kg', 0, 'PLACEHOLDER — enter rated payload', DATE '2025-01-01', 1, false,
  'Auto-created from container type. Enter rated payload (kg) and approve.'
FROM public.container_types ct
WHERE ct.active = true
ON CONFLICT (factor_key, version) DO NOTHING;
