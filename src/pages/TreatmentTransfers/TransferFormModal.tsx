import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { WASTE_CATEGORIES, TRANSFER_DESTINATIONS, type DailyLogRef, type TransferWithDate } from './constants';

export default function TransferFormModal({ transfer, dailyLogs, onClose, onSave }: {
  transfer?: TransferWithDate | null;
  dailyLogs: DailyLogRef[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    daily_log_id: transfer?.daily_log_id || dailyLogs[0]?.id || '',
    waste_category: transfer?.waste_category || 'Infectious',
    quantity_kg: transfer ? String(transfer.quantity_kg) : '',
    destination: transfer?.destination || TRANSFER_DESTINATIONS[0],
    manifest_number: transfer?.manifest_number || '',
    notes: transfer?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.daily_log_id || !form.quantity_kg || Number(form.quantity_kg) <= 0) {
      setError('Please select a date and enter a valid quantity.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      daily_log_id: form.daily_log_id,
      transfer_type: 'Transfer Out',
      waste_category: form.waste_category,
      quantity_kg: Number(form.quantity_kg),
      destination: form.destination,
      manifest_number: form.manifest_number,
      notes: form.notes,
    };

    if (transfer) {
      const { error: err } = await supabase
        .from('treatment_waste_transfers')
        .update(payload)
        .eq('id', transfer.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('treatment_waste_transfers').insert(payload);
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
        className="flex items-center gap-1.5 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors"
      >
        <Save size={14} /> {saving ? 'Saving...' : transfer ? 'Update Transfer' : 'Save Transfer'}
      </button>
    </>
  );

  return (
    <Modal
      title={transfer ? 'Edit Waste Transfer' : 'Record Waste Transfer'}
      onClose={onClose}
      size="md"
      accent="green"
      footer={modalFooter}
    >
      <div className="space-y-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-xs text-emerald-800">
          Untreated medical waste collected and sent to an external treatment facility.
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Production Date *</label>
          <select
            value={form.daily_log_id}
            onChange={e => setForm(prev => ({ ...prev, daily_log_id: e.target.value }))}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {dailyLogs.slice(0, 60).map(l => (
              <option key={l.id} value={l.id}>
                {new Date(l.date).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Waste Stream</label>
            <select
              value={form.waste_category}
              onChange={e => setForm(prev => ({ ...prev, waste_category: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {WASTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Quantity (kg) *</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={form.quantity_kg}
              onChange={e => setForm(prev => ({ ...prev, quantity_kg: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Facility</label>
            <select
              value={form.destination}
              onChange={e => setForm(prev => ({ ...prev, destination: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
            >
              {TRANSFER_DESTINATIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Manifest Number</label>
            <input
              type="text"
              value={form.manifest_number}
              onChange={e => setForm(prev => ({ ...prev, manifest_number: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
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
