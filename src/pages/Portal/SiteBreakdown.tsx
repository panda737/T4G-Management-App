import { useMemo, useState } from 'react';
import { Download, Building2, Scale, Boxes, FileText } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useSiteBreakdown, periodRange, type PeriodKey } from './portalApi';
import { exportSiteBreakdown } from './portalExport';
import { kg, num, fmtDate } from './portalUtils';
import { PageHeader, KpiCard, SectionCard, Awaiting } from './portalWidgets';
import { PeriodSelect } from './CategoryBreakdown';

export default function SiteBreakdown() {
  usePageTitle('Portal — Site Breakdown');
  const { clientId, siteId } = usePortalClient();
  const [periodKey, setPeriodKey] = useState<PeriodKey>('all');
  const { start, end } = useMemo(() => periodRange(periodKey), [periodKey]);
  const { rows: sites, loading, error } = useSiteBreakdown(clientId, siteId, start, end);

  const totals = useMemo(() => sites.reduce((a, s) => ({
    kg: a.kg + s.kg, containers: a.containers + s.containers, manifests: a.manifests + s.manifests,
  }), { kg: 0, containers: 0, manifests: 0 }), [sites]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Building2}
        title="Site Breakdown"
        subtitle="Waste generated per site / generator facility"
      >
        <button
          onClick={() => { if (!exportSiteBreakdown(sites, periodKey)) alert('No site data to export.'); }}
          className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium">
          <Download size={15} /> Export CSV
        </button>
        <PeriodSelect value={periodKey} onChange={setPeriodKey} />
      </PageHeader>

      {error && <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {error}</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Building2} tone="emerald" value={num(sites.length)} label="Sites in scope" />
        <KpiCard icon={Scale} tone="blue" value={`${kg(totals.kg)} kg`} label="Waste generated" />
        <KpiCard icon={Boxes} tone="amber" value={num(totals.containers)} label="Containers" />
        <KpiCard icon={FileText} tone="gray" value={num(totals.manifests)} label="Manifests" />
      </div>

      <SectionCard title="Sites by Waste Generated" icon={Building2}>
        {sites.length === 0 ? (
          <Awaiting>No site activity in this period. Try a wider period, or check back once collection data is loaded for your sites.</Awaiting>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">Generator Facility</th>
                  <th className="py-2 px-3 font-medium">Province</th>
                  <th className="py-2 px-3 font-medium text-right">Waste generated (kg)</th>
                  <th className="py-2 px-3 font-medium text-right">Containers</th>
                  <th className="py-2 px-3 font-medium">Top Category</th>
                  <th className="py-2 px-3 font-medium text-right">Manifests</th>
                  <th className="py-2 pl-3 font-medium">Latest Collection</th>
                </tr>
              </thead>
              <tbody>
                {[...sites].sort((a, b) => b.kg - a.kg).map(s => (
                  <tr key={s.site_id ?? s.generator_facility} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="py-2 pr-3 font-medium text-gray-800">{s.generator_facility}</td>
                    <td className="py-2 px-3 text-gray-500">{s.province || '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums font-semibold text-gray-900">{kg(s.kg)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">{num(s.containers)}</td>
                    <td className="py-2 px-3 text-gray-700">{s.top_category}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">{num(s.manifests)}</td>
                    <td className="py-2 pl-3 text-gray-600 whitespace-nowrap">{fmtDate(s.last_received)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
