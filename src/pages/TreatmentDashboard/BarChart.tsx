import type { TreatmentDailyLog } from '../../lib/supabase';
import type { BarDatum } from './constants';

const BAR_CHART_HEIGHT = 192;

export default function BarChart({
  data,
  selectedDate,
  onBarClick,
}: {
  data: BarDatum[];
  selectedDate: string;
  onBarClick: (log: TreatmentDailyLog | null, monthPrefix?: string) => void;
}) {
  const max = Math.max(...data.map(d => d.total), 1);

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-[3px] min-w-[400px]" style={{ height: BAR_CHART_HEIGHT + 20 }}>
        {data.map((d, i) => {
          const barH = max > 0 ? Math.max((d.total / max) * BAR_CHART_HEIGHT, d.total === 0 ? 2 : 6) : 2;
          const isSelected = d.log
            ? d.log.date === selectedDate
            : !!selectedDate && selectedDate.length >= 7 && selectedDate.substring(5, 7) === String(i + 1).padStart(2, '0');
          const dayH = d.total > 0 ? (d.dayKg / d.total) * barH : 0;
          const aftH = d.total > 0 ? (d.aftKg / d.total) * barH : 0;
          const nightH = barH - dayH - aftH;
          const monthPrefix = !d.log && selectedDate.length >= 4
            ? `${selectedDate.substring(0, 4)}-${String(i + 1).padStart(2, '00')}`
            : undefined;

          return (
            <div
              key={i}
              className={`flex-1 flex flex-col items-end min-w-0 group ${d.isFuture ? 'cursor-default opacity-40' : 'cursor-pointer'}`}
              style={{ height: BAR_CHART_HEIGHT + 20 }}
              onClick={() => !d.isFuture && onBarClick(d.log, monthPrefix)}
            >
              <div className="flex-1 flex items-end w-full">
                {d.total === 0 ? (
                  <div className={`w-full rounded-t ${d.isFuture ? 'bg-gray-50' : 'bg-gray-100'}`} style={{ height: 2 }} />
                ) : (
                  <div
                    className={`w-full rounded-t overflow-hidden flex flex-col-reverse transition-all duration-200 ${isSelected ? 'ring-2 ring-emerald-800 ring-offset-1' : 'group-hover:opacity-90'}`}
                    style={{ height: barH }}
                  >
                    {dayH > 0 && (
                      <div style={{ height: dayH, backgroundColor: d.hasDowntime ? '#f59e0b' : '#059669' }} />
                    )}
                    {aftH > 0 && (
                      <div style={{ height: aftH, backgroundColor: d.hasDowntime ? '#fbbf24' : '#34d399' }} />
                    )}
                    {nightH > 0.5 && (
                      <div style={{ height: nightH, backgroundColor: d.hasDowntime ? '#fcd34d' : '#a7f3d0' }} />
                    )}
                  </div>
                )}
              </div>
              <span className={`text-[9px] mt-1 truncate w-full text-center leading-none ${isSelected ? 'font-bold text-emerald-700' : 'text-gray-400'}`}>{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
