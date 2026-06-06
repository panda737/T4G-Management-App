import { useState, useEffect, useRef } from 'react';
import { Search, User, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface EmployeeOption {
  id: string;
  label: string;
  employee_number: string;
  department: string;
}

interface EmployeeSelectProps {
  value: string | null;
  displayValue: string;
  onChange: (id: string | null, name: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
  positionFilter?: string[];
}

export default function EmployeeSelect({
  value,
  displayValue,
  onChange,
  placeholder = 'Search employee...',
  label,
  required,
  className = '',
  positionFilter,
}: EmployeeSelectProps) {
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let query = supabase
      .from('employees')
      .select('id, employee_number, first_name, surname, department, position')
      .eq('status', 'active')
      .order('surname');
    if (positionFilter && positionFilter.length > 0) {
      query = query.in('position', positionFilter);
    }
    query.then(({ data }) => {
      if (data) {
        setEmployees(
          data.map((e) => ({
            id: e.id,
            label: `${e.first_name} ${e.surname}`,
            employee_number: e.employee_number,
            department: e.department,
          }))
        );
      }
    });
  }, [positionFilter?.join(',')]);

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
        (e) =>
          e.label.toLowerCase().includes(search.toLowerCase()) ||
          e.employee_number.toLowerCase().includes(search.toLowerCase()) ||
          e.department.toLowerCase().includes(search.toLowerCase())
      )
    : employees;

  function select(emp: EmployeeOption) {
    onChange(emp.id, emp.label);
    setOpen(false);
    setSearch('');
  }

  function clear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange(null, '');
    setSearch('');
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      {label && (
        <label className="block text-xs font-medium text-gray-500 mb-1">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-left bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
      >
        <User size={14} className="text-gray-400 flex-shrink-0" />
        <span className={`flex-1 truncate ${displayValue ? 'text-gray-900' : 'text-gray-400'}`}>
          {displayValue || placeholder}
        </span>
        {value && (
          <span onClick={clear} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
            <X size={14} />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-md">
              <Search size={13} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, number or department..."
                className="flex-1 text-sm bg-transparent outline-none placeholder-gray-400"
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-gray-400 text-center">No employees found</li>
            ) : (
              filtered.map((emp) => (
                <li key={emp.id}>
                  <button
                    type="button"
                    onClick={() => select(emp)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-emerald-50 transition-colors ${
                      value === emp.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-800'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-emerald-700 uppercase">
                      {emp.label[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{emp.label}</p>
                      <p className="text-[11px] text-gray-400">{emp.employee_number} · {emp.department}</p>
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
