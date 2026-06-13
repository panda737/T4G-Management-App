import { useMemo } from 'react';
import { Scale, Boxes, CalendarDays, FileText } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalWaste, kg, num, monthKey, colorFor, sumBy, fmtDate } from './portalUtils';

export default function ReceivedWasteDashboard() {
  usePageTitle('Portal — Received Waste');
  const { rows, loading } = usePortalWaste();

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const thisYear = String(now.getFullYear());
    let monthKgV = 0, ytdKgV = 0, monthContainers = 0;
    let latestDate = '', latestManifest = '';
    rows.forEach(r => {
      const mk = monthKey(r.received_date);
      if (mk === thisMonth) { monthKgV += Number(r.nett_weight_kg); monthContainers += Number(r.containers_received); }
      if (mk.startsWith(thisYear)) ytdKgV += Number(r.nett_weight_kg);
      if (r.received_date && r.received_date > latestDate) { latestDate = r.received_date; latestManifest = r.waste_manifest_tracking_number; }
    });
    return { thisMonth, monthKgV, ytdKgV, monthContainers, latestDate, latestManifest };
  }, [rows]);

  const byCategory = useMemo(() => sumBy(rows, r => r.waste_category_name || 'Uncategorised', r => Number(r.nett_weight_kg)), [rows]);
  const bySite = useMemo(() => sumBy(rows, r => r.generator_facility || 'Unknown', r => Number(r.nett_weight_kg)), [rows]);
  const byContainer = useMemo(() => sumBy(rows, r => r.container_type_name || 'Unknown', r => Number(r.containers_received)), [rows]);
  const totalKg = useMemo(() => rows.reduce((s, r) => s + Number(r.nett_weight_kg), 0), [rows]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Received Waste</h1>
        <p className="text-sm text-gray-500 mt-1">Waste Tech4Green received from your sites</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Scale} tone="emerald" value={`${kg(stats.monthKgV)} kg`} label="Received this month" />
        <Kpi icon={Scale} tone="blue" value={`${kg(stats.ytdKgV)} kg`} label="Year to date" />
        <Kpi icon={Boxes} tone="amber" value={num(stats.monthContainers)} label="Containers this month" />
        <Kpi icon={CalendarDays} tone="gray" value={fmtDate(stats.latestDate || null)} label="Latest received" />
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm text-center py-16 text-sm text-gray-400">
          No received-waste records yet.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card title="By Waste Category">
              <DonutChart
                segments={byCategory.map(([k, v], i) => ({ label: k, value: v, color: colorFor(k, i) }))}
                centerLabel={`${kg(totalKg)}`} centerSub="kg total"
              />
              <BreakdownList items={byCategory} total={totalKg} unit="kg" />
            </Card>
            <Card title="By Container Type">
              <BreakdownList items={byContainer} total={byContainer.reduce((s, [, v]) => s + v, 0)} unit="" />
            </Card>
          </div>

          <Card title="By Site / Facility">
            <BreakdownList items={bySite} total={totalKg} unit="kg" />
          </Card>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
            <FileText size={18} className="text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Latest manifest received</p>
              <p className="text-sm font-semibold text-gray-900">{stats.latestManifest || '—'}</p>
            </div>
          </div>
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

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-4">{title}</h2>
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
