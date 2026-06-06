import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export function KpiCard({ icon: Icon, label, value, lightBg, sub }: {
  icon: LucideIcon; label: string; value: string | number; color: string; lightBg: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <div className={`inline-flex p-2 rounded-lg ${lightBg} flex-shrink-0 mt-0.5`}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
      </div>
    </div>
  );
}

export function TreatStat({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-cyan-50/60 rounded-lg px-2.5 py-2 border border-cyan-100">
      <p className="text-[9px] text-cyan-700 font-semibold uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm font-bold text-gray-900 leading-tight">{value}</p>
      {sub && <p className="text-[10px] text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

export function StatusRow({ icon: Icon, label, value, total, color, barColor, bgColor }: {
  icon: LucideIcon; label: string; value: number; total: number; color: string; barColor: string; bgColor: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  const inversePct = total > 0 ? Math.round(((total - value) / total) * 100) : 100;
  const showInverse = label.includes('Overdue') || label.includes('Open');
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <Icon size={14} className={color} />
          <span className="text-xs font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-xs font-bold ${color}`}>{value}{total > 0 ? ` / ${total}` : ''}</span>
      </div>
      <div className={`h-2 ${bgColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-700`}
          style={{ width: `${showInverse ? inversePct : (total > 0 ? pct : 100)}%` }}
        />
      </div>
    </div>
  );
}

export function LegendRow({ color, label, value, alert }: { color: string; label: string; value: number; alert?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-xs text-gray-600">{label}</span>
      </div>
      <span className={`text-xs font-bold ${alert ? 'text-red-600' : 'text-gray-900'}`}>{value}</span>
    </div>
  );
}

export function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}

export function QuickAction({ icon: Icon, label, onClick, color }: {
  icon: LucideIcon; label: string; onClick: () => void; color: string;
}) {
  const [iconColor, iconBg] = color.split(' ');
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors text-left group"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconBg} flex-shrink-0`}>
        <Icon size={15} className={iconColor} />
      </div>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 font-medium">{label}</span>
      <ArrowRight size={13} className="ml-auto text-gray-300 group-hover:text-gray-500 transition-colors" />
    </button>
  );
}
