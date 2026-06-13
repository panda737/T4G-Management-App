import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Scale, Boxes, Building2, CalendarDays } from 'lucide-react';
import { supabase, type Client, type ClientSite, type ReceivedWasteRecord, type EsgResult } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageSpinner } from '../../components/Spinner';
import DonutChart from '../../components/DonutChart';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';

const kg = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 });
const fmtDate = (d: string | null) => d ? new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

type EnrichedRecord = ReceivedWasteRecord & { category_name: string; site_name: string; container_name: string };

const PALETTE = ['#10b981','#f59e0b','#ef4444','#0ea5e9','#a855f7','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#6b7280'];
const colorFor = (_k: string, i: number) => PALETTE[i % PALETTE.length];

function sumBy<T>(rows: T[], group: (r: T) => string, value: (r: T) => number): [string, number][] {
  const map: Record<string, number> = {};
  rows.forEach(r => { const k = group(r) || '—'; map[k] = (map[k] || 0) + value(r); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

type Tab = 'overview' | 'records' | 'sites' | 'esg';

export default function ClientView() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  usePageTitle('Commercial — Client View');

  const [client, setClient] = useState<Client | null>(null);
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [esgResults, setEsgResults] = useState<EsgResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');

  useEffect(() => { if (clientId) load(); }, [clientId]);

  async function load() {
    setLoading(true);
    const [cRes, rRes, sitesRes, catsRes, contsRes, esgRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId!).maybeSingle(),
      supabase.from('received_waste_records').select('*').eq('client_id', clientId!).eq('import_status', 'imported').order('received_date', { ascending: false }),
      supabase.from('client_sites').select('*').eq('client_id', clientId!).order('generator_facility'),
      supabase.from('waste_categories').select('id, waste_category_name'),
      supabase.from('container_types').select('id, container_type_name'),
      supabase.from('esg_results').select('*').eq('client_id', clientId!).order('period_month', { ascending: false }),
    ]);

    setClient(cRes.data as Client | null);
    setSites((sitesRes.data ?? []) as ClientSite[]);
    setEsgResults((esgRes.data ?? []) as EsgResult[]);

    const catMap = new Map<string, string>();
    (catsRes.data ?? []).forEach((c: { id: string; waste_category_name: string }) => catMap.set(c.id, c.waste_category_name));
    const contMap = new Map<string, string>();
    (contsRes.data ?? []).forEach((c: { id: string; container_type_name: string }) => contMap.set(c.id, c.container_type_name));
    const siteMap = new Map<string, string>();
    (sitesRes.data ?? []).forEach((s: { id: string; generator_facility: string }) => siteMap.set(s.id, s.generator_facility));

    const enriched = ((rRes.data ?? []) as ReceivedWasteRecord[]).map(r => ({
      ...r,
      category_name: r.waste_category_id ? (catMap.get(r.waste_category_id) ?? '—') : '—',
      site_name: r.site_id ? (siteMap.get(r.site_id) ?? '—') : '—',
      container_name: r.container_type_id ? (contMap.get(r.container_type_id) ?? '—') : '—',
    }));
    setRecords(enriched);
    setLoading(false);
  }

  const stats = useMemo(() => {
    const totalKg = records.reduce((s, r) => s + Number(r.nett_weight_kg), 0);
    const totalContainers = records.reduce((s, r) => s + Number(r.containers_received), 0);
    const latest = records[0]?.received_date ?? null;
    return { totalKg, totalContainers, latest, count: records.length };
  }, [records]);

  const byCategory = useMemo(() => sumBy(records, r => r.category_name, r => Number(r.nett_weight_kg)), [records]);
  const bySite = useMemo(() => sumBy(records, r => r.site_name, r => Number(r.nett_weight_kg)), [records]);

  if (loading) return <PageSpinner layout="h64" />;
  if (!client) return <div className="p-10 text-center text-sm text-gray-400">Client not found.</div>;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'records', label: `Waste Records (${records.length})` },
    { id: 'sites', label: `Sites (${sites.length})` },
    { id: 'esg', label: `ESG Results (${esgResults.length})` },
  ];

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/commercial/clients')}
          className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition"
          title="Back to clients"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{client.client_name}</h1>
          {client.client_code && <p className="text-sm text-gray-400">{client.client_code}</p>}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} label="Total received" value={`${kg(stats.totalKg)} kg`} />
        <KpiCard icon={Boxes} label="Total containers" value={stats.totalContainers.toLocaleString('en-ZA')} />
        <KpiCard icon={Building2} label="Sites" value={String(sites.length)} />
        <KpiCard icon={CalendarDays} label="Latest delivery" value={fmtDate(stats.latest)} />
      </div>

      {/* Local tab bar */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-1 -mb-px overflow-x-auto">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {tab === 'overview' && (
        records.length === 0
          ? <Empty>No waste records for this client yet.</Empty>
          : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <Card title="By Waste Category">
                <DonutChart
                  segments={byCategory.map(([k, v], i) => ({ label: k, value: v, color: colorFor(k, i) }))}
                  centerLabel={`${kg(stats.totalKg)}`} centerSub="kg total"
                />
              </Card>
              <Card title="By Site">
                <DonutChart
                  segments={bySite.map(([k, v], i) => ({ label: k, value: v, color: colorFor(k, i) }))}
                  centerLabel={`${sites.length}`} centerSub="sites"
                />
              </Card>
            </div>
          )
      )}

      {/* Waste Records */}
      {tab === 'records' && (
        records.length === 0
          ? <Empty>No waste records for this client yet.</Empty>
          : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white text-[11px] uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-medium">Date</th>
                      <th className="text-left px-4 py-2.5 font-medium">Manifest</th>
                      <th className="text-left px-4 py-2.5 font-medium">Site</th>
                      <th className="text-left px-4 py-2.5 font-medium">Category</th>
                      <th className="text-left px-4 py-2.5 font-medium">Container</th>
                      <th className="text-right px-4 py-2.5 font-medium">Containers</th>
                      <th className="text-right px-4 py-2.5 font-medium">Nett kg</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {records.map((r, i) => (
                      <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                        <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{fmtDate(r.received_date)}</td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.waste_manifest_tracking_number}</td>
                        <td className="px-4 py-2.5 text-gray-700">{r.site_name}</td>
                        <td className="px-4 py-2.5 text-gray-700">{r.category_name}</td>
                        <td className="px-4 py-2.5 text-gray-700">{r.container_name}</td>
                        <td className="px-4 py-2.5 text-right text-gray-700">{r.containers_received}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{kg(Number(r.nett_weight_kg))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* Sites */}
      {tab === 'sites' && (
        sites.length === 0
          ? <Empty>No sites linked to this client yet.</Empty>
          : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-800 text-white text-[11px] uppercase tracking-wider">
                      <th className="text-left px-4 py-2.5 font-medium">Facility</th>
                      <th className="text-left px-4 py-2.5 font-medium">Group</th>
                      <th className="text-left px-4 py-2.5 font-medium">Site Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sites.map((s, i) => (
                      <tr key={s.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{s.generator_facility}</td>
                        <td className="px-4 py-2.5 text-gray-500">{s.generator_group || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{s.site_code || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
      )}

      {/* ESG Results */}
      {tab === 'esg' && (
        esgResults.length === 0
          ? <Empty>No ESG results yet. Run the ESG engine under Commercial → ESG Engine.</Empty>
          : (
            <div className="space-y-3">
              {esgResults.map(r => (
                <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 ${r.approved ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-gray-800">
                      {new Date(r.period_month).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                    </span>
                    {r.approved
                      ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Approved — visible to client</span>
                      : <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Draft</span>}
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <EsgTile label="CO₂e saved" value={r.co2e_saved_kg} unit="kg" />
                    <EsgTile label="Residual" value={r.residual_tco2e} unit="tCO₂e" />
                    <EsgTile label="Water saved" value={r.water_saved_kl} unit="kL" />
                    <EsgTile label="Diesel saved" value={r.diesel_saved_l} unit="L" />
                  </div>
                </div>
              ))}
            </div>
          )
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-indigo-50 rounded-lg"><Icon size={18} className="text-indigo-600" /></div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}

function EsgTile({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-900">
        {value == null
          ? <span className="text-gray-300">—</span>
          : <>{Number(value).toLocaleString('en-ZA', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400">{unit}</span></>}
      </div>
    </div>
  );
}
