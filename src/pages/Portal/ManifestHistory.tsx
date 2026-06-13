import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalWaste, kg, num, fmtDate } from './portalUtils';
import type { ReceivedWasteCustomerRow } from '../../lib/supabase';

interface ManifestAgg {
  tracking: string;
  received: string | null;
  collected: string | null;
  facility: string;
  lines: number;
  containers: number;
  nettKg: number;
  categories: string;
}

export default function ManifestHistory() {
  usePageTitle('Portal — Manifest History');
  const { rows, loading } = usePortalWaste();
  const [search, setSearch] = useState('');

  const manifests = useMemo<ManifestAgg[]>(() => {
    const by: Record<string, ReceivedWasteCustomerRow[]> = {};
    rows.forEach(r => { const k = r.waste_manifest_tracking_number || '(none)'; (by[k] ||= []).push(r); });
    return Object.entries(by).map(([tracking, rs]) => {
      const cats = new Set<string>();
      let containers = 0, nettKg = 0, received = '', collected = '';
      rs.forEach(r => {
        containers += Number(r.containers_received);
        nettKg += Number(r.nett_weight_kg);
        if (r.waste_category_name) cats.add(r.waste_category_name);
        if (r.received_date && r.received_date > received) received = r.received_date;
        if (r.collection_date && r.collection_date > collected) collected = r.collection_date;
      });
      return {
        tracking, received: received || null, collected: collected || null,
        facility: rs[0].generator_facility || '—', lines: rs.length, containers, nettKg,
        categories: [...cats].join(', '),
      };
    }).sort((a, b) => (b.received || '').localeCompare(a.received || ''));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return manifests.filter(m => !q || m.tracking.toLowerCase().includes(q) || m.facility.toLowerCase().includes(q));
  }, [manifests, search]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manifest History</h1>
        <p className="text-sm text-gray-500 mt-1">{manifests.length} manifests received</p>
      </div>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tracking # or facility…"
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No manifests</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Tracking #</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Received</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Collected</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Facility</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Categories</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Containers</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((m, i) => (
                  <tr key={m.tracking + i} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 whitespace-nowrap">{m.tracking}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(m.received)}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{fmtDate(m.collected)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{m.facility}</td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[220px] truncate" title={m.categories}>{m.categories || '—'}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{num(m.containers)}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(m.nettKg)}</td>
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
