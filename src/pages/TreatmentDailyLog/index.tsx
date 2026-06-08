import { useEffect, useState, useMemo } from 'react';
import { Plus, Search, ChevronDown, AlertTriangle } from 'lucide-react';
import { supabase, TreatmentDailyLog as TDL, Employee } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import { usePageTitle } from '../../lib/usePageTitle';
import DailyLogFormModal from './DailyLogFormModal';

export default function TreatmentDailyLog() {
  usePageTitle('Treatment — Daily Log');
  const { addToast } = useToast();
  const [logs, setLogs] = useState<TDL[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editLog, setEditLog] = useState<TDL | null>(null);

  useEffect(() => { loadLogs(); loadEmployees(); }, []);

  async function loadLogs() {
    setLoading(true);
    const { data } = await supabase
      .from('treatment_daily_log')
      .select('*')
      .order('date', { ascending: false });
    setLogs(data || []);
    setLoading(false);
  }

  async function loadEmployees() {
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, surname')
      .in('position', ['Supervisor', 'Senior Operator', 'Health & Safety Officer'])
      .eq('status', 'active')
      .order('surname');
    setEmployees((data || []) as unknown as Employee[]);
  }

  function empName(id: string | null | undefined): string | null {
    if (!id) return null;
    const e = employees.find(e => e.id === id);
    return e ? `${e.first_name} ${e.surname}` : null;
  }

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (monthFilter && !l.date.startsWith(monthFilter)) return false;
      if (search) {
        const q = search.toLowerCase();
        return l.date.includes(q) || (l.downtime_reason || '').toLowerCase().includes(q) || (l.notes || '').toLowerCase().includes(q);
      }
      return true;
    });
  }, [logs, monthFilter, search]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Daily Log</h1>
          <p className="text-sm text-gray-500 mt-1">Record daily treatment shift data, downtime, and waste transfers</p>
        </div>
        <button
          onClick={() => { setEditLog(null); setShowForm(true); }}
          className="flex items-center gap-1.5 text-sm bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm"
        >
          <Plus size={16} /> Add Shift Treatment Record
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by date or downtime reason..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
          />
        </div>
        <div className="relative w-full sm:w-auto">
          <select
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className="appearance-none bg-white border border-gray-200 rounded-lg px-4 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-full sm:w-auto"
          >
            <option value="">All Months</option>
            {availableMonths.map(m => {
              const [y, mo] = m.split('-').map(Number);
              const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
              return <option key={m} value={m}>{names[mo - 1]} {y}</option>;
            })}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Table and Card View */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-cyan-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">No records found</div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <th className="text-left px-4 py-2.5 text-xs font-medium uppercase tracking-wider">Date</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider">Day</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider">Afternoon</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider">Night</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider bg-gray-700">Cycles</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider bg-gray-700">Total Kg</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider">Chemical</th>
                    <th className="text-left px-3 py-2.5 text-xs font-medium uppercase tracking-wider">Downtime</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium uppercase tracking-wider w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((l, idx) => {
                    const isZero = Number(l.total_cycles) === 0;
                    const hasDowntime = l.downtime_reason && l.downtime_reason.trim() !== '';
                    return (
                      <tr
                        key={l.id}
                        className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'} ${isZero ? 'opacity-50' : ''} hover:bg-cyan-50/30 transition-colors cursor-pointer`}
                        onClick={() => { setEditLog(l); setShowForm(true); }}
                      >
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium text-gray-800">
                          {new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <CycleKg cycles={l.day_shift_cycles} kg={l.day_shift_treated_kg} supervisorName={empName(l.day_shift_supervisor_id)} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <CycleKg cycles={l.afternoon_shift_cycles} kg={l.afternoon_shift_treated_kg} supervisorName={empName(l.afternoon_shift_supervisor_id)} />
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <CycleKg cycles={l.night_shift_cycles} kg={l.night_shift_treated_kg} supervisorName={empName(l.night_shift_supervisor_id)} />
                        </td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 bg-gray-50/60">{l.total_cycles}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-gray-900 bg-gray-50/60">
                          {Number(l.total_treated_kg).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
                        </td>
                        <td className="px-3 py-2.5 text-center text-gray-600">
                          {Number(l.chemical_litres) > 0 ? `${Number(l.chemical_litres).toLocaleString()} L` : '--'}
                        </td>
                        <td className="px-3 py-2.5 max-w-[180px]">
                          {hasDowntime ? (
                            <span className="flex items-center gap-1 text-xs text-amber-700">
                              <AlertTriangle size={12} className="flex-shrink-0" />
                              <span className="truncate">{l.downtime_reason}</span>
                            </span>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={e => { e.stopPropagation(); setEditLog(l); setShowForm(true); }}
                            className="text-xs text-gray-400 hover:text-cyan-600 font-medium"
                          >
                            Edit
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map((l) => {
                const isZero = Number(l.total_cycles) === 0;
                const hasDowntime = l.downtime_reason && l.downtime_reason.trim() !== '';
                return (
                  <div
                    key={l.id}
                    className={`px-3 py-2 cursor-pointer transition-colors ${isZero ? 'opacity-50' : 'hover:bg-cyan-50/30'}`}
                    onClick={() => { setEditLog(l); setShowForm(true); }}
                  >
                    {/* Date + totals + edit */}
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm font-bold text-gray-800 flex-1 min-w-0 truncate">
                        {new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-[10px] text-gray-500 flex-shrink-0">
                        {l.total_cycles} cyc · {Number(l.total_treated_kg).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setEditLog(l); setShowForm(true); }}
                        className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex-shrink-0 pl-1.5"
                      >
                        Edit
                      </button>
                    </div>
                    {/* 3 shifts side by side */}
                    <div className="grid grid-cols-3 gap-1">
                      <ShiftMini label="Day" cycles={l.day_shift_cycles} kg={l.day_shift_treated_kg} supervisorName={empName(l.day_shift_supervisor_id)} />
                      <ShiftMini label="Aft" cycles={l.afternoon_shift_cycles} kg={l.afternoon_shift_treated_kg} supervisorName={empName(l.afternoon_shift_supervisor_id)} />
                      <ShiftMini label="Night" cycles={l.night_shift_cycles} kg={l.night_shift_treated_kg} supervisorName={empName(l.night_shift_supervisor_id)} />
                    </div>
                    {hasDowntime && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-700 mt-1.5">
                        <AlertTriangle size={10} className="flex-shrink-0" />
                        <span className="truncate">{l.downtime_reason}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <DailyLogFormModal
          log={editLog}
          onClose={() => { setShowForm(false); setEditLog(null); }}
          onSave={() => { setShowForm(false); setEditLog(null); addToast('Log saved'); loadLogs(); }}
        />
      )}
    </div>
  );
}

function CycleKg({ cycles, kg, supervisorName }: { cycles: number; kg: number; supervisorName?: string | null }) {
  if (!cycles || cycles === 0) return <span className="text-gray-300">--</span>;
  return (
    <div>
      <span className={`font-semibold ${cycles >= 12 ? 'text-emerald-600' : 'text-gray-800'}`}>{cycles}</span>
      <span className="text-[10px] text-gray-400 block">{Number(kg).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg</span>
      {supervisorName && (
        <span className="text-[10px] text-gray-400 block truncate max-w-[90px]" title={supervisorName}>{supervisorName}</span>
      )}
    </div>
  );
}

function ShiftMini({ label, cycles, kg, supervisorName }: { label: string; cycles: number; kg: number; supervisorName?: string | null }) {
  if (!cycles || cycles === 0) return (
    <div className="bg-gray-50 rounded px-1.5 py-1 text-center">
      <p className="text-[9px] text-gray-400 uppercase font-medium leading-tight">{label}</p>
      <p className="text-gray-300 text-xs leading-tight">--</p>
    </div>
  );
  return (
    <div className="bg-gray-50 rounded px-1.5 py-1 text-center">
      <p className="text-[9px] text-gray-400 uppercase font-medium leading-tight">{label}</p>
      <p className={`text-sm font-bold leading-tight ${cycles >= 12 ? 'text-emerald-600' : 'text-gray-800'}`}>{cycles}</p>
      <p className="text-[9px] text-gray-400 leading-tight">{Number(kg).toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg</p>
      {supervisorName && <p className="text-[8px] text-gray-400 truncate leading-tight" title={supervisorName}>{supervisorName}</p>}
    </div>
  );
}
