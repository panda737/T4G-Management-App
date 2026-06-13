-- ─────────────────────────────────────────────────────────────────────────────
-- Commercial Dashboard — waste-by-month aggregate view
--
-- The dashboard previously pulled every received_waste_records row (paged 1,000 at
-- a time) to compute the monthly trend + all-time total, which made the landing
-- page hang on large datasets. This pre-aggregates the data server-side so the
-- dashboard reads a small (~dozens of rows) result instead.
--
-- security_invoker = on → respects received_waste_records RLS (NOT is_customer()),
-- so customers never see it. The Commercial section is admin-gated at the route
-- level regardless. Mirrors v_esg_readiness (20260613150000_commercial_esg.sql).
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_commercial_waste_monthly
  WITH (security_invoker = on) AS
SELECT
  date_trunc('month', received_date)::date AS month,   -- NULL row for null dates → still counts toward total
  sum(nett_weight_kg)                       AS total_kg,
  count(*)                                  AS n
FROM public.received_waste_records
WHERE import_status = 'imported'
GROUP BY 1;

GRANT SELECT ON public.v_commercial_waste_monthly TO authenticated;
