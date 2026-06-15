// ─────────────────────────────────────────────────────────────────────────────
// Shared presentational primitives for the customer portal.
//
// Every portal page uses these so the experience reads as one premium, insight-led
// ESG & waste-intelligence portal — not a database viewer. All ESG/readiness copy
// here is methodology-safe: "estimated CO₂e avoided vs autoclave", "treatment-only
// comparison", operational emissions pending verified data, effluent Not Applicable.
// ─────────────────────────────────────────────────────────────────────────────
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Info } from 'lucide-react';

const TONE: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  blue: 'bg-blue-100 text-blue-600',
  gray: 'bg-gray-100 text-gray-600',
  sky: 'bg-sky-100 text-sky-600',
  orange: 'bg-orange-100 text-orange-600',
  green: 'bg-green-100 text-green-600',
  indigo: 'bg-indigo-100 text-indigo-600',
};

/** Strong, consistent page header. `children` renders right-aligned actions/filters. */
export function PageHeader({ icon: Icon, title, subtitle, children }: {
  icon?: LucideIcon; title: string; subtitle?: string; children?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-sm">
            <Icon size={19} className="text-white" />
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {children && <div className="flex items-center gap-2 flex-wrap print:hidden">{children}</div>}
    </div>
  );
}

export function KpiCard({ icon: Icon, tone, value, label, sub }: {
  icon: LucideIcon; tone: string; value: string; label: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${TONE[tone] ?? TONE.gray}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-gray-900 truncate">{value}</p>
        <p className="text-xs text-gray-500 truncate">{label}{sub ? ` · ${sub}` : ''}</p>
      </div>
    </div>
  );
}

/** ESG metric tile. Shows the value once approved, otherwise a clear awaiting note + pill. */
export function EsgKpiCard({ icon: Icon, tone, label, value, unit, has, awaitingNote }: {
  icon: LucideIcon; tone: string; label: string; value: number | null | undefined; unit: string; has: boolean; awaitingNote: string;
}) {
  const show = has && value != null;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${TONE[tone] ?? TONE.gray}`}><Icon size={16} /></div>
        {!show && <StatusPill tone="amber">Awaiting</StatusPill>}
      </div>
      <p className="text-xs text-gray-500">{label}</p>
      {show ? (
        <p className="text-xl font-bold text-gray-900">{value!.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} <span className="text-sm font-normal text-gray-400">{unit}</span></p>
      ) : (
        <p className="text-[11px] text-gray-400 leading-tight mt-0.5">{awaitingNote}</p>
      )}
    </div>
  );
}

export function SectionCard({ title, icon: Icon, right, children }: {
  title: string; icon?: LucideIcon; right?: ReactNode; children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">{Icon && <Icon size={15} className="text-emerald-500" />}{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}

export type PillTone = 'emerald' | 'amber' | 'gray' | 'blue' | 'indigo';

export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  const cls: Record<PillTone, string> = {
    emerald: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    amber: 'text-amber-700 bg-amber-50 border-amber-200',
    gray: 'text-gray-500 bg-gray-100 border-gray-200',
    blue: 'text-blue-700 bg-blue-50 border-blue-200',
    indigo: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  };
  return <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${cls[tone]}`}>{children}</span>;
}

/** Clean empty / awaiting state that explains what is missing rather than going blank. */
export function Awaiting({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-lg px-4 py-5">
      <Info size={15} className="flex-shrink-0 mt-0.5" /> <span>{children}</span>
    </div>
  );
}

/** Compact insight chip — surfaces "highest site / latest month / sites in scope" style facts. */
export function InsightStat({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Icon size={15} /></div>
      <div className="min-w-0">
        <p className="text-[11px] text-gray-400 truncate">{label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      </div>
    </div>
  );
}

export interface ReadinessItem { label: string; value: string; tone: PillTone; icon?: LucideIcon }

export function ReadinessList({ items }: { items: ReadinessItem[] }) {
  return (
    <div className="divide-y divide-gray-100 -my-1">
      {items.map(it => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="flex items-center justify-between gap-3 py-2.5">
            <span className="text-sm text-gray-600 flex items-center gap-2">{Icon && <Icon size={14} className="text-gray-400" />}{it.label}</span>
            <StatusPill tone={it.tone}>{it.value}</StatusPill>
          </div>
        );
      })}
    </div>
  );
}

/** Methodology guardrails — the exact safe wording shown wherever ESG is explained. */
export const METHODOLOGY_POINTS = [
  'Estimated CO₂e avoided vs autoclave',
  'Treatment-only comparison',
  'Operational emissions pending verified operational data',
  'Effluent: Not Applicable — no effluent stream generated',
  'No carbon figures are shown until reviewed and approved.',
];

export function MethodologyPanel() {
  return (
    <ul className="space-y-1.5">
      {METHODOLOGY_POINTS.map(p => (
        <li key={p} className="flex items-start gap-2 text-sm text-gray-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" /> {p}
        </li>
      ))}
    </ul>
  );
}
