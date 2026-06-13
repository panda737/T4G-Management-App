import { useMemo } from 'react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalWaste, kg, num, fmtDate } from './portalUtils';
import type { ReceivedWasteCustomerRow } from '../../lib/supabase';

interface SiteAgg {
  facility: string;
  group: string;
  nettKg: number;
  containers: number;
  topCategory: string;
  lastReceived: string;
  manifests: number;
}

export default function SiteBreakdown() {
  usePageTitle('Portal — Site Breakdown');
  const { rows, loading } = usePortalWaste();

  const sites = useMemo<SiteAgg[]>(() => {
    const byFac: Record<string, ReceivedWasteCustomerRow[]> = {};
    rows.forEach(r => { const f = r.generator_facility || 'Unknown'; (byFac[f] ||= []).push(r); });
    return Object.entries(byFac).map(([facility, rs]) => {
      const catKg: Record<string, number> = {};
      const manifests = new Set<string>();
      let nettKg = 0, containers = 0, lastReceived = '';
      rs.forEach(r => {
        nettKg += Number(r.nett_weight_kg);
        containers += Number(r.containers_received);
        const c = r.waste_category_name || '—'; catKg[c] = (catKg[c] || 0) + Number(r.nett_weight_kg);
        if (r.waste_manifest_tracking_number) manifests.add(r.waste_manifest_tracking_number);
        if (r.received_date && r.received_date > lastReceived) lastReceived = r.received_date;
      });
      const topCategory = Object.entries(catKg).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
      return { facility, group: rs[0].generator_group || '', nettKg, containers, topCategory, lastReceived, manifests: manifests.size };
    }).sort((a, b) => b.nettKg - a.nettKg);
  }, [rows]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Site Breakdown</h1>
        <p className="text-sm text-gray-500 mt-1">Received waste per generator facility</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sites.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No data</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Generator Facility</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Group</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Containers</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Top Category</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Manifests</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Last Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((s, i) => (
                  <tr key={s.facility} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{s.facility}</td>
                    <td className="px-4 py-2.5 text-gray-500">{s.group || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(s.nettKg)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{num(s.containers)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{s.topCategory}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{s.manifests}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(s.lastReceived || null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
