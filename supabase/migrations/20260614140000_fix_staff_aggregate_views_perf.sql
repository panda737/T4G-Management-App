-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: staff aggregate views time out for the `authenticated` role
--
-- v_commercial_waste_monthly + v_commercial_client_data_audit were security_invoker,
-- so Postgres evaluated the received_waste_records RLS policy (NOT is_customer())
-- while aggregating all ~61k rows. Under the authenticated role's statement_timeout
-- that aggregation is cancelled (SQLSTATE 57014) and the dashboard reads it as 0.
--
-- These are STAFF-ONLY aggregates (no per-customer row data: plant-wide monthly
-- totals / per-client counts). Make them SECURITY DEFINER to bypass the per-row
-- RLS cost, with a single InitPlan guard `(SELECT NOT public.is_customer())` so a
-- customer calling the endpoint directly still gets zero rows. The guard has no
-- column dependency → evaluated ONCE per query (fast), unlike a per-row RLS policy.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Monthly waste totals (dashboard trend + all-time total)
DROP VIEW IF EXISTS public.v_commercial_waste_monthly;
CREATE VIEW public.v_commercial_waste_monthly AS   -- SECURITY DEFINER (default)
SELECT
  date_trunc('month', received_date)::date AS month,
  sum(nett_weight_kg)                       AS total_kg,
  count(*)                                  AS n
FROM public.received_waste_records
WHERE import_status = 'imported'
  AND (SELECT NOT public.is_customer())     -- one-shot staff guard
GROUP BY 1;
GRANT SELECT ON public.v_commercial_waste_monthly TO authenticated;

-- 2. Per-client data audit
DROP VIEW IF EXISTS public.v_commercial_client_data_audit;
CREATE VIEW public.v_commercial_client_data_audit AS   -- SECURITY DEFINER (default)
SELECT
  c.id   AS client_id,
  c.client_name,
  (SELECT count(*) FROM public.client_sites s WHERE s.client_id = c.id)                        AS sites,
  (SELECT count(*) FROM public.client_sites s
     WHERE s.client_id = c.id AND coalesce(btrim(s.province), '') <> '')                        AS sites_with_province,
  (SELECT count(*) FROM public.received_waste_records r
     WHERE r.client_id = c.id AND r.import_status = 'imported')                                 AS waste_rows,
  (SELECT to_char(min(r.received_date), 'YYYY-MM') FROM public.received_waste_records r
     WHERE r.client_id = c.id AND r.import_status = 'imported' AND r.received_date IS NOT NULL)  AS month_min,
  (SELECT to_char(max(r.received_date), 'YYYY-MM') FROM public.received_waste_records r
     WHERE r.client_id = c.id AND r.import_status = 'imported' AND r.received_date IS NOT NULL)  AS month_max,
  (SELECT count(*) FROM public.esg_results e WHERE e.client_id = c.id)                          AS esg_total,
  (SELECT count(*) FROM public.esg_results e WHERE e.client_id = c.id AND e.approved)           AS esg_approved,
  (SELECT to_char(max(e.period_month), 'YYYY-MM') FROM public.esg_results e
     WHERE e.client_id = c.id AND e.approved)                                                   AS latest_approved
FROM public.clients c
WHERE (SELECT NOT public.is_customer());   -- one-shot staff guard
GRANT SELECT ON public.v_commercial_client_data_audit TO authenticated;
