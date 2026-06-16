import { useEffect, useState } from 'react';
import { Calendar, Factory, Save, AlertTriangle, Check, X, Plus } from 'lucide-react';
import { supabase, TreatmentDailyLog as TDL, Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';

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

export default function DailyLogFormModal({ log, onClose, onSave }: Props) {
  const [supervisors, setSupervisors] = useState<Pick<Employee, 'id' | 'first_name' | 'surname' | 'position'>[]>([]);

  const [form, setForm] = useState({
    date: log?.date || new Date().toISOString().split('T')[0],
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
    downtime_entries: [{ minutes: log?.downtime_minutes ?? 0, reason: log?.downtime_reason ?? '' }],
    notes: log?.notes ?? '',
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

  function addDowntimeEntry() {
    setForm(prev => ({ ...prev, downtime_entries: [...prev.downtime_entries, { minutes: 0, reason: '' }] }));
  }

  function removeDowntimeEntry(index: number) {
    setForm(prev => ({ ...prev, downtime_entries: prev.downtime_entries.filter((_, i) => i !== index) }));
  }

  function updateDowntimeEntry(index: number, field: 'minutes' | 'reason', value: number | string) {
    setForm(prev => ({
      ...prev,
      downtime_entries: prev.downtime_entries.map((e, i) => i === index ? { ...e, [field]: value } : e),
    }));
  }

  async function handleSave() {
    if (!form.date) {
      setError('Date is required');
      return;
    }
    setSaving(true);
    setError('');

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
      downtime_minutes: form.downtime_entries.reduce((s, e) => s + (Number(e.minutes) || 0), 0),
      downtime_reason: form.downtime_entries.length === 1
        ? form.downtime_entries[0].reason
        : form.downtime_entries
            .filter(e => e.reason.trim() || Number(e.minutes) > 0)
            .map(e => e.reason && Number(e.minutes) > 0 ? `${e.reason} (${e.minutes} min)` : e.reason || `${e.minutes} min`)
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
                  <SupervisorSelect value={sv(`${s.key}_shift_supervisor_id`)} supervisors={supervisors} onChange={v => update(`${s.key}_shift_supervisor_id`, v)} />
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 text-center">
              <Stat label="Total Cycles" value={totalCycles} />
              <Stat label="Total Kg" value={totalKg} />
              <Stat label="Chemical (L)" value={chemicalLitres} sub="@ 27L/cycle" />
              <Stat label="RUC Washed" value={totalRuc} />
              <Stat label="Wheelie Bins" value={totalWheelie} />
            </div>
          </div>
        </div>

        {/* Downtime */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} /> Downtime
            </h3>
            <button
              type="button"
              onClick={addDowntimeEntry}
              className="flex items-center gap-1 text-xs font-medium text-cyan-600 hover:text-cyan-700 transition-colors"
            >
              <Plus size={13} /> Add downtime
            </button>
          </div>
          <div className="space-y-2">
            {form.downtime_entries.map((entry, i) => (
              <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 sm:gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Minutes</label>
                  <input
                    type="number"
                    min="0"
                    value={entry.minutes || ''}
                    onChange={e => updateDowntimeEntry(i, 'minutes', Number(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div className="sm:col-span-3 flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Reason</label>
                    <input
                      type="text"
                      value={entry.reason}
                      onChange={e => updateDowntimeEntry(i, 'reason', e.target.value)}
                      placeholder="e.g. Shredder clogged, No power, Waiting for RORO..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  {form.downtime_entries.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDowntimeEntry(i)}
                      className="mb-px p-2 text-gray-400 hover:text-red-500 transition-colors flex-shrink-0 self-end"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {form.downtime_entries.length > 1 && (
            <p className="mt-2 text-xs text-gray-500">
              Total downtime: <strong>{form.downtime_entries.reduce((s, e) => s + (Number(e.minutes) || 0), 0)} min</strong>
            </p>
          )}
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

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div>
      <p className="text-base sm:text-lg font-bold text-gray-900">{value.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
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
