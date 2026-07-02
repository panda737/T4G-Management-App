import { useState } from 'react';
import { Save, X, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { TreatmentMonthlySummary } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { fmtMonth } from '../../lib/formatters';

export default function LandfillFormModal({
  record,
  onClose,
  onSave,
}: {
  record: TreatmentMonthlySummary | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const defaultMonth = record
    ? record.month.substring(0, 7)
    : new Date().toISOString().substring(0, 7);

  const defaultTons = record
    ? (Number(record.total_sent_for_landfill_kg) / 1000).toString()
    : '';

  const defaultWaterTons = record && Number(record.total_water_to_landfill_kg) > 0
    ? (Number(record.total_water_to_landfill_kg) / 1000).toString()
    : '';

  const [month, setMonth] = useState(defaultMonth);
  const [tons, setTons] = useState(defaultTons);
  const [waterTons, setWaterTons] = useState(defaultWaterTons);
  const [notes, setNotes] = useState(record?.notes || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const wasteKg = Number(tons) * 1000 || 0;
  const waterKg = Number(waterTons) * 1000 || 0;
  const waterPct = wasteKg + waterKg > 0 ? (waterKg / (wasteKg + waterKg)) * 100 : 0;

  async function handleSave() {
    if (!month || !tons || Number(tons) <= 0) {
      setError('Please select a month and enter a valid tonnage.');
      return;
    }
    setSaving(true);
    setError('');

    const monthDate = `${month}-01`;

    if (record) {
      const { error: err } = await supabase
        .from('treatment_monthly_summary')
        .update({ month: monthDate, total_sent_for_landfill_kg: wasteKg, total_water_to_landfill_kg: waterKg, notes, updated_at: new Date().toISOString() })
        .eq('id', record.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase
        .from('treatment_monthly_summary')
        .upsert({ month: monthDate, total_sent_for_landfill_kg: wasteKg, total_water_to_landfill_kg: waterKg, notes, updated_at: new Date().toISOString() }, { onConflict: 'month' });
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSave();
  }

  const modalFooter = (
    <>
      <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-5 py-2 text-sm bg-slate-600 hover:bg-slate-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors"
      >
        <Save size={14} /> {saving ? 'Saving...' : record ? 'Update' : 'Save Record'}
      </button>
    </>
  );

  return (
    <Modal title={record ? `Edit Landfill Record — ${fmtMonth(record.month.substring(0, 7))}` : 'Add Landfill Record'} onClose={onClose} size="sm" accent="gray" footer={modalFooter}>
      <div className="space-y-4">
        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700">
          Treated waste collected by us and dispatched to Mooiplaats Landfill.
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Month *</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="month"
              value={month}
              onChange={e => setMonth(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
            />
          </div>
          <p className="text-[11px] text-gray-400 mt-1">
            {record
              ? 'Changing the month moves this record — pick a month that doesn’t already have one.'
              : 'If a record for this month already exists, it will be updated.'}
          </p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tons Sent to Landfill *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={tons}
            onChange={e => setTons(e.target.value)}
            placeholder="e.g. 12.5"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {tons && Number(tons) > 0 && (
            <p className="text-[11px] text-gray-400 mt-1">= {wasteKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg</p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Water / Liquid Waste to Landfill</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={waterTons}
            onChange={e => setWaterTons(e.target.value)}
            placeholder="e.g. 3.2"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
          />
          {waterTons && Number(waterTons) > 0 && (
            <p className="text-[11px] text-gray-400 mt-1">
              = {waterKg.toLocaleString('en-ZA', { maximumFractionDigits: 0 })} kg · {waterPct.toFixed(1)}% of total sent to landfill
            </p>
          )}
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={2}
            placeholder="Optional notes..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
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
