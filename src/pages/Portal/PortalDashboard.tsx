import { useMemo, useRef, useState } from 'react';
import {
  Scale, Boxes, FileText, CalendarDays, Leaf, Droplets, Fuel, TreePine,
  ChevronDown, Printer, Download, Info, MapPin, TrendingUp, Recycle, Building2,
  CalendarRange, Layers, ClipboardCheck, Gauge,
} from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { PageSpinner } from '../../components/Spinner';
import { BarChart, fmtNum, CRM_PALETTE, monthBuckets } from '../../components/crm';
import { usePageTitle } from '../../lib/usePageTitle';
import { usePortalClient } from './PortalClientContext';
import { kg, num, fmtDate, colorFor, monthLabel } from './portalUtils';
import { usePortalDashboard, usePortalSites, periodRange, type PeriodKey, type EsgSummary } from './portalApi';
import { exportDashboardSites } from './portalExport';
import {
  PageHeader, KpiCard, EsgKpiCard, SectionCard, StatusPill, Awaiting, InsightStat, ReadinessList,
} from './portalWidgets';
import PortalReport from './PortalReport';

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: 'This month' },
  { key: 'ytd', label: 'Year to date' },
  { key: '12m', label: 'Last 12 months' },
  { key: 'all', label: 'All time' },
];

export default function PortalDashboard() {
  usePageTitle('Portal — ESG & Sustainability Dashboard');
  const { clientId, siteId: ctxSiteId, adminPreview, siteScoped, clientName } = usePortalClient();

  const [periodKey, setPeriodKey] = useState<PeriodKey>('12m');
  const [localSiteId, setLocalSiteId] = useState<string>('');
  const [generating, setGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const sites = usePortalSites(adminPreview ? clientId : null);

  const { start, end, label } = useMemo(() => periodRange(periodKey), [periodKey]);
  const trendStart = useMemo(() => periodRange('12m').start, []);
  const siteId = adminPreview ? ctxSiteId : (localSiteId || null);

  const d = usePortalDashboard(clientId, siteId, start, end, trendStart);
  const allocated = siteScoped || !!siteId;
  const hasEsg = !!d.esg && d.esg.months > 0;

  const trend = useMemo(() => {
    const map = new Map(d.byMonth.map(p => [p.month, p.kg]));
    return monthBuckets(12).map(b => ({ label: b.label, value: map.get(b.key) ?? 0 }));
  }, [d.byMonth]);

  const bySiteSorted = useMemo(() => [...d.bySite].sort((a, b) => b.kg - a.kg), [d.bySite]);
  const byCatSorted = useMemo(() => [...d.byCategory].sort((a, b) => b.kg - a.kg), [d.byCategory]);
  const totalKg = useMemo(() => d.bySite.reduce((s, r) => s + r.kg, 0), [d.bySite]);
  const activeSites = useMemo(() => d.bySite.filter(s => s.kg > 0).length, [d.bySite]);

  const latestMonthLabel = d.summary?.latest_date ? monthLabel(d.summary.latest_date.slice(0, 7)) : '—';
  const siteLabel = siteId ? (sites.find(s => s.id === siteId)?.label ?? 'Selected site') : 'All sites';
  const scope = `${periodKey}${siteId ? '-site' : ''}`;

  function handleExportData() {
    if (!exportDashboardSites(d.bySite, scope)) alert('No data in the current selection to export.');
  }

  async function handleGenerateReport() {
    if (!reportRef.current) return;
    setGenerating(true);
    try {
      const { downloadElementPagesAsPdf } = await import('../../lib/pdf');
      await downloadElementPagesAsPdf(reportRef.current, `t4g-esg-report-${scope}-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      window.print(); // fallback
    } finally {
      setGenerating(false);
    }
  }

  if (d.loading) return <PageSpinner layout="h64" />;

  const coverage: [string, string][] = [
    ['Waste records', num(d.summary?.rows ?? 0)],
    ['Manifests', num(d.summary?.manifests ?? 0)],
    ['Active sites in scope', num(activeSites)],
    ['Latest collection', fmtDate(d.summary?.latest_date ?? null)],
  ];

  const reportReady = (d.summary?.total_kg ?? 0) > 0;

  return (
    <div className="space-y-5">
      {/* Header + filters */}
      <PageHeader
        icon={Leaf}
        title="ESG & Sustainability Dashboard"
        subtitle={`${clientName ? `${clientName} · ` : ''}${label} · waste generated & environmental impact`}
      >
        {!adminPreview && sites.length > 0 && (
          <div className="relative">
            <select value={localSiteId} onChange={e => setLocalSiteId(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">All sites</option>
              {sites.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}
        <div className="relative">
          <select value={periodKey} onChange={e => setPeriodKey(e.target.value as PeriodKey)}
            className="appearance-none bg-white border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button onClick={handleExportData} className="inline-flex items-center gap-1.5 text-sm bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg px-3 py-2 font-medium">
          <Download size={15} /> Export Data
        </button>
        <button onClick={handleGenerateReport} disabled={generating} className="inline-flex items-center gap-1.5 text-sm bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg px-3 py-2 font-medium disabled:opacity-50">
          <Printer size={15} /> {generating ? 'Generating…' : 'Generate Report'}
        </button>
      </PageHeader>

      {d.error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 text-sm text-amber-800">
          Some data couldn’t load: {d.error}
        </div>
      )}

      {/* KPI tiles — waste generated */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard icon={Scale} tone="emerald" value={`${kg(d.summary?.total_kg ?? 0)} kg`} label="Waste generated" sub={label} />
        <KpiCard icon={Boxes} tone="amber" value={num(d.summary?.containers ?? 0)} label="Containers / RUCs" sub={label} />
        <KpiCard icon={FileText} tone="blue" value={num(d.summary?.manifests ?? 0)} label="Manifests" sub={label} />
        <KpiCard icon={CalendarDays} tone="gray" value={fmtDate(d.summary?.latest_date ?? null)} label="Latest collection" />
      </div>

      {/* At a glance — insight labels */}
      <SectionCard title="At a Glance" icon={Gauge}>
        {totalKg === 0 ? (
          <Awaiting>No waste generated in this period yet. Insights appear once collection data is loaded for your account.</Awaiting>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
            <InsightStat icon={Building2} label="Highest generating site" value={bySiteSorted[0]?.generator_facility || '—'} />
            <InsightStat icon={Recycle} label="Highest waste category" value={byCatSorted[0]?.category || '—'} />
            <InsightStat icon={CalendarRange} label="Latest reporting month" value={latestMonthLabel} />
            <InsightStat icon={MapPin} label="Active sites in scope" value={num(activeSites)} />
            <InsightStat icon={Layers} label="Waste records" value={num(d.summary?.rows ?? 0)} />
            <InsightStat icon={FileText} label="Manifests" value={num(d.summary?.manifests ?? 0)} />
          </div>
        )}
      </SectionCard>

      {/* Environmental impact (ESG) — awaiting until approved */}
      <SectionCard
        title="Environmental Impact — vs autoclave (treatment-only)"
        icon={Leaf}
        right={<StatusPill tone={hasEsg ? 'emerald' : 'amber'}>{hasEsg ? 'ESG results approved' : 'Awaiting verified factors & results'}</StatusPill>}
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <EsgKpiCard icon={Leaf} tone="emerald" label="CO₂e avoided" value={d.esg?.co2e_saved_kg} unit="kg CO₂e" has={hasEsg} awaitingNote="Awaiting verification" />
          <EsgKpiCard icon={Droplets} tone="sky" label="Water saved" value={d.esg?.water_saved_kl} unit="kL" has={hasEsg} awaitingNote="Awaiting verified operational data" />
          <EsgKpiCard icon={Fuel} tone="orange" label="Diesel saved" value={d.esg?.diesel_saved_l} unit="L" has={hasEsg} awaitingNote="Awaiting verified operational data" />
          <EsgKpiCard icon={TreePine} tone="green" label="Trees equivalent" value={d.esg?.trees_equivalent} unit="trees" has={hasEsg} awaitingNote="Awaiting approved ESG results" />
        </div>
      </SectionCard>

      {/* Tech4Green vs Autoclave */}
      <SectionCard title="Tech4Green vs Autoclave — treatment-only comparison" icon={TrendingUp}
        right={allocated ? <StatusPill tone="indigo">Allocated estimate (site share)</StatusPill> : undefined}>
        {hasEsg ? <Comparison esg={d.esg!} /> : <Awaiting>Estimated avoided CO₂e vs an autoclave baseline appears once Tech4Green has computed and approved ESG results for this account. Water, electricity &amp; diesel comparisons follow once verified operational data is loaded.</Awaiting>}
      </SectionCard>

      {/* Monthly trend */}
      <SectionCard title="Waste Generated — last 12 months" icon={TrendingUp}>
        <BarChart data={trend} color="#10b981" format={(v: number) => `${fmtNum(v)} kg`} height={200} />
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* By category */}
        <SectionCard title="Waste by Category" icon={Recycle}>
          {byCatSorted.length === 0 ? <Awaiting>No waste generated in this period.</Awaiting> : (
            <>
              <DonutChart
                segments={byCatSorted.slice(0, 8).map((c, i) => ({ label: c.category, value: c.kg, color: colorFor(c.category, i) }))}
                centerLabel={kg(totalKg)} centerSub="kg total"
              />
              <BreakdownList items={byCatSorted.map(c => [c.category, c.kg] as [string, number])} total={totalKg} unit="kg" />
            </>
          )}
        </SectionCard>

        {/* Treatment split — only when tagged, else site contribution */}
        {d.byTreatment.length > 0 ? (
          <SectionCard title="Treatment Breakdown (by weight)" icon={Layers}>
            <DonutChart
              segments={d.byTreatment.map((t, i) => ({ label: t.treatment_method, value: t.kg, color: colorFor(t.treatment_method, i) }))}
              centerLabel={kg(d.byTreatment.reduce((s, t) => s + t.kg, 0))} centerSub="kg total"
            />
            <BreakdownList items={d.byTreatment.map(t => [t.treatment_method, t.kg] as [string, number])} total={d.byTreatment.reduce((s, t) => s + t.kg, 0)} unit="kg" />
          </SectionCard>
        ) : (
          <SectionCard title="Site Contribution by Waste Generated" icon={Building2}>
            {bySiteSorted.length === 0 ? <Awaiting>No waste generated in this period.</Awaiting> : (
              <BreakdownList items={bySiteSorted.slice(0, 12).map(s => [s.generator_facility, s.kg] as [string, number])} total={totalKg} unit="kg" />
            )}
          </SectionCard>
        )}
      </div>

      {/* Top generating sites table */}
      <SectionCard title="Top Generating Sites" icon={MapPin}
        right={allocated && hasEsg ? <StatusPill tone="indigo">CO₂e allocated by site share</StatusPill> : undefined}>
        {bySiteSorted.length === 0 ? <Awaiting>No site data in this period.</Awaiting> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider text-gray-400 border-b border-gray-100">
                  <th className="py-2 pr-3 font-medium">Site</th>
                  <th className="py-2 px-3 font-medium">Province</th>
                  <th className="py-2 px-3 font-medium text-right">Waste generated (kg)</th>
                  <th className="py-2 px-3 font-medium text-right">Containers</th>
                  <th className="py-2 pl-3 font-medium text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {bySiteSorted.slice(0, 10).map(s => (
                  <tr key={s.site_id ?? s.generator_facility} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-3 font-medium text-gray-800">{s.generator_facility}</td>
                    <td className="py-2 px-3 text-gray-500">{s.province || '—'}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">{kg(s.kg)}</td>
                    <td className="py-2 px-3 text-right tabular-nums text-gray-700">{num(s.containers)}</td>
                    <td className="py-2 pl-3 text-right tabular-nums text-gray-500">{totalKg > 0 ? ((s.kg / totalKg) * 100).toFixed(1) : '0'}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* Recent manifests */}
      <SectionCard title="Recent Manifests" icon={FileText}>
        {d.recent.length === 0 ? <Awaiting>No manifests in scope.</Awaiting> : (
          <div className="divide-y divide-gray-100 -my-1">
            {d.recent.map((m, i) => (
              <div key={`${m.manifest}-${i}`} className="flex items-center gap-3 py-2">
                <div className="p-1.5 bg-emerald-50 rounded-lg flex-shrink-0"><FileText size={13} className="text-emerald-600" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-800 truncate">{m.manifest || '(no manifest #)'}</div>
                  <div className="text-[11px] text-gray-400 truncate">{m.generator_facility} · {m.category}</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-semibold text-gray-900">{kg(m.kg)} kg</div>
                  <div className="text-[11px] text-gray-400">{fmtDate(m.received_date)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Data coverage + ESG readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Data Coverage" icon={ClipboardCheck}
          right={<StatusPill tone={reportReady ? 'emerald' : 'gray'}>{reportReady ? 'Report ready' : 'Awaiting data'}</StatusPill>}>
          <div className="divide-y divide-gray-100 -my-1">
            {coverage.map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="text-gray-600">{k}</span>
                <span className="font-semibold text-gray-900">{v}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="ESG Readiness" icon={Leaf}>
          <ReadinessList items={[
            { label: 'Waste data loaded', value: reportReady ? 'Loaded' : 'None yet', tone: reportReady ? 'emerald' : 'gray' },
            { label: 'Verified autoclave factor', value: 'Awaiting', tone: 'amber' },
            { label: 'Monthly operational data', value: 'Awaiting', tone: 'amber' },
            { label: 'ESG results', value: hasEsg ? 'Approved' : 'Awaiting approval', tone: hasEsg ? 'emerald' : 'amber' },
            { label: 'Effluent', value: 'Not Applicable', tone: 'gray' },
          ]} />
        </SectionCard>
      </div>

      {/* ESG performance summary */}
      <SectionCard title="ESG Performance Summary" icon={Leaf}>
        {hasEsg ? (
          <p className="text-sm text-gray-600 leading-relaxed">
            Over {label.toLowerCase()}, Tech4Green treated <b>{kg(d.esg!.total_nett_kg ?? 0)} kg</b> of waste{allocated ? ' (allocated to your visible sites)' : ''},
            an estimated <b>{kg(d.esg!.co2e_saved_kg ?? 0)} kg CO₂e avoided</b> versus an autoclave baseline (treatment-only comparison)
            {d.esg!.water_saved_kl != null && <>, plus <b>{num(d.esg!.water_saved_kl)} kL of water</b></>}
            {d.esg!.trees_equivalent != null && <> — roughly equivalent to <b>{num(d.esg!.trees_equivalent)} trees</b> (illustrative only, not verified offsetting)</>}.
            Operational emissions (electricity, water, diesel, transport) are included only once verified operational data is loaded. Thank you for choosing sustainable healthcare waste treatment.
          </p>
        ) : (
          <Awaiting>Your ESG performance summary appears here once Tech4Green has verified the autoclave baseline factor and approved results for your account — no estimates are shown until then.</Awaiting>
        )}
      </SectionCard>

      <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 flex items-start gap-2 text-xs text-gray-500">
        <Info size={14} className="flex-shrink-0 mt-0.5" />
        Waste figures are from the manifests for your sites. Carbon is an <b>estimated avoided CO₂e vs an autoclave baseline (treatment-only comparison)</b>; operational emissions (electricity, water, diesel, transport) are included only once verified operational data is loaded. Effluent is <b>Not Applicable</b> — no effluent stream is generated. All environmental figures are reviewed and approved before they appear, and "trees equivalent" is an illustrative comparison only — not verified carbon offsetting or actual trees planted.
      </div>

      {/* Off-screen branded report — rasterised to PDF by Generate Report. */}
      <div ref={reportRef} className="hidden" aria-hidden="true">
        <PortalReport
          clientName={clientName}
          periodLabel={label}
          siteLabel={siteLabel}
          generatedAt={new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
          summary={d.summary}
          trend={trend}
          bySite={bySiteSorted}
          byCategory={byCatSorted}
          esg={d.esg}
          hasEsg={hasEsg}
        />
      </div>
    </div>
  );
}

// ── comparison strip ─────────────────────────────────────────────────────────
function Comparison({ esg }: { esg: EsgSummary }) {
  const rows: { label: string; t4g: number | null; saved: number | null; unit: string }[] = [
    { label: 'CO₂e', t4g: esg.residual_tco2e, saved: esg.co2e_saved_kg != null ? esg.co2e_saved_kg / 1000 : null, unit: 'tCO₂e' },
    { label: 'Water', t4g: esg.t4g_water_kl, saved: esg.water_saved_kl, unit: 'kL' },
    { label: 'Electricity', t4g: esg.t4g_electricity_kwh, saved: esg.electricity_saved_kwh, unit: 'kWh' },
    { label: 'Diesel', t4g: esg.t4g_diesel_l, saved: esg.diesel_saved_l, unit: 'L' },
    { label: 'Trips', t4g: esg.t4g_trips, saved: esg.trips_avoided, unit: '' },
  ];
  const shown = rows.filter(r => r.t4g != null && r.saved != null);
  if (shown.length === 0) return <Awaiting>Comparison figures need approved operational data for this account.</Awaiting>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {shown.map(r => {
        const conv = (r.t4g ?? 0) + (r.saved ?? 0);
        const pct = conv > 0 ? Math.round(((r.saved ?? 0) / conv) * 100) : 0;
        return (
          <div key={r.label} className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-600 mb-1.5">{r.label}{r.unit ? ` (${r.unit})` : ''}</div>
            <Bar label="Tech4Green" value={r.t4g ?? 0} max={conv} color="bg-emerald-500" />
            <Bar label="Conventional" value={conv} max={conv} color="bg-gray-300" />
            <div className="text-[11px] font-semibold text-emerald-700 mt-1">{pct}% lower</div>
          </div>
        );
      })}
    </div>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span className="w-20 text-[10px] text-gray-500 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
      </div>
      <span className="w-16 text-right text-[10px] font-medium text-gray-700 tabular-nums">{fmtNum(value, 1)}</span>
    </div>
  );
}

function BreakdownList({ items, total, unit }: { items: [string, number][]; total: number; unit: string }) {
  if (items.length === 0) return <p className="text-sm text-gray-400 text-center py-4">No data</p>;
  return (
    <div className="mt-3 space-y-2">
      {items.slice(0, 12).map(([k, v], i) => (
        <div key={k} className="flex items-center gap-3 py-1 border-b border-gray-50 last:border-0">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CRM_PALETTE[i % CRM_PALETTE.length] }} />
          <span className="text-xs font-medium text-gray-700 flex-1 truncate">{k}</span>
          <span className="text-xs font-semibold text-gray-900">{num(v)}{unit ? ` ${unit}` : ''}</span>
          <span className="text-[10px] text-gray-400 w-10 text-right">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
        </div>
      ))}
    </div>
  );
}
