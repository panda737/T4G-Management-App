import { useEffect, useState } from 'react';
import { Calendar, Factory, Save, AlertTriangle, Check, X, Plus } from 'lucide-react';
import { supabase, TreatmentDailyLog as TDL, Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { localToday } from '../../lib/formatters';

interface Props {
  log: TDL | null;
  onClose: () => void;
  onSave: () => void;
}

const SHIFTS = [
  { key: 'day', label: 'Day Shift' },
  { key: 'afternoon', label: 'Afternoon Shift' },
  { key: 'night', label: 'Night Shift' },
] as const;

type ShiftKey = (typeof SHIFTS)[number]['key'];
type DtEntry = { hours: string; minutes: string; reason: string };

function splitMinutes(min: number): { hours: string; minutes: string } {
  const h = Math.floor(min / 60), m = min % 60;
  return { hours: h ? String(h) : '', minutes: m ? String(m) : '' };
}
function initDowntimes(arr?: { minutes: number; reason: string }[]): DtEntry[] {
  if (!arr || arr.length === 0) return [{ hours: '', minutes: '', reason: '' }];
  return arr.map(d => ({ ...splitMinutes(Number(d.minutes) || 0), reason: d.reason || '' }));
}
const entryMinutes = (e: DtEntry) => (Number(e.hours) || 0) * 60 + (Number(e.minutes) || 0);
function toShiftDowntimes(entries: DtEntry[]): { minutes: number; reason: string }[] {
  return entries
    .map(e => ({ minutes: entryMinutes(e), reason: e.reason.trim() }))
    .filter(e => e.minutes > 0 || e.reason !== '');
}
function fmtHM(min: number): string {
  const h = Math.floor(min / 60), m = min % 60;
  return h > 0 ? (m > 0 ? `${h}h ${m}m` : `${h}h`) : `${m}m`;
}

export default function DailyLogFormModal({ log, onClose, onSave }: Props) {
  const [supervisors, setSupervisors] = useState<Pick<Employee, 'id' | 'first_name' | 'surname' | 'position'>[]>([]);

  const [form, setForm] = useState({
    date: log?.date || localToday(),
    day_shift_cycles: log?.day_shift_cycles ?? 0,
    day_shift_treated_kg: log?.day_shift_treated_kg ?? 0,
    day_shift_ruc_washed: log?.day_shift_ruc_washed ?? 0,
    day_shift_lids_washed: log?.day_shift_lids_washed ?? 0,
    day_shift_wheelie_bins: log?.day_shift_wheelie_bins ?? 0,
    day_shift_supervisor_id: log?.day_shift_supervisor_id ?? '',
    afternoon_shift_cycles: log?.afternoon_shift_cycles ?? 0,
    afternoon_shift_treated_kg: log?.afternoon_shift_treated_kg ?? 0,
    afternoon_shift_ruc_washed: log?.afternoon_shift_ruc_washed ?? 0,
    afternoon_shift_lids_washed: log?.afternoon_shift_lids_washed ?? 0,
    afternoon_shift_wheelie_bins: log?.afternoon_shift_wheelie_bins ?? 0,
    afternoon_shift_supervisor_id: log?.afternoon_shift_supervisor_id ?? '',
    night_shift_cycles: log?.night_shift_cycles ?? 0,
    night_shift_treated_kg: log?.night_shift_treated_kg ?? 0,
    night_shift_ruc_washed: log?.night_shift_ruc_washed ?? 0,
    night_shift_lids_washed: log?.night_shift_lids_washed ?? 0,
    night_shift_wheelie_bins: log?.night_shift_wheelie_bins ?? 0,
    night_shift_supervisor_id: log?.night_shift_supervisor_id ?? '',
    notes: log?.notes ?? '',
  });

  const [downtimes, setDowntimes] = useState<Record<ShiftKey, DtEntry[]>>({
    day: initDowntimes(log?.day_shift_downtimes),
    afternoon: initDowntimes(log?.afternoon_shift_downtimes),
    night: initDowntimes(log?.night_shift_downtimes),
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.from('employees').select('id, first_name, surname, position')
      .in('position', ['Supervisor', 'Senior Operator', 'Health & Safety Officer'])
      .eq('status', 'active')
      .order('surname')
      .then(({ data }) => setSupervisors(data || []));
  }, []);

  // Typed helpers for the dynamic per-shift field access.
  const fv = (k: string) => Number((form as Record<string, unknown>)[k]) || 0;
  const sv = (k: string) => String((form as Record<string, unknown>)[k] ?? '');

  const totalCycles = fv('day_shift_cycles') + fv('afternoon_shift_cycles') + fv('night_shift_cycles');
  const totalKg = fv('day_shift_treated_kg') + fv('afternoon_shift_treated_kg') + fv('night_shift_treated_kg');
  const totalRuc = fv('day_shift_ruc_washed') + fv('afternoon_shift_ruc_washed') + fv('night_shift_ruc_washed');
  const totalWheelie = fv('day_shift_wheelie_bins') + fv('afternoon_shift_wheelie_bins') + fv('night_shift_wheelie_bins');
  const chemicalLitres = totalCycles * 27;

  function update(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addDt(k: ShiftKey) {
    setDowntimes(prev => ({ ...prev, [k]: [...prev[k], { hours: '', minutes: '', reason: '' }] }));
  }
  function removeDt(k: ShiftKey, index: number) {
    setDowntimes(prev => ({ ...prev, [k]: prev[k].filter((_, i) => i !== index) }));
  }
  function updateDt(k: ShiftKey, index: number, field: keyof DtEntry, value: string) {
    setDowntimes(prev => ({ ...prev, [k]: prev[k].map((e, i) => i === index ? { ...e, [field]: value } : e) }));
  }

  const totalDowntimeMin = (Object.keys(downtimes) as ShiftKey[])
    .reduce((s, k) => s + downtimes[k].reduce((ss, e) => ss + entryMinutes(e), 0), 0);

  async function handleSave() {
    if (!form.date) {
      setError('Date is required');
      return;
    }
    setSaving(true);
    setError('');

    const dtDay = toShiftDowntimes(downtimes.day);
    const dtAft = toShiftDowntimes(downtimes.afternoon);
    const dtNight = toShiftDowntimes(downtimes.night);
    const allDt = [...dtDay, ...dtAft, ...dtNight];

    const payload = {
      date: form.date,
      day_shift_cycles: fv('day_shift_cycles'),
      day_shift_treated_kg: fv('day_shift_treated_kg'),
      day_shift_ruc_washed: fv('day_shift_ruc_washed'),
      day_shift_lids_washed: fv('day_shift_lids_washed'),
      day_shift_wheelie_bins: fv('day_shift_wheelie_bins'),
      day_shift_supervisor_id: sv('day_shift_supervisor_id') || null,
      afternoon_shift_cycles: fv('afternoon_shift_cycles'),
      afternoon_shift_treated_kg: fv('afternoon_shift_treated_kg'),
      afternoon_shift_ruc_washed: fv('afternoon_shift_ruc_washed'),
      afternoon_shift_lids_washed: fv('afternoon_shift_lids_washed'),
      afternoon_shift_wheelie_bins: fv('afternoon_shift_wheelie_bins'),
      afternoon_shift_supervisor_id: sv('afternoon_shift_supervisor_id') || null,
      night_shift_cycles: fv('night_shift_cycles'),
      night_shift_treated_kg: fv('night_shift_treated_kg'),
      night_shift_ruc_washed: fv('night_shift_ruc_washed'),
      night_shift_lids_washed: fv('night_shift_lids_washed'),
      night_shift_wheelie_bins: fv('night_shift_wheelie_bins'),
      night_shift_supervisor_id: sv('night_shift_supervisor_id') || null,
      total_cycles: totalCycles,
      total_treated_kg: totalKg,
      chemical_litres: chemicalLitres,
      day_shift_downtimes: dtDay,
      afternoon_shift_downtimes: dtAft,
      night_shift_downtimes: dtNight,
      downtime_minutes: allDt.reduce((s, e) => s + e.minutes, 0),
      downtime_reason: allDt
        .map(e => e.reason && e.minutes > 0 ? `${e.reason} (${fmtHM(e.minutes)})` : e.reason || fmtHM(e.minutes))
        .join(' | '),
      notes: form.notes,
      updated_at: new Date().toISOString(),
    };

    if (log) {
      const { error: err } = await supabase.from('treatment_daily_log').update(payload).eq('id', log.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('treatment_daily_log').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSave();
  }

  const modalFooter = (
    <>
      {totalCycles > 0 && (
        <span className="text-xs text-gray-400 flex items-center gap-1 mr-auto">
          <Check size={12} className="text-emerald-500" />
          {totalCycles} cycles &mdash; {totalKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg &mdash; {chemicalLitres.toLocaleString()} L chemical
        </span>
      )}
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-5 py-2 text-sm bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors"
      >
        <Save size={14} /> {saving ? 'Saving...' : log ? 'Update' : 'Save Entry'}
      </button>
    </>
  );

  return (
    <Modal
      title={log ? `Edit · ${new Date(log.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'New Shift Treatment Record'}
      onClose={onClose}
      size="xl"
      accent="cyan"
      footer={modalFooter}
    >
      <div className="space-y-6">
        {/* Date (compact) */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
          <div className="relative max-w-[200px]">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={form.date}
              onChange={e => update('date', e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Shift data — one column per shift (cycles → kg → washed → supervisor) */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Factory size={14} /> Shift Production Data
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {SHIFTS.map(s => (
                <div key={s.key} className="space-y-2">
                  <p className="text-xs font-semibold text-gray-600 text-center mb-1">{s.label}</p>
                  <ShiftInput label="Cycles" value={fv(`${s.key}_shift_cycles`)} onChange={v => update(`${s.key}_shift_cycles`, v)} />
                  <ShiftInput label="Kg Treated" value={fv(`${s.key}_shift_treated_kg`)} onChange={v => update(`${s.key}_shift_treated_kg`, v)} />
                  <div className="pt-2 mt-1 border-t border-gray-200 space-y-2">
                    <ShiftInput label="RUC Washed" value={fv(`${s.key}_shift_ruc_washed`)} onChange={v => update(`${s.key}_shift_ruc_washed`, v)} />
                    <ShiftInput label="Lids Washed" value={fv(`${s.key}_shift_lids_washed`)} onChange={v => update(`${s.key}_shift_lids_washed`, v)} />
                    <ShiftInput label="Wheelie Bins" value={fv(`${s.key}_shift_wheelie_bins`)} onChange={v => update(`${s.key}_shift_wheelie_bins`, v)} />
                  </div>

                  {/* Downtime (per shift) */}
                  <div className="pt-2 mt-1 border-t border-gray-200 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                      <AlertTriangle size={10} /> Downtime
                    </p>
                    {downtimes[s.key].map((entry, i) => (
                      <div key={i} className="space-y-1">
                        <div className="flex items-end gap-1">
                          <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Hours</label>
                            <input
                              type="number" min="0"
                              value={entry.hours}
                              onChange={e => updateDt(s.key, i, 'hours', e.target.value)}
                              placeholder="0"
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Mins</label>
                            <input
                              type="number" min="0" max="59"
                              value={entry.minutes}
                              onChange={e => updateDt(s.key, i, 'minutes', e.target.value)}
                              placeholder="0"
                              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
                            />
                          </div>
                          {downtimes[s.key].length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeDt(s.key, i)}
                              className="mb-1 p-1 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          value={entry.reason}
                          onChange={e => updateDt(s.key, i, 'reason', e.target.value)}
                          placeholder="Reason"
                          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        />
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addDt(s.key)}
                      className="flex items-center gap-1 text-[10px] font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
                    >
                      <Plus size={11} /> add downtime
                    </button>
                  </div>

                  <SupervisorSelect value={sv(`${s.key}_shift_supervisor_id`)} supervisors={supervisors} onChange={v => update(`${s.key}_shift_supervisor_id`, v)} />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 text-center">
              <Stat label="Total Cycles" value={totalCycles} />
              <Stat label="Total Kg" value={totalKg} />
              <Stat label="Chemical (L)" value={chemicalLitres} sub="@ 27L/cycle" />
              <Stat label="RUC Washed" value={totalRuc} />
              <Stat label="Wheelie Bins" value={totalWheelie} />
              <Stat label="Downtime" value={totalDowntimeMin > 0 ? fmtHM(totalDowntimeMin) : '0'} />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            rows={2}
            placeholder="General notes for the day..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
          <X size={14} /> {error}
        </div>
      )}
    </Modal>
  );
}

function Stat({ label, value, sub }: { label: string; value: number | string; sub?: string }) {
  return (
    <div>
      <p className="text-base sm:text-lg font-bold text-gray-900">{typeof value === 'number' ? value.toLocaleString('en-ZA', { maximumFractionDigits: 0 }) : value}</p>
      <p className="text-[11px] text-gray-500 leading-tight">{label}</p>
      {sub && <p className="text-[10px] text-gray-400 leading-tight">{sub}</p>}
    </div>
  );
}

function ShiftInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">{label}</label>
      <input
        type="number"
        min="0"
        step={label.includes('Kg') ? '0.1' : '1'}
        value={value || ''}
        onChange={e => onChange(Number(e.target.value) || 0)}
        placeholder="0"
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 text-center"
      />
    </div>
  );
}

function SupervisorSelect({ value, supervisors, onChange }: {
  value: string;
  supervisors: Pick<Employee, 'id' | 'first_name' | 'surname' | 'position'>[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Supervisor</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white"
      >
        <option value="">None</option>
        {supervisors.map(s => (
          <option key={s.id} value={s.id}>{s.first_name} {s.surname}</option>
        ))}
      </select>
    </div>
  );
}
