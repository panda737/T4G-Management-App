import { useMemo } from 'react';
import { Scale, Boxes, CalendarDays, Download, Recycle, Building2, Package } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useReceivedWaste } from './portalApi';
import { exportContainers } from './portalExport';
import { kg, num, colorFor, fmtDate } from './portalUtils';
import { PageHeader, KpiCard, SectionCard, Awaiting } from './portalWidgets';

export default function WasteGenerated() {
  usePageTitle('Portal — Waste Generated');
  const { clientId, siteId } = usePortalClient();
  const d = useReceivedWaste(clientId, siteId);

  const byCategory = useMemo(() => d.byCategory.map(c => [c.category, c.kg] as [string, number]), [d.byCategory]);
  const byContainer = useMemo(() => d.byContainer.map(c => [c.container_type, c.containers] as [string, number]), [d.byContainer]);
  const bySite = useMemo(() => [...d.bySite].sort((a, b) => b.kg - a.kg).map(s => [s.generator_facility, s.kg] as [string, number]), [d.bySite]);
  const totalKg = useMemo(() => d.byCategory.reduce((s, c) => s + c.kg, 0), [d.byCategory]);
  const totalContainers = useMemo(() => d.byContainer.reduce((s, c) => s + c.containers, 0), [d.byContainer]);

  if (d.loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Scale}
        title="Waste Generated"
        subtitle="Waste your sites generated and Tech4Green collected for treatment"
      >
        <button
          onClick={() => { if (!exportContainers(d.byContainer, 'ytd')) alert('No container data to export.'); }}
          className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium">
          <Download size={15} /> Export CSV
        </button>
      </PageHeader>

      {d.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {d.error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} tone="emerald" value={`${kg(d.monthKg)} kg`} label="Generated this month" />
        <KpiCard icon={Scale} tone="blue" value={`${kg(d.ytdKg)} kg`} label="Year to date" />
        <KpiCard icon={Boxes} tone="amber" value={num(d.monthContainers)} label="Containers this month" />
        <KpiCard icon={CalendarDays} tone="gray" value={fmtDate(d.latest)} label="Latest collection" />
      </div>

      {totalKg === 0 ? (
        <SectionCard title="Waste Generated" icon={Scale}>
          <Awaiting>No waste records for your account this year yet. Figures appear here once collection data is loaded for your sites.</Awaiting>
        </SectionCard>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="By Waste Category" icon={Recycle} right={<span className="text-[11px] font-medium text-gray-400">Year to date</span>}>
              <DonutChart
                segments={d.byCategory.slice(0, 8).map((c, i) => ({ label: c.category, value: c.kg, color: colorFor(c.category, i) }))}
                centerLabel={`${kg(totalKg)}`} centerSub="kg total"
              />
              <BreakdownList items={byCategory} total={totalKg} unit="kg" />
            </SectionCard>
            <SectionCard title="By Container Type" icon={Package} right={<span className="text-[11px] font-medium text-gray-400">Year to date</span>}>
              <BreakdownList items={byContainer} total={totalContainers} unit="" />
            </SectionCard>
          </div>

          <SectionCard title="Site Contribution by Waste Generated" icon={Building2} right={<span className="text-[11px] font-medium text-gray-400">Year to date</span>}>
            <BreakdownList items={bySite} total={totalKg} unit="kg" />
          </SectionCard>
        </>
      )}
    </div>
  );
}

function BreakdownList({ items, total, unit }: { items: [string, number][]; total: number; unit: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;
  return (
    <div className="mt-2 space-y-2">
      {items.slice(0, 12).map(([k, v], i) => (
        <div key={k} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colorFor(k, i) }} />
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">{k}</span>
          <span className="text-xs font-semibold text-gray-900">{num(v)}{unit ? ` ${unit}` : ''}</span>
          <span className="text-[10px] text-gray-400 w-10 text-right">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
        </div>
      ))}
    </div>
  );
}
