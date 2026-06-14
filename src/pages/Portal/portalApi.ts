import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// ─────────────────────────────────────────────────────────────────────────────
// Portal dashboard data hooks — call the security-definer RPCs (small/fast/scoped).
// For a real customer pass clientId=null (the RPC locks to their own client + site
// allow-list). For admin Portal Preview pass the selected clientId (+ optional siteId).
// All loaders resolve loading in `finally` so the UI can never hang.
// ─────────────────────────────────────────────────────────────────────────────

export type PeriodKey = 'month' | 'ytd' | '12m' | 'all';

export interface DashSummary { total_kg: number; containers: number; manifests: number; rows: number; latest_date: string | null }
export interface MonthPoint { month: string; kg: number }
export interface SiteRow { site_id: string | null; generator_facility: string; province: string; kg: number; containers: number; rows: number }
export interface CatRow { category: string; kg: number }
export interface TreatRow { treatment_method: string; kg: number }
export interface ManifestRow { manifest: string; received_date: string; generator_facility: string; category: string; kg: number }
export interface EsgSummary {
  co2e_saved_kg: number | null; residual_tco2e: number | null; water_saved_kl: number | null;
  electricity_saved_kwh: number | null; diesel_saved_l: number | null; km_avoided: number | null;
  trips_avoided: number | null; trees_equivalent: number | null; t4g_water_kl: number | null;
  t4g_electricity_kwh: number | null; t4g_diesel_l: number | null; t4g_trips: number | null;
  total_nett_kg: number | null; months: number;
}

const n = (v: unknown) => Number(v) || 0;
const nn = (v: unknown) => (v == null ? null : Number(v));

export function periodRange(key: PeriodKey, now = new Date()): { start: string | null; end: string | null; label: string } {
  const y = now.getFullYear(), m = now.getMonth();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const end = iso(now);
  if (key === 'month') return { start: iso(new Date(y, m, 1)), end, label: 'This month' };
  if (key === 'ytd') return { start: iso(new Date(y, 0, 1)), end, label: 'Year to date' };
  if (key === '12m') return { start: iso(new Date(y, m - 11, 1)), end, label: 'Last 12 months' };
  return { start: null, end: null, label: 'All time' };
}

/** The visible sites for the site-filter dropdown (all-time, respects scope). */
export function usePortalSites(clientId: string | null) {
  const [sites, setSites] = useState<{ id: string; label: string }[]>([]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.rpc('portal_waste_by_site', { p_client_id: clientId, p_start: null, p_end: null, p_site_id: null });
      if (cancelled) return;
      setSites(((data ?? []) as SiteRow[])
        .filter(r => r.site_id)
        .map(r => ({ id: r.site_id as string, label: r.generator_facility })));
    })();
    return () => { cancelled = true; };
  }, [clientId]);
  return sites;
}

export interface DashboardData {
  summary: DashSummary | null;
  byMonth: MonthPoint[];
  bySite: SiteRow[];
  byCategory: CatRow[];
  byTreatment: TreatRow[];
  recent: ManifestRow[];
  esg: EsgSummary | null;
  loading: boolean;
  error: string;
}

export function usePortalDashboard(
  clientId: string | null, siteId: string | null,
  start: string | null, end: string | null, trendStart: string | null,
): DashboardData {
  const [data, setData] = useState<DashboardData>({
    summary: null, byMonth: [], bySite: [], byCategory: [], byTreatment: [], recent: [], esg: null, loading: true, error: '',
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(d => ({ ...d, loading: true, error: '' }));
      try {
        const args = { p_client_id: clientId, p_start: start, p_end: end, p_site_id: siteId };
        const [sumR, monR, siteR, catR, treatR, recR, esgR] = await Promise.all([
          supabase.rpc('portal_waste_summary', args),
          supabase.rpc('portal_waste_by_month', { p_client_id: clientId, p_start: trendStart, p_end: end, p_site_id: siteId }),
          supabase.rpc('portal_waste_by_site', args),
          supabase.rpc('portal_waste_by_category', args),
          supabase.rpc('portal_waste_by_treatment', args),
          supabase.rpc('portal_recent_manifests', { p_client_id: clientId, p_limit: 8, p_site_id: siteId }),
          supabase.rpc('portal_esg_summary', args),
        ]);
        if (cancelled) return;
        const firstErr = [sumR, monR, siteR, catR, treatR, recR, esgR].find(r => r.error)?.error;
        const s = (sumR.data?.[0] ?? null) as Record<string, unknown> | null;
        const e = (esgR.data?.[0] ?? null) as Record<string, unknown> | null;
        setData({
          loading: false,
          error: firstErr?.message ?? '',
          summary: s ? { total_kg: n(s.total_kg), containers: n(s.containers), manifests: n(s.manifests), rows: n(s.rows), latest_date: (s.latest_date as string) ?? null } : null,
          byMonth: ((monR.data ?? []) as Record<string, unknown>[]).map(r => ({ month: String(r.month).slice(0, 7), kg: n(r.kg) })),
          bySite: ((siteR.data ?? []) as Record<string, unknown>[]).map(r => ({ site_id: (r.site_id as string) ?? null, generator_facility: String(r.generator_facility ?? ''), province: String(r.province ?? ''), kg: n(r.kg), containers: n(r.containers), rows: n(r.rows) })),
          byCategory: ((catR.data ?? []) as Record<string, unknown>[]).map(r => ({ category: String(r.category ?? ''), kg: n(r.kg) })),
          byTreatment: ((treatR.data ?? []) as Record<string, unknown>[]).map(r => ({ treatment_method: String(r.treatment_method ?? ''), kg: n(r.kg) })),
          recent: ((recR.data ?? []) as Record<string, unknown>[]).map(r => ({ manifest: String(r.manifest ?? ''), received_date: (r.received_date as string) ?? '', generator_facility: String(r.generator_facility ?? ''), category: String(r.category ?? ''), kg: n(r.kg) })),
          esg: e ? {
            co2e_saved_kg: nn(e.co2e_saved_kg), residual_tco2e: nn(e.residual_tco2e), water_saved_kl: nn(e.water_saved_kl),
            electricity_saved_kwh: nn(e.electricity_saved_kwh), diesel_saved_l: nn(e.diesel_saved_l), km_avoided: nn(e.km_avoided),
            trips_avoided: nn(e.trips_avoided), trees_equivalent: nn(e.trees_equivalent), t4g_water_kl: nn(e.t4g_water_kl),
            t4g_electricity_kwh: nn(e.t4g_electricity_kwh), t4g_diesel_l: nn(e.t4g_diesel_l), t4g_trips: nn(e.t4g_trips),
            total_nett_kg: nn(e.total_nett_kg), months: n(e.months),
          } : null,
        });
      } catch (err) {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: err instanceof Error ? err.message : 'Failed to load dashboard' }));
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId, start, end, trendStart]);

  return data;
}
