import { useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { localToday } from '../../lib/formatters';

const inp = 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400';

interface Props {
  equipmentId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function MaintenanceFormModal({ equipmentId, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    service_date: localToday(),
    type: 'Scheduled',
    technician: '',
    description: '',
    next_service_date: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    if (!form.description.trim()) { setError('Description is required'); return; }
    setSaving(true);
    setError('');
    const { error: err } = await supabase.from('maintenance_history').insert({
      equipment_id: equipmentId,
      service_date: form.service_date,
      type: form.type,
      technician: form.technician || null,
      description: form.description.trim(),
      next_service_date: form.next_service_date || null,
    });
    if (err) { setError(err.message); setSaving(false); return; }
    onSave();
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Log Maintenance Service</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="block text-xs font-medium text-gray-500 mb-1">Date</label><input className={inp} type="date" value={form.service_date} onChange={e => setForm({ ...form, service_date: e.target.value })} /></div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
            <select className={inp} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
              {['Scheduled', 'Corrective', 'Preventive', 'Emergency'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">Technician</label><input className={inp} value={form.technician} onChange={e => setForm({ ...form, technician: e.target.value })} /></div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">Description *</label><textarea className={inp} rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
        <div><label className="block text-xs font-medium text-gray-500 mb-1">Next Service Date</label><input className={inp} type="date" value={form.next_service_date} onChange={e => setForm({ ...form, next_service_date: e.target.value })} /></div>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2 flex items-center gap-2"><X size={13} /> {error}</div>}
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 font-medium shadow-sm transition-colors">
            <Wrench size={13} /> {saving ? 'Logging...' : 'Log Service'}
          </button>
        </div>
      </div>
    </div>
  );
}
