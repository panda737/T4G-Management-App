import { useState, useEffect } from 'react';
import { Check, User, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { EmployeeHsRole } from '../lib/supabase';

interface EmployeeOption {
  id: string;
  label: string;
  employee_number: string;
  department: string;
  position: string;
}

interface Props {
  value: string[];
  onChange: (ids: string[], names: string[]) => void;
  excludeIds?: string[];
  excludeNames?: string[];
  /**
   * When set, these employees (e.g. the shift's toolbox-talk attendees) are shown
   * pinned at the top and everyone else is collapsed behind a "Show all" toggle.
   * Empty/undefined → the normal flat grid.
   */
  priorityIds?: string[];
  positionFilter?: string[];
  hsRoleFilter?: EmployeeHsRole[];
}

/*
  A keyboard-free multi-select built for operators on a phone. Instead of a
  search-first dropdown (which pops the keyboard on every interaction), it shows
  the whole eligible team as big tappable cards — tap to add, tap again to
  remove. A filter box only appears when the list is long, and it never
  auto-focuses, so the keyboard stays down unless the operator wants it.
*/
export default function EmployeeTogglePicker({ value, onChange, excludeIds, excludeNames, priorityIds, positionFilter, hsRoleFilter }: Props) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let query = supabase
      .from('employees')
      .select('id, employee_number, first_name, surname, department, position, hs_role')
      .eq('status', 'active')
      .order('first_name');
    if (positionFilter?.length) query = query.in('position', positionFilter);
    if (hsRoleFilter?.length) query = query.in('hs_role', hsRoleFilter);
    query.then(({ data }) => {
      setEmployees((data ?? []).map(e => ({
        id: e.id,
        label: `${e.first_name} ${e.surname}`,
        employee_number: e.employee_number,
        department: e.department,
        position: e.position,
      })));
      setLoading(false);
    });
  }, [positionFilter?.join(','), hsRoleFilter?.join(',')]);

  const excludeNameSet = excludeNames?.length
    ? new Set(excludeNames.map(n => n.trim().toLowerCase()))
    : null;
  const available = employees.filter(e => {
    if (excludeIds?.includes(e.id)) return false;
    if (excludeNameSet) {
      const full = e.label.toLowerCase();
      const first = full.split(' ')[0];
      if (excludeNameSet.has(full) || excludeNameSet.has(first)) return false;
    }
    return true;
  });
  const filtered = search
    ? available.filter(e =>
        e.label.toLowerCase().includes(search.toLowerCase()) ||
        e.position.toLowerCase().includes(search.toLowerCase()))
    : available;

  function toggle(emp: EmployeeOption) {
    const next = value.includes(emp.id) ? value.filter(id => id !== emp.id) : [...value, emp.id];
    const names = employees.filter(e => next.includes(e.id)).map(e => e.label);
    onChange(next, names);
  }

  function renderCard(emp: EmployeeOption) {
    const selected = value.includes(emp.id);
    return (
      <button
        key={emp.id}
        type="button"
        onClick={() => toggle(emp)}
        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition active:scale-[0.99] ${
          selected ? 'bg-emerald-50 border-emerald-400 ring-1 ring-emerald-200' : 'bg-white border-gray-200 hover:border-gray-300'
        }`}
      >
        <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border ${selected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'}`}>
          {selected && <Check size={13} className="text-white" strokeWidth={3} />}
        </span>
        <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0 text-xs font-bold uppercase">
          {emp.label[0]}
        </span>
        <span className="min-w-0 flex-1">
          <span className={`block text-sm font-medium truncate ${selected ? 'text-emerald-900' : 'text-gray-800'}`}>{emp.label}</span>
          <span className="block text-[11px] text-gray-400 truncate">{emp.position}</span>
        </span>
      </button>
    );
  }

  if (loading) return <p className="text-sm text-gray-400 py-2">Loading team…</p>;
  if (available.length === 0) return <p className="text-sm text-gray-400 py-2">No team members available.</p>;

  // Pinned mode: show the pre-selected (e.g. toolbox-talk) people up top, collapse
  // everyone else. Only while not actively filtering — search always reaches all.
  const pinnedActive = !!priorityIds?.length && !search;
  const pinnedIdSet = new Set([...(priorityIds ?? []), ...value]);
  const pinned = pinnedActive ? employees.filter(e => pinnedIdSet.has(e.id)) : [];
  const rest = pinnedActive ? available.filter(e => !pinnedIdSet.has(e.id)) : [];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{value.length > 0 ? `${value.length} selected` : 'Tap names to add them'}</span>
        {value.length > 0 && (
          <button type="button" onClick={() => onChange([], [])} className="text-xs text-red-500 hover:text-red-700">Clear</button>
        )}
      </div>

      {available.length > 8 && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Filter names…"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
        />
      )}

      {pinnedActive ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {pinned.map(renderCard)}
          </div>
          {rest.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowAll(s => !s)}
                className="flex items-center gap-1.5 text-sm font-medium text-cyan-600 hover:text-cyan-700 transition py-1"
              >
                <ChevronDown size={15} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
                {showAll ? 'Show fewer' : `Show all employees (${rest.length})`}
              </button>
              {showAll && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {rest.map(renderCard)}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filtered.map(renderCard)}
          {filtered.length === 0 && (
            <p className="col-span-full text-sm text-gray-400 text-center py-3 flex items-center justify-center gap-1">
              <User size={14} className="text-gray-300" /> No matches
            </p>
          )}
        </div>
      )}
    </div>
  );
}
