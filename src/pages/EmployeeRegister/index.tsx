import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Plus, ChevronDown, ChevronUp, Phone, User, AlertCircle, Download } from 'lucide-react';
import { downloadCSV } from '../../lib/csvExport';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import type { Employee } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { useUser } from '../../lib/UserContext';
import { POSITIONS, DEPARTMENTS, departmentForPosition } from './constants';
import EmployeeFormModal from './EmployeeFormModal';

type SortKey = 'surname' | 'position' | 'status';

export default function EmployeeRegister() {
  usePageTitle('Employee Register');
  const { isAdmin } = useUser();
  const canEdit = isAdmin;
  const navigate = useNavigate();

  const { addToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('surname');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [loadError, setLoadError] = useState('');

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*');
      if (error) throw error;
      setEmployees(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load employees. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = employees
    .filter(e => {
      const matchesSearch = !search || [e.surname, e.first_name, e.employee_number, e.contact_number]
        .some(f => f?.toLowerCase().includes(search.toLowerCase()));
      const matchesPosition = !positionFilter || e.position === positionFilter;
      const matchesStatus = !statusFilter || e.status === statusFilter;
      const matchesDept = !departmentFilter || departmentForPosition(e.position) === departmentFilter;
      return matchesSearch && matchesPosition && matchesStatus && matchesDept;
    })
    .sort((a, b) => {
      const aVal = (a[sortKey] ?? '') as string;
      const bVal = (b[sortKey] ?? '') as string;
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });

  function handleSort(key: SortKey) {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('asc'); }
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown size={10} className="ml-1 opacity-30 inline" />;
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="ml-1 text-emerald-300 inline" />
      : <ChevronDown size={10} className="ml-1 text-emerald-300 inline" />;
  }

  function handleExport() {
    const rows = filtered.map(e => ({
      'Employee Number': e.employee_number,
      'Surname': e.surname,
      'First Name': e.first_name,
      'Position': e.position,
      'Department': departmentForPosition(e.position),
      'Status': e.status === 'active' ? 'Active' : 'Inactive',
      'Contact': e.contact_number,
      'Email': e.email,
      'Date Joined': e.date_joined ?? '',
    }));
    downloadCSV(rows, 'employees');
  }

  return (
    <div className="space-y-5">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={loadEmployees} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Register</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => { setEditEmployee(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Add Employee</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full sm:flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, employee number, or phone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={positionFilter}
            onChange={e => setPositionFilter(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Positions</option>
            {POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={departmentFilter}
            onChange={e => setDepartmentFilter(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Departments</option>
            {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 text-sm bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg transition disabled:opacity-40 whitespace-nowrap"
        >
          <Download size={15} /> Export
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : employees.length === 0 ? (
          <div className="py-14 text-center">
            <User size={32} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No employees registered yet</p>
            <p className="text-xs text-gray-400 mt-1">Get started by adding your first employee.</p>
            {canEdit && (
              <button
                onClick={() => { setEditEmployee(null); setShowForm(true); }}
                className="mt-4 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                + Add Employee
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-14 text-center">
            <Search size={28} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No employees match your filters.</p>
            <button
              onClick={() => { setSearch(''); setPositionFilter(''); setStatusFilter('active'); setDepartmentFilter(''); }}
              className="mt-2 text-xs text-gray-500 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider cursor-pointer select-none w-56" onClick={() => handleSort('surname')}>
                      Employee <SortIcon k="surname" />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider cursor-pointer select-none" onClick={() => handleSort('position')}>
                      Position <SortIcon k="position" />
                    </th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Department</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-24 cursor-pointer select-none" onClick={() => handleSort('status')}>
                      Status <SortIcon k="status" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      onClick={() => navigate(`/employees/${emp.id}`)}
                      className={`cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-emerald-50/40 transition-colors ${emp.status === 'inactive' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700 uppercase">
                            {emp.first_name[0]}{emp.surname[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors truncate">{emp.surname}, {emp.first_name}</p>
                            <p className="text-xs text-gray-400 truncate">{emp.employee_number}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{emp.position}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-gray-700">{departmentForPosition(emp.position)}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {emp.contact_number ? (
                          <div className="flex items-center gap-1.5 text-gray-600">
                            <Phone size={12} />
                            <span className="text-xs">{emp.contact_number}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-300">--</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {emp.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((emp, idx) => (
                <Link
                  key={emp.id}
                  to={`/employees/${emp.id}`}
                  className={`block ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} p-4 ${emp.status === 'inactive' ? 'opacity-60' : ''} hover:bg-emerald-50/40 transition-colors`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700 uppercase">
                          {emp.first_name[0]}{emp.surname[0]}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{emp.surname}, {emp.first_name}</p>
                          <p className="text-xs text-gray-400">{emp.employee_number}</p>
                        </div>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        emp.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {emp.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Position</p>
                        <p className="text-gray-700">{emp.position}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Department</p>
                        <p className="text-gray-700">{departmentForPosition(emp.position)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Contact</p>
                        <p className="text-gray-700 text-xs">{emp.contact_number || '--'}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>

      {canEdit && showForm && (
        <EmployeeFormModal
          employee={editEmployee}
          onClose={() => { setShowForm(false); setEditEmployee(null); }}
          onSave={() => { setShowForm(false); setEditEmployee(null); addToast('Employee saved'); loadEmployees(); }}
        />
      )}
    </div>
  );
}
