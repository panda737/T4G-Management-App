import { useMemo, useState } from 'react';
import { Download, Printer, ChevronDown } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalWaste, kg, num, monthKey, fmtDate } from './portalUtils';

const MONTHS = [
  ['01', 'January'], ['02', 'February'], ['03', 'March'], ['04', 'April'], ['05', 'May'], ['06', 'June'],
  ['07', 'July'], ['08', 'August'], ['09', 'September'], ['10', 'October'], ['11', 'November'], ['12', 'December'],
];

export default function MonthlyReport() {
  usePageTitle('Portal — Monthly Report');
  const { rows, loading } = usePortalWaste();
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [site, setSite] = useState('');
  const [category, setCategory] = useState('');
  const [container, setContainer] = useState('');

  const years = useMemo(() => Array.from(new Set(rows.map(r => monthKey(r.received_date).substring(0, 4)).filter(Boolean))).sort().reverse(), [rows]);
  const sites = useMemo(() => Array.from(new Set(rows.map(r => r.generator_facility).filter(Boolean) as string[])).sort(), [rows]);
  const categories = useMemo(() => Array.from(new Set(rows.map(r => r.waste_category_name).filter(Boolean) as string[])).sort(), [rows]);
  const containers = useMemo(() => Array.from(new Set(rows.map(r => r.container_type_name).filter(Boolean) as string[])).sort(), [rows]);

  const filtered = useMemo(() => rows.filter(r => {
    const mk = monthKey(r.received_date);
    if (year && mk.substring(0, 4) !== year) return false;
    if (month && mk.substring(5, 7) !== month) return false;
    if (site && r.generator_facility !== site) return false;
    if (category && r.waste_category_name !== category) return false;
    if (container && r.container_type_name !== container) return false;
    return true;
  }), [rows, year, month, site, category, container]);

  const totalKg = filtered.reduce((s, r) => s + Number(r.nett_weight_kg), 0);
  const totalContainers = filtered.reduce((s, r) => s + Number(r.containers_received), 0);

  function exportCsv() {
    const header = ['Received Date', 'Collection Date', 'Generator Facility', 'Waste Category', 'HCRW Super Category', 'Container Type', 'Containers Received', 'Nett Weight kg', 'Reusable', 'Tracking Number'];
    const lines = filtered.map(r => [
      r.received_date ?? '', r.collection_date ?? '', r.generator_facility ?? '', r.waste_category_name ?? '',
      r.hcrw_super_category ?? '', r.container_type_name ?? '', r.containers_received, r.nett_weight_kg,
      r.reusable_boolean ? 'Yes' : 'No', r.waste_manifest_tracking_number,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `received-waste-report.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Monthly Received Waste Report</h1>
          <p className="text-sm text-gray-500 mt-1">{filtered.length} records · {kg(totalKg)} kg · {num(totalContainers)} containers</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button onClick={exportCsv} className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium"><Download size={15} /> CSV</button>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium"><Printer size={15} /> Print / PDF</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 print:hidden">
        <Select value={year} onChange={setYear} placeholder="All Years" options={years.map(y => [y, y])} />
        <Select value={month} onChange={setMonth} placeholder="All Months" options={MONTHS.map(m => [m[0], m[1]])} />
        <Select value={site} onChange={setSite} placeholder="All Sites" options={sites.map(s => [s, s])} />
        <Select value={category} onChange={setCategory} placeholder="All Categories" options={categories.map(c => [c, c])} />
        <Select value={container} onChange={setContainer} placeholder="All Containers" options={containers.map(c => [c, c])} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                {['Received', 'Collected', 'Facility', 'Waste Category', 'HCRW', 'Container', 'Containers', 'Nett kg', 'Reusable', 'Tracking #'].map(h => (
                  <th key={h} className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-sm text-gray-400">No records match the filters</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{fmtDate(r.received_date)}{r.received_date_source === 'collection_fallback' && <span className="ml-1 text-[10px] text-amber-600">(coll.)</span>}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(r.collection_date)}</td>
                  <td className="px-3 py-2 text-gray-700">{r.generator_facility || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.waste_category_name || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.hcrw_super_category || '—'}</td>
                  <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{r.container_type_name || '—'}</td>
                  <td className="px-3 py-2 text-right text-gray-700">{num(Number(r.containers_received))}</td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{Number(r.nett_weight_kg).toLocaleString('en-ZA', { maximumFractionDigits: 1 })}</td>
                  <td className="px-3 py-2 text-gray-500">{r.reusable_boolean ? 'Yes' : 'No'}</td>
                  <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{r.waste_manifest_tracking_number || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: (string | string)[][] }) {
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
