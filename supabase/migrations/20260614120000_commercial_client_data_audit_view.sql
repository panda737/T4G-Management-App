-- ─────────────────────────────────────────────────────────────────────────────
-- Portal Data Audit — per-client aggregate view (Phase 0 follow-up)
--
-- The audit page must NOT page every received_waste_records row (that hangs on
-- large datasets, same problem v_commercial_waste_monthly fixed for the
-- dashboard). This pre-aggregates per client server-side so the page reads one
-- small result.
--
-- security_invoker = on → respects received_waste_records RLS (NOT is_customer),
-- so only staff/admin see it. The Commercial section is admin-gated anyway.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE VIEW public.v_commercial_client_data_audit
  WITH (security_invoker = on) AS
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
FROM public.clients c;

GRANT SELECT ON public.v_commercial_client_data_audit TO authenticated;
