-- ─────────────────────────────────────────────────────────────────────────────
-- Two-tier portal access: account-level OR site-level customer logins
--
-- A customer login is scoped by user_profiles.client_id (the whole account).
-- This adds an optional user_profiles.site_id: when set, the login is restricted
-- to that single generator facility (e.g. a "Montana" login under Netcare sees
-- only Montana's received-waste, not all of Netcare).
--
-- ESG stays account-level (esg_results has no per-site breakdown), so a
-- site-scoped login sees no ESG rows; the portal shows a "per-site coming soon"
-- note for those logins.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Optional site link on the login profile.
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS site_id uuid REFERENCES public.client_sites(id) ON DELETE SET NULL;

-- 2. Resolve the active user's scoped site (null = whole account). Mirrors
--    current_user_client_id(): SECURITY INVOKER so it reads auth.uid() even when
--    called inside the definer customer views.
CREATE OR REPLACE FUNCTION public.current_user_site_id()
  RETURNS uuid LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
  SELECT site_id FROM public.user_profiles
    WHERE auth_user_id = auth.uid() AND is_active = true LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.current_user_site_id() FROM anon;

-- 3. Received-waste view: also filter to the scoped site when one is set.
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
  AND r.client_id = public.current_user_client_id()
  AND (public.current_user_site_id() IS NULL OR r.site_id = public.current_user_site_id());

GRANT SELECT ON public.v_received_waste TO authenticated;

-- 4. ESG view: account-level only. Site-scoped logins (site_id set) see nothing.
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
  AND r.client_id = public.current_user_client_id()
  AND public.current_user_site_id() IS NULL;
GRANT SELECT ON public.v_esg_results TO authenticated;
