-- ─────────────────────────────────────────────────────────────────────────────
-- Portal rebuild — Phase 1: explicit per-site access model
--
-- Replaces the single optional user_profiles.site_id with an explicit mode:
--   portal_access_mode = 'all_sites'      → every site of the login's client.
--   portal_access_mode = 'selected_sites' → ONLY sites in portal_user_sites.
--     • empty allow-list ⇒ the customer sees NO site data (not "all").
--
-- SECURITY MODEL (governs every customer read):
--   • Customers have NO direct SELECT on base tables — base-table RLS
--     (NOT public.is_customer()) denies it; the column-safe views are the ONLY path.
--   • Those views are SECURITY DEFINER *by necessity* (column-level security: the
--     base tables mix customer-safe and admin-only columns, and Postgres RLS is
--     row-level, not column-level, so an invoker view + customer row-policy would
--     leak admin columns). To make that safe we: (a) centralise the row filter in
--     ONE helper — site_visible_to_current_user() — so no view can forget it;
--     (b) always also filter client_id = current_user_client_id(); (c) mark the
--     views security_barrier; (d) keep zero customer base-table grants as the
--     backstop. A SQL self-test asserts a customer cannot read base tables and
--     sees only allowed sites.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Access mode on the login profile ────────────────────────────────────────
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS portal_access_mode text NOT NULL DEFAULT 'all_sites'
    CHECK (portal_access_mode IN ('all_sites','selected_sites'));

-- 2. Allow-list of sites for selected_sites logins ───────────────────────────
CREATE TABLE IF NOT EXISTS public.portal_user_sites (
  user_profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES public.client_sites(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_profile_id, site_id)
);
CREATE INDEX IF NOT EXISTS idx_pus_user ON public.portal_user_sites (user_profile_id);

ALTER TABLE public.portal_user_sites ENABLE ROW LEVEL SECURITY;

-- staff (admin/management) manage the allow-list…
CREATE POLICY "Manage portal_user_sites" ON public.portal_user_sites
  FOR ALL TO authenticated
  USING (public.can_write_commercial())
  WITH CHECK (public.can_write_commercial());
-- …and a customer may read only their own allow-list (needed by the SECURITY
-- INVOKER helpers below when they run inside the customer's session).
CREATE POLICY "Read own portal_user_sites" ON public.portal_user_sites
  FOR SELECT TO authenticated
  USING (user_profile_id IN (SELECT id FROM public.user_profiles WHERE auth_user_id = auth.uid()));

-- 3. Centralised visibility helpers (SECURITY INVOKER) ───────────────────────
CREATE OR REPLACE FUNCTION public.current_user_access_mode()
  RETURNS text LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT COALESCE(portal_access_mode, 'all_sites') FROM public.user_profiles
    WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_access_mode() FROM anon;

CREATE OR REPLACE FUNCTION public.current_user_site_ids()
  RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT pus.site_id FROM public.portal_user_sites pus
  JOIN public.user_profiles up ON up.id = pus.user_profile_id
  WHERE up.auth_user_id = auth.uid() AND up.is_active = true;
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_site_ids() FROM anon;

-- THE single rule every customer view applies for row-level site scoping.
CREATE OR REPLACE FUNCTION public.site_visible_to_current_user(p_site_id uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT CASE
    WHEN public.current_user_access_mode() = 'all_sites' THEN true
    ELSE p_site_id IN (SELECT public.current_user_site_ids())
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.site_visible_to_current_user(uuid) FROM anon;

-- 4. Backfill the old single-site logins into the new model ──────────────────
INSERT INTO public.portal_user_sites (user_profile_id, site_id)
SELECT id, site_id FROM public.user_profiles WHERE site_id IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE public.user_profiles
SET portal_access_mode = 'selected_sites'
WHERE site_id IS NOT NULL AND portal_access_mode <> 'selected_sites';

-- 5. Recreate the customer received-waste view on the centralised filter ─────
DROP VIEW IF EXISTS public.v_received_waste;
CREATE VIEW public.v_received_waste WITH (security_barrier = true) AS
SELECT
  r.id, r.client_id, c.client_name, r.site_id,
  s.generator_group, s.generator_facility, s.province,
  r.waste_manifest_tracking_number, r.received_date, r.collection_date,
  r.facility_receipt_date, r.received_date_source,
  r.waste_category_id, wc.waste_category_name, r.hcrw_super_category,
  r.container_type_id, ct.container_type_name,
  r.treatment_method_id, tm.treatment_method_name,
  r.containers_received, r.nett_weight_kg, r.reusable_boolean
FROM public.received_waste_records r
JOIN public.clients c ON c.id = r.client_id
LEFT JOIN public.client_sites s ON s.id = r.site_id
LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
LEFT JOIN public.container_types ct ON ct.id = r.container_type_id
LEFT JOIN public.treatment_methods tm ON tm.id = r.treatment_method_id
WHERE r.import_status = 'imported'
  AND r.client_id = public.current_user_client_id()
  AND public.site_visible_to_current_user(r.site_id);
GRANT SELECT ON public.v_received_waste TO authenticated;

-- 6. ESG view: account-level only; selected_sites logins see none (until the
--    Phase 2 allocated view). Uses access-mode instead of the old site_id check.
CREATE OR REPLACE VIEW public.v_esg_results WITH (security_barrier = true) AS
SELECT
  r.id, r.client_id, c.client_name, r.period_month,
  r.co2e_saved_kg, r.residual_tco2e, r.water_saved_kl, r.electricity_saved_kwh,
  r.diesel_saved_l, r.km_avoided, r.trips_avoided, r.indicative_carbon_credits,
  r.total_nett_kg, r.treatment_emissions_by_method, r.transport_comparison, r.data_basis,
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
