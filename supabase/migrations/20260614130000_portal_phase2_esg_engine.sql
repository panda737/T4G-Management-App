-- ─────────────────────────────────────────────────────────────────────────────
-- Portal rebuild — Phase 2: ESG engine made dashboard-ready (governed + traceable)
--
--  • esg_calc_runs            — one immutable row per recalc (who/when/factor set).
--  • esg_results additions    — calc_run_id + factor_snapshot (STAFF-ONLY audit),
--      and customer-safe figures: trees_equivalent + the Tech4Green "actual" side
--      of each comparison metric (conventional = actual + saved, derived in UI).
--  • equivalence factor       — kg CO2e per tree (illustrative; draft).
--  • v_esg_results            — expose the new customer-safe columns (no snapshot/audit).
--  • v_esg_site_allocated     — per-site allocation by waste-share ("allocated estimate"),
--      column-safe + centralised site filter, for site-scoped logins / per-site views.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Calc-run audit table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.esg_calc_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month date NOT NULL,
  run_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  run_at timestamptz DEFAULT now(),
  factor_set_hash text DEFAULT '',
  factor_count integer DEFAULT 0,
  client_count integer DEFAULT 0,
  notes text DEFAULT ''
);
ALTER TABLE public.esg_calc_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read esg_calc_runs" ON public.esg_calc_runs FOR SELECT TO authenticated USING (NOT public.is_customer());
CREATE POLICY "Write esg_calc_runs ins" ON public.esg_calc_runs FOR INSERT TO authenticated WITH CHECK (public.can_write_commercial());

-- 2. esg_results: traceability (staff-only) + customer-safe comparison/trees ──
ALTER TABLE public.esg_results
  ADD COLUMN IF NOT EXISTS calc_run_id uuid REFERENCES public.esg_calc_runs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS factor_snapshot jsonb DEFAULT '[]'::jsonb,   -- STAFF-ONLY (never in a customer view)
  ADD COLUMN IF NOT EXISTS trees_equivalent numeric,
  ADD COLUMN IF NOT EXISTS t4g_water_kl numeric,
  ADD COLUMN IF NOT EXISTS t4g_electricity_kwh numeric,
  ADD COLUMN IF NOT EXISTS t4g_diesel_l numeric,
  ADD COLUMN IF NOT EXISTS t4g_trips numeric;

-- 3. Allow an 'equivalence' factor category + seed the trees factor as DRAFT ──
ALTER TABLE public.esg_factors
  DROP CONSTRAINT IF EXISTS esg_factors_category_check,
  ADD CONSTRAINT esg_factors_category_check CHECK (category IN (
    'emission_factor','water_factor','treatment_factor','transport_assumption',
    'container_capacity','plant_benchmark','baseline','carbon_credit','allocation','equivalence'));

INSERT INTO public.esg_factors
  (factor_key, factor_name, category, ghg_scope, unit, value, source, effective_date, version, approved, notes)
VALUES
  ('equivalence:kg_co2e_per_tree','CO₂e absorbed per tree per year','equivalence',NULL,'kg CO2e/tree/yr',21,
   'Illustrative equivalence (review)',DATE '2025-01-01',1,false,
   'Illustrative ONLY — expresses CO₂e saved as a "trees equivalent". NOT verified offsetting or actual trees planted. Review before approving.')
ON CONFLICT (factor_key, version) DO NOTHING;

-- 4. Customer ESG view: expose new customer-safe columns (still no audit/snapshot) ─
DROP VIEW IF EXISTS public.v_esg_results;
CREATE VIEW public.v_esg_results WITH (security_barrier = true) AS
SELECT
  r.id, r.client_id, c.client_name, r.period_month,
  r.co2e_saved_kg, r.residual_tco2e, r.water_saved_kl, r.electricity_saved_kwh,
  r.diesel_saved_l, r.km_avoided, r.trips_avoided, r.indicative_carbon_credits,
  r.total_nett_kg, r.treatment_emissions_by_method, r.transport_comparison, r.data_basis,
  r.trees_equivalent, r.t4g_water_kl, r.t4g_electricity_kwh, r.t4g_diesel_l, r.t4g_trips,
  COALESCE((
    SELECT bool_or(e.verified) FROM public.carbon_credit_evidence e
    WHERE e.client_id = r.client_id
      AND (e.period_month = r.period_month OR e.period_month IS NULL)
  ), false) AS credits_verified
FROM public.esg_results r
JOIN public.clients c ON c.id = r.client_id
WHERE r.approved = true
  AND r.client_id = public.current_user_client_id()
  AND public.current_user_access_mode() = 'all_sites';
GRANT SELECT ON public.v_esg_results TO authenticated;

-- 5. Per-site allocated ESG view ("allocated estimate based on site waste-share") ─
DROP VIEW IF EXISTS public.v_esg_site_allocated;
CREATE VIEW public.v_esg_site_allocated WITH (security_barrier = true) AS
WITH site_month AS (
  SELECT r.client_id, r.site_id,
         date_trunc('month', r.received_date)::date AS period_month,
         sum(r.nett_weight_kg) AS site_kg
  FROM public.received_waste_records r
  WHERE r.import_status = 'imported' AND r.received_date IS NOT NULL AND r.site_id IS NOT NULL
  GROUP BY r.client_id, r.site_id, date_trunc('month', r.received_date)
),
client_month AS (
  SELECT client_id, period_month, sum(site_kg) AS client_kg
  FROM site_month GROUP BY client_id, period_month
)
SELECT
  er.id   AS esg_result_id,
  er.client_id,
  c.client_name,
  sm.site_id,
  s.generator_facility,
  s.province,
  er.period_month,
  'allocated_estimate'::text AS basis,
  sm.site_kg AS site_nett_kg,
  CASE WHEN cm.client_kg > 0 THEN round((sm.site_kg / cm.client_kg)::numeric, 6) ELSE 0 END AS allocation_share,
  er.co2e_saved_kg         * sm.site_kg / NULLIF(cm.client_kg, 0) AS co2e_saved_kg,
  er.residual_tco2e        * sm.site_kg / NULLIF(cm.client_kg, 0) AS residual_tco2e,
  er.water_saved_kl        * sm.site_kg / NULLIF(cm.client_kg, 0) AS water_saved_kl,
  er.electricity_saved_kwh * sm.site_kg / NULLIF(cm.client_kg, 0) AS electricity_saved_kwh,
  er.diesel_saved_l        * sm.site_kg / NULLIF(cm.client_kg, 0) AS diesel_saved_l,
  er.km_avoided            * sm.site_kg / NULLIF(cm.client_kg, 0) AS km_avoided,
  er.trips_avoided         * sm.site_kg / NULLIF(cm.client_kg, 0) AS trips_avoided,
  er.trees_equivalent      * sm.site_kg / NULLIF(cm.client_kg, 0) AS trees_equivalent,
  er.t4g_water_kl          * sm.site_kg / NULLIF(cm.client_kg, 0) AS t4g_water_kl,
  er.t4g_electricity_kwh   * sm.site_kg / NULLIF(cm.client_kg, 0) AS t4g_electricity_kwh,
  er.t4g_diesel_l          * sm.site_kg / NULLIF(cm.client_kg, 0) AS t4g_diesel_l,
  er.t4g_trips             * sm.site_kg / NULLIF(cm.client_kg, 0) AS t4g_trips
FROM public.esg_results er
JOIN site_month   sm ON sm.client_id = er.client_id AND sm.period_month = er.period_month
JOIN client_month cm ON cm.client_id = er.client_id AND cm.period_month = er.period_month
JOIN public.clients c ON c.id = er.client_id
LEFT JOIN public.client_sites s ON s.id = sm.site_id
WHERE er.approved = true
  AND er.client_id = public.current_user_client_id()
  AND public.site_visible_to_current_user(sm.site_id);
GRANT SELECT ON public.v_esg_site_allocated TO authenticated;
