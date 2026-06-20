import { NavLink, useLocation } from 'react-router-dom';

/**
 * A tab. `match` lets a tab stay active across sibling routes that don't share
 * its `to` prefix (e.g. an "Imports" tab whose pages live at /upload, /imports,
 * /import-errors) — handy for grouping a set of pages under one parent tab.
 */
export interface TabDef { to: string; label: string; end?: boolean; match?: string[] }

/** Horizontal sub-navigation tab bar for a section landing page. */
export default function SectionTabs({ tabs }: { tabs: TabDef[] }) {
  const { pathname } = useLocation();
  const matchActive = (t: TabDef) =>
    !!t.match && t.match.some(m => pathname === m || pathname.startsWith(m + '/'));

  return (
    <div className="border-b border-gray-200">
      <nav className="flex gap-1 overflow-x-auto -mb-px">
        {tabs.map(t => {
          const forced = matchActive(t);
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                `px-3.5 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive || forced
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`
              }
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
