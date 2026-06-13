import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Users, CheckSquare, Scale, MapPin, Leaf, Droplets, TrendingUp,
  Phone, StickyNote, Mail, CalendarDays, ClipboardList,
} from 'lucide-react';
import {
  supabase,
  type Client,
  type CrmActivity,
  type CrmActivityType,
  type EsgResult,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import DonutChart from '../../components/DonutChart';
import SectionTabs from '../../components/SectionTabs';
import { ANALYTICS_TABS } from './commercialTabs';
import {
  BarChart,
  fmtNum,
  fmtDateTime,
  CRM_PALETTE,
  monthBuckets,
} from '../../components/crm';

type RecentActivity = CrmActivity & { client_name: string };

const ACTIVITY_ICON: Record<CrmActivityType, React.ElementType> = {
  task: CheckSquare,
  call: Phone,
  note: StickyNote,
  email: Mail,
  meeting: CalendarDays,
};

interface Snapshot {
  clients: Client[];
  contactCount: number;
  siteCount: number;
  openTasks: number;
  recent: RecentActivity[];
  wasteByMonth: Record<string, number>;
  totalKg: number;
  esg: EsgResult[];
}

// Module-level cache: survives navigating away & back so revisits render
// instantly from the last result while a fresh load refreshes in the background.
let dashCache: Snapshot | null = null;

export default function CommercialDashboard() {
  usePageTitle('Commercial — Dashboard');
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [clients, setClients] = useState<Client[]>(dashCache?.clients ?? []);
  const [contactCount, setContactCount] = useState(dashCache?.contactCount ?? 0);
  const [siteCount, setSiteCount] = useState(dashCache?.siteCount ?? 0);
  const [openTasks, setOpenTasks] = useState(dashCache?.openTasks ?? 0);
  const [recent, setRecent] = useState<RecentActivity[]>(dashCache?.recent ?? []);
  const [wasteByMonth, setWasteByMonth] = useState<Record<string, number>>(dashCache?.wasteByMonth ?? {});
  const [totalKg, setTotalKg] = useState(dashCache?.totalKg ?? 0);
  const [esg, setEsg] = useState<EsgResult[]>(dashCache?.esg ?? []);
  // Spinner only on a cold start; cached revisits render immediately and refresh silently.
  const [loading, setLoading] = useState(!dashCache);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const [cRes, contRes, siteRes, taskRes, recentRes, esgRes, wasteRes] = await Promise.all([
        supabase.from('clients').select('*').order('client_name'),
        supabase.from('crm_contacts').select('id', { count: 'exact', head: true }).eq('active', true),
        supabase.from('client_sites').select('id', { count: 'exact', head: true }),
        supabase.from('crm_activities').select('id', { count: 'exact', head: true }).eq('type', 'task').eq('status', 'open'),
        supabase.from('crm_activities').select('*, clients(client_name)').order('created_at', { ascending: false }).limit(8),
        supabase.from('esg_results').select('*'),
        // Pre-aggregated server-side (v_commercial_waste_monthly) → small, fast result.
        supabase.from('v_commercial_waste_monthly').select('month, total_kg, n'),
      ]);

      const nextClients = (cRes.data ?? []) as Client[];
      const nextContactCount = contRes.count ?? 0;
      const nextSiteCount = siteRes.count ?? 0;
      const nextOpenTasks = taskRes.count ?? 0;
      const nextRecent = ((recentRes.data ?? []) as Array<Record<string, unknown>>).map(a => ({
        ...(a as unknown as CrmActivity),
        client_name: (a.clients as { client_name: string } | null)?.client_name ?? '—',
      }));
      const nextEsg = (esgRes.data ?? []) as EsgResult[];

      const nextWasteByMonth: Record<string, number> = {};
      let nextTotalKg = 0;
      for (const r of (wasteRes.data ?? []) as Array<{ month: string | null; total_kg: number | null }>) {
        const kg = Number(r.total_kg) || 0;
        nextTotalKg += kg; // includes the NULL-month row → all-time total stays accurate
        if (r.month) nextWasteByMonth[r.month.slice(0, 7)] = kg; // 'YYYY-MM'
      }

      dashCache = {
        clients: nextClients, contactCount: nextContactCount, siteCount: nextSiteCount,
        openTasks: nextOpenTasks, recent: nextRecent, wasteByMonth: nextWasteByMonth,
        totalKg: nextTotalKg, esg: nextEsg,
      };

      setClients(nextClients);
      setContactCount(nextContactCount);
      setSiteCount(nextSiteCount);
      setOpenTasks(nextOpenTasks);
      setRecent(nextRecent);
      setEsg(nextEsg);
      setWasteByMonth(nextWasteByMonth);
      setTotalKg(nextTotalKg);
    } catch (e) {
      addToast('Could not load dashboard: ' + (e as Error).message, 'error');
    }
    setLoading(false);
  }

  // ── derived ─────────────────────────────────────────────────────────────────
  const activeAccounts = useMemo(() => clients.filter(c => c.account_status === 'active').length, [clients]);
  const prospects = useMemo(() => clients.filter(c => c.account_status === 'prospect').length, [clients]);

  const byStatus = useMemo(() => {
    const m: Record<string, number> = { active: 0, prospect: 0, inactive: 0 };
    clients.forEach(c => { m[c.account_status] = (m[c.account_status] ?? 0) + 1; });
    return m;
  }, [clients]);

  const byIndustry = useMemo(() => {
    const m: Record<string, number> = {};
    clients.forEach(c => { const k = c.industry?.trim() || 'Unspecified'; m[k] = (m[k] ?? 0) + 1; });
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [clients]);

  const trend = useMemo(() => {
    const buckets = monthBuckets(12);
    return buckets.map(b => ({ label: b.label, value: wasteByMonth[b.key] ?? 0 }));
  }, [wasteByMonth]);

  const esgTotals = useMemo(() => {
    const sum = (k: keyof EsgResult) => esg.reduce((s, r) => s + (Number(r[k]) || 0), 0);
    return {
      co2e: sum('co2e_saved_kg'),
      water: sum('water_saved_kl'),
      diesel: sum('diesel_saved_l'),
      km: sum('km_avoided'),
    };
  }, [esg]);

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ANALYTICS_TABS} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Commercial Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Live overview across accounts, contacts, activity and waste volume.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Building2} label="Active accounts" value={fmtNum(activeAccounts)} sub={`${fmtNum(prospects)} prospects`} onClick={() => navigate('/commercial/clients')} />
        <Kpi icon={Users} label="Contacts" value={fmtNum(contactCount)} sub="active" onClick={() => navigate('/commercial/contacts')} />
        <Kpi icon={CheckSquare} label="Open tasks" value={fmtNum(openTasks)} sub={openTasks > 0 ? 'needs attention' : 'all clear'} accent={openTasks > 0 ? 'amber' : 'emerald'} onClick={() => navigate('/commercial/activities')} />
        <Kpi icon={Scale} label="Total received" value={`${fmtNum(totalKg)} kg`} sub={`${fmtNum(siteCount)} sites`} onClick={() => navigate('/commercial/sites')} />
      </div>

      {/* Waste trend */}
      <Card title="Waste Received — last 12 months" icon={TrendingUp}>
        <BarChart data={trend} color="#6366f1" format={n => `${fmtNum(n)} kg`} height={200} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Accounts by status */}
        <Card title="Accounts by Status">
          <div className="flex flex-col items-center gap-3">
            <DonutChart
              segments={[
                { label: 'Active', value: byStatus.active, color: '#10b981' },
                { label: 'Prospect', value: byStatus.prospect, color: '#f59e0b' },
                { label: 'Inactive', value: byStatus.inactive, color: '#9ca3af' },
              ]}
              centerLabel={String(clients.length)}
              centerSub="accounts"
            />
            <div className="flex flex-wrap justify-center gap-3 text-xs">
              <Legend color="#10b981" label="Active" value={byStatus.active} />
              <Legend color="#f59e0b" label="Prospect" value={byStatus.prospect} />
              <Legend color="#9ca3af" label="Inactive" value={byStatus.inactive} />
            </div>
          </div>
        </Card>

        {/* Accounts by industry */}
        <Card title="Top Industries">
          {byIndustry.length === 0 ? (
            <Empty>No industry data yet.</Empty>
          ) : (
            <div className="space-y-2.5 pt-1">
              {byIndustry.map(([name, n], i) => {
                const peak = byIndustry[0][1] || 1;
                return (
                  <div key={name} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span className="truncate">{name}</span>
                      <span className="font-medium text-gray-900">{n}</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(n / peak) * 100}%`, backgroundColor: CRM_PALETTE[i % CRM_PALETTE.length] }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Recent activity */}
        <Card title="Recent Activity" icon={ClipboardList}>
          {recent.length === 0 ? (
            <Empty>No activity logged yet.</Empty>
          ) : (
            <div className="divide-y divide-gray-100 -mx-1">
              {recent.map(a => {
                const Icon = ACTIVITY_ICON[a.type] ?? StickyNote;
                return (
                  <button
                    key={a.id}
                    onClick={() => navigate(`/commercial/clients/${a.client_id}`)}
                    className="w-full flex items-start gap-2.5 px-1 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <div className="p-1.5 bg-indigo-50 rounded-lg flex-shrink-0 mt-0.5"><Icon size={13} className="text-indigo-600" /></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-800 truncate">{a.subject || a.type}</div>
                      <div className="text-[11px] text-gray-400 truncate">{a.client_name} · {fmtDateTime(a.created_at)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* ESG rollup */}
      <Card title="ESG Impact (all approved & draft results)" icon={Leaf}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <EsgTile icon={Leaf} label="CO₂e saved" value={esgTotals.co2e} unit="kg" color="text-emerald-600" />
          <EsgTile icon={Droplets} label="Water saved" value={esgTotals.water} unit="kL" color="text-sky-600" />
          <EsgTile icon={Scale} label="Diesel saved" value={esgTotals.diesel} unit="L" color="text-amber-600" />
          <EsgTile icon={MapPin} label="Km avoided" value={esgTotals.km} unit="km" color="text-indigo-600" />
        </div>
      </Card>
    </div>
  );
}

// ── presentational ─────────────────────────────────────────────────────────────
function Kpi({ icon: Icon, label, value, sub, accent = 'indigo', onClick }: {
  icon: React.ElementType; label: string; value: string; sub?: string;
  accent?: 'indigo' | 'amber' | 'emerald'; onClick?: () => void;
}) {
  const tint = { indigo: 'bg-indigo-50 text-indigo-600', amber: 'bg-amber-50 text-amber-600', emerald: 'bg-emerald-50 text-emerald-600' }[accent];
  return (
    <button onClick={onClick} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3 text-left hover:border-indigo-300 hover:shadow transition">
      <div className={`p-2.5 rounded-lg flex-shrink-0 ${tint}`}><Icon size={20} /></div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-xl font-bold text-gray-900 truncate">{value}</div>
        {sub && <div className="text-[11px] text-gray-400 truncate">{sub}</div>}
      </div>
    </button>
  );
}

function Card({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
        {Icon && <Icon size={15} className="text-indigo-500" />}{title}
      </h3>
      {children}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="flex items-center gap-1.5 text-gray-600">
      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label} <span className="font-semibold text-gray-900">{value}</span>
    </span>
  );
}

function EsgTile({ icon: Icon, label, value, unit, color }: { icon: React.ElementType; label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-3">
      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mb-1"><Icon size={13} className={color} />{label}</div>
      <div className="text-lg font-bold text-gray-900">
        {fmtNum(value, 1)} <span className="text-xs font-normal text-gray-400">{unit}</span>
      </div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-gray-400">{children}</div>;
}
