import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { MonthlyTreatment } from './constants';
import { TreatStat, EmptyChart } from './DashboardStatCards';

export default function TreatmentPanel({ treatmentMonths }: { treatmentMonths: MonthlyTreatment[] }) {
  const chartMonths = treatmentMonths.slice(-6);
  const maxMonthKg = Math.max(...chartMonths.map(m => m.kg), 1);
  const currentMonth = chartMonths[chartMonths.length - 1];
  const prevMonth = chartMonths.length > 1 ? chartMonths[chartMonths.length - 2] : null;
  const trendPct = prevMonth && prevMonth.kg > 0
    ? ((currentMonth?.kg || 0) - prevMonth.kg) / prevMonth.kg * 100
    : 0;

  const thisYear = new Date().getFullYear().toString();
  const totalThisYear = treatmentMonths.filter(m => m.month.startsWith(thisYear)).reduce((s, m) => s + m.kg, 0);
  const bestMonth = treatmentMonths.reduce<MonthlyTreatment | null>((best, m) => (!best || m.kg > best.kg) ? m : best, null);
  const activeMonths = treatmentMonths.filter(m => m.kg > 0);
  const avgMonthly = activeMonths.length > 0
    ? Math.round(activeMonths.reduce((s, m) => s + m.kg, 0) / activeMonths.length)
    : 0;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600"><BarChart3 size={16} /></div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Treatment Output</h2>
            <p className="text-xs text-gray-500">Last 6 months · kg treated</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {trendPct !== 0 && (
            <span className={`flex items-center gap-0.5 font-medium ${trendPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendPct > 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {Math.abs(trendPct).toFixed(0)}%
            </span>
          )}
          <span className="text-gray-400">vs prev month</span>
        </div>
      </div>

      {chartMonths.length > 0 ? (
        <div className="relative overflow-x-auto" style={{ height: 240 }}>
          <div className="absolute inset-0 flex items-end gap-2 pb-6 min-w-min">
            {chartMonths.map((m) => {
              const heightPct = Math.max((m.kg / maxMonthKg) * 100, 10);
              const isCurrentMonth = m === currentMonth;
              const avgPerCycle = m.cycles > 0 ? Math.round(m.kg / m.cycles) : 0;
              const chemDisplay = m.chemicalLitres >= 1000
                ? `${(m.chemicalLitres / 1000).toFixed(1)} kL`
                : `${m.chemicalLitres} L`;
              const showStats = heightPct >= 30;
              return (
                <div key={m.month} className="flex-1 flex flex-col items-center gap-0 relative h-full justify-end">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-500 relative overflow-hidden ${isCurrentMonth ? 'bg-gradient-to-t from-cyan-600 to-cyan-400' : 'bg-gradient-to-t from-cyan-300 to-cyan-200'}`}
                    style={{ height: `${heightPct}%` }}
                  >
                    {showStats && (
                      <div className="absolute inset-x-0 bottom-2 flex flex-col items-center gap-[3px] px-1">
                        {m.chemicalLitres > 0 && (
                          <span className={`text-[9px] leading-tight text-center ${isCurrentMonth ? 'text-cyan-100' : 'text-cyan-700'}`}>
                            {chemDisplay} Chem
                          </span>
                        )}
                        <span className={`text-[9px] leading-tight text-center ${isCurrentMonth ? 'text-cyan-100' : 'text-cyan-700'}`}>
                          {m.activeDays} d Op.
                        </span>
                        <span className={`text-[9px] leading-tight text-center ${isCurrentMonth ? 'text-cyan-100' : 'text-cyan-700'}`}>
                          {avgPerCycle} kg/Cyc
                        </span>
                        <span className={`text-[9px] font-semibold leading-tight text-center ${isCurrentMonth ? 'text-cyan-100' : 'text-cyan-800'}`}>
                          {m.cycles} Cyc
                        </span>
                        <span className={`text-[11px] font-extrabold leading-tight text-center tracking-tight ${isCurrentMonth ? 'text-white' : 'text-cyan-900'}`}>
                          {(m.kg / 1000).toFixed(1)} T
                        </span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[11px] font-semibold mt-1.5 ${isCurrentMonth ? 'text-cyan-700' : 'text-gray-500'}`}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <EmptyChart label="No treatment data yet" />
      )}

      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-2">
        <TreatStat
          label={`Total ${thisYear}`}
          value={totalThisYear >= 1000 ? `${(totalThisYear / 1000).toFixed(1)}t` : `${totalThisYear.toLocaleString()} kg`}
        />
        <TreatStat
          label="Best Month"
          value={bestMonth ? `${(bestMonth.kg / 1000).toFixed(1)}t` : '--'}
          sub={bestMonth?.label ?? ''}
        />
        <TreatStat
          label="Avg Monthly"
          value={avgMonthly >= 1000 ? `${(avgMonthly / 1000).toFixed(1)}t` : `${avgMonthly.toLocaleString()} kg`}
          sub={activeMonths.length > 0 ? `over ${activeMonths.length} months` : ''}
        />
      </div>
    </div>
  );
}
