import { accent, type Accent } from './accents';

export interface Stat {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  /** Override the value colour (defaults to gray-900). */
  valueClass?: string;
}

interface StatStripProps {
  stats: Stat[];
  accent?: Accent;
  /** Columns at the sm breakpoint (default 4). */
  cols?: 2 | 3 | 4 | 5;
}

const COLS = { 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4', 5: 'sm:grid-cols-5' } as const;

/** Compact KPI strip (Stock/Training style), accent-tinted icons. */
export default function StatStrip({ stats, accent: a = 'indigo', cols = 4 }: StatStripProps) {
  const ac = accent(a);
  return (
    <div className={`grid grid-cols-2 ${COLS[cols]} gap-2`}>
      {stats.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={i} className="bg-white rounded-lg border border-gray-200 px-3 py-2 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 min-w-0">
              {Icon && <Icon size={14} className={ac.iconText} />}
              <span className="text-xs text-gray-500 truncate">{s.label}</span>
            </div>
            <span className={`text-sm font-bold ${s.valueClass ?? 'text-gray-900'}`}>{s.value}</span>
          </div>
        );
      })}
    </div>
  );
}
