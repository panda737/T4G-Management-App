import { useState } from 'react';
import { supabase, type Supplier, type SupplierStatus } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  supplier: Supplier | null;
  onClose: () => void;
  onSave: (saved: Supplier) => void;
}

const SUPPLIER_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function SupplierFormModal({ supplier, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    supplier_name: supplier?.supplier_name ?? '',
    supplier_code: supplier?.supplier_code ?? '',
    status: (supplier?.status ?? 'active') as SupplierStatus,
    website: supplier?.website ?? '',
    contact_person: supplier?.contact_person ?? '',
    email: supplier?.email ?? '',
    phone: supplier?.phone ?? '',
    address_line_1: supplier?.address_line_1 ?? '',
    address_line_2: supplier?.address_line_2 ?? '',
    address_line_3: supplier?.address_line_3 ?? '',
    postal_code: supplier?.postal_code ?? '',
    payment_terms: supplier?.payment_terms ?? '',
    lead_time_days: supplier?.lead_time_days != null ? String(supplier.lead_time_days) : '',
    notes: supplier?.notes ?? '',
    active: supplier?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.supplier_name.trim()) { setError('Supplier name is required.'); return; }
    setSaving(true);
    setError('');

    const { lead_time_days, ...rest } = form;
    const payload = {
      ...rest,
      lead_time_days: lead_time_days.trim() === '' ? null : Number(lead_time_days),
    };

    const { data, error: err } = supplier
      ? await supabase.from('suppliers').update(payload).eq('id', supplier.id).select().single()
      : await supabase.from('suppliers').insert(payload).select().single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data as Supplier);
  }

  return (
    <Modal
      title={supplier ? 'Edit Supplier' : 'New Supplier'}
      onClose={onClose}
      size="lg"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.supplier_name.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : supplier ? 'Save Changes' : 'Create Supplier'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Supplier info */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Supplier Info</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Name *</label>
              <input value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} className={inputCls} placeholder="e.g. Acme Packaging" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Supplier Code</label>
              <input value={form.supplier_code} onChange={e => set('supplier_code', e.target.value)} className={inputCls} placeholder="e.g. ACM-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value as SupplierStatus)} className={inputCls}>
                {SUPPLIER_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Website</label>
              <input type="url" value={form.website} onChange={e => set('website', e.target.value)} className={inputCls} placeholder="https://" />
            </div>
          </div>
        </div>

        {/* Contact */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Primary Contact</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
              <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Supply terms */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Supply Terms</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Payment Terms</label>
              <input value={form.payment_terms} onChange={e => set('payment_terms', e.target.value)} className={inputCls} placeholder="e.g. 30 days" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Lead Time (days)</label>
              <input type="number" min="0" value={form.lead_time_days} onChange={e => set('lead_time_days', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Address */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Street Address</label>
              <input value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Suburb</label>
              <input value={form.address_line_2} onChange={e => set('address_line_2', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">City / Province</label>
              <input value={form.address_line_3} onChange={e => set('address_line_3', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
              <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputCls} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Active
              </label>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
            className={`${inputCls} resize-none`} />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>
    </Modal>
  );
}
