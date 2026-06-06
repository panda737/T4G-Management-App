import type { LucideIcon } from 'lucide-react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function KpiCard({ icon: Icon, label, value, change, sub, color, alert }: {
  icon: LucideIcon; label: string; value: string; change?: number; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm ${alert ? 'border-amber-300' : ''}`}>
      <div className="flex items-start gap-2 mb-1.5">
        <div className={`inline-flex p-1.5 rounded-lg ${color} flex-shrink-0 mt-0.5`}><Icon size={14} /></div>
        <div className="min-w-0 flex-1">
          <p className={`text-base font-bold leading-tight ${alert ? 'text-amber-600' : 'text-gray-900'}`}>{value}</p>
          {change !== undefined && change !== 0 && (
            <div className={`flex items-center gap-0.5 text-[10px] font-medium ${change > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {change > 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
              {Math.abs(change).toFixed(1)}%
            </div>
          )}
        </div>
      </div>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
