import { useMemo, useState } from 'react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useSiteBreakdown, periodRange, type PeriodKey } from './portalApi';
import { kg, num, fmtDate } from './portalUtils';
import { PeriodSelect } from './CategoryBreakdown';

export default function SiteBreakdown() {
  usePageTitle('Portal — Site Breakdown');
  const { clientId, siteId } = usePortalClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const { start, end } = useMemo(() => periodRange(periodKey), [periodKey]);
  const { rows: sites, loading, error } = useSiteBreakdown(clientId, siteId, start, end);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Site Breakdown</h1>
          <p className="text-sm text-gray-500 mt-1">Received waste per generator facility</p>
        </div>
        <PeriodSelect value={periodKey} onChange={setPeriodKey} />
      </div>

      {error && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {sites.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No data in this period</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Generator Facility</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Province</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Nett kg</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Containers</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Top Category</th>
                  <th className="text-right px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Manifests</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Last Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map((s, i) => (
                  <tr key={s.site_id ?? s.generator_facility} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 font-medium text-gray-800">{s.generator_facility}</td>
                    <td className="px-4 py-2.5 text-gray-500">{s.province || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(s.kg)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{num(s.containers)}</td>
                    <td className="px-4 py-2.5 text-gray-700">{s.top_category}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{num(s.manifests)}</td>
                    <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(s.last_received)}</td>
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
