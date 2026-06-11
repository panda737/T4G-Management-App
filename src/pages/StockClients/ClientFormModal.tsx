import { useState } from 'react';
import { supabase, Client } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  client: Client | null;
  onClose: () => void;
  onSave: () => void;
}

export default function ClientFormModal({ client, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    client_code: client?.client_code || '',
    client_name: client?.client_name || '',
    contact_person: client?.contact_person || '',
    email: client?.email || '',
    phone: client?.phone || '',
    address_line_1: client?.address_line_1 || '',
    address_line_2: client?.address_line_2 || '',
    address_line_3: client?.address_line_3 || '',
    postal_code: client?.postal_code || '',
    notes: client?.notes || '',
    active: client?.active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field: keyof typeof form, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.client_name.trim()) { setError('Client name is required.'); return; }
    setSaving(true);
    setError('');

    const { error: err } = client
      ? await supabase.from('clients').update(form).eq('id', client.id)
      : await supabase.from('clients').insert(form);

    if (err) { setError(err.message); setSaving(false); return; }
    setSaving(false);
    onSave();
  }

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white';

  return (
    <Modal title={client ? 'Edit Client' : 'Add Client'} onClose={onClose} size="lg" accent="green" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSave} disabled={saving || !form.client_name.trim()} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm">
          {saving ? 'Saving...' : client ? 'Save Changes' : 'Add Client'}
        </button>
      </>
    }>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Client Name *</label>
          <input value={form.client_name} onChange={e => set('client_name', e.target.value)} className={inputCls} placeholder="e.g. Hospital ABC" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Account / Client Code</label>
          <input value={form.client_code} onChange={e => set('client_code', e.target.value)} className={inputCls} placeholder="e.g. HAB-001" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Contact Person</label>
          <input value={form.contact_person} onChange={e => set('contact_person', e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 1</label>
          <input value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} className={inputCls} placeholder="Street address" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 2</label>
          <input value={form.address_line_2} onChange={e => set('address_line_2', e.target.value)} className={inputCls} placeholder="Suburb" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address Line 3</label>
          <input value={form.address_line_3} onChange={e => set('address_line_3', e.target.value)} className={inputCls} placeholder="City / Province" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code</label>
          <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputCls} />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
            Active client
          </label>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} className={`${inputCls} resize-none`} />
        </div>
      </div>
      {error && <p className="text-sm text-red-600 mt-3 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
    </Modal>
  );
}
