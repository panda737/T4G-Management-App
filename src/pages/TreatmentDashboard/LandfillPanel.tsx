import { Pencil, Trash2 } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { fmtKgTons as fmtKg } from '../../lib/formatters';
import type { TreatmentMonthlySummary } from '../../lib/supabase';
import type { Period } from './constants';

interface LandfillDatum {
  label: string;
  waste: number;
  water: number;
  landfillTotal?: number;
  summary?: TreatmentMonthlySummary;
}

function LandfillRow({ label, value, color, pct }: { label: string; value: number; color: string; pct?: number }) {
  return (
    <div className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs font-medium text-gray-700 flex-1">{label}</span>
      {pct != null && <span className="text-xs text-gray-400">{pct.toFixed(1)}%</span>}
      <span className="text-xs font-semibold text-gray-900">{fmtKg(value)}</span>
    </div>
  );
}

export default function LandfillPanel({
  period,
  landfillData,
  landfillTotal,
  isAdmin,
  onEdit,
  onDelete,
}: {
  period: Period;
  landfillData: LandfillDatum[];
  landfillTotal: number;
  isAdmin?: boolean;
  onEdit?: (summary: TreatmentMonthlySummary) => void;
  onDelete?: (summary: TreatmentMonthlySummary) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5">
      <h2 className="text-sm font-semibold text-gray-900 mb-1">Sent to Landfill</h2>
      <p className="text-xs text-gray-400 mb-4">Mooiplaats Landfill</p>
      {period === 'day' ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <p className="text-sm text-gray-400">Landfill data is recorded monthly</p>
          <p className="text-xs text-gray-300">Switch to Month or Year view</p>
        </div>
      ) : landfillData.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">No landfill data for this period</p>
      ) : period === 'month' ? (
        <>
          <DonutChart
            segments={[
              { label: 'Treated', value: landfillData[0]?.waste || 0, color: '#10b981' },
              { label: 'Water', value: landfillData[0]?.water || 0, color: '#94a3b8' },
            ]}
            centerLabel={fmtKg(landfillTotal)}
            centerSub="Total to Landfill"
          />
          <div className="mt-4 space-y-2">
            <LandfillRow label="Treated" value={landfillData[0]?.waste || 0} color="#10b981" pct={landfillTotal > 0 ? ((landfillData[0]?.waste || 0) / landfillTotal) * 100 : undefined} />
            <LandfillRow label="Water" value={landfillData[0]?.water || 0} color="#94a3b8" pct={landfillTotal > 0 ? ((landfillData[0]?.water || 0) / landfillTotal) * 100 : undefined} />
          </div>
          {isAdmin && landfillData[0]?.summary && (
            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
              <button
                onClick={() => onEdit?.(landfillData[0].summary!)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                <Pencil size={12} /> Edit
              </button>
              <button
                onClick={() => onDelete?.(landfillData[0].summary!)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 size={12} /> Delete
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="space-y-3">
            {landfillData.map((d, i) => {
              const rowTotal = d.landfillTotal ?? (d.waste + d.water);
              const denom = rowTotal || 1;
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-gray-600">{d.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">{fmtKg(rowTotal)}</span>
                      {isAdmin && d.summary && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEdit?.(d.summary!)}
                            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => onDelete?.(d.summary!)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex h-4 rounded-full overflow-hidden bg-gray-100">
                    {d.waste > 0 && <div className="bg-emerald-500 h-full" style={{ width: `${(d.waste / denom) * 100}%` }} />}
                    {d.water > 0 && <div className="bg-gray-400 h-full" style={{ width: `${(d.water / denom) * 100}%` }} />}
                  </div>
                  <div className="flex justify-between mt-0.5 text-[10px] text-gray-400">
                    <span>Treated: {fmtKg(d.waste)}</span>
                    <span>Water: {fmtKg(d.water)} ({((d.water / denom) * 100).toFixed(1)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700">Year Total</span>
            <span className="text-sm font-bold text-gray-900">{fmtKg(landfillTotal)}</span>
          </div>
        </>
      )}
    </div>
  );
}
