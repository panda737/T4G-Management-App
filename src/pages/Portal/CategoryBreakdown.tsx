import { useMemo } from 'react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalWaste, kg, num, colorFor } from './portalUtils';
import type { ReceivedWasteCustomerRow } from '../../lib/supabase';

export default function CategoryBreakdown() {
  usePageTitle('Portal — Waste Categories');
  const { rows, loading } = usePortalWaste();

  const cats = useMemo(() => {
    const by: Record<string, { hcrw: string; kg: number; containers: number }> = {};
    rows.forEach((r: ReceivedWasteCustomerRow) => {
      const name = r.waste_category_name || 'Uncategorised';
      const e = by[name] || { hcrw: r.hcrw_super_category || '—', kg: 0, containers: 0 };
      e.kg += Number(r.nett_weight_kg);
      e.containers += Number(r.containers_received);
      by[name] = e;
    });
    return Object.entries(by).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.kg - a.kg);
  }, [rows]);

  const totalKg = cats.reduce((s, c) => s + c.kg, 0);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Waste Category Breakdown</h1>
        <p className="text-sm text-gray-500 mt-1">Received waste by category and HCRW super category</p>
      </div>

      {cats.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-12 text-sm text-gray-400">No data</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 lg:col-span-1">
            <DonutChart
              segments={cats.map((c, i) => ({ label: c.name, value: c.kg, color: colorFor(c.name, i) }))}
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
                    <tr key={c.name} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                      <td className="px-4 py-2.5 font-medium text-gray-800">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: colorFor(c.name, i) }} />
                        {c.name}
                      </td>
                      <td className="px-4 py-2.5 text-gray-500">{c.hcrw || '—'}</td>
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
