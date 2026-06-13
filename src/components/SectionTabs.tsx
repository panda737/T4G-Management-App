import { NavLink } from 'react-router-dom';

export interface TabDef { to: string; label: string; end?: boolean }

/** Horizontal sub-navigation tab bar for a section landing page. */
export default function SectionTabs({ tabs }: { tabs: TabDef[] }) {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              }`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
