import { useEffect, useState } from 'react';
import {
  Plus, Calendar, Factory, Save,
  AlertTriangle, Check, Trash2, X,
} from 'lucide-react';
import { supabase, TreatmentDailyLog as TDL, TreatmentWasteTransfer, Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';

const WASTE_CATEGORIES = ['Infectious', 'Sharps', 'Anatomical', 'Pharmaceutical', 'Cytotoxic', 'Clinical Glass', 'PVC', 'Other'];
const TRANSFER_DESTINATIONS = ['A-Thermal', 'Averda', 'Biomed', 'ClinX', 'Holfontein'];
const LANDFILL_DESTINATION = 'Mooiplaats Landfill';

interface Props {
  log: TDL | null;
  onClose: () => void;
  onSave: () => void;
}

export default function DailyLogFormModal({ log, onClose, onSave }: Props) {
  const [supervisors, setSupervisors] = useState<Employee[]>([]);
  const [transfers, setTransfers] = useState<TreatmentWasteTransfer[]>([]);

  const [form, setForm] = useState({
    date: log?.date || new Date().toISOString().split('T')[0],
    day_shift_cycles: log?.day_shift_cycles ?? 0,
    day_shift_treated_kg: log?.day_shift_treated_kg ?? 0,
    day_shift_supervisor_id: log?.day_shift_supervisor_id ?? '',
    afternoon_shift_cycles: log?.afternoon_shift_cycles ?? 0,
    afternoon_shift_treated_kg: log?.afternoon_shift_treated_kg ?? 0,
    afternoon_shift_supervisor_id: log?.afternoon_shift_supervisor_id ?? '',
    night_shift_cycles: log?.night_shift_cycles ?? 0,
    night_shift_treated_kg: log?.night_shift_treated_kg ?? 0,
    night_shift_supervisor_id: log?.night_shift_supervisor_id ?? '',
    downtime_minutes: log?.downtime_minutes ?? 0,
    downtime_reason: log?.downtime_reason ?? '',
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

    if (log) {
      supabase.from('treatment_waste_transfers')
        .select('*')
        .eq('daily_log_id', log.id)
        .then(({ data }) => setTransfers(data || []));
    }
  }, [log]);

  const totalCycles = Number(form.day_shift_cycles) + Number(form.afternoon_shift_cycles) + Number(form.night_shift_cycles);
  const totalKg = Number(form.day_shift_treated_kg) + Number(form.afternoon_shift_treated_kg) + Number(form.night_shift_treated_kg);
  const chemicalLitres = totalCycles * 27;

  function update(field: string, value: string | number) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addTransfer() {
    setTransfers(prev => [...prev, {
      id: crypto.randomUUID(),
      daily_log_id: log?.id || '',
      transfer_type: 'Transfer Out',
      waste_category: 'Infectious',
      quantity_kg: 0,
      destination: TRANSFER_DESTINATIONS[0],
      manifest_number: '',
      notes: '',
      created_at: new Date().toISOString(),
    }]);
  }

  function updateTransfer(idx: number, field: string, value: string | number) {
    setTransfers(prev => prev.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  }

  function removeTransfer(idx: number) {
    setTransfers(prev => prev.filter((_, i) => i !== idx));
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
      day_shift_cycles: Number(form.day_shift_cycles) || 0,
      day_shift_treated_kg: Number(form.day_shift_treated_kg) || 0,
      day_shift_supervisor_id: form.day_shift_supervisor_id || null,
      afternoon_shift_cycles: Number(form.afternoon_shift_cycles) || 0,
      afternoon_shift_treated_kg: Number(form.afternoon_shift_treated_kg) || 0,
      afternoon_shift_supervisor_id: form.afternoon_shift_supervisor_id || null,
      night_shift_cycles: Number(form.night_shift_cycles) || 0,
      night_shift_treated_kg: Number(form.night_shift_treated_kg) || 0,
      night_shift_supervisor_id: form.night_shift_supervisor_id || null,
      total_cycles: totalCycles,
      total_treated_kg: totalKg,
      chemical_litres: chemicalLitres,
      downtime_minutes: Number(form.downtime_minutes) || 0,
      downtime_reason: form.downtime_reason,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    };

    let logId = log?.id;

    if (log) {
      const { error: err } = await supabase
        .from('treatment_daily_log')
        .update(payload)
        .eq('id', log.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data: newLog, error: err } = await supabase
        .from('treatment_daily_log')
        .insert(payload)
        .select('id')
        .maybeSingle();
      if (err) { setError(err.message); setSaving(false); return; }
      logId = newLog?.id;
    }

    if (logId) {
      await supabase.from('treatment_waste_transfers').delete().eq('daily_log_id', logId);
      const validTransfers = transfers.filter(t => Number(t.quantity_kg) > 0);
      if (validTransfers.length > 0) {
        const { error: tErr } = await supabase.from('treatment_waste_transfers').insert(
          validTransfers.map(t => ({
            daily_log_id: logId,
            transfer_type: t.transfer_type,
            waste_category: t.waste_category,
            quantity_kg: Number(t.quantity_kg),
            destination: t.destination,
            manifest_number: t.manifest_number,
            notes: t.notes,
          }))
        );
        if (tErr) { setError(tErr.message); setSaving(false); return; }
      }
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
      title={log ? `Edit -- ${new Date(log.date).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}` : 'New Shift Treatment Record'}
      onClose={onClose}
      size="xl"
      accent="cyan"
      footer={modalFooter}
    >
      <div className="space-y-6">
        {/* Date field */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Date *</label>
            <div className="relative">
              <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="date"
                value={form.date}
                onChange={e => update('date', e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Shift data */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Factory size={14} /> Shift Production Data
          </h3>
          <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-2">
              <p className="text-xs font-semibold text-gray-600 text-center">Day Shift</p>
              <p className="text-xs font-semibold text-gray-600 text-center">Afternoon Shift</p>
              <p className="text-xs font-semibold text-gray-600 text-center">Night Shift</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              <ShiftInput label="Cycles" value={form.day_shift_cycles} onChange={v => update('day_shift_cycles', v)} />
              <ShiftInput label="Cycles" value={form.afternoon_shift_cycles} onChange={v => update('afternoon_shift_cycles', v)} />
              <ShiftInput label="Cycles" value={form.night_shift_cycles} onChange={v => update('night_shift_cycles', v)} />
              <ShiftInput label="Kg Treated" value={form.day_shift_treated_kg} onChange={v => update('day_shift_treated_kg', v)} />
              <ShiftInput label="Kg Treated" value={form.afternoon_shift_treated_kg} onChange={v => update('afternoon_shift_treated_kg', v)} />
              <ShiftInput label="Kg Treated" value={form.night_shift_treated_kg} onChange={v => update('night_shift_treated_kg', v)} />
              <SupervisorSelect
                value={form.day_shift_supervisor_id}
                supervisors={supervisors}
                onChange={v => update('day_shift_supervisor_id', v)}
              />
              <SupervisorSelect
                value={form.afternoon_shift_supervisor_id}
                supervisors={supervisors}
                onChange={v => update('afternoon_shift_supervisor_id', v)}
              />
              <SupervisorSelect
                value={form.night_shift_supervisor_id}
                supervisors={supervisors}
                onChange={v => update('night_shift_supervisor_id', v)}
              />
            </div>

            {/* Totals */}
            <div className="mt-4 pt-3 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-center">
              <div>
                <p className="text-lg font-bold text-gray-900">{totalCycles}</p>
                <p className="text-xs text-gray-500">Total Cycles</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{totalKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}</p>
                <p className="text-xs text-gray-500">Total Kg Treated</p>
              </div>
              <div>
                <p className="text-lg font-bold text-gray-900">{chemicalLitres.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Chemical (L) @ 27L/cycle</p>
              </div>
            </div>
          </div>
        </div>

        {/* Downtime */}
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Downtime
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Downtime (minutes)</label>
              <input
                type="number"
                min="0"
                value={form.downtime_minutes}
                onChange={e => update('downtime_minutes', e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Downtime Reason</label>
              <input
                type="text"
                value={form.downtime_reason}
                onChange={e => update('downtime_reason', e.target.value)}
                placeholder="e.g. Shredder clogged, No power, Waiting for RORO..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Waste Transfers */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Waste Transfers</h3>
            <button onClick={addTransfer} className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700 font-medium">
              <Plus size={13} /> Add Transfer
            </button>
          </div>
          {transfers.length === 0 ? (
            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg p-4 text-center">No waste transfers for this day</p>
          ) : (
            <div className="space-y-3">
              {transfers.map((t, idx) => (
                <div key={t.id} className="bg-gray-50 rounded-lg p-3 flex flex-col sm:flex-row flex-wrap gap-3 items-end relative">
                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Type</label>
                    <select
                      value={t.transfer_type}
                      onChange={e => {
                        updateTransfer(idx, 'transfer_type', e.target.value);
                        if (e.target.value === 'Landfill') updateTransfer(idx, 'destination', LANDFILL_DESTINATION);
                      }}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white"
                    >
                      <option value="Transfer Out">Transfer Out</option>
                      <option value="Landfill">Landfill</option>
                    </select>
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Category</label>
                    <select
                      value={t.waste_category}
                      onChange={e => updateTransfer(idx, 'waste_category', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white"
                    >
                      {WASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="w-full sm:w-24">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Kg</label>
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={t.quantity_kg}
                      onChange={e => updateTransfer(idx, 'quantity_kg', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div className="w-full sm:flex-1 sm:min-w-[120px]">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Destination</label>
                    {t.transfer_type === 'Landfill' ? (
                      <input
                        value={LANDFILL_DESTINATION}
                        disabled
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-gray-100 text-gray-500"
                      />
                    ) : (
                      <select
                        value={t.destination}
                        onChange={e => updateTransfer(idx, 'destination', e.target.value)}
                        className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs bg-white"
                      >
                        {TRANSFER_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    )}
                  </div>
                  <div className="w-full sm:flex-1 sm:min-w-[100px]">
                    <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Manifest #</label>
                    <input
                      type="text"
                      value={t.manifest_number}
                      onChange={e => updateTransfer(idx, 'manifest_number', e.target.value)}
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-xs"
                    />
                  </div>
                  <button
                    onClick={() => removeTransfer(idx)}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors sm:self-end"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
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
  supervisors: Employee[];
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
        <option value="">-- None --</option>
        {supervisors.map(s => (
          <option key={s.id} value={s.id}>{s.first_name} {s.surname}</option>
        ))}
      </select>
    </div>
  );
}
