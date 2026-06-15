// ─────────────────────────────────────────────────────────────────────────────
// Branded, customer-facing A4 report — rendered off-screen and rasterised to PDF
// by downloadElementPagesAsPdf (src/lib/pdf.ts). Each direct child <div> of the
// fragment is ONE A4 page, so keep each page's content within ~A4 height.
//
// Wording is methodology-safe: "Estimated CO₂e avoided vs autoclave",
// "treatment-only comparison", "operational emissions pending verified data",
// "Effluent: Not Applicable" — and avoids any absolute carbon-neutrality or
// whole-footprint savings claim that the operational data has not substantiated.
// ─────────────────────────────────────────────────────────────────────────────
import type { DashSummary, SiteRow, CatRow, EsgSummary } from './portalApi';
import { kg, num, fmtDate } from './portalUtils';

export interface PortalReportProps {
  clientName: string | null;
  periodLabel: string;
  siteLabel: string;
  generatedAt: string;
  summary: DashSummary | null;
  trend: { label: string; value: number }[];
  bySite: SiteRow[];
  byCategory: CatRow[];
  esg: EsgSummary | null;
  hasEsg: boolean;
}

const PAGE = 'bg-white text-gray-900 p-8';
const DISCLAIMER =
  'Waste figures are from manifests Tech4Green received. Carbon is an estimated avoided CO₂e vs an autoclave baseline (treatment-only comparison); ' +
  'operational emissions (electricity, water, diesel, transport) are included only once verified operational data is loaded. ' +
  'Effluent: Not Applicable — no effluent stream is generated. Environmental figures are reviewed and approved before release; ' +
  '“trees equivalent”, where shown, is an illustrative comparison only — not verified offsetting or actual trees planted.';

function Header({ clientName, periodLabel, siteLabel, generatedAt }: { clientName: string | null; periodLabel: string; siteLabel: string; generatedAt: string }) {
  return (
    <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3 mb-5">
      <div className="flex items-center gap-3">
        <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-11 h-11 rounded-lg object-contain" />
        <div>
          <div className="text-xl font-bold text-gray-900">ESG &amp; Sustainability Report</div>
          <div className="text-xs text-gray-500">{periodLabel} · {siteLabel}</div>
        </div>
      </div>
      <div className="text-right text-xs text-gray-500">
        {clientName && <div className="text-sm font-semibold text-gray-800">{clientName}</div>}
        <div>Generated {generatedAt}</div>
        <div>Tech4Green</div>
      </div>
    </div>
  );
}

function Footer({ page }: { page: number }) {
  return (
    <div className="mt-6 pt-3 border-t border-gray-200">
      <p className="text-[9px] leading-snug text-gray-400">{DISCLAIMER}</p>
      <p className="text-[9px] text-gray-400 text-right mt-1">Tech4Green · Page {page}</p>
    </div>
  );
}

export default function PortalReport(p: PortalReportProps) {
  const totalKg = p.bySite.reduce((s, r) => s + r.kg, 0);
  const trendMax = Math.max(1, ...p.trend.map(t => t.value));
  const topSites = [...p.bySite].sort((a, b) => b.kg - a.kg).slice(0, 10);
  const cats = [...p.byCategory].sort((a, b) => b.kg - a.kg).slice(0, 8);

  return (
    <>
      {/* ── PAGE 1: summary + environmental impact ── */}
      <div className={PAGE}>
        <Header clientName={p.clientName} periodLabel={p.periodLabel} siteLabel={p.siteLabel} generatedAt={p.generatedAt} />

        <div className="grid grid-cols-4 gap-3 mb-6">
          <Kpi label="Waste received" value={`${kg(p.summary?.total_kg ?? 0)} kg`} sub={p.periodLabel} />
          <Kpi label="Containers / RUCs" value={num(p.summary?.containers ?? 0)} sub={p.periodLabel} />
          <Kpi label="Manifests" value={num(p.summary?.manifests ?? 0)} sub={p.periodLabel} />
          <Kpi label="Latest received" value={fmtDate(p.summary?.latest_date ?? null)} sub="" />
        </div>

        <div className="rounded-lg border border-gray-200 p-4 mb-2">
          <div className="text-sm font-semibold text-emerald-700 mb-2">Environmental impact — Tech4Green vs autoclave (treatment-only)</div>
          {p.hasEsg && p.esg ? (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Stat label="Estimated CO₂e avoided (vs autoclave)" value={p.esg.co2e_saved_kg != null ? `${num(p.esg.co2e_saved_kg)} kg` : '—'} />
              <Stat label="Waste treated" value={`${num(p.esg.total_nett_kg ?? 0)} kg`} />
              {p.esg.water_saved_kl != null && <Stat label="Water saved" value={`${num(p.esg.water_saved_kl)} kL`} />}
              {p.esg.diesel_saved_l != null && <Stat label="Diesel saved" value={`${num(p.esg.diesel_saved_l)} L`} />}
              {p.esg.trees_equivalent != null && <Stat label="Trees equivalent (illustrative)" value={num(p.esg.trees_equivalent)} />}
            </div>
          ) : (
            <p className="text-xs text-gray-500 leading-relaxed">
              Estimated CO₂e avoided vs an autoclave baseline (treatment-only comparison) will appear here once Tech4Green has
              verified the autoclave emission factor and approved results. Operational emissions (electricity, water, diesel,
              transport) are included only once verified operational data is loaded. <b>Effluent: Not Applicable</b> — no
              effluent stream is generated by the Tech4Green process.
            </p>
          )}
        </div>

        <Footer page={1} />
      </div>

      {/* ── PAGE 2: trend + top sites + categories ── */}
      <div className={PAGE}>
        <Header clientName={p.clientName} periodLabel={p.periodLabel} siteLabel={p.siteLabel} generatedAt={p.generatedAt} />

        <div className="text-sm font-semibold text-gray-800 mb-2">Waste received — last 12 months</div>
        <div className="space-y-1 mb-6">
          {p.trend.map(t => (
            <div key={t.label} className="flex items-center gap-2">
              <span className="w-14 text-[10px] text-gray-500 flex-shrink-0">{t.label}</span>
              <div className="flex-1 h-3 bg-gray-100 rounded">
                <div className="h-3 rounded bg-emerald-500" style={{ width: `${(t.value / trendMax) * 100}%` }} />
              </div>
              <span className="w-20 text-right text-[10px] text-gray-600 tabular-nums">{kg(t.value)} kg</span>
            </div>
          ))}
        </div>

        <div className="text-sm font-semibold text-gray-800 mb-2">Top sites by waste{p.bySite.length > 10 ? ' (top 10)' : ''}</div>
        <table className="w-full text-xs mb-6">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-1 pr-2 font-medium">Site</th>
              <th className="py-1 px-2 font-medium">Province</th>
              <th className="py-1 px-2 font-medium text-right">Nett kg</th>
              <th className="py-1 px-2 font-medium text-right">Containers</th>
              <th className="py-1 pl-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {topSites.map(s => (
              <tr key={s.site_id ?? s.generator_facility} className="border-b border-gray-100">
                <td className="py-1 pr-2 text-gray-800">{s.generator_facility}</td>
                <td className="py-1 px-2 text-gray-500">{s.province || '—'}</td>
                <td className="py-1 px-2 text-right tabular-nums">{kg(s.kg)}</td>
                <td className="py-1 px-2 text-right tabular-nums">{num(s.containers)}</td>
                <td className="py-1 pl-2 text-right tabular-nums text-gray-500">{totalKg > 0 ? ((s.kg / totalKg) * 100).toFixed(1) : '0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-sm font-semibold text-gray-800 mb-2">Waste by category</div>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-gray-500 border-b border-gray-200">
              <th className="py-1 pr-2 font-medium">Category</th>
              <th className="py-1 px-2 font-medium text-right">Nett kg</th>
              <th className="py-1 pl-2 font-medium text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {cats.map(c => (
              <tr key={c.category} className="border-b border-gray-100">
                <td className="py-1 pr-2 text-gray-800">{c.category}</td>
                <td className="py-1 px-2 text-right tabular-nums">{kg(c.kg)}</td>
                <td className="py-1 pl-2 text-right tabular-nums text-gray-500">{totalKg > 0 ? ((c.kg / totalKg) * 100).toFixed(1) : '0'}%</td>
              </tr>
            ))}
          </tbody>
        </table>

        <Footer page={2} />
      </div>
    </>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-base font-bold text-gray-900">{value}</div>
      <div className="text-[10px] text-gray-500">{label}{sub ? ` · ${sub}` : ''}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-gray-50 px-3 py-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-base font-bold text-gray-900">{value}</div>
    </div>
  );
}
