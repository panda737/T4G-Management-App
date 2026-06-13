import { useState } from 'react';
import { supabase, type Client } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  client: Client | null;
  onClose: () => void;
  onSave: (saved: Client) => void;
}

const ACCOUNT_STATUSES = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function AccountFormModal({ client, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    client_name: client?.client_name ?? '',
    client_code: client?.client_code ?? '',
    account_status: client?.account_status ?? 'active',
    industry: client?.industry ?? '',
    website: client?.website ?? '',
    contact_person: client?.contact_person ?? '',
    email: client?.email ?? '',
    phone: client?.phone ?? '',
    address_line_1: client?.address_line_1 ?? '',
    address_line_2: client?.address_line_2 ?? '',
    address_line_3: client?.address_line_3 ?? '',
    postal_code: client?.postal_code ?? '',
    notes: client?.notes ?? '',
    active: client?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.client_name.trim()) { setError('Account name is required.'); return; }
    setSaving(true);
    setError('');

    const { data, error: err } = client
      ? await supabase.from('clients').update(form).eq('id', client.id).select().single()
      : await supabase.from('clients').insert(form).select().single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data as Client);
  }

  return (
    <Modal
      title={client ? 'Edit Account' : 'New Account'}
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
            disabled={saving || !form.client_name.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : client ? 'Save Changes' : 'Create Account'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Account info */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Account Info</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Name *</label>
              <input value={form.client_name} onChange={e => set('client_name', e.target.value)} className={inputCls} placeholder="e.g. Hospital ABC" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Account Code</label>
              <input value={form.client_code} onChange={e => set('client_code', e.target.value)} className={inputCls} placeholder="e.g. HAB-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select value={form.account_status} onChange={e => set('account_status', e.target.value as typeof form.account_status)} className={inputCls}>
                {ACCOUNT_STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
              <input value={form.industry} onChange={e => set('industry', e.target.value)} className={inputCls} placeholder="e.g. Healthcare" />
            </div>
            <div>
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
