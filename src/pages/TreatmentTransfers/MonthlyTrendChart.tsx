import { fmtKgCompact as fmtKg } from '../../lib/formatters';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthLabel(ym: string) {
  const [y, m] = ym.split('-');
  return `${MONTH_ABBR[Number(m) - 1]} '${y.slice(2)}`;
}

export interface MonthlyDatum {
  month: string;                       // YYYY-MM
  segments: Record<string, number>;    // key -> kg
  total: number;
}

interface MonthlyTrendChartProps {
  data: MonthlyDatum[];
  stackKeys: string[];
  colors: Record<string, string>;
}

const BAR_AREA = 180;

export default function MonthlyTrendChart({ data, stackKeys, colors }: MonthlyTrendChartProps) {
  const max = Math.max(1, ...data.map(d => d.total));

  return (
    <div>
      <p className="text-[10px] text-gray-400 mb-1">Peak: {fmtKg(max)} kg</p>
      <div className="overflow-x-auto pb-1">
        <div className="flex items-stretch gap-2" style={{ minWidth: '100%' }}>
          {data.map(d => {
            const pct = (d.total / max) * 100;
            return (
              <div key={d.month} className="flex-1 min-w-[34px] flex flex-col items-center gap-1.5 group">
                <div className="relative w-full flex items-end justify-center" style={{ height: BAR_AREA }}>
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 text-[9px] font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {fmtKg(d.total)}
                  </span>
                  <div
                    className="w-full max-w-[46px] rounded-t-md overflow-hidden flex flex-col-reverse shadow-sm ring-1 ring-black/5 group-hover:ring-emerald-300 transition-all"
                    style={{ height: `${Math.max(pct, 1)}%` }}
                    title={`${monthLabel(d.month)} — ${fmtKg(d.total)} kg`}
                  >
                    {stackKeys.map(k => {
                      const v = d.segments[k] || 0;
                      if (v <= 0) return null;
                      return (
                        <div
                          key={k}
                          style={{ height: `${(v / d.total) * 100}%`, backgroundColor: colors[k] || '#6b7280' }}
                          title={`${k}: ${fmtKg(v)} kg`}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="text-[10px] text-gray-500 whitespace-nowrap">{monthLabel(d.month)}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 justify-center">
        {stackKeys.map(k => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: colors[k] || '#6b7280' }} />
            <span className="text-[11px] text-gray-600">{k}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
