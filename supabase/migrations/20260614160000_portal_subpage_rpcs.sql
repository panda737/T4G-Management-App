-- ─────────────────────────────────────────────────────────────────────────────
-- Portal rebuild — Phase 3b: sub-page data API (security-definer RPCs)
--
-- The portal sub-pages (Received Waste, Monthly Report, Site Breakdown, Waste
-- Categories, Manifest History) used to pull raw received_waste_records to the
-- browser and aggregate in JS. PostgREST caps that at 1000 rows, so every total
-- was UNDER-COUNTED for any account > 1000 rows (e.g. Lenmed report showed
-- "1000 records", Manifest History showed 633 vs the real 2162).
--
-- These RPCs aggregate / paginate server-side, reusing the same scope guards as
-- the dashboard RPCs (portal_effective_client_id + portal_site_allowed), so they
-- are fast (SECURITY DEFINER bypasses per-row RLS) and respect the customer's
-- client + site allow-list. EXECUTE revoked from anon.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── waste by container type (Received Waste page + report filter options) ─────
CREATE OR REPLACE FUNCTION public.portal_waste_by_container(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(container_type text, containers numeric, kg numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(ct.container_type_name,'Unknown'), sum(r.containers_received), sum(r.nett_weight_kg), count(*)
  FROM public.received_waste_records r
  LEFT JOIN public.container_types ct ON ct.id = r.container_type_id
  WHERE r.import_status='imported' AND r.received_date IS NOT NULL
    AND r.client_id = public.portal_effective_client_id(p_client_id)
    AND public.portal_site_allowed(r.site_id, p_site_id)
    AND (p_start IS NULL OR r.received_date >= p_start)
    AND (p_end   IS NULL OR r.received_date <= p_end)
  GROUP BY coalesce(ct.container_type_name,'Unknown')
  ORDER BY sum(r.containers_received) DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_by_container(uuid,date,date,uuid) FROM anon;

-- ── waste by category (richer: + hcrw super + containers) ─────────────────────
-- Replaces the lean dashboard version; the dashboard hook reads .category/.kg by
-- name so the extra columns are harmless there.
DROP FUNCTION IF EXISTS public.portal_waste_by_category(uuid,date,date,uuid);
CREATE FUNCTION public.portal_waste_by_category(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(category text, hcrw_super text, kg numeric, containers numeric, rows bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT coalesce(wc.waste_category_name,'Uncategorised'),
         coalesce(max(r.hcrw_super_category),''),
         sum(r.nett_weight_kg), sum(r.containers_received), count(*)
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

-- ── site breakdown (per facility: + group, manifests, last received, top cat) ─
CREATE OR REPLACE FUNCTION public.portal_site_breakdown(p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL)
  RETURNS TABLE(site_id uuid, generator_facility text, generator_group text, province text,
                kg numeric, containers numeric, manifests bigint, last_received date, top_category text)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH base AS (
    SELECT r.site_id, r.nett_weight_kg, r.containers_received, r.waste_manifest_tracking_number,
           r.received_date, r.waste_category_id
    FROM public.received_waste_records r
    WHERE r.import_status='imported' AND r.received_date IS NOT NULL
      AND r.client_id = public.portal_effective_client_id(p_client_id)
      AND public.portal_site_allowed(r.site_id, p_site_id)
      AND (p_start IS NULL OR r.received_date >= p_start)
      AND (p_end   IS NULL OR r.received_date <= p_end)
  ),
  agg AS (
    SELECT b.site_id,
           sum(b.nett_weight_kg) AS kg, sum(b.containers_received) AS containers,
           count(distinct nullif(b.waste_manifest_tracking_number,'')) AS manifests,
           max(b.received_date) AS last_received
    FROM base b GROUP BY b.site_id
  ),
  topcat AS (
    SELECT site_id, waste_category_id,
           row_number() OVER (PARTITION BY site_id ORDER BY sum(nett_weight_kg) DESC) AS rn
    FROM base GROUP BY site_id, waste_category_id
  )
  SELECT a.site_id, coalesce(s.generator_facility,'(Unassigned)'), coalesce(s.generator_group,''),
         coalesce(s.province,''), a.kg, a.containers, a.manifests, a.last_received,
         coalesce(wc.waste_category_name,'—')
  FROM agg a
  LEFT JOIN public.client_sites s ON s.id = a.site_id
  LEFT JOIN topcat t ON t.site_id IS NOT DISTINCT FROM a.site_id AND t.rn = 1
  LEFT JOIN public.waste_categories wc ON wc.id = t.waste_category_id
  ORDER BY a.kg DESC;
$$;
REVOKE EXECUTE ON FUNCTION public.portal_site_breakdown(uuid,date,date,uuid) FROM anon;

-- ── manifest history (grouped by tracking #, server search + pagination) ──────
CREATE OR REPLACE FUNCTION public.portal_manifests(
  p_client_id uuid, p_start date, p_end date, p_site_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL, p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
  RETURNS TABLE(tracking text, received_date date, collection_date date, generator_facility text,
                categories text, lines bigint, containers numeric, kg numeric, total_count bigint)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH base AS (
    SELECT coalesce(nullif(r.waste_manifest_tracking_number,''),'(none)') AS tracking,
           r.received_date, r.collection_date, r.nett_weight_kg, r.containers_received,
           wc.waste_category_name, s.generator_facility
    FROM public.received_waste_records r
    LEFT JOIN public.client_sites s ON s.id = r.site_id
    LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
    WHERE r.import_status='imported' AND r.received_date IS NOT NULL
      AND r.client_id = public.portal_effective_client_id(p_client_id)
      AND public.portal_site_allowed(r.site_id, p_site_id)
      AND (p_start IS NULL OR r.received_date >= p_start)
      AND (p_end   IS NULL OR r.received_date <= p_end)
  ),
  grp AS (
    SELECT tracking,
           max(received_date)   AS received_date,
           max(collection_date) AS collection_date,
           min(coalesce(generator_facility,'—')) AS generator_facility,
           string_agg(distinct coalesce(waste_category_name,'—'), ', ' ORDER BY coalesce(waste_category_name,'—')) AS categories,
           count(*) AS lines, sum(containers_received) AS containers, sum(nett_weight_kg) AS kg
    FROM base GROUP BY tracking
  ),
  filt AS (
    SELECT * FROM grp
    WHERE p_search IS NULL OR p_search = ''
       OR tracking ILIKE '%'||p_search||'%'
       OR generator_facility ILIKE '%'||p_search||'%'
  )
  SELECT tracking, received_date, collection_date, generator_facility, categories, lines, containers, kg,
         count(*) OVER () AS total_count
  FROM filt
  ORDER BY received_date DESC NULLS LAST, tracking DESC
  LIMIT greatest(1, least(coalesce(p_limit,100), 500)) OFFSET greatest(0, coalesce(p_offset,0));
$$;
REVOKE EXECUTE ON FUNCTION public.portal_manifests(uuid,date,date,uuid,text,integer,integer) FROM anon;

-- ── detail rows (Monthly Report table: filters + pagination + windowed totals) ─
CREATE OR REPLACE FUNCTION public.portal_waste_rows(
  p_client_id uuid, p_year integer DEFAULT NULL, p_month integer DEFAULT NULL,
  p_site_id uuid DEFAULT NULL, p_category text DEFAULT NULL, p_container text DEFAULT NULL,
  p_limit integer DEFAULT 100, p_offset integer DEFAULT 0)
  RETURNS TABLE(
    id uuid, received_date date, collection_date date, received_date_source text,
    generator_facility text, waste_category text, hcrw_super text, container_type text,
    containers numeric, nett_kg numeric, reusable boolean, tracking text,
    total_count bigint, total_kg numeric, total_containers numeric)
  LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH base AS (
    SELECT r.id, r.received_date, r.collection_date, r.received_date_source,
           coalesce(s.generator_facility,'(Unassigned)') AS generator_facility,
           coalesce(wc.waste_category_name,'Uncategorised') AS waste_category,
           coalesce(r.hcrw_super_category,'') AS hcrw_super,
           coalesce(ct.container_type_name,'') AS container_type,
           r.containers_received, r.nett_weight_kg, r.reusable_boolean,
           coalesce(r.waste_manifest_tracking_number,'') AS tracking, r.created_at
    FROM public.received_waste_records r
    LEFT JOIN public.client_sites s ON s.id = r.site_id
    LEFT JOIN public.waste_categories wc ON wc.id = r.waste_category_id
    LEFT JOIN public.container_types ct ON ct.id = r.container_type_id
    WHERE r.import_status='imported' AND r.received_date IS NOT NULL
      AND r.client_id = public.portal_effective_client_id(p_client_id)
      AND public.portal_site_allowed(r.site_id, p_site_id)
      AND (p_year  IS NULL OR extract(year  from r.received_date) = p_year)
      AND (p_month IS NULL OR extract(month from r.received_date) = p_month)
      AND (p_category  IS NULL OR p_category  = '' OR coalesce(wc.waste_category_name,'Uncategorised') = p_category)
      AND (p_container IS NULL OR p_container = '' OR coalesce(ct.container_type_name,'') = p_container)
  )
  SELECT id, received_date, collection_date, received_date_source, generator_facility, waste_category,
         hcrw_super, container_type, containers_received, nett_weight_kg, reusable_boolean, tracking,
         count(*) OVER ()                  AS total_count,
         sum(nett_weight_kg) OVER ()       AS total_kg,
         sum(containers_received) OVER ()  AS total_containers
  FROM base
  ORDER BY received_date DESC, created_at DESC
  LIMIT greatest(1, least(coalesce(p_limit,100), 1000)) OFFSET greatest(0, coalesce(p_offset,0));
$$;
REVOKE EXECUTE ON FUNCTION public.portal_waste_rows(uuid,integer,integer,uuid,text,text,integer,integer) FROM anon;
