import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase, WasteReceipt, WasteReceiptWasteType, Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';

const WASTE_TYPES: WasteReceiptWasteType[] = ['Medical', 'Sharps', 'Pharmaceutical', 'Anatomical', 'Other'];

interface Props {
  receipt: WasteReceipt | null;
  onClose: () => void;
  onSave: () => void;
}

async function nextReceiptNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `WR-${year}-`;
  const { data } = await supabase
    .from('waste_receipts')
    .select('receipt_number')
    .like('receipt_number', `${prefix}%`)
    .order('receipt_number', { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return `${prefix}0001`;
  const last = data[0].receipt_number as string;
  const seq = parseInt(last.replace(prefix, ''), 10) || 0;
  return `${prefix}${String(seq + 1).padStart(4, '0')}`;
}

export default function WasteReceiptFormModal({ receipt, onClose, onSave }: Props) {
  const isEdit = !!receipt;
  const [form, setForm] = useState({
    date: receipt?.date ?? new Date().toISOString().slice(0, 10),
    client_name: receipt?.client_name ?? '',
    waste_type: (receipt?.waste_type ?? 'Medical') as WasteReceiptWasteType,
    quantity_kg: receipt?.quantity_kg?.toString() ?? '',
    manifest_number: receipt?.manifest_number ?? '',
    vehicle_registration: receipt?.vehicle_registration ?? '',
    received_by: receipt?.received_by ?? '',
    notes: receipt?.notes ?? '',
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500';

  useEffect(() => {
    supabase.from('employees').select('id, first_name, surname').eq('status', 'active').order('surname')
      .then(({ data }) => setEmployees((data ?? []) as unknown as Employee[]));
  }, []);

  async function handleSave() {
    setError('');
    if (!form.date) { setError('Date is required.'); return; }
    if (!form.client_name.trim()) { setError('Client name is required.'); return; }
    const qty = parseFloat(form.quantity_kg);
    if (isNaN(qty) || qty <= 0) { setError('Quantity must be a positive number.'); return; }

    setSaving(true);
    try {
      const payload = {
        date: form.date,
        client_name: form.client_name.trim(),
        waste_type: form.waste_type,
        quantity_kg: qty,
        manifest_number: form.manifest_number.trim(),
        vehicle_registration: form.vehicle_registration.trim(),
        received_by: form.received_by || null,
        notes: form.notes.trim(),
        updated_at: new Date().toISOString(),
      };

      if (isEdit) {
        const { error: err } = await supabase.from('waste_receipts').update(payload).eq('id', receipt.id);
        if (err) { setError(err.message); return; }
      } else {
        const receipt_number = await nextReceiptNumber();
        const { error: err } = await supabase.from('waste_receipts').insert({ ...payload, receipt_number });
        if (err) { setError(err.message); return; }
      }
      onSave();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Receipt' : 'Record Waste Receipt'} onClose={onClose} size="md" accent="cyan">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Date *</label>
            <input type="date" value={form.date} onChange={e => set({ date: e.target.value })} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Waste Type *</label>
            <select value={form.waste_type} onChange={e => set({ waste_type: e.target.value as WasteReceiptWasteType })} className={inp}>
              {WASTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Client / Generator Name *</label>
          <input type="text" value={form.client_name} onChange={e => set({ client_name: e.target.value })} placeholder="e.g. City Hospital" className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (kg) *</label>
            <input type="number" step="0.01" min="0" value={form.quantity_kg} onChange={e => set({ quantity_kg: e.target.value })} placeholder="0.00" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Manifest Number</label>
            <input type="text" value={form.manifest_number} onChange={e => set({ manifest_number: e.target.value })} placeholder="e.g. MAN-2026-001" className={inp} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Vehicle Registration</label>
            <input type="text" value={form.vehicle_registration} onChange={e => set({ vehicle_registration: e.target.value })} placeholder="e.g. CA 123-456" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Received By</label>
            <select value={form.received_by} onChange={e => set({ received_by: e.target.value })} className={inp}>
              <option value="">— select employee —</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.surname}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set({ notes: e.target.value })} rows={2} className={`${inp} resize-none`} placeholder="Optional notes" />
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700 transition disabled:opacity-50"
          >
            {saving ? <><Loader size={14} className="animate-spin" /> Saving...</> : (isEdit ? 'Save Changes' : 'Record Receipt')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
