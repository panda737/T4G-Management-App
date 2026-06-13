import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, X, BarChart3, Table2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { ANALYTICS_TABS } from './commercialTabs';
import {
  BarChart,
  fmtNum,
  downloadCsv,
  CRM_PALETTE,
  runReport,
  grandTotal,
  distinctValues,
  fetchAll,
  type FieldDef,
  type ReportRow,
  type ReportFilter,
  type Agg,
} from '../../components/crm';

// ─────────────────────────────────────────────────────────────────────────────
// Object registry — each defines its dimensions/measures + a loader that
// normalises table joins into flat ReportRows.
// ─────────────────────────────────────────────────────────────────────────────

interface ReportObjectDef {
  key: string;
  label: string;
  fields: FieldDef[];
  load: () => Promise<ReportRow[]>;
}

const kg = (n: number) => `${fmtNum(n)} kg`;

async function clientStats() {
  const records = await fetchAll<{ client_id: string; nett_weight_kg: number }>(
    (from, to) => supabase
      .from('received_waste_records')
      .select('client_id, nett_weight_kg')
      .eq('import_status', 'imported')
      .range(from, to),
  );
  const stat: Record<string, { n: number; kg: number }> = {};
  records.forEach(r => {
    const e = stat[r.client_id] || { n: 0, kg: 0 };
    e.n++; e.kg += Number(r.nett_weight_kg) || 0;
    stat[r.client_id] = e;
  });
  return stat;
}

async function siteStats() {
  const records = await fetchAll<{ site_id: string | null; nett_weight_kg: number }>(
    (from, to) => supabase
      .from('received_waste_records')
      .select('site_id, nett_weight_kg')
      .eq('import_status', 'imported')
      .range(from, to),
  );
  const stat: Record<string, { n: number; kg: number }> = {};
  records.forEach(r => {
    if (!r.site_id) return;
    const e = stat[r.site_id] || { n: 0, kg: 0 };
    e.n++; e.kg += Number(r.nett_weight_kg) || 0;
    stat[r.site_id] = e;
  });
  return stat;
}

const OBJECTS: ReportObjectDef[] = [
  {
    key: 'accounts',
    label: 'Accounts',
    fields: [
      { key: 'status', label: 'Status', type: 'dimension' },
      { key: 'industry', label: 'Industry', type: 'dimension' },
      { key: 'active', label: 'Active', type: 'dimension' },
      { key: 'sites', label: 'Sites', type: 'measure' },
      { key: 'records', label: 'Waste records', type: 'measure' },
      { key: 'nett_kg', label: 'Nett kg', type: 'measure', format: kg },
    ],
    load: async () => {
      const [cRes, sRes] = await Promise.all([
        supabase.from('clients').select('id, client_name, account_status, industry, active'),
        supabase.from('client_sites').select('id, client_id'),
      ]);
      const stat = await clientStats();
      const siteCount: Record<string, number> = {};
      ((sRes.data ?? []) as Array<{ client_id: string }>).forEach(s => {
        siteCount[s.client_id] = (siteCount[s.client_id] ?? 0) + 1;
      });
      return ((cRes.data ?? []) as Array<{ id: string; client_name: string; account_status: string; industry: string; active: boolean }>).map(c => ({
        account: c.client_name,
        status: c.account_status,
        industry: c.industry?.trim() || 'Unspecified',
        active: c.active ? 'Active' : 'Inactive',
        sites: siteCount[c.id] ?? 0,
        records: stat[c.id]?.n ?? 0,
        nett_kg: Math.round(stat[c.id]?.kg ?? 0),
      }));
    },
  },
  {
    key: 'contacts',
    label: 'Contacts',
    fields: [
      { key: 'account', label: 'Account', type: 'dimension' },
      { key: 'job_title', label: 'Job title', type: 'dimension' },
      { key: 'is_primary', label: 'Primary', type: 'dimension' },
      { key: 'active', label: 'Active', type: 'dimension' },
    ],
    load: async () => {
      const { data } = await supabase
        .from('crm_contacts')
        .select('first_name, last_name, job_title, is_primary, active, clients(client_name)');
      return ((data ?? []) as Array<Record<string, unknown>>).map(c => ({
        contact: `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || '(no name)',
        account: (c.clients as { client_name: string } | null)?.client_name ?? '—',
        job_title: (c.job_title as string)?.trim() || 'Unspecified',
        is_primary: c.is_primary ? 'Primary' : 'Standard',
        active: c.active ? 'Active' : 'Inactive',
      }));
    },
  },
  {
    key: 'sites',
    label: 'Sites',
    fields: [
      { key: 'account', label: 'Account', type: 'dimension' },
      { key: 'group', label: 'Group', type: 'dimension' },
      { key: 'active', label: 'Active', type: 'dimension' },
      { key: 'records', label: 'Waste records', type: 'measure' },
      { key: 'nett_kg', label: 'Nett kg', type: 'measure', format: kg },
    ],
    load: async () => {
      const [sRes, cRes] = await Promise.all([
        supabase.from('client_sites').select('id, client_id, generator_facility, generator_group, active'),
        supabase.from('clients').select('id, client_name'),
      ]);
      const stat = await siteStats();
      const clientMap = new Map<string, string>();
      ((cRes.data ?? []) as Array<{ id: string; client_name: string }>).forEach(c => clientMap.set(c.id, c.client_name));
      return ((sRes.data ?? []) as Array<{ id: string; client_id: string; generator_facility: string; generator_group: string; active: boolean }>).map(s => ({
        facility: s.generator_facility,
        account: clientMap.get(s.client_id) ?? '—',
        group: s.generator_group?.trim() || 'Unspecified',
        active: s.active ? 'Active' : 'Inactive',
        records: stat[s.id]?.n ?? 0,
        nett_kg: Math.round(stat[s.id]?.kg ?? 0),
      }));
    },
  },
  {
    key: 'waste',
    label: 'Waste Records',
    fields: [
      { key: 'account', label: 'Account', type: 'dimension' },
      { key: 'site', label: 'Site', type: 'dimension' },
      { key: 'category', label: 'Waste category', type: 'dimension' },
      { key: 'super_category', label: 'HCRW super-category', type: 'dimension' },
      { key: 'container', label: 'Container type', type: 'dimension' },
      { key: 'month', label: 'Month', type: 'dimension' },
      { key: 'nett_kg', label: 'Nett kg', type: 'measure', format: kg },
      { key: 'containers', label: 'Containers', type: 'measure' },
    ],
    load: async () => {
      const [cRes, sRes, catRes, contRes] = await Promise.all([
        supabase.from('clients').select('id, client_name'),
        supabase.from('client_sites').select('id, generator_facility'),
        supabase.from('waste_categories').select('id, waste_category_name'),
        supabase.from('container_types').select('id, container_type_name'),
      ]);
      const clientMap = new Map<string, string>();
      ((cRes.data ?? []) as Array<{ id: string; client_name: string }>).forEach(c => clientMap.set(c.id, c.client_name));
      const siteMap = new Map<string, string>();
      ((sRes.data ?? []) as Array<{ id: string; generator_facility: string }>).forEach(s => siteMap.set(s.id, s.generator_facility));
      const catMap = new Map<string, string>();
      ((catRes.data ?? []) as Array<{ id: string; waste_category_name: string }>).forEach(c => catMap.set(c.id, c.waste_category_name));
      const contMap = new Map<string, string>();
      ((contRes.data ?? []) as Array<{ id: string; container_type_name: string }>).forEach(c => contMap.set(c.id, c.container_type_name));

      const records = await fetchAll<{
        client_id: string; site_id: string | null; waste_category_id: string | null;
        hcrw_super_category: string; container_type_id: string | null; received_date: string | null;
        nett_weight_kg: number; containers_received: number;
      }>(
        (from, to) => supabase
          .from('received_waste_records')
          .select('client_id, site_id, waste_category_id, hcrw_super_category, container_type_id, received_date, nett_weight_kg, containers_received')
          .eq('import_status', 'imported')
          .range(from, to),
      );

      return records.map(r => ({
        account: clientMap.get(r.client_id) ?? '—',
        site: r.site_id ? (siteMap.get(r.site_id) ?? '—') : '—',
        category: r.waste_category_id ? (catMap.get(r.waste_category_id) ?? '—') : '—',
        super_category: r.hcrw_super_category?.trim() || 'Unspecified',
        container: r.container_type_id ? (contMap.get(r.container_type_id) ?? '—') : '—',
        month: r.received_date ? r.received_date.slice(0, 7) : '(no date)',
        nett_kg: Math.round(Number(r.nett_weight_kg) || 0),
        containers: Number(r.containers_received) || 0,
      }));
    },
  },
];

const AGG_OPTIONS: { value: Agg; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const selCls = 'text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function CommercialReports() {
  usePageTitle('Commercial — Reports');
  const { addToast } = useToast();

  const [objectKey, setObjectKey] = useState('accounts');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [groupBy, setGroupBy] = useState('status');
  const [measure, setMeasure] = useState<string>(''); // '' => count
  const [agg, setAgg] = useState<Agg>('sum');
  const [filters, setFilters] = useState<ReportFilter[]>([]);

  // filter builder
  const [fDim, setFDim] = useState('');
  const [fVal, setFVal] = useState('');

  const obj = useMemo(() => OBJECTS.find(o => o.key === objectKey)!, [objectKey]);
  const dimensions = useMemo(() => obj.fields.filter(f => f.type === 'dimension'), [obj]);
  const measures = useMemo(() => obj.fields.filter(f => f.type === 'measure'), [obj]);

  useEffect(() => { loadObject(objectKey); /* eslint-disable-next-line */ }, [objectKey]);

  async function loadObject(key: string) {
    setLoading(true);
    const def = OBJECTS.find(o => o.key === key)!;
    try {
      const data = await def.load();
      setRows(data);
    } catch (e) {
      addToast('Could not load report data: ' + (e as Error).message, 'error');
      setRows([]);
    }
    // reset config to sensible defaults for the new object
    const dims = def.fields.filter(f => f.type === 'dimension');
    setGroupBy(dims[0]?.key ?? '');
    setMeasure('');
    setAgg('sum');
    setFilters([]);
    setFDim('');
    setFVal('');
    setLoading(false);
  }

  const measureField = measures.find(m => m.key === measure) || null;
  const effectiveAgg: Agg = measure ? agg : 'count';

  const results = useMemo(
    () => runReport(rows, { groupBy, measure: measure || null, agg: effectiveAgg, filters }),
    [rows, groupBy, measure, effectiveAgg, filters],
  );

  const total = useMemo(() => grandTotal(results, effectiveAgg), [results, effectiveAgg]);

  const fmtMeasure = (n: number) => measureField?.format ? measureField.format(n) : fmtNum(n, effectiveAgg === 'avg' ? 1 : 0);

  const groupLabel = dimensions.find(d => d.key === groupBy)?.label ?? groupBy;
  const valueLabel = measure ? `${AGG_OPTIONS.find(a => a.value === agg)?.label} of ${measureField?.label}` : 'Count';

  // filter value options for the currently picked filter dimension
  const filterValueOptions = useMemo(
    () => fDim ? distinctValues(rows, fDim) : [],
    [rows, fDim],
  );

  function addFilter() {
    if (!fDim || !fVal) return;
    if (filters.some(f => f.key === fDim && f.value === fVal)) { setFDim(''); setFVal(''); return; }
    setFilters(prev => [...prev, { key: fDim, value: fVal }]);
    setFDim(''); setFVal('');
  }

  function exportCsv() {
    const headers = [groupLabel, valueLabel, 'Rows'];
    const data = results.map(r => [r.key, measure ? fmtMeasure(r.value) : r.value, r.count]);
    downloadCsv(`report_${objectKey}_by_${groupBy}`, headers, data as (string | number)[][]);
  }

  const chartData = useMemo(
    () => results.slice(0, 12).map((r, i) => ({ label: r.key, value: r.value, color: CRM_PALETTE[i % CRM_PALETTE.length] })),
    [results],
  );

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ANALYTICS_TABS} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-1">Pick an object, filter, group and aggregate — then export to CSV.</p>
      </div>

      {/* Object picker */}
      <div className="flex flex-wrap gap-2">
        {OBJECTS.map(o => (
          <button key={o.key} onClick={() => setObjectKey(o.key)}
            className={`text-sm px-4 py-2 rounded-lg border font-medium transition ${objectKey === o.key ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Builder */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Group by</label>
            <select value={groupBy} onChange={e => setGroupBy(e.target.value)} className={selCls}>
              {dimensions.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Measure</label>
            <select value={measure} onChange={e => setMeasure(e.target.value)} className={selCls}>
              <option value="">Count of records</option>
              {measures.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
            </select>
          </div>
          {measure && (
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Aggregation</label>
              <select value={agg} onChange={e => setAgg(e.target.value as Agg)} className={selCls}>
                {AGG_OPTIONS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
          )}

          <button onClick={exportCsv} disabled={results.length === 0}
            className="ml-auto flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40">
            <Download size={15} className="text-gray-400" /> Export CSV
          </button>
        </div>

        {/* Filter builder */}
        <div className="border-t border-gray-100 pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-[11px] uppercase tracking-wider text-gray-400 mb-1">Filter</label>
              <select value={fDim} onChange={e => { setFDim(e.target.value); setFVal(''); }} className={selCls}>
                <option value="">Field…</option>
                {dimensions.map(d => <option key={d.key} value={d.key}>{d.label}</option>)}
              </select>
            </div>
            {fDim && (
              <select value={fVal} onChange={e => setFVal(e.target.value)} className={selCls}>
                <option value="">Value…</option>
                {filterValueOptions.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            )}
            {fDim && fVal && (
              <button onClick={addFilter}
                className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg px-3 py-2 hover:bg-indigo-100">
                <Plus size={14} /> Add
              </button>
            )}
          </div>

          {filters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.map((f, i) => {
                const label = dimensions.find(d => d.key === f.key)?.label ?? f.key;
                return (
                  <span key={i} className="flex items-center gap-1.5 text-xs bg-gray-100 text-gray-700 rounded-full pl-3 pr-1.5 py-1">
                    <span className="font-medium">{label}</span>: {f.value}
                    <button onClick={() => setFilters(prev => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500">
                      <X size={13} />
                    </button>
                  </span>
                );
              })}
              <button onClick={() => setFilters([])} className="text-xs text-gray-400 hover:text-gray-700 underline px-1">clear all</button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <PageSpinner layout="h64" />
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
          No data for this selection.
        </div>
      ) : (
        <>
          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <BarChart3 size={15} className="text-indigo-500" />
              {valueLabel} by {groupLabel}{results.length > 12 && <span className="text-xs font-normal text-gray-400">(top 12)</span>}
            </h3>
            <BarChart data={chartData} format={n => measure ? fmtMeasure(n) : fmtNum(n)} height={200} />
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
              <Table2 size={15} className="text-indigo-500" />
              <span className="text-sm font-semibold text-gray-900">Results</span>
              <span className="text-xs text-gray-400">({results.length} group{results.length !== 1 ? 's' : ''})</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                    <th className="text-left px-4 py-2.5 font-medium">{groupLabel}</th>
                    <th className="text-right px-4 py-2.5 font-medium">{valueLabel}</th>
                    <th className="text-right px-4 py-2.5 font-medium">Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r, i) => (
                    <tr key={r.key} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                      <td className="px-4 py-2.5 text-gray-800">{r.key}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">
                        {measure ? fmtMeasure(r.value) : fmtNum(r.value)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{fmtNum(r.count)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-800 text-white font-semibold">
                    <td className="px-4 py-2.5">Total</td>
                    <td className="px-4 py-2.5 text-right">{measure ? fmtMeasure(total) : fmtNum(total)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtNum(results.reduce((s, r) => s + r.count, 0))}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
