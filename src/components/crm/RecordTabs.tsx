export interface RecordTab { id: string; label: string; count?: number }

interface RecordTabsProps {
  tabs: RecordTab[];
  active: string;
  onChange: (id: string) => void;
}

/** In-record tab strip (Overview / Related / Activity …). Mirrors SectionTabs styling. */
export default function RecordTabs({ tabs, active, onChange }: RecordTabsProps) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1 -mb-px overflow-x-auto">
        {tabs.map(t => (
          <button key={t.id} onClick={() => onChange(t.id)}
            className={`px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active === t.id
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
            }`}>
            {t.label}
            {t.count !== undefined && (
              <span className={`ml-1.5 text-xs rounded-full px-1.5 py-0.5 ${active === t.id ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'}`}>{t.count}</span>
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
