import { useState } from 'react';
import { Save, X } from 'lucide-react';
import { supabase, Part } from '../../lib/supabase';

const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400';

interface Props {
  equipmentId: string;
  part: Part | null;
  onClose: () => void;
  onSave: () => void;
}

export default function PartFormModal({ equipmentId, part, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    name: part?.name ?? '',
    part_number: part?.part_number ?? '',
    supplier: part?.supplier ?? '',
    qty_on_hand: part?.qty_on_hand ?? 0,
    qty_required: part?.qty_required ?? 1,
    unit_cost: part?.unit_cost?.toString() ?? '',
    notes: part?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.name.trim()) { setError('Part name is required'); return; }
    setSaving(true);
    setError('');
    const payload = {
      equipment_id: equipmentId,
      name: form.name.trim(),
      part_number: form.part_number || null,
      supplier: form.supplier || null,
      qty_on_hand: Number(form.qty_on_hand),
      qty_required: Number(form.qty_required),
      unit_cost: form.unit_cost ? Number(form.unit_cost) : null,
      notes: form.notes || null,
    };
    const { error: err } = part?.id
      ? await supabase.from('parts').update(payload).eq('id', part.id)
      : await supabase.from('parts').insert(payload);
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">{part ? 'Edit Part' : 'Add Spare Part'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Part Name *</label>
          <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Part Number</label><input className={inp} value={form.part_number} onChange={e => setForm({ ...form, part_number: e.target.value })} /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Supplier</label><input className={inp} value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">On Hand</label><input className={inp} type="number" min="0" value={form.qty_on_hand} onChange={e => setForm({ ...form, qty_on_hand: Number(e.target.value) })} /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Required</label><input className={inp} type="number" min="0" value={form.qty_required} onChange={e => setForm({ ...form, qty_required: Number(e.target.value) })} /></div>
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Unit Cost (R)</label><input className={inp} type="number" min="0" step="0.01" value={form.unit_cost} onChange={e => setForm({ ...form, unit_cost: e.target.value })} /></div>
        </div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">Notes</label><textarea className={inp} rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2"><X size={13} /> {error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium shadow-sm transition-colors">
            <Save size={13} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
