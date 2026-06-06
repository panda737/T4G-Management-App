import { useState, useEffect, useRef } from 'react';
import { Search, User, X, Check, ChevronDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { EmployeeHsRole } from '../lib/supabase';

interface EmployeeOption {
  id: string;
  label: string;
  employee_number: string;
  department: string;
  position: string;
  hs_role: EmployeeHsRole;
}

interface EmployeeMultiSelectProps {
  value: string[];
  onChange: (ids: string[], names: string[]) => void;
  label?: string;
  placeholder?: string;
  required?: boolean;
  className?: string;
  positionFilter?: string[];
  hsRoleFilter?: EmployeeHsRole[];
}

export default function EmployeeMultiSelect({
  value,
  onChange,
  label,
  placeholder = 'Select employees...',
  required,
  className = '',
  positionFilter,
  hsRoleFilter,
}: EmployeeMultiSelectProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let query = supabase
      .from('employees')
      .select('id, employee_number, first_name, surname, department, position, hs_role')
      .eq('status', 'active')
      .order('surname');
    if (positionFilter && positionFilter.length > 0) {
      query = query.in('position', positionFilter);
    }
    if (hsRoleFilter && hsRoleFilter.length > 0) {
      query = query.in('hs_role', hsRoleFilter);
    }
    query.then(({ data }) => {
      if (data) {
        setEmployees(
          data.map(e => ({
            id: e.id,
            label: `${e.first_name} ${e.surname}`,
            employee_number: e.employee_number,
            department: e.department,
            position: e.position,
            hs_role: e.hs_role as EmployeeHsRole,
          }))
        );
      }
    });
  }, [positionFilter?.join(','), hsRoleFilter?.join(',')]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = search
    ? employees.filter(
        e =>
          e.label.toLowerCase().includes(search.toLowerCase()) ||
          e.employee_number.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase()) ||
          e.position.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  function toggle(emp: EmployeeOption) {
    const next = value.includes(emp.id)
      ? value.filter(id => id !== emp.id)
      : [...value, emp.id];
    const names = employees.filter(e => next.includes(e.id)).map(e => e.label);
    onChange(next, names);
  }

  function removeChip(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const next = value.filter(v => v !== id);
    const names = employees.filter(emp => next.includes(emp.id)).map(emp => emp.label);
    onChange(next, names);
  }

  const selectedEmployees = employees.filter(e => value.includes(e.id));

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}

      <div
        onClick={() => setOpen(o => !o)}
        className="min-h-[38px] w-full flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm bg-white hover:border-gray-400 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-transparent cursor-pointer transition-colors"
      >
        {selectedEmployees.length === 0 ? (
          <span className="text-gray-400 text-sm py-0.5 flex-1">{placeholder}</span>
        ) : (
          selectedEmployees.map(emp => (
            <span
              key={emp.id}
              className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-xs font-medium px-2 py-0.5 rounded-full"
            >
              {emp.label}
              <button
                type="button"
                onClick={e => removeChip(emp.id, e)}
                className="text-emerald-600 hover:text-emerald-900 transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))
        )}
        <div className="ml-auto flex items-center gap-1 pl-1 flex-shrink-0">
          {value.length > 0 && (
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded-full">
              {value.length}
            </span>
          )}
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, number or department..."
                className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
              />
            </div>
          </div>

          {value.length > 0 && (
            <div className="px-3 py-1.5 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs text-gray-500">{value.length} selected</span>
              <button
                type="button"
                onClick={() => onChange([], [])}
                className="text-xs text-red-500 hover:text-red-700 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}

          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-sm text-gray-400 text-center flex flex-col items-center gap-1">
                <User size={16} className="text-gray-300" />
                No employees found
              </li>
            ) : (
              filtered.map(emp => {
                const selected = value.includes(emp.id);
                return (
                  <li key={emp.id}>
                    <button
                      type="button"
                      onClick={() => toggle(emp)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors ${
                        selected ? 'bg-emerald-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-colors ${
                          selected ? 'bg-emerald-600 border-emerald-600' : 'border-gray-300'
                        }`}
                      >
                        {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-emerald-700 uppercase">
                        {emp.label[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${selected ? 'text-emerald-800' : 'text-gray-800'}`}>
                          {emp.label}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {emp.employee_number} · {emp.position}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
