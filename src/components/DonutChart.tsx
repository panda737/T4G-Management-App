export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerSub: string;
  size?: number;
  variant?: 'thick' | 'thin';
}

export default function DonutChart({
  segments,
  centerLabel,
  centerSub,
  size = 160,
  variant = 'thick',
}: DonutChartProps) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);

  const strokeWidth = variant === 'thin' ? 12 : 28;
  const radius = variant === 'thin' ? size / 2 - strokeWidth : (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (total === 0) {
    if (variant === 'thin') {
      return (
        <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-gray-400">--</span>
            <span className="text-xs text-gray-400">no data</span>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-44">
        <p className="text-sm text-gray-400">No data</p>
      </div>
    );
  }

  if (variant === 'thin') {
    let offset = 0;
    const arcs = segments.filter(s => s.value > 0).map((seg) => {
      const pct = seg.value / total;
      const dash = pct * circumference;
      const gap = circumference - dash;
      const currentOffset = offset;
      offset += dash;
      return { ...seg, dash, gap, offset: currentOffset };
    });

    return (
      <div style={{ width: size, height: size }} className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f3f4f6" strokeWidth={strokeWidth} />
          {arcs.map((arc) => (
            <circle
              key={arc.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="round"
              className="transition-all duration-700"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-gray-900">{centerLabel}</span>
          <span className="text-xs text-gray-500">{centerSub}</span>
        </div>
      </div>
    );
  }

  let offset = 0;
  return (
    <div className="flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {segments.filter(s => s.value > 0).map((seg, i) => {
            const pct = seg.value / total;
            const dashLen = circumference * pct;
            const dashOffset = -offset;
            offset += dashLen;
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${dashLen} ${circumference - dashLen}`}
                strokeDashoffset={dashOffset}
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <p className="text-lg font-bold text-gray-900">{centerLabel}</p>
          <p className="text-[10px] text-gray-400">{centerSub}</p>
        </div>
      </div>
    </div>
  );
}
