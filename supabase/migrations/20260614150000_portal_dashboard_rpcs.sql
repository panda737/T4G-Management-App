-- ─────────────────────────────────────────────────────────────────────────────
-- Portal rebuild — Phase 3: dashboard data API (security-definer RPCs)
--
-- Small, fast, date-ranged aggregates that power BOTH the customer dashboard and
-- the admin Portal Preview, without ever scanning full tables under a user session
-- (which times out under authenticated RLS — see 20260614140000).
--
-- Scope rules (enforced inside every RPC, can't be bypassed from the client):
--   • CUSTOMER caller  → locked to current_user_client_id() + their site allow-list
--                        (the p_client_id argument is IGNORED for customers).
--   • STAFF caller     → may pass any p_client_id (admin preview) and an optional
--                        p_site_id to preview a single site. Staff already read all
--                        commercial data via base RLS, so this is no new exposure.
-- SECURITY DEFINER → bypasses per-row RLS (fast); EXECUTE revoked from anon.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── scope helpers ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_effective_client_id(p_client_id uuid)
  RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE WHEN public.is_customer() THEN public.current_user_client_id() ELSE p_client_id END;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_effective_client_id(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.portal_site_allowed(p_row_site uuid, p_site_filter uuid)
  RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT CASE
    -- customers: never beyond their allow-list, but may narrow to one allowed site
    WHEN public.is_customer() THEN public.site_visible_to_current_user(p_row_site)
                                    AND (p_site_filter IS NULL OR p_row_site = p_site_filter)
    WHEN p_site_filter IS NULL THEN true
    ELSE p_row_site = p_site_filter
  END;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_site_allowed(uuid, uuid) FROM anon;

-- ── KPI summary ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_waste_summary(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(total_kg numeric, containers numeric, manifests bigint, rows bigint, latest_date date)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(sum(r.nett_weight_kg),0), coalesce(sum(r.containers_received),0),
         count(distinct nullif(r.waste_manifest_tracking_number,'')), count(*), max(r.received_date)
  FROM public.received_waste_records r
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end);
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_summary(uuid,date,date,uuid) FROM anon;

-- ── waste by month (trend) ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_waste_by_month(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(month date, kg numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT date_trunc('month', r.received_date)::date, sum(r.nett_weight_kg), count(*)
  FROM public.received_waste_records r
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end)
  GROUP BY 1 ORDER BY 1;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_by_month(uuid,date,date,uuid) FROM anon;

-- ── waste by site ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_waste_by_site(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(site_id uuid, generator_facility text, province text, kg numeric, containers numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.site_id, coalesce(s.generator_facility,'(Unassigned)'), coalesce(s.province,''),
         sum(r.nett_weight_kg), sum(r.containers_received), count(*)
  FROM public.received_waste_records r
  LEFT JOIN public.client_sites s ON s.id = r.site_id
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end)
  GROUP BY r.site_id, s.generator_facility, s.province
  ORDER BY sum(r.nett_weight_kg) DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_by_site(uuid,date,date,uuid) FROM anon;

-- ── waste by category ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_waste_by_category(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(category text, kg numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(wc.waste_category_name,'Uncategorised'), sum(r.nett_weight_kg), count(*)
  FROM public.received_waste_records r
  LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end)
  GROUP BY coalesce(wc.waste_category_name,'Uncategorised')
  ORDER BY sum(r.nett_weight_kg) DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_by_category(uuid,date,date,uuid) FROM anon;

-- ── treatment split (only returns named methods once data is tagged) ─────────
CREATE OR REPLACE FUNCTION public.portal_waste_by_treatment(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(treatment_method text, kg numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT tm.treatment_method_name, sum(r.nett_weight_kg), count(*)
  FROM public.received_waste_records r
  JOIN public.treatment_methods tm ON tm.id = r.treatment_method_id   -- INNER: excludes untagged rows
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end)
  GROUP BY tm.treatment_method_name
  ORDER BY sum(r.nett_weight_kg) DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_by_treatment(uuid,date,date,uuid) FROM anon;

-- ── recent manifests ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_recent_manifests(p_client_id uuid, p_limit integer DEFAULT 8, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(manifest text, received_date date, generator_facility text, category text, kg numeric)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT r.waste_manifest_tracking_number, r.received_date,
         coalesce(s.generator_facility,'(Unassigned)'), coalesce(wc.waste_category_name,'Uncategorised'), r.nett_weight_kg
  FROM public.received_waste_records r
  LEFT JOIN public.client_sites s ON s.id = r.site_id
  LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
  ORDER BY r.received_date DESC, r.created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit,8), 50));
$$;
REVOKE EXECUTE ON FUNCTION public.portal_recent_manifests(uuid,integer,uuid) FROM anon;

-- ── ESG summary (approved results, allocated to the visible sites by waste-share) ─
CREATE OR REPLACE FUNCTION public.portal_esg_summary(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(
    co2e_saved_kg numeric, residual_tco2e numeric, water_saved_kl numeric, electricity_saved_kwh numeric,
    diesel_saved_l numeric, km_avoided numeric, trips_avoided numeric, trees_equivalent numeric,
    t4g_water_kl numeric, t4g_electricity_kwh numeric, t4g_diesel_l numeric, t4g_trips numeric,
    total_nett_kg numeric, months integer)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH eff AS (SELECT public.portal_effective_client_id(p_client_id) AS cid),
  site_month AS (
    SELECT date_trunc('month', r.received_date)::date AS pm, sum(r.nett_weight_kg) AS visible_kg
    FROM public.received_waste_records r, eff
    WHERE r.import_status='imported' AND r.received_date IS NOT NULL AND r.site_id IS NOT NULL
      AND r.client_id = eff.cid AND public.portal_site_allowed(r.site_id, p_site_id)
    GROUP BY 1
  ),
  client_month AS (
    SELECT date_trunc('month', r.received_date)::date AS pm, sum(r.nett_weight_kg) AS client_kg
    FROM public.received_waste_records r, eff
    WHERE r.import_status='imported' AND r.received_date IS NOT NULL AND r.site_id IS NOT NULL
      AND r.client_id = eff.cid
    GROUP BY 1
  ),
  alloc AS (
    SELECT (sm.visible_kg / NULLIF(cm.client_kg,0)) AS share, er.*
    FROM public.esg_results er
    JOIN eff ON er.client_id = eff.cid
    JOIN site_month sm  ON sm.pm = er.period_month
    JOIN client_month cm ON cm.pm = er.period_month
    WHERE er.approved = true
      AND (p_start IS NULL OR er.period_month >= date_trunc('month', p_start)::date)
      AND (p_end   IS NULL OR er.period_month <= p_end)
  )
  SELECT sum(co2e_saved_kg*share), sum(residual_tco2e*share), sum(water_saved_kl*share), sum(electricity_saved_kwh*share),
         sum(diesel_saved_l*share), sum(km_avoided*share), sum(trips_avoided*share), sum(trees_equivalent*share),
         sum(t4g_water_kl*share), sum(t4g_electricity_kwh*share), sum(t4g_diesel_l*share), sum(t4g_trips*share),
         sum(total_nett_kg*share), count(distinct period_month)::int
  FROM alloc;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_esg_summary(uuid,date,date,uuid) FROM anon;
