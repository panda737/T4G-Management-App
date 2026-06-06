import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import type { MonthlyTreatment } from './constants';
import { TreatStat, EmptyChart } from './DashboardStatCards';

export default function TreatmentPanel({
  treatmentMonths,
  treatmentToday,
}: {
  treatmentMonths: MonthlyTreatment[];
  treatmentToday: { kg: number; cycles: number };
}) {
  const maxMonthKg = Math.max(...treatmentMonths.map(m => m.kg), 1);
  const currentMonth = treatmentMonths[treatmentMonths.length - 1];
  const prevMonth = treatmentMonths.length > 1 ? treatmentMonths[treatmentMonths.length - 2] : null;
  const trendPct = prevMonth && prevMonth.kg > 0 ? ((currentMonth?.kg || 0) - prevMonth.kg) / prevMonth.kg * 100 : 0;

  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600"><BarChart3 size={16} /></div>
          <div>
            <h2 className="font-semibold text-gray-900 text-sm">Treatment Output</h2>
            <p className="text-xs text-gray-500">Monthly kg treated</p>
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

      {treatmentMonths.length > 0 ? (
        <div className="relative overflow-x-auto" style={{ height: 260 }}>
          <div className="absolute inset-0 flex items-end gap-2 pb-6 min-w-min">
            {treatmentMonths.map((m) => {
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
                          {avgPerCycle} kg/Cycle
                        </span>
                        <span className={`text-[9px] font-semibold leading-tight text-center ${isCurrentMonth ? 'text-cyan-100' : 'text-cyan-800'}`}>
                          {m.cycles} Cycles
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

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
            {currentMonth ? new Date(currentMonth.month + '-01').toLocaleString('en-ZA', { month: 'long', year: 'numeric' }) : 'This Month'}
          </p>
          {trendPct !== 0 && prevMonth && (
            <span className={`text-[10px] font-medium flex items-center gap-0.5 ${trendPct > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trendPct > 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {Math.abs(trendPct).toFixed(0)}% vs {prevMonth.label}
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <TreatStat
            label="Total Treated"
            value={currentMonth ? `${(currentMonth.kg / 1000).toFixed(2)}t` : '--'}
            sub={currentMonth ? `${currentMonth.kg.toLocaleString()} kg` : ''}
          />
          <TreatStat
            label="Total Cycles"
            value={currentMonth?.cycles ?? '--'}
            sub={currentMonth && currentMonth.activeDays > 0 ? `${(currentMonth.cycles / currentMonth.activeDays).toFixed(1)} /day` : ''}
          />
          <TreatStat
            label="Avg / Cycle"
            value={currentMonth && currentMonth.cycles > 0 ? `${(currentMonth.kg / currentMonth.cycles).toFixed(0)} kg` : '--'}
            sub="per cycle"
          />
          <TreatStat
            label="Active Days"
            value={currentMonth?.activeDays ?? '--'}
            sub={currentMonth ? `of ${new Date(currentMonth.month.substring(0, 4) as unknown as number, parseInt(currentMonth.month.substring(5, 7)), 0).getDate()} days` : ''}
          />
        </div>
        {currentMonth && (currentMonth.chemicalLitres > 0 || currentMonth.downtimeMinutes > 0) && (
          <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-gray-50">
            {currentMonth.chemicalLitres > 0 && (
              <TreatStat
                label="Chemical Used"
                value={`${currentMonth.chemicalLitres.toLocaleString()} L`}
                sub={currentMonth.cycles > 0 ? `${(currentMonth.chemicalLitres / currentMonth.cycles).toFixed(1)} L/cycle` : ''}
              />
            )}
            {currentMonth.downtimeMinutes > 0 && (
              <TreatStat
                label="Downtime"
                value={currentMonth.downtimeMinutes >= 60 ? `${(currentMonth.downtimeMinutes / 60).toFixed(1)}h` : `${currentMonth.downtimeMinutes} min`}
                sub="this month"
              />
            )}
          </div>
        )}
        {(treatmentToday.kg > 0 || treatmentToday.cycles > 0) && (
          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-4">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <span className="text-xs text-gray-500">Today:</span>
            <span className="text-xs font-semibold text-gray-800">{treatmentToday.kg.toLocaleString()} kg</span>
            <span className="text-xs text-gray-400">·</span>
            <span className="text-xs font-semibold text-gray-800">{treatmentToday.cycles} cycles</span>
          </div>
        )}
      </div>
    </div>
  );
}
