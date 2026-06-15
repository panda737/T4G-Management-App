import { useEffect, useState } from 'react';
import { Download, Printer, ChevronDown, FileBarChart2 } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useReportRows, useReportFilters, fetchAllReportRows, type ReportFilters, type WasteDetailRow } from './portalApi';
import { exportReportRows } from './portalExport';
import { kg, num, fmtDate } from './portalUtils';
import { PageHeader } from './portalWidgets';

const MONTHS = [
  ['1', 'January'], ['2', 'February'], ['3', 'March'], ['4', 'April'], ['5', 'May'], ['6', 'June'],
  ['7', 'July'], ['8', 'August'], ['9', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];
const PAGE = 200;
const EMPTY: ReportFilters = { year: '', month: '', siteId: '', category: '', container: '' };

export default function MonthlyReport() {
  usePageTitle('Portal — Monthly Report');
  const { clientId, siteId } = usePortalClient();
  const [f, setF] = useState<ReportFilters>(EMPTY);
  const [offset, setOffset] = useState(0);
  const [acc, setAcc] = useState<WasteDetailRow[]>([]);
  const [exporting, setExporting] = useState(false);

  const opts = useReportFilters(clientId, siteId);

  // Reset paging whenever a filter or scope changes.
  useEffect(() => { setOffset(0); setAcc([]); }, [f.year, f.month, f.siteId, f.category, f.container, clientId, siteId]);

  const { rows: page, total, totalKg, totalContainers, loading, error } = useReportRows(clientId, siteId, f, PAGE, offset);

  useEffect(() => {
    if (loading) return;
    setAcc(prev => (offset === 0 ? page : [...prev, ...page]));
  }, [page, offset, loading]);

  async function exportCsv() {
    setExporting(true);
    try {
      const all = await fetchAllReportRows(clientId, siteId, f);
      const scope = [f.year || 'all-years', f.month && `m${f.month}`, f.siteId && 'site', f.category && 'cat', f.container && 'cont'].filter(Boolean).join('-');
      if (!exportReportRows(all, scope)) alert('No records to export for the current filters.');
    } catch (e) {
      alert(`Export failed: ${e instanceof Error ? e.message : 'unknown error'}`);
    } finally {
      setExporting(false);
    }
  }

  const set = (k: keyof ReportFilters) => (v: string) => setF(prev => ({ ...prev, [k]: v }));

  if (loading && acc.length === 0) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={FileBarChart2}
        title="Monthly Report"
        subtitle={`${num(total)} waste records · ${kg(totalKg)} kg generated · ${num(totalContainers)} containers`}
      >
        <button onClick={exportCsv} disabled={exporting || total === 0} className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium disabled:opacity-50"><Download size={15} /> {exporting ? 'Exporting…' : 'Export CSV'}</button>
        <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg font-medium"><Printer size={15} /> Print / PDF</button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Select value={f.year} onChange={set('year')} placeholder="All Years" options={opts.years.map(y => [y, y])} />
        <Select value={f.month} onChange={set('month')} placeholder="All Months" options={MONTHS.map(m => [m[0], m[1]])} />
        <Select value={f.siteId} onChange={set('siteId')} placeholder="All Sites" options={opts.sites.map(s => [s.id, s.label])} />
        <Select value={f.category} onChange={set('category')} placeholder="All Categories" options={opts.categories.map(c => [c, c])} />
        <Select value={f.container} onChange={set('container')} placeholder="All Containers" options={opts.containers.map(c => [c, c])} />
      </div>

      {error && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                {['Received by T4G', 'Collected', 'Facility', 'Waste Category', 'HCRW', 'Container', 'Containers', 'Generated (kg)', 'Reusable', 'Tracking #'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {acc.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400">No waste records match the filters</td></tr>
              ) : acc.map((r, i) => (
                <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(r.received_date)}{r.received_date_source === 'collection_fallback' && <span className="ml-1 text-[10px] text-amber-600">(coll.)</span>}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(r.collection_date)}</td>
                  <td className="px-3 py-2 text-gray-700">{r.generator_facility || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.waste_category || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.hcrw_super || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.container_type || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{num(r.containers)}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{r.nett_kg.toLocaleString('en-ZA', { maximumFractionDigits: 1 })}</td>
                  <td className="px-3 py-2 text-gray-500">{r.reusable ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.tracking || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {acc.length < total && (
        <div className="text-center print:hidden">
          <button onClick={() => setOffset(acc.length)} disabled={loading}
            className="text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Loading…' : `Load more (${num(acc.length)} of ${num(total)})`}
          </button>
        </div>
      )}
    </div>
  );
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[][] }) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">{placeholder}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
