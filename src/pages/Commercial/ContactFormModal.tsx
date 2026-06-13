import { useEffect, useState } from 'react';
import { supabase, type Client, type CrmContact } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  contact: CrmContact | null;
  /** If provided the account dropdown is pre-selected and locked. */
  lockedClientId?: string;
  onClose: () => void;
  onSave: (saved: CrmContact) => void;
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function ContactFormModal({ contact, lockedClientId, onClose, onSave }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    client_id: contact?.client_id ?? lockedClientId ?? '',
    first_name: contact?.first_name ?? '',
    last_name: contact?.last_name ?? '',
    job_title: contact?.job_title ?? '',
    email: contact?.email ?? '',
    phone: contact?.phone ?? '',
    mobile: contact?.mobile ?? '',
    is_primary: contact?.is_primary ?? false,
    active: contact?.active ?? true,
    notes: contact?.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!lockedClientId) {
      supabase.from('clients').select('id, client_name').order('client_name')
        .then(({ data }) => setClients((data ?? []) as Client[]));
    }
  }, [lockedClientId]);

  function set<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.first_name.trim() && !form.last_name.trim()) { setError('First or last name is required.'); return; }
    if (!form.client_id) { setError('Account is required.'); return; }
    setSaving(true);
    setError('');

    const { data, error: err } = contact
      ? await supabase.from('crm_contacts').update(form).eq('id', contact.id).select().single()
      : await supabase.from('crm_contacts').insert(form).select().single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data as CrmContact);
  }

  return (
    <Modal
      title={contact ? 'Edit Contact' : 'New Contact'}
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
            disabled={saving || (!form.first_name.trim() && !form.last_name.trim())}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : contact ? 'Save Changes' : 'Create Contact'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Account */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Account *</label>
          {lockedClientId ? (
            <input
              value={clients.find(c => c.id === lockedClientId)?.client_name ?? lockedClientId}
              readOnly
              className={`${inputCls} bg-gray-50 text-gray-500`}
            />
          ) : (
            <select value={form.client_id} onChange={e => set('client_id', e.target.value)} className={inputCls}>
              <option value="">Select account…</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
            </select>
          )}
        </div>

        {/* Name */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Name</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} className={inputCls} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Job Title</label>
              <input value={form.job_title} onChange={e => set('job_title', e.target.value)} className={inputCls} placeholder="e.g. Environmental Manager" />
            </div>
          </div>
        </div>

        {/* Contact info */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact Info</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Mobile</label>
              <input type="tel" value={form.mobile} onChange={e => set('mobile', e.target.value)} className={inputCls} />
            </div>
          </div>
        </div>

        {/* Flags + notes */}
        <div className="grid grid-cols-2 gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.is_primary} onChange={e => set('is_primary', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            Primary contact for this account
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            Active
          </label>
        </div>
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
