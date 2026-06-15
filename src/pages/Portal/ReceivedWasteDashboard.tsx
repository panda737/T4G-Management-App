import { useMemo } from 'react';
import { Scale, Boxes, CalendarDays, Download } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { useReceivedWaste } from './portalApi';
import { exportContainers } from './portalExport';
import { kg, num, colorFor, fmtDate } from './portalUtils';

export default function ReceivedWasteDashboard() {
  usePageTitle('Portal — Received Waste');
  const { clientId, siteId } = usePortalClient();
  const d = useReceivedWaste(clientId, siteId);

  const byCategory = useMemo(() => d.byCategory.map(c => [c.category, c.kg] as [string, number]), [d.byCategory]);
  const byContainer = useMemo(() => d.byContainer.map(c => [c.container_type, c.containers] as [string, number]), [d.byContainer]);
  const bySite = useMemo(() => d.bySite.map(s => [s.generator_facility, s.kg] as [string, number]), [d.bySite]);
  const totalKg = useMemo(() => d.byCategory.reduce((s, c) => s + c.kg, 0), [d.byCategory]);
  const totalContainers = useMemo(() => d.byContainer.reduce((s, c) => s + c.containers, 0), [d.byContainer]);

  if (d.loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Received Waste</h1>
          <p className="text-sm text-gray-500 mt-1">Waste Tech4Green received from your sites</p>
        </div>
        <button
          onClick={() => { if (!exportContainers(d.byContainer, 'ytd')) alert('No container data to export.'); }}
          className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-lg font-medium print:hidden">
          <Download size={15} /> Export CSV
        </button>
      </div>

      {d.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">Some data couldn’t load: {d.error}</div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Scale} tone="emerald" value={`${kg(d.monthKg)} kg`} label="Received this month" />
        <Kpi icon={Scale} tone="blue" value={`${kg(d.ytdKg)} kg`} label="Year to date" />
        <Kpi icon={Boxes} tone="amber" value={num(d.monthContainers)} label="Containers this month" />
        <Kpi icon={CalendarDays} tone="gray" value={fmtDate(d.latest)} label="Latest received" />
      </div>

      {totalKg === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-16 text-sm text-gray-400">
          No received-waste records this year.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="By Waste Category" sub="Year to date">
              <DonutChart
                segments={d.byCategory.slice(0, 8).map((c, i) => ({ label: c.category, value: c.kg, color: colorFor(c.category, i) }))}
                centerLabel={`${kg(totalKg)}`} centerSub="kg total"
              />
              <BreakdownList items={byCategory} total={totalKg} unit="kg" />
            </Card>
            <Card title="By Container Type" sub="Year to date">
              <BreakdownList items={byContainer} total={totalContainers} unit="" />
            </Card>
          </div>

          <Card title="By Site / Facility" sub="Year to date">
            <BreakdownList items={bySite} total={totalKg} unit="kg" />
          </Card>
        </>
      )}
    </div>
  );
}

function Kpi({ icon: Icon, tone, value, label }: { icon: typeof Scale; tone: 'emerald' | 'blue' | 'amber' | 'gray'; value: string; label: string }) {
  const bg: Record<string, string> = { emerald: 'bg-emerald-100 text-emerald-600', blue: 'bg-blue-100 text-blue-600', amber: 'bg-amber-100 text-amber-600', gray: 'bg-gray-100 text-gray-600' };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${bg[tone]}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {sub && <span className="text-[11px] font-medium text-gray-400">{sub}</span>}
      </div>
      {children}
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
