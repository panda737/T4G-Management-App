import { useMemo, useState } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useCategoryBreakdown, periodRange, type PeriodKey } from './portalApi';
import { exportCategories } from './portalExport';
import { kg, num, colorFor } from './portalUtils';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'all', label: 'All time' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'ytd', label: 'Year to date' },
  { key: 'month', label: 'This month' },
];

export default function CategoryBreakdown() {
  usePageTitle('Portal — Waste Categories');
  const { clientId, siteId } = usePortalClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const { start, end } = useMemo(() => periodRange(periodKey), [periodKey]);
  const { rows: cats, loading, error } = useCategoryBreakdown(clientId, siteId, start, end);

  const totalKg = cats.reduce((s, c) => s + c.kg, 0);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Waste Category Breakdown</h1>
          <p className="text-sm text-gray-500 mt-1">Received waste by category and HCRW super category</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { if (!exportCategories(cats, periodKey)) alert('No category data to export.'); }}
            className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium print:hidden">
            <Download size={15} /> Export CSV
          </button>
          <PeriodSelect value={periodKey} onChange={setPeriodKey} />
        </div>
      </div>

      {error && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {error}</div>}

      {cats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-12 text-sm text-gray-400">No data in this period</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-1">
            <DonutChart
              segments={cats.map((c, i) => ({ label: c.category, value: c.kg, color: colorFor(c.category, i) }))}
              centerLabel={kg(totalKg)} centerSub="kg total"
            />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Waste Category</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">HCRW Super</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">%</th>
                    <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Containers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {cats.map((c, i) => (
                    <tr key={c.category} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: colorFor(c.category, i) }} />
                        {c.category}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{c.hcrw_super || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(c.kg)}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{totalKg > 0 ? ((c.kg / totalKg) * 100).toFixed(1) : 0}%</td>
                      <td className="px-4 py-2.5 text-right text-gray-700">{num(c.containers)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function PeriodSelect({ value, onChange }: { value: PeriodKey; onChange: (v: PeriodKey) => void }) {
  return (
    <div className="relative print:hidden">
      <select value={value} onChange={e => onChange(e.target.value as PeriodKey)}
        className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
        {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
    </div>
  );
}
