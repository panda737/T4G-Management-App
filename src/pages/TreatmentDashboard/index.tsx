import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Factory, Beaker, Clock, TrendingUp, AlertTriangle,
  Calendar, User, Pencil, Trash2, RefreshCw,
} from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { supabase, TreatmentDailyLog, TreatmentMonthlySummary, Employee } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { fmtKgTons as fmtKg, fmtKgRaw } from '../../lib/formatters';

type EmployeeName = Pick<Employee, 'id' | 'first_name' | 'surname' | 'position'>;
import { MONTHS, MONTHS_SHORT, type Period, type BarDatum, categorizeDowntime } from './constants';
import BarChart from './BarChart';
import KpiCard from './KpiCard';
import ShiftDonut from './ShiftDonut';
import LandfillPanel from './LandfillPanel';
import DowntimePanel from './DowntimePanel';
import DailyLogFormModal from '../TreatmentDailyLog/DailyLogFormModal';
import LandfillFormModal from '../TreatmentTransfers/LandfillFormModal';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { useUser } from '../../lib/UserContext';

export default function TreatmentDashboard() {
  usePageTitle('Treatment Plant');
  const { isAdmin, isOperator } = useUser();
  const [logs, setLogs] = useState<TreatmentDailyLog[]>([]);
  const [monthlySummaries, setMonthlySummaries] = useState<TreatmentMonthlySummary[]>([]);
  const [employees, setEmployees] = useState<EmployeeName[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear().toString());
  const [selectedDayLog, setSelectedDayLog] = useState<TreatmentDailyLog | null>(null);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string | null>(null);

  // Admin edit/delete state
  const [editingLog, setEditingLog] = useState<TreatmentDailyLog | null | 'new'>(null);
  const [deletingLog, setDeletingLog] = useState<TreatmentDailyLog | null>(null);
  const [deletingLogBusy, setDeletingLogBusy] = useState(false);
  const [editingLandfill, setEditingLandfill] = useState<TreatmentMonthlySummary | null>(null);
  const [deletingLandfill, setDeletingLandfill] = useState<TreatmentMonthlySummary | null>(null);
  const [deletingLandfillBusy, setDeletingLandfillBusy] = useState(false);
  const [opError, setOpError] = useState('');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const t = setInterval(() => setLastFetched(d => d ? new Date(d) : d), 60000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (logs.length === 0 || isOperator) return;
    const latest = logs[logs.length - 1].date.substring(0, 7);
    setSelectedMonth(latest);
    setSelectedYear(latest.substring(0, 4));
  }, [logs, isOperator]);

  async function loadData() {
    setLoading(true);
    const [logRes, sumRes, empRes] = await Promise.all([
      supabase.from('treatment_daily_log').select('id, date, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, downtime_reason, supervisor_id, day_shift_supervisor_id, afternoon_shift_supervisor_id, night_shift_supervisor_id, notes, status, created_at, updated_at').order('date', { ascending: true }),
      supabase.from('treatment_monthly_summary').select('*').order('month'),
      supabase.from('employees').select('id, first_name, surname, position').in('position', ['Supervisor', 'Senior Operator', 'Health & Safety Officer']).eq('status', 'active').order('surname'),
    ]);
    setLogs((logRes.data || []) as TreatmentDailyLog[]);
    setMonthlySummaries(sumRes.data || []);
    setEmployees(empRes.data || []);
    setLastFetched(new Date());
    setLoading(false);
  }

  function timeSince(d: Date) {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  }

  async function handleDeleteLog() {
    if (!deletingLog) return;
    setDeletingLogBusy(true);
    setOpError('');
    const { error } = await supabase.from('treatment_daily_log').delete().eq('id', deletingLog.id);
    setDeletingLogBusy(false);
    if (error) { setOpError(error.message); return; }
    setDeletingLog(null);
    loadData();
  }

  async function handleDeleteLandfill() {
    if (!deletingLandfill) return;
    setDeletingLandfillBusy(true);
    setOpError('');
    const { error } = await supabase.from('treatment_monthly_summary').delete().eq('id', deletingLandfill.id);
    setDeletingLandfillBusy(false);
    if (error) { setOpError(error.message); return; }
    setDeletingLandfill(null);
    loadData();
  }

  const empName = useCallback((id: string | null | undefined) => {
    if (!id) return null;
    const e = employees.find(e => e.id === id);
    return e ? `${e.first_name} ${e.surname}` : null;
  }, [employees]);

  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const yesterdayLog = useMemo(() => logs.find(l => l.date === yesterday), [logs, yesterday]);
  const headerLog = selectedDayLog ?? yesterdayLog ?? null;

  const yearHeaderStats = useMemo(() => {
    if (period !== 'year') return null;
    const scope = selectedYearMonth
      ? logs.filter(l => l.date.startsWith(selectedYearMonth))
      : logs.filter(l => l.date.startsWith(selectedYear));
    const totalKg = scope.reduce((s, l) => s + Number(l.total_treated_kg), 0);
    const totalCycles = scope.reduce((s, l) => s + Number(l.total_cycles), 0);
    const dayKg = scope.reduce((s, l) => s + Number(l.day_shift_treated_kg), 0);
    const aftKg = scope.reduce((s, l) => s + Number(l.afternoon_shift_treated_kg), 0);
    const nightKg = scope.reduce((s, l) => s + Number(l.night_shift_treated_kg), 0);
    const dayCycles = scope.reduce((s, l) => s + Number(l.day_shift_cycles), 0);
    const aftCycles = scope.reduce((s, l) => s + Number(l.afternoon_shift_cycles), 0);
    const nightCycles = scope.reduce((s, l) => s + Number(l.night_shift_cycles), 0);
    const activeDays = scope.filter(l => Number(l.total_cycles) > 0).length;
    const downtimeDays = scope.filter(l => l.downtime_reason && l.downtime_reason.trim()).length;
    const reasons: Record<string, number> = {};
    scope.forEach(l => {
      if (l.downtime_reason && l.downtime_reason.trim()) {
        const key = categorizeDowntime(l.downtime_reason);
        reasons[key] = (reasons[key] || 0) + 1;
      }
    });
    const topReason = Object.entries(reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    const upgradeCount = scope.filter(l =>
      l.downtime_reason && /install|maintenance|upgrade|civil/i.test(l.downtime_reason)
    ).length;
    return { totalKg, totalCycles, dayKg, aftKg, nightKg, dayCycles, aftCycles, nightCycles, activeDays, downtimeDays, topReason, upgradeCount };
  }, [period, logs, selectedYear, selectedYearMonth]);

  const periodLogs = useMemo(() => {
    if (period === 'day') return logs.filter(l => l.date === yesterday);
    if (period === 'month') return logs.filter(l => l.date.startsWith(selectedMonth));
    return logs.filter(l => l.date.startsWith(selectedYear));
  }, [logs, period, selectedMonth, selectedYear, yesterday]);

  const prevPeriodLogs = useMemo(() => {
    if (period === 'day') {
      const d = new Date(yesterday);
      d.setDate(d.getDate() - 1);
      return logs.filter(l => l.date === d.toISOString().split('T')[0]);
    }
    if (period === 'month') {
      const [y, m] = selectedMonth.split('-').map(Number);
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      return logs.filter(l => l.date.startsWith(`${py}-${String(pm).padStart(2, '0')}`));
    }
    return logs.filter(l => l.date.startsWith((Number(selectedYear) - 1).toString()));
  }, [logs, period, selectedMonth, selectedYear, yesterday]);

  const stats = useMemo(() => {
    const totalKg = periodLogs.reduce((s, l) => s + Number(l.total_treated_kg), 0);
    const totalCycles = periodLogs.reduce((s, l) => s + Number(l.total_cycles), 0);
    const totalChemical = periodLogs.reduce((s, l) => s + Number(l.chemical_litres), 0);
    const activeDays = periodLogs.filter(l => Number(l.total_cycles) > 0).length;
    const avgKgPerDay = activeDays > 0 ? totalKg / activeDays : 0;
    const downtimeDays = periodLogs.filter(l => l.downtime_reason && l.downtime_reason.trim() !== '').length;
    const dayKg = periodLogs.reduce((s, l) => s + Number(l.day_shift_treated_kg), 0);
    const aftKg = periodLogs.reduce((s, l) => s + Number(l.afternoon_shift_treated_kg), 0);
    const nightKg = periodLogs.reduce((s, l) => s + Number(l.night_shift_treated_kg), 0);
    const dayCycles = periodLogs.reduce((s, l) => s + Number(l.day_shift_cycles), 0);
    const aftCycles = periodLogs.reduce((s, l) => s + Number(l.afternoon_shift_cycles), 0);
    const nightCycles = periodLogs.reduce((s, l) => s + Number(l.night_shift_cycles), 0);
    const prevKg = prevPeriodLogs.reduce((s, l) => s + Number(l.total_treated_kg), 0);
    const prevCycles = prevPeriodLogs.reduce((s, l) => s + Number(l.total_cycles), 0);
    const kgChange = prevKg > 0 ? ((totalKg - prevKg) / prevKg) * 100 : 0;
    const cycleChange = prevCycles > 0 ? ((totalCycles - prevCycles) / prevCycles) * 100 : 0;
    return {
      totalKg, totalCycles, totalChemical, activeDays, avgKgPerDay, downtimeDays,
      dayKg, aftKg, nightKg, dayCycles, aftCycles, nightCycles,
      kgChange, cycleChange,
    };
  }, [periodLogs, prevPeriodLogs]);

  const monthlyBarData = useMemo((): BarDatum[] => {
    if (period === 'month') {
      const [yr, mo] = selectedMonth.split('-').map(Number);
      const daysInMonth = new Date(yr, mo, 0).getDate();
      const today = new Date();
      const isCurrentMonth = yr === today.getFullYear() && mo === today.getMonth() + 1;
      const lastDay = isCurrentMonth ? today.getDate() : daysInMonth;
      return Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const dateStr = `${selectedMonth}-${String(day).padStart(2, '0')}`;
        const l = periodLogs.find(r => r.date === dateStr) ?? null;
        const isFuture = day > lastDay;
        return {
          log: l,
          label: String(day),
          dayKg: l ? Number(l.day_shift_treated_kg) : 0,
          aftKg: l ? Number(l.afternoon_shift_treated_kg) : 0,
          nightKg: l ? Number(l.night_shift_treated_kg) : 0,
          total: l ? Number(l.total_treated_kg) : 0,
          hasDowntime: l ? !!(l.downtime_reason && l.downtime_reason.trim()) : false,
          isFuture,
        };
      });
    }
    if (period === 'year') {
      return Array.from({ length: 12 }, (_, m) => {
        const prefix = `${selectedYear}-${String(m + 1).padStart(2, '0')}`;
        const mLogs = logs.filter(l => l.date.startsWith(prefix));
        return {
          log: null,
          label: MONTHS_SHORT[m],
          dayKg: mLogs.reduce((s, l) => s + Number(l.day_shift_treated_kg), 0),
          aftKg: mLogs.reduce((s, l) => s + Number(l.afternoon_shift_treated_kg), 0),
          nightKg: mLogs.reduce((s, l) => s + Number(l.night_shift_treated_kg), 0),
          total: mLogs.reduce((s, l) => s + Number(l.total_treated_kg), 0),
          hasDowntime: false,
        };
      });
    }
    return [];
  }, [period, periodLogs, logs, selectedYear, selectedMonth]);

  const landfillData = useMemo(() => {
    if (period === 'year') {
      return monthlySummaries
        .filter(s => s.month.startsWith(selectedYear))
        .map(s => {
          const monthPrefix = s.month.substring(0, 7);
          const treated = logs
            .filter(l => l.date.startsWith(monthPrefix))
            .reduce((sum, l) => sum + Number(l.total_treated_kg), 0);
          const landfillTotal = Number(s.total_sent_for_landfill_kg);
          const water = Math.max(0, landfillTotal - treated);
          return {
            label: MONTHS_SHORT[new Date(s.month).getMonth()],
            waste: treated,
            water,
            landfillTotal,
            summary: s,
          };
        });
    }
    if (period === 'month') {
      const summary = monthlySummaries.find(s => s.month.startsWith(selectedMonth));
      if (summary) {
        const treated = periodLogs.reduce((sum, l) => sum + Number(l.total_treated_kg), 0);
        const landfillTotal = Number(summary.total_sent_for_landfill_kg);
        const water = Math.max(0, landfillTotal - treated);
        return [{ label: 'Treated', waste: treated, water, landfillTotal, summary }];
      }
    }
    return [];
  }, [period, monthlySummaries, selectedMonth, selectedYear, logs, periodLogs]);

  const landfillTotal = useMemo(() => landfillData.reduce((s, d) => s + (d.landfillTotal ?? d.waste + d.water), 0), [landfillData]);

  const downtimeBreakdown = useMemo(() => {
    const reasons: Record<string, number> = {};
    periodLogs.forEach(l => {
      if (l.downtime_reason && l.downtime_reason.trim()) {
        const key = categorizeDowntime(l.downtime_reason);
        reasons[key] = (reasons[key] || 0) + 1;
      }
    });
    return Object.entries(reasons).sort((a, b) => b[1] - a[1]);
  }, [periodLogs]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.date.substring(0, 7)));
    return Array.from(set).sort();
  }, [logs]);

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    logs.forEach(l => set.add(l.date.substring(0, 4)));
    return Array.from(set).sort();
  }, [logs]);

  if (loading) {
    return (
      <PageSpinner layout="h64" />
    );
  }

  const periodLabel = period === 'day'
    ? new Date(yesterday).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : period === 'month'
    ? `${MONTHS[Number(selectedMonth.split('-')[1]) - 1]} ${selectedMonth.split('-')[0]}`
    : selectedYear;

  const isYesterday = !selectedDayLog || selectedDayLog.date === yesterday;
  const headerDateLabel = headerLog
    ? new Date(headerLog.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Plant Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Cold chemical treatment -- Peracetic acid & hydrogen peroxide</p>
          {lastFetched && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5 mt-1">
              Updated {timeSince(lastFetched)}
              <button onClick={loadData} title="Refresh" className="text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={12} />
              </button>
            </span>
          )}
        </div>
        {!isOperator && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex bg-gray-100 rounded-lg p-0.5 flex-shrink-0">
              {(['day', 'month', 'year'] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all capitalize ${
                    period === p ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p === 'day' ? 'Yesterday' : p}
                </button>
              ))}
            </div>
            {period === 'month' && (
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                {availableMonths.map(m => {
                  const [y, mo] = m.split('-').map(Number);
                  return <option key={m} value={m}>{MONTHS_SHORT[mo - 1]} {y}</option>;
                })}
              </select>
            )}
            {period === 'year' && (
              <select
                value={selectedYear}
                onChange={e => setSelectedYear(e.target.value)}
                className="flex-1 min-w-0 bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between gap-2 mb-3 min-w-0">
          <div className="flex items-center gap-2 opacity-80 min-w-0 flex-1">
            <Calendar size={14} className="flex-shrink-0" />
            <span className="text-xs font-medium uppercase tracking-wider truncate">
              {period === 'year'
                ? selectedYearMonth
                  ? `${MONTHS[Number(selectedYearMonth.split('-')[1]) - 1]} ${selectedYearMonth.split('-')[0]}`
                  : `Year ${selectedYear} -- Overview`
                : isYesterday
                ? `Yesterday -- ${headerDateLabel}`
                : headerDateLabel ?? ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isAdmin && !isOperator && headerLog && period !== 'year' && (
              <>
                <button
                  onClick={() => setEditingLog(headerLog)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-white/15 hover:bg-white/25 text-white rounded-md transition-colors"
                >
                  <Pencil size={11} /> Edit
                </button>
                <button
                  onClick={() => setDeletingLog(headerLog)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-red-500/30 hover:bg-red-500/50 text-white rounded-md transition-colors"
                >
                  <Trash2 size={11} /> Del
                </button>
              </>
            )}
            {period === 'year' && selectedYearMonth && (
              <button onClick={() => setSelectedYearMonth(null)} className="text-xs text-emerald-200 hover:text-white underline underline-offset-2">
                Show full year
              </button>
            )}
            {period !== 'year' && !isYesterday && (
              <button onClick={() => setSelectedDayLog(null)} className="text-xs text-emerald-200 hover:text-white underline underline-offset-2">
                Back to yesterday
              </button>
            )}
          </div>
        </div>

        {period === 'year' && yearHeaderStats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-h-[72px]">
            <div className="min-w-0">
              <p className="text-3xl font-bold">{fmtKg(yearHeaderStats.totalKg)}</p>
              <p className="text-xs opacity-70 mt-1">Total Treated</p>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{yearHeaderStats.dayCycles} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Day: {fmtKg(yearHeaderStats.dayKg)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{yearHeaderStats.aftCycles} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Aft: {fmtKg(yearHeaderStats.aftKg)}</p>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{yearHeaderStats.nightCycles} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Night: {fmtKg(yearHeaderStats.nightKg)}</p>
            </div>
          </div>
        ) : headerLog ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 min-h-[72px]">
            <div className="min-w-0">
              <p className="text-3xl font-bold">{fmtKgRaw(Number(headerLog.total_treated_kg))}</p>
              <p className="text-xs opacity-70 mt-1">Total Treated</p>
              <p className="text-xs opacity-60 mt-1">{headerLog.total_cycles || 0} cycles total</p>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{headerLog.day_shift_cycles || 0} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Day: {fmtKgRaw(Number(headerLog.day_shift_treated_kg))}</p>
              {empName(headerLog.day_shift_supervisor_id) && (
                <p className="text-xs opacity-60 mt-0.5 flex items-center gap-1 truncate"><User size={10} className="flex-shrink-0" /> <span className="truncate">{empName(headerLog.day_shift_supervisor_id)}</span></p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{headerLog.afternoon_shift_cycles || 0} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Aft: {fmtKgRaw(Number(headerLog.afternoon_shift_treated_kg))}</p>
              {empName(headerLog.afternoon_shift_supervisor_id) && (
                <p className="text-xs opacity-60 mt-0.5 flex items-center gap-1 truncate"><User size={10} className="flex-shrink-0" /> <span className="truncate">{empName(headerLog.afternoon_shift_supervisor_id)}</span></p>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-semibold">{headerLog.night_shift_cycles || 0} <span className="text-xs opacity-60 font-normal">cycles</span></p>
              <p className="text-xs opacity-70">Night: {fmtKgRaw(Number(headerLog.night_shift_treated_kg))}</p>
              {empName(headerLog.night_shift_supervisor_id) && (
                <p className="text-xs opacity-60 mt-0.5 flex items-center gap-1 truncate"><User size={10} className="flex-shrink-0" /> <span className="truncate">{empName(headerLog.night_shift_supervisor_id)}</span></p>
              )}
            </div>
          </div>
        ) : null}

        <div className="mt-3 pt-2.5 border-t border-white/20 flex flex-wrap gap-x-5 gap-y-1 min-h-[22px]">
          {period === 'year' && yearHeaderStats ? (
            yearHeaderStats.downtimeDays > 0 || yearHeaderStats.upgradeCount > 0 ? (
              <>
                {yearHeaderStats.downtimeDays > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-200">
                    <AlertTriangle size={11} />
                    {yearHeaderStats.downtimeDays} downtime day{yearHeaderStats.downtimeDays !== 1 ? 's' : ''}
                    {yearHeaderStats.topReason && ` -- top: ${yearHeaderStats.topReason}`}
                  </span>
                )}
                {yearHeaderStats.upgradeCount > 0 && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-200">
                    <TrendingUp size={11} />
                    {yearHeaderStats.upgradeCount} upgrade / maintenance day{yearHeaderStats.upgradeCount !== 1 ? 's' : ''}
                  </span>
                )}
              </>
            ) : (
              <span className="text-xs text-white/40">No Reported Downtime or Delays</span>
            )
          ) : headerLog?.downtime_reason?.trim() ? (
            <span className="flex items-center gap-1.5 text-xs text-amber-200">
              <AlertTriangle size={11} /> {headerLog.downtime_reason}
            </span>
          ) : (
            <span className="text-xs text-white/40">No Reported Downtime or Delays</span>
          )}
        </div>
      </div>

      {(period === 'month' || period === 'year') && monthlyBarData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 sm:p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">
            {period === 'month' ? 'Daily' : 'Monthly'} Production -- {periodLabel}
          </h2>
          <BarChart
            data={monthlyBarData}
            selectedDate={period === 'year' ? (selectedYearMonth ?? selectedYear) : (selectedDayLog?.date ?? yesterday)}
            onBarClick={(log, monthPrefix) => {
              if (period === 'year') {
                setSelectedYearMonth(prev => prev === monthPrefix ? null : (monthPrefix ?? null));
              } else {
                setSelectedDayLog(log);
              }
            }}
          />
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 flex-shrink-0" /> Day Shift</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 flex-shrink-0" /> Afternoon</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-200 flex-shrink-0" /> Night</span>
            {period === 'month' && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 flex-shrink-0" /> Downtime</span>}
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 flex-shrink-0" /> No production</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <KpiCard icon={Factory} label="Total Treated" value={fmtKg(stats.totalKg)} change={stats.kgChange} color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={TrendingUp} label="Total Cycles" value={stats.totalCycles.toString()} change={stats.cycleChange} color="bg-green-50 text-green-600" />
        <KpiCard icon={Calendar} label="Active Days" value={stats.activeDays.toString()} color="bg-emerald-50 text-emerald-700" />
        <KpiCard icon={Factory} label="Avg / Day" value={fmtKg(stats.avgKgPerDay)} color="bg-green-50 text-green-700" />
        <KpiCard icon={Beaker} label="Chemical Used" value={`${fmtKg(stats.totalChemical)} L`} sub="27L per cycle" color="bg-emerald-50 text-emerald-600" />
        <KpiCard icon={Clock} label="Downtime Days" value={stats.downtimeDays.toString()} color="bg-amber-50 text-amber-600" alert={stats.downtimeDays > 5} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <ShiftDonut stats={{
          dayKg: stats.dayKg, aftKg: stats.aftKg, nightKg: stats.nightKg,
          dayCycles: stats.dayCycles, aftCycles: stats.aftCycles, nightCycles: stats.nightCycles,
          totalKg: stats.totalKg,
        }} />
        <LandfillPanel
          period={period}
          landfillData={landfillData}
          landfillTotal={landfillTotal}
          isAdmin={isAdmin}
          onEdit={s => setEditingLandfill(s)}
          onDelete={s => setDeletingLandfill(s)}
        />
        <DowntimePanel downtimeBreakdown={downtimeBreakdown} />
      </div>

      {opError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {opError}
        </div>
      )}

      {/* Admin: Edit daily log */}
      {editingLog && editingLog !== 'new' && (
        <DailyLogFormModal
          log={editingLog}
          onClose={() => setEditingLog(null)}
          onSave={() => { setEditingLog(null); loadData(); }}
        />
      )}

      {/* Admin: Delete daily log confirmation */}
      {deletingLog && (
        <DeleteConfirmModal
          label={`daily log for ${new Date(deletingLog.date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}`}
          onConfirm={handleDeleteLog}
          onClose={() => setDeletingLog(null)}
          deleting={deletingLogBusy}
        />
      )}

      {/* Admin: Edit landfill monthly summary */}
      {editingLandfill && (
        <LandfillFormModal
          record={editingLandfill}
          onClose={() => setEditingLandfill(null)}
          onSave={() => { setEditingLandfill(null); loadData(); }}
        />
      )}

      {/* Admin: Delete landfill monthly summary confirmation */}
      {deletingLandfill && (
        <DeleteConfirmModal
          label={`landfill record for ${new Date(deletingLandfill.month).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}`}
          onConfirm={handleDeleteLandfill}
          onClose={() => setDeletingLandfill(null)}
          deleting={deletingLandfillBusy}
        />
      )}
    </div>
  );
}
