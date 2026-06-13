import { accent, type Accent } from './accents';

export interface FilterTab {
  value: string;
  label: string;
  count?: number;
}

interface FilterTabsProps {
  tabs: FilterTab[];
  value: string;
  onChange: (v: string) => void;
  accent?: Accent;
}

/** Status pill-tabs with counts (e.g. "All 2 / Open 2 / Closed 0"). */
export default function FilterTabs({ tabs, value, onChange, accent: a = 'indigo' }: FilterTabsProps) {
  const ac = accent(a);
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(t => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={`flex items-center gap-2 text-sm font-medium rounded-lg px-3 py-2 border transition-colors ${
              active ? `${ac.tabActive} border-transparent` : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${active ? 'bg-white/25 text-white' : 'bg-gray-100 text-gray-500'}`}>
                {t.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
