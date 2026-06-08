import { useEffect, useState, useMemo } from 'react';
import { Search, AlertTriangle, ChevronDown, Briefcase, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, LegalAppointment, LegalAppointmentType } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';

const APPOINTMENT_TYPES: LegalAppointmentType[] = [
  'First Aider', 'Fire Fighter', 'Emergency Coordinator', 'Safety Representative',
  '16.1 Appointee', '16.2 Appointee', 'Risk Assessor', 'Incident Investigator', 'Other',
];

type AppointmentWithEmployee = LegalAppointment & {
  employees: { first_name: string; surname: string; employee_number: string } | null;
};

function expiryStatus(expiry: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiry) return 'none';
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

function fmt(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AppointmentsRegister() {
  usePageTitle('Legal Appointments');
  const [appointments, setAppointments] = useState<AppointmentWithEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const { data } = await supabase
      .from('legal_appointments')
      .select('*, employees(first_name, surname, employee_number)')
      .order('expiry_date', { ascending: true, nullsFirst: false });
    setAppointments((data ?? []) as AppointmentWithEmployee[]);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return appointments.filter(a => {
      if (typeFilter && a.appointment_type !== typeFilter) return false;
      if (statusFilter) {
        const es = expiryStatus(a.expiry_date);
        if (statusFilter === 'expired' && es !== 'expired') return false;
        if (statusFilter === 'soon' && es !== 'soon') return false;
        if (statusFilter === 'valid' && es !== 'ok' && es !== 'none') return false;
      }
      if (q) {
        const emp = a.employees;
        const name = emp ? `${emp.first_name} ${emp.surname}`.toLowerCase() : '';
        return name.includes(q) || a.appointment_type.toLowerCase().includes(q);
      }
      return true;
    });
  }, [appointments, search, typeFilter, statusFilter]);

  const expiredCount = appointments.filter(a => expiryStatus(a.expiry_date) === 'expired').length;
  const soonCount = appointments.filter(a => expiryStatus(a.expiry_date) === 'soon').length;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Legal Appointments Register</h1>
        <p className="text-sm text-gray-500 mt-1">All legally required appointments across all employees</p>
      </div>

      {(expiredCount > 0 || soonCount > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {expiredCount > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-800 text-sm rounded-lg px-4 py-2.5">
              <AlertTriangle size={14} />
              <span><strong>{expiredCount}</strong> expired appointment{expiredCount !== 1 ? 's' : ''}</span>
            </div>
          )}
          {soonCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
              <AlertTriangle size={14} />
              <span><strong>{soonCount}</strong> expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by employee or appointment type..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          />
        </div>
        <div className="relative">
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto">
            <option value="">All Types</option>
            {APPOINTMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-auto">
            <option value="">All Statuses</option>
            <option value="expired">Expired</option>
            <option value="soon">Expiring Soon</option>
            <option value="valid">Valid</option>
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            <Briefcase size={32} className="mx-auto mb-2 text-gray-300" />
            {appointments.length === 0 ? 'No appointments recorded yet' : 'No appointments match your filters'}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Employee</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Appointment</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Appointed Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Expiry</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Appointed By</th>
                    <th className="px-4 py-3 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(a => {
                    const es = expiryStatus(a.expiry_date);
                    const emp = a.employees;
                    return (
                      <tr key={a.id} className={`hover:bg-gray-50 transition ${es === 'expired' ? 'bg-red-50/30' : es === 'soon' ? 'bg-amber-50/30' : ''}`}>
                        <td className="px-4 py-3">
                          {emp ? (
                            <div>
                              <p className="font-medium text-gray-900">{emp.first_name} {emp.surname}</p>
                              <p className="text-xs text-gray-400">{emp.employee_number}</p>
                            </div>
                          ) : <span className="text-gray-400">Unknown</span>}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-sm text-gray-700 font-medium">{a.appointment_type}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">{fmt(a.appointment_date)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {a.expiry_date ? (
                            <span className={`text-sm font-medium ${es === 'expired' ? 'text-red-600' : es === 'soon' ? 'text-amber-600' : 'text-gray-600'}`}>
                              {es !== 'ok' && <AlertTriangle size={11} className="inline mr-1" />}
                              {fmt(a.expiry_date)}
                            </span>
                          ) : <span className="text-gray-300">No expiry</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.appointed_by || '—'}</td>
                        <td className="px-4 py-3">
                          {emp && (
                            <Link to={`/employees/${a.employee_id}`} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg transition inline-flex">
                              <ExternalLink size={13} />
                            </Link>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(a => {
                const es = expiryStatus(a.expiry_date);
                const emp = a.employees;
                return (
                  <div key={a.id} className={`px-4 py-3 ${es === 'expired' ? 'bg-red-50/30' : es === 'soon' ? 'bg-amber-50/30' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{a.appointment_type}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {emp ? `${emp.first_name} ${emp.surname}` : 'Unknown'}
                          {a.appointed_by ? ` · by ${a.appointed_by}` : ''}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Appointed {fmt(a.appointment_date)}
                          {a.expiry_date && (
                            <span className={`ml-1 ${es === 'expired' ? 'text-red-600 font-medium' : es === 'soon' ? 'text-amber-600 font-medium' : ''}`}>
                              · Expires {fmt(a.expiry_date)}
                            </span>
                          )}
                        </p>
                      </div>
                      {emp && (
                        <Link to={`/employees/${a.employee_id}`} className="p-1.5 text-gray-400 hover:text-emerald-600 rounded-lg transition flex-shrink-0">
                          <ExternalLink size={14} />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
