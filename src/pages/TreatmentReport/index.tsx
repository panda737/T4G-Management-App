import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { supabase, TreatmentDailyLog } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import { fmtKgRaw } from '../../lib/formatters';
import { PageSpinner } from '../../components/Spinner';
import DashboardError from '../../components/DashboardError';

type Preset = 'this-month' | 'last-month' | 'last-3-months' | 'this-year' | 'all' | 'custom';

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: 'this-month', label: 'This Month' },
  { id: 'last-month', label: 'Last Month' },
  { id: 'last-3-months', label: 'Last 3 Months' },
  { id: 'this-year', label: 'This Year' },
  { id: 'all', label: 'All Time' },
];

export default function TreatmentReport() {
  usePageTitle('Treatment Report');
  const { isAdmin } = useUser();
  const [logs, setLogs] = useState<TreatmentDailyLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [preset, setPreset] = useState<Preset>('this-month');
  const [from, setFrom] = useState(() => isoDate(startOfMonth(new Date())));
  const [to, setTo] = useState(() => isoDate(new Date()));

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, from, to]);

  async function load() {
    setLoading(true);
    setError('');
    try {
      let query = supabase.from('treatment_daily_log').select('*').order('date', { ascending: true });
      if (from) query = query.gte('date', from);
      if (to) query = query.lte('date', to);
      const { data, error: err } = await query;
      if (err) throw new Error(err.message);
      setLogs((data || []) as TreatmentDailyLog[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load treatment report');
    } finally {
      setLoading(false);
    }
  }

  function applyPreset(p: Preset) {
    setPreset(p);
    const now = new Date();
    if (p === 'this-month') {
      setFrom(isoDate(startOfMonth(now)));
      setTo(isoDate(now));
    } else if (p === 'last-month') {
      const lastMonthEnd = new Date(startOfMonth(now).getTime() - 86400000);
      setFrom(isoDate(startOfMonth(lastMonthEnd)));
      setTo(isoDate(lastMonthEnd));
    } else if (p === 'last-3-months') {
      setFrom(isoDate(new Date(now.getFullYear(), now.getMonth() - 2, 1)));
      setTo(isoDate(now));
    } else if (p === 'this-year') {
      setFrom(isoDate(new Date(now.getFullYear(), 0, 1)));
      setTo(isoDate(now));
    } else if (p === 'all') {
      setFrom('');
      setTo('');
    }
  }

  const totals = useMemo(() => logs.reduce((acc, l) => ({
    dayCycles: acc.dayCycles + (l.day_shift_cycles || 0),
    afternoonCycles: acc.afternoonCycles + (l.afternoon_shift_cycles || 0),
    nightCycles: acc.nightCycles + (l.night_shift_cycles || 0),
    cycles: acc.cycles + (l.total_cycles || 0),
    treatedKg: acc.treatedKg + (l.total_treated_kg || 0),
    chemicalLitres: acc.chemicalLitres + (l.chemical_litres || 0),
  }), { dayCycles: 0, afternoonCycles: 0, nightCycles: 0, cycles: 0, treatedKg: 0, chemicalLitres: 0 }), [logs]);

  if (!isAdmin) return <Navigate to="/" replace />;
  if (error) return <DashboardError title="Treatment Report" message={error} onRetry={load} />;

  function handleExport() {
    const rows = logs.map(l => ({
      Date: l.date,
      'Day Cycles': l.day_shift_cycles,
      'Afternoon Cycles': l.afternoon_shift_cycles,
      'Night Cycles': l.night_shift_cycles,
      'Total Cycles': l.total_cycles,
      'Treated (kg)': l.total_treated_kg,
      'Chemical Used (L)': l.chemical_litres,
      Status: l.status,
    }));
    rows.push({
      Date: 'TOTAL',
      'Day Cycles': totals.dayCycles,
      'Afternoon Cycles': totals.afternoonCycles,
      'Night Cycles': totals.nightCycles,
      'Total Cycles': totals.cycles,
      'Treated (kg)': Math.round(totals.treatedKg),
      'Chemical Used (L)': totals.chemicalLitres,
      Status: '',
    });
    downloadCSV(rows, `treatment-report_${from || 'all'}_${to || 'all'}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Treatment Report</h1>
          <p className="text-sm text-gray-500 mt-1">Waste cycles treated and chemical usage by cycle, across the plant</p>
        </div>
        {logs.length > 0 && (
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition shadow-sm">
            <Download size={14} /> <span>Export CSV</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {PRESETS.map(p => (
          <button key={p.id} onClick={() => applyPreset(p.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition border ${preset === p.id ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
            {p.label}
          </button>
        ))}
        <div className="flex items-center gap-2 ml-1">
          <input type="date" value={from} onChange={e => { setFrom(e.target.value); setPreset('custom'); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={to} onChange={e => { setTo(e.target.value); setPreset('custom'); }}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
        </div>
      </div>

      {loading ? <PageSpinner /> : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{totals.cycles.toLocaleString('en-ZA')}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total cycles</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{fmtKgRaw(totals.treatedKg)}</p>
              <p className="text-xs text-gray-500 mt-0.5">Waste treated</p>
            </div>
            <div className="bg-white rounded-xl border border-cyan-200 p-4">
              <p className="text-2xl font-bold text-cyan-700">{totals.chemicalLitres.toLocaleString('en-ZA')} L</p>
              <p className="text-xs text-gray-500 mt-0.5">Chemical used (by cycle)</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Days logged</p>
            </div>
          </div>

          {logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
              No treatment log entries in this range.
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-2.5 font-medium">Date</th>
                    <th className="px-4 py-2.5 font-medium text-right">Day</th>
                    <th className="px-4 py-2.5 font-medium text-right">Afternoon</th>
                    <th className="px-4 py-2.5 font-medium text-right">Night</th>
                    <th className="px-4 py-2.5 font-medium text-right">Total Cycles</th>
                    <th className="px-4 py-2.5 font-medium text-right">Treated</th>
                    <th className="px-4 py-2.5 font-medium text-right">Chemical Used</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                      <td className="px-4 py-2 text-gray-700">{fmtDate(l.date)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.day_shift_cycles}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.afternoon_shift_cycles}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{l.night_shift_cycles}</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{l.total_cycles}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{fmtKgRaw(l.total_treated_kg)}</td>
                      <td className="px-4 py-2 text-right text-cyan-700">{l.chemical_litres.toLocaleString('en-ZA')} L</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-200 font-semibold bg-gray-50/70">
                    <td className="px-4 py-2.5 text-gray-900">Total</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{totals.dayCycles}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{totals.afternoonCycles}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{totals.nightCycles}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{totals.cycles}</td>
                    <td className="px-4 py-2.5 text-right text-gray-900">{fmtKgRaw(totals.treatedKg)}</td>
                    <td className="px-4 py-2.5 text-right text-cyan-700">{totals.chemicalLitres.toLocaleString('en-ZA')} L</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
