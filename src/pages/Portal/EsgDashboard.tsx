import { useEffect, useMemo, useState } from 'react';
import {
  Leaf, Droplets, Fuel, Truck, Zap, Award, ChevronDown, Info, ShieldCheck, Clock,
  Scale, FileText, Building2, CalendarDays,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { type EsgResultCustomerRow, type EsgDataBasis, ESG_DATA_BASIS_LABELS } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { PageSpinner } from '../../components/Spinner';
import { num, kg, fmtDate, monthLabel, usePortalEsg } from './portalUtils';
import { usePortalClient } from './PortalClientContext';
import { usePortalDashboard, periodRange } from './portalApi';
import { PageHeader, KpiCard, SectionCard, ReadinessList, MethodologyPanel } from './portalWidgets';

const BASIS_STYLE: Record<EsgDataBasis, string> = {
  actual: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  admin_actual: 'bg-blue-50 text-blue-700 border-blue-200',
  estimated: 'bg-amber-50 text-amber-700 border-amber-200',
  benchmark: 'bg-violet-50 text-violet-700 border-violet-200',
  awaiting: 'bg-gray-100 text-gray-400 border-gray-200',
};

function Badge({ b }: { b: EsgDataBasis | undefined }) {
  if (!b || b === 'awaiting') return null;
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${BASIS_STYLE[b]}`}>{ESG_DATA_BASIS_LABELS[b]}</span>;
}

export default function EsgDashboard() {
  usePageTitle('Portal — ESG & Sustainability');
  const { clientId, siteId, siteScoped } = usePortalClient();
  const { rows, loading: esgLoading } = usePortalEsg();
  const trendStart = useMemo(() => periodRange('12m').start, []);
  const d = usePortalDashboard(clientId, siteId, null, null, trendStart);
  const [month, setMonth] = useState('');

  useEffect(() => {
    setMonth(rows[0]?.period_month ?? '');
  }, [rows]);

  const months = useMemo(() => Array.from(new Set(rows.map(r => r.period_month))).sort().reverse(), [rows]);
  const current = useMemo(() => rows.find(r => r.period_month === month), [rows, month]);

  const wasteLoaded = (d.summary?.total_kg ?? 0) > 0;
  const activeSites = useMemo(() => d.bySite.filter(s => s.kg > 0).length, [d.bySite]);
  const hasApproved = rows.length > 0;

  if (esgLoading || d.loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Leaf}
        title="ESG & Sustainability"
        subtitle="Your environmental impact with Tech4Green — estimated avoided CO₂e vs an autoclave baseline (treatment-only)."
      >
        {months.length > 0 && (
          <div className="relative">
            <select value={month} onChange={e => setMonth(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              {months.map(m => <option key={m} value={m}>{monthLabel(m.substring(0, 7))}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
      </PageHeader>

      {/* Summary wording — sets the expectation while results are awaiting */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-emerald-900">
        <Info size={16} className="flex-shrink-0 mt-0.5 text-emerald-600" />
        Estimated avoided CO₂e vs autoclave will appear here once Tech4Green has verified and approved the emission factors and monthly results.
      </div>

      {/* Data context — what we have for your account right now */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} tone="emerald" value={`${kg(d.summary?.total_kg ?? 0)} kg`} label="Waste generated" sub="all time" />
        <KpiCard icon={FileText} tone="blue" value={num(d.summary?.manifests ?? 0)} label="Manifests" />
        <KpiCard icon={Building2} tone="amber" value={num(activeSites)} label="Sites in scope" />
        <KpiCard icon={CalendarDays} tone="gray" value={fmtDate(d.summary?.latest_date ?? null)} label="Latest collection" />
      </div>

      {siteScoped && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 flex items-start gap-2 text-sm text-indigo-800">
          <Info size={15} className="flex-shrink-0 mt-0.5" />
          Per-site ESG reporting is coming soon. ESG &amp; sustainability figures are currently calculated at the account level — please use the account login to view approved results.
        </div>
      )}

      {/* Readiness + methodology */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="ESG Readiness" icon={Leaf}>
          <ReadinessList items={[
            { label: 'Waste data loaded', value: wasteLoaded ? 'Loaded' : 'None yet', tone: wasteLoaded ? 'emerald' : 'gray' },
            { label: 'Verified autoclave factor', value: 'Awaiting', tone: 'amber' },
            { label: 'Monthly operational data', value: 'Awaiting', tone: 'amber' },
            { label: 'ESG results', value: hasApproved ? 'Approved' : 'Awaiting approval', tone: hasApproved ? 'emerald' : 'amber' },
            { label: 'Effluent', value: 'Not Applicable', tone: 'gray' },
          ]} />
        </SectionCard>

        <SectionCard title="Methodology" icon={Info}>
          <MethodologyPanel />
        </SectionCard>
      </div>

      {/* Approved monthly results — only render once results are reviewed & approved */}
      {hasApproved && !siteScoped && (
        current ? <EsgMonth row={current} /> : <p className="text-sm text-gray-400">No data for the selected month.</p>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-start gap-2 text-xs text-gray-500">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        Each figure, once published, is tagged with its data basis — <b>Actual</b> (from your waste data), <b>Admin</b> (Tech4Green meter readings), <b>Estimated</b> (modelled) or <b>Benchmark</b> (industry comparison). All figures are reviewed and approved before they appear here.
      </div>
    </div>
  );
}

const TONE: Record<string, string> = {
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  sky: 'bg-sky-50 text-sky-600',
  orange: 'bg-orange-50 text-orange-600',
  indigo: 'bg-indigo-50 text-indigo-600',
  violet: 'bg-violet-50 text-violet-600',
};

function EsgMonth({ row }: { row: EsgResultCustomerRow }) {
  const b = row.data_basis ?? {};
  const cards: { key: string; label: string; value: number | null; unit: string; icon: LucideIcon; tone: string }[] = [
    { key: 'co2e_saved_kg', label: 'Est. CO₂e avoided', value: row.co2e_saved_kg, unit: 'kg', icon: Leaf, tone: 'emerald' },
    { key: 'electricity_saved_kwh', label: 'Electricity saved', value: row.electricity_saved_kwh, unit: 'kWh', icon: Zap, tone: 'amber' },
    { key: 'water_saved_kl', label: 'Water saved', value: row.water_saved_kl, unit: 'kL', icon: Droplets, tone: 'sky' },
    { key: 'diesel_saved_l', label: 'Diesel saved', value: row.diesel_saved_l, unit: 'L', icon: Fuel, tone: 'orange' },
    { key: 'trips_avoided', label: 'Trips avoided', value: row.trips_avoided, unit: '', icon: Truck, tone: 'indigo' },
    { key: 'km_avoided', label: 'Km avoided', value: row.km_avoided, unit: 'km', icon: Truck, tone: 'violet' },
  ];

  const treatment = Object.entries(row.treatment_emissions_by_method ?? {});
  const transport = Object.entries(row.transport_comparison ?? {});

  return (
    <div className="space-y-5">
      {/* Methodology boundary — defensible framing */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-start gap-2 text-xs text-gray-600">
        <Info size={14} className="flex-shrink-0 mt-0.5 text-gray-400" />
        <span><b>Treatment-only comparison vs an autoclave baseline.</b> Operational emissions (electricity, water, diesel, transport) are pending verified operational data. <b>Effluent: Not Applicable</b> — no effluent stream is generated by the Tech4Green process.</span>
      </div>

      {/* Hero: total nett + residual */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl p-5 text-white">
          <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Waste treated</p>
          <p className="text-3xl font-bold mt-1">{num(row.total_nett_kg)} <span className="text-base font-medium">kg</span></p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Est. CO₂e avoided</p><Badge b={b.co2e_saved_kg} /></div>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{row.co2e_saved_kg == null ? '—' : num(row.co2e_saved_kg)} <span className="text-base font-medium text-gray-400">kg</span></p>
          <p className="text-[11px] text-gray-400 mt-1">vs autoclave · treatment-only</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between"><p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Residual footprint</p><Badge b={b.residual_tco2e} /></div>
          <p className="text-3xl font-bold text-gray-900 mt-1">{row.residual_tco2e == null ? '—' : num(row.residual_tco2e)} <span className="text-base font-medium text-gray-400">tCO₂e</span></p>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map(c => {
          const Icon = c.icon;
          const basis = b[c.key] as EsgDataBasis | undefined;
          const awaiting = basis === 'awaiting' || c.value == null;
          return (
            <div key={c.key} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE[c.tone]}`}><Icon size={16} /></div>
                <Badge b={basis} />
              </div>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className="text-xl font-bold text-gray-900">
                {awaiting ? <span className="text-sm font-medium text-gray-300">Awaiting data</span> : <>{num(c.value!)} <span className="text-sm font-normal text-gray-400">{c.unit}</span></>}
              </p>
            </div>
          );
        })}
      </div>

      {/* Carbon credits */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-3">
          <Award size={18} className="text-emerald-600" />
          <h2 className="text-sm font-semibold text-gray-900">Indicative Carbon Credits</h2>
        </div>
        {row.indicative_carbon_credits == null ? (
          <p className="text-sm text-gray-400">Awaiting data.</p>
        ) : (
          <>
            <p className="text-3xl font-bold text-gray-900">{num(row.indicative_carbon_credits)}</p>
            {row.credits_verified ? (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full"><ShieldCheck size={12} /> Registry-verified</p>
            ) : (
              <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full"><Clock size={12} /> Indicative estimate — not verified</p>
            )}
          </>
        )}
      </div>

      {/* Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {treatment.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Treatment emissions by route (kg CO₂e)</h2>
            <div className="space-y-2">
              {treatment.map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{num(Number(val))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {transport.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Transport comparison</h2>
            <div className="space-y-2">
              {transport.map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{label}</span>
                  <span className="font-semibold text-gray-900">{num(Number(val))}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
