import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, ChevronDown, Phone, User, Truck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/supabase';
import { HS_ROLE_LABELS, HS_ROLE_COLORS } from '../../lib/supabase';
import type { EmployeeHsRole } from '../../lib/supabase';
import { Spinner } from '../../components/Spinner';
import { useUser } from '../../lib/UserContext';
import { POSITIONS } from './constants';
import EmployeeFormModal from './EmployeeFormModal';

export default function EmployeeRegister() {
  const { isAdmin, isManagement } = useUser();
  const canEdit = isAdmin || isManagement;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [positionFilter, setPositionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('active');
  const [hsRoleFilter, setHsRoleFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);

  useEffect(() => { loadEmployees(); }, []);

  async function loadEmployees() {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('*')
      .order('surname', { ascending: true });
    setEmployees(data || []);
    setLoading(false);
  }

  const filtered = employees.filter(e => {
    const matchesSearch = !search || [e.surname, e.first_name, e.employee_number, e.contact_number]
      .some(f => f?.toLowerCase().includes(search.toLowerCase()));
    const matchesPosition = !positionFilter || e.position === positionFilter;
    const matchesStatus = !statusFilter || e.status === statusFilter;
    const matchesHsRole = !hsRoleFilter || e.hs_role === hsRoleFilter;
    return matchesSearch && matchesPosition && matchesStatus && matchesHsRole;
  });

  const positionCounts = employees.reduce<Record<string, number>>((acc, e) => {
    if (e.status === 'active') acc[e.position] = (acc[e.position] || 0) + 1;
    return acc;
  }, {});

  const hsRoleOptions: { value: EmployeeHsRole; label: string }[] = [
    { value: 'employee', label: 'Employee' },
    { value: 'supervisor', label: 'Supervisor' },
    { value: 'hs_staff', label: 'H&S Staff' },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Register</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} employee{filtered.length !== 1 ? 's' : ''} found
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

      {/* Position Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {POSITIONS.map(pos => (
          <button
            key={pos}
            onClick={() => setPositionFilter(positionFilter === pos ? '' : pos)}
            className={`text-left p-3 rounded-lg border transition-all text-xs ${
              positionFilter === pos
                ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            <p className="font-bold text-lg text-gray-900">{positionCounts[pos] || 0}</p>
            <p className="truncate mt-0.5">{pos}</p>
          </button>
        ))}
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
            value={hsRoleFilter}
            onChange={e => setHsRoleFilter(e.target.value)}
            className="appearance-none w-full bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">All Roles</option>
            {hsRoleOptions.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No employees found</div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider">Position</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider hidden lg:table-cell">H&S Role</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs uppercase tracking-wider hidden md:table-cell">Contact</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-20 hidden lg:table-cell">Handler</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs uppercase tracking-wider w-24">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((emp, idx) => (
                    <tr
                      key={emp.id}
                      className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} hover:bg-emerald-50/40 transition-colors ${emp.status === 'inactive' ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Link to={`/employees/${emp.id}`} className="flex items-center gap-3 group">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 text-xs font-bold text-emerald-700 uppercase">
                            {emp.first_name[0]}{emp.surname[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 group-hover:text-emerald-700 transition-colors">{emp.surname}, {emp.first_name}</p>
                            <p className="text-xs text-gray-400">{emp.employee_number}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-700">{emp.position}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${HS_ROLE_COLORS[emp.hs_role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {HS_ROLE_LABELS[emp.hs_role] ?? emp.hs_role}
                        </span>
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
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        {emp.is_truck_handler && (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            <Truck size={11} /> Yes
                          </span>
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
                        <p className="text-xs text-gray-500 font-medium mb-0.5">H&S Role</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${HS_ROLE_COLORS[emp.hs_role] ?? 'bg-gray-100 text-gray-600'}`}>
                          {HS_ROLE_LABELS[emp.hs_role] ?? emp.hs_role}
                        </span>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 font-medium mb-0.5">Department</p>
                        <p className="text-gray-700">{emp.department}</p>
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
          onSave={() => { setShowForm(false); setEditEmployee(null); loadEmployees(); }}
        />
      )}
    </div>
  );
}
