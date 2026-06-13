export interface Bar {
  label: string;
  value: number;
  /** Optional override colour for this bar. */
  color?: string;
}

interface BarChartProps {
  data: Bar[];
  height?: number;
  color?: string;
  /** Format a value for the tooltip / axis. */
  format?: (n: number) => string;
  /** Optional max for the y-axis; defaults to the largest value. */
  max?: number;
}

/**
 * Lightweight vertical bar chart for CRM dashboards & reports.
 * No dependencies — pure flex/SVG-free divs with hover tooltips.
 */
export default function BarChart({
  data, height = 180, color = '#6366f1', format = n => String(n), max,
}: BarChartProps) {
  const peak = max ?? Math.max(...data.map(d => d.value), 1);

  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-gray-400" style={{ height }}>No data</div>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-full" style={{ height: height + 28 }}>
        {data.map((d, i) => {
          const barH = peak > 0 ? Math.max((d.value / peak) * height, d.value > 0 ? 4 : 1) : 1;
          return (
            <div key={i} className="flex-1 flex flex-col items-center min-w-0 group" style={{ minWidth: 24 }}>
              <div className="flex-1 flex items-end w-full justify-center relative">
                {/* tooltip */}
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 whitespace-nowrap">
                  <div className="bg-gray-900 text-white text-[11px] rounded px-2 py-1 shadow-lg">
                    {format(d.value)}
                  </div>
                </div>
                <div
                  className="w-full max-w-[40px] rounded-t transition-all duration-300 group-hover:opacity-80"
                  style={{ height: barH, backgroundColor: d.color ?? color }}
                />
              </div>
              <span className="text-[10px] mt-1.5 text-gray-400 truncate w-full text-center leading-tight">{d.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
