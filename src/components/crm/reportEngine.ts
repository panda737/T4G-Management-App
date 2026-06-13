// ─────────────────────────────────────────────────────────────────────────────
// Report-builder-lite aggregation engine (Phase 7).
//
// A tiny, dependency-free grouping/aggregation core shared by the Commercial
// Dashboard and the Report Builder. It operates on already-flattened rows
// (Record<string, string | number | null>) so each "object" only has to provide
// a loader that normalises its table joins into flat rows + field metadata.
// ─────────────────────────────────────────────────────────────────────────────

export type Agg = 'count' | 'sum' | 'avg' | 'min' | 'max';

export type ReportValue = string | number | null;
export type ReportRow = Record<string, ReportValue>;

export interface FieldDef {
  key: string;
  label: string;
  type: 'dimension' | 'measure';
  /** Formatter for measure output (defaults to localized number). */
  format?: (n: number) => string;
}

export interface ReportFilter { key: string; value: string }

export interface ReportConfig {
  /** Dimension key to group rows by. */
  groupBy: string;
  /** Measure key to aggregate; null means a simple row count. */
  measure: string | null;
  agg: Agg;
  filters: ReportFilter[];
}

export interface GroupResult {
  key: string;
  /** Aggregated measure (or count when measure is null). */
  value: number;
  /** Number of underlying rows in the group. */
  count: number;
}

export const BLANK = '(blank)';

/** Apply equality filters (dimension key === value) to a row set. */
export function applyFilters(rows: ReportRow[], filters: ReportFilter[]): ReportRow[] {
  if (filters.length === 0) return rows;
  return rows.filter(r => filters.every(f => String(r[f.key] ?? BLANK) === f.value));
}

/** Distinct non-blank values for a dimension, sorted, for filter dropdowns. */
export function distinctValues(rows: ReportRow[], key: string): string[] {
  const set = new Set<string>();
  rows.forEach(r => {
    const v = String(r[key] ?? '').trim();
    if (v) set.add(v);
  });
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function reduce(vals: number[], agg: Agg, count: number): number {
  if (agg === 'count') return count;
  if (vals.length === 0) return 0;
  switch (agg) {
    case 'sum': return vals.reduce((s, v) => s + v, 0);
    case 'avg': return vals.reduce((s, v) => s + v, 0) / vals.length;
    case 'min': return Math.min(...vals);
    case 'max': return Math.max(...vals);
    default: return 0;
  }
}

/** Group + aggregate rows per the config. Results are sorted by value desc. */
export function runReport(rows: ReportRow[], cfg: ReportConfig): GroupResult[] {
  const filtered = applyFilters(rows, cfg.filters);
  const measureVals = new Map<string, number[]>();
  const counts = new Map<string, number>();

  for (const r of filtered) {
    const g = String(r[cfg.groupBy] ?? BLANK) || BLANK;
    counts.set(g, (counts.get(g) ?? 0) + 1);
    if (cfg.measure) {
      const raw = r[cfg.measure];
      const num = typeof raw === 'number' ? raw : Number(raw);
      const arr = measureVals.get(g) ?? [];
      if (!Number.isNaN(num)) arr.push(num);
      measureVals.set(g, arr);
    }
  }

  const results: GroupResult[] = [];
  for (const [g, count] of counts) {
    const value = cfg.measure ? reduce(measureVals.get(g) ?? [], cfg.agg, count) : count;
    results.push({ key: g, value, count });
  }
  results.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));
  return results;
}

/** Grand total across groups (sum/count) for the footer row. */
export function grandTotal(results: GroupResult[], agg: Agg): number {
  const totalCount = results.reduce((s, r) => s + r.count, 0);
  if (agg === 'count') return totalCount;
  if (agg === 'sum') return results.reduce((s, r) => s + r.value, 0);
  if (agg === 'avg') {
    const n = results.reduce((s, r) => s + r.count, 0);
    const weighted = results.reduce((s, r) => s + r.value * r.count, 0);
    return n > 0 ? weighted / n : 0;
  }
  if (agg === 'min') return results.length ? Math.min(...results.map(r => r.value)) : 0;
  if (agg === 'max') return results.length ? Math.max(...results.map(r => r.value)) : 0;
  return totalCount;
}

/**
 * Page through a Supabase query in chunks, bypassing the default 1000-row cap.
 * `build` receives a [from, to] range and must return a ranged query/promise.
 */
export async function fetchAll<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
  chunk = 1000,
): Promise<T[]> {
  const out: T[] = [];
  let from = 0;
  // hard stop at 100 pages (100k rows) to avoid runaway loops
  for (let page = 0; page < 100; page++) {
    const { data, error } = await build(from, from + chunk - 1);
    if (error || !data || data.length === 0) break;
    out.push(...data);
    if (data.length < chunk) break;
    from += chunk;
  }
  return out;
}

/** Build last-N month buckets (oldest→newest) keyed 'YYYY-MM' with short labels. */
export function monthBuckets(n: number, end = new Date()): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const d = new Date(end.getFullYear(), end.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`;
    const label = m.toLocaleDateString('en-ZA', { month: 'short', year: '2-digit' });
    out.push({ key, label });
  }
  return out;
}
