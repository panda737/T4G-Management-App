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

// ─────────────────────────────────────────────────────────────────────────────
// Sub-page hooks (Waste Generated / Site / Category / Manifest / Monthly Report).
// All read server-side aggregate/paginated RPCs — no 1000-row cap, no full-table
// scan under the user session, and the same client + site allow-list scope.
// ─────────────────────────────────────────────────────────────────────────────

export interface CategoryRow { category: string; hcrw_super: string; kg: number; containers: number; rows: number }
export interface ContainerRow { container_type: string; containers: number; kg: number; rows: number }
export interface SiteBreakdownRow {
  site_id: string | null; generator_facility: string; generator_group: string; province: string;
  kg: number; containers: number; manifests: number; last_received: string | null; top_category: string;
}
export interface ManifestHistRow {
  tracking: string; received_date: string | null; collection_date: string | null;
  generator_facility: string; categories: string; lines: number; containers: number; kg: number;
}
export interface WasteDetailRow {
  id: string; received_date: string | null; collection_date: string | null; received_date_source: string | null;
  generator_facility: string; waste_category: string; hcrw_super: string; container_type: string;
  containers: number; nett_kg: number; reusable: boolean; tracking: string;
}

function mapCategory(r: Record<string, unknown>): CategoryRow {
  return { category: String(r.category ?? ''), hcrw_super: String(r.hcrw_super ?? ''), kg: n(r.kg), containers: n(r.containers), rows: n(r.rows) };
}
function mapContainer(r: Record<string, unknown>): ContainerRow {
  return { container_type: String(r.container_type ?? ''), containers: n(r.containers), kg: n(r.kg), rows: n(r.rows) };
}

// ── Waste Generated page: month + YTD KPIs and YTD breakdowns ─────────────────
export interface ReceivedWasteData {
  monthKg: number; ytdKg: number; monthContainers: number; latest: string | null;
  byCategory: CategoryRow[]; byContainer: ContainerRow[]; bySite: SiteRow[];
  loading: boolean; error: string;
}

export function useReceivedWaste(clientId: string | null, siteId: string | null): ReceivedWasteData {
  const [data, setData] = useState<ReceivedWasteData>({
    monthKg: 0, ytdKg: 0, monthContainers: 0, latest: null, byCategory: [], byContainer: [], bySite: [], loading: true, error: '',
  });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setData(d => ({ ...d, loading: true, error: '' }));
      try {
        const month = periodRange('month'), ytd = periodRange('ytd');
        const [mR, yR, catR, conR, siteR] = await Promise.all([
          supabase.rpc('portal_waste_summary', { p_client_id: clientId, p_start: month.start, p_end: month.end, p_site_id: siteId }),
          supabase.rpc('portal_waste_summary', { p_client_id: clientId, p_start: ytd.start, p_end: ytd.end, p_site_id: siteId }),
          supabase.rpc('portal_waste_by_category', { p_client_id: clientId, p_start: ytd.start, p_end: ytd.end, p_site_id: siteId }),
          supabase.rpc('portal_waste_by_container', { p_client_id: clientId, p_start: ytd.start, p_end: ytd.end, p_site_id: siteId }),
          supabase.rpc('portal_waste_by_site', { p_client_id: clientId, p_start: ytd.start, p_end: ytd.end, p_site_id: siteId }),
        ]);
        if (cancelled) return;
        const firstErr = [mR, yR, catR, conR, siteR].find(r => r.error)?.error;
        const m = (mR.data?.[0] ?? null) as Record<string, unknown> | null;
        const y = (yR.data?.[0] ?? null) as Record<string, unknown> | null;
        setData({
          loading: false, error: firstErr?.message ?? '',
          monthKg: n(m?.total_kg), monthContainers: n(m?.containers),
          ytdKg: n(y?.total_kg), latest: (y?.latest_date as string) ?? null,
          byCategory: ((catR.data ?? []) as Record<string, unknown>[]).map(mapCategory),
          byContainer: ((conR.data ?? []) as Record<string, unknown>[]).map(mapContainer),
          bySite: ((siteR.data ?? []) as Record<string, unknown>[]).map(r => ({ site_id: (r.site_id as string) ?? null, generator_facility: String(r.generator_facility ?? ''), province: String(r.province ?? ''), kg: n(r.kg), containers: n(r.containers), rows: n(r.rows) })),
        });
      } catch (err) {
        if (!cancelled) setData(d => ({ ...d, loading: false, error: err instanceof Error ? err.message : 'Failed to load' }));
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId]);
  return data;
}

// ── Category Breakdown page ───────────────────────────────────────────────────
export function useCategoryBreakdown(clientId: string | null, siteId: string | null, start: string | null, end: string | null) {
  const [state, setState] = useState<{ rows: CategoryRow[]; loading: boolean; error: string }>({ rows: [], loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState(s => ({ ...s, loading: true, error: '' }));
      try {
        const { data, error } = await supabase.rpc('portal_waste_by_category', { p_client_id: clientId, p_start: start, p_end: end, p_site_id: siteId });
        if (cancelled) return;
        setState({ rows: ((data ?? []) as Record<string, unknown>[]).map(mapCategory), loading: false, error: error?.message ?? '' });
      } catch (err) {
        if (!cancelled) setState({ rows: [], loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId, start, end]);
  return state;
}

// ── Site Breakdown page ───────────────────────────────────────────────────────
export function useSiteBreakdown(clientId: string | null, siteId: string | null, start: string | null, end: string | null) {
  const [state, setState] = useState<{ rows: SiteBreakdownRow[]; loading: boolean; error: string }>({ rows: [], loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState(s => ({ ...s, loading: true, error: '' }));
      try {
        const { data, error } = await supabase.rpc('portal_site_breakdown', { p_client_id: clientId, p_start: start, p_end: end, p_site_id: siteId });
        if (cancelled) return;
        setState({
          rows: ((data ?? []) as Record<string, unknown>[]).map(r => ({
            site_id: (r.site_id as string) ?? null, generator_facility: String(r.generator_facility ?? ''),
            generator_group: String(r.generator_group ?? ''), province: String(r.province ?? ''),
            kg: n(r.kg), containers: n(r.containers), manifests: n(r.manifests),
            last_received: (r.last_received as string) ?? null, top_category: String(r.top_category ?? '—'),
          })),
          loading: false, error: error?.message ?? '',
        });
      } catch (err) {
        if (!cancelled) setState({ rows: [], loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId, start, end]);
  return state;
}

// ── Manifest History page (server search + paginated) ─────────────────────────
export function useManifests(clientId: string | null, siteId: string | null, search: string, limit: number, offset: number) {
  const [state, setState] = useState<{ rows: ManifestHistRow[]; total: number; loading: boolean; error: string }>({ rows: [], total: 0, loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState(s => ({ ...s, loading: true, error: '' }));
      try {
        const { data, error } = await supabase.rpc('portal_manifests', { p_client_id: clientId, p_start: null, p_end: null, p_site_id: siteId, p_search: search || null, p_limit: limit, p_offset: offset });
        if (cancelled) return;
        const arr = (data ?? []) as Record<string, unknown>[];
        setState({
          rows: arr.map(r => ({
            tracking: String(r.tracking ?? ''), received_date: (r.received_date as string) ?? null, collection_date: (r.collection_date as string) ?? null,
            generator_facility: String(r.generator_facility ?? ''), categories: String(r.categories ?? ''), lines: n(r.lines), containers: n(r.containers), kg: n(r.kg),
          })),
          total: n(arr[0]?.total_count), loading: false, error: error?.message ?? '',
        });
      } catch (err) {
        if (!cancelled) setState({ rows: [], total: 0, loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId, search, limit, offset]);
  return state;
}

// ── Monthly Report page (filtered detail rows + windowed totals) ──────────────
export interface ReportFilters { year: string; month: string; siteId: string; category: string; container: string }

function mapDetail(r: Record<string, unknown>): WasteDetailRow {
  return {
    id: r.id as string, received_date: (r.received_date as string) ?? null, collection_date: (r.collection_date as string) ?? null,
    received_date_source: (r.received_date_source as string) ?? null, generator_facility: String(r.generator_facility ?? ''),
    waste_category: String(r.waste_category ?? ''), hcrw_super: String(r.hcrw_super ?? ''), container_type: String(r.container_type ?? ''),
    containers: n(r.containers), nett_kg: n(r.nett_kg), reusable: Boolean(r.reusable), tracking: String(r.tracking ?? ''),
  };
}

function reportArgs(clientId: string | null, scopeSiteId: string | null, f: ReportFilters) {
  return {
    p_client_id: clientId,
    p_year: f.year ? Number(f.year) : null,
    p_month: f.month ? Number(f.month) : null,
    p_site_id: f.siteId || scopeSiteId || null,
    p_category: f.category || null,
    p_container: f.container || null,
  };
}

export function useReportRows(clientId: string | null, scopeSiteId: string | null, f: ReportFilters, limit: number, offset: number) {
  const [state, setState] = useState<{ rows: WasteDetailRow[]; total: number; totalKg: number; totalContainers: number; loading: boolean; error: string }>({ rows: [], total: 0, totalKg: 0, totalContainers: 0, loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState(s => ({ ...s, loading: true, error: '' }));
      try {
        const { data, error } = await supabase.rpc('portal_waste_rows', { ...reportArgs(clientId, scopeSiteId, f), p_limit: limit, p_offset: offset });
        if (cancelled) return;
        const arr = (data ?? []) as Record<string, unknown>[];
        setState({
          rows: arr.map(mapDetail),
          total: n(arr[0]?.total_count), totalKg: n(arr[0]?.total_kg), totalContainers: n(arr[0]?.total_containers),
          loading: false, error: error?.message ?? '',
        });
      } catch (err) {
        if (!cancelled) setState({ rows: [], total: 0, totalKg: 0, totalContainers: 0, loading: false, error: err instanceof Error ? err.message : 'Failed to load' });
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, scopeSiteId, f.year, f.month, f.siteId, f.category, f.container, limit, offset]);
  return state;
}

/** Pages through the same scoped RPC to collect ALL filtered rows for a CSV export. */
export async function fetchAllReportRows(clientId: string | null, scopeSiteId: string | null, f: ReportFilters): Promise<WasteDetailRow[]> {
  const out: WasteDetailRow[] = [];
  const LIMIT = 1000;
  let offset = 0, total = Infinity;
  while (out.length < total) {
    const { data, error } = await supabase.rpc('portal_waste_rows', { ...reportArgs(clientId, scopeSiteId, f), p_limit: LIMIT, p_offset: offset });
    if (error) throw new Error(error.message);
    const arr = (data ?? []) as Record<string, unknown>[];
    if (arr.length === 0) break;
    total = n(arr[0].total_count) || arr.length;
    out.push(...arr.map(mapDetail));
    if (arr.length < LIMIT) break;
    offset += LIMIT;
  }
  return out;
}

function mapManifest(r: Record<string, unknown>): ManifestHistRow {
  return {
    tracking: String(r.tracking ?? ''), received_date: (r.received_date as string) ?? null, collection_date: (r.collection_date as string) ?? null,
    generator_facility: String(r.generator_facility ?? ''), categories: String(r.categories ?? ''), lines: n(r.lines), containers: n(r.containers), kg: n(r.kg),
  };
}

/** Pages through portal_manifests (capped 500/call) to collect ALL manifests for a CSV export. */
export async function fetchAllManifests(clientId: string | null, siteId: string | null, search: string): Promise<ManifestHistRow[]> {
  const out: ManifestHistRow[] = [];
  const LIMIT = 500;
  let offset = 0, total = Infinity;
  while (out.length < total) {
    const { data, error } = await supabase.rpc('portal_manifests', { p_client_id: clientId, p_start: null, p_end: null, p_site_id: siteId, p_search: search || null, p_limit: LIMIT, p_offset: offset });
    if (error) throw new Error(error.message);
    const arr = (data ?? []) as Record<string, unknown>[];
    if (arr.length === 0) break;
    total = n(arr[0].total_count) || arr.length;
    out.push(...arr.map(mapManifest));
    if (arr.length < LIMIT) break;
    offset += LIMIT;
  }
  return out;
}

// ── Filter options for the Monthly Report (years / sites / categories / containers) ─
export interface ReportFilterOptions { years: string[]; sites: { id: string; label: string }[]; categories: string[]; containers: string[]; loading: boolean }

export function useReportFilters(clientId: string | null, siteId: string | null): ReportFilterOptions {
  const [state, setState] = useState<ReportFilterOptions>({ years: [], sites: [], categories: [], containers: [], loading: true });
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const args = { p_client_id: clientId, p_start: null, p_end: null, p_site_id: siteId };
        const [monR, siteR, catR, conR] = await Promise.all([
          supabase.rpc('portal_waste_by_month', args),
          supabase.rpc('portal_waste_by_site', args),
          supabase.rpc('portal_waste_by_category', args),
          supabase.rpc('portal_waste_by_container', args),
        ]);
        if (cancelled) return;
        const years = Array.from(new Set(((monR.data ?? []) as Record<string, unknown>[]).map(r => String(r.month).slice(0, 4)).filter(Boolean))).sort().reverse();
        setState({
          years,
          sites: ((siteR.data ?? []) as Record<string, unknown>[]).filter(r => r.site_id).map(r => ({ id: r.site_id as string, label: String(r.generator_facility ?? '') })),
          categories: ((catR.data ?? []) as Record<string, unknown>[]).map(r => String(r.category ?? '')).filter(Boolean),
          containers: ((conR.data ?? []) as Record<string, unknown>[]).map(r => String(r.container_type ?? '')).filter(Boolean),
          loading: false,
        });
      } catch {
        if (!cancelled) setState(s => ({ ...s, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [clientId, siteId]);
  return state;
}
