import { useEffect, useState } from 'react';
import { supabase, type Client, type ClientSite } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  site: ClientSite | null;
  /** If provided the account dropdown is pre-selected and locked. */
  lockedClientId?: string;
  onClose: () => void;
  onSave: (saved: ClientSite) => void;
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

export default function SiteFormModal({ site, lockedClientId, onClose, onSave }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [form, setForm] = useState({
    client_id: site?.client_id ?? lockedClientId ?? '',
    generator_facility: site?.generator_facility ?? '',
    generator_group: site?.generator_group ?? '',
    site_code: site?.site_code ?? '',
    province: site?.province ?? '',
    active: site?.active ?? true,
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
    if (!form.generator_facility.trim()) { setError('Facility name is required.'); return; }
    if (!form.client_id) { setError('Account is required.'); return; }
    setSaving(true);
    setError('');

    const { data, error: err } = site
      ? await supabase.from('client_sites').update(form).eq('id', site.id).select().single()
      : await supabase.from('client_sites').insert(form).select().single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    onSave(data as ClientSite);
  }

  return (
    <Modal
      title={site ? 'Edit Site' : 'New Site'}
      onClose={onClose}
      size="md"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.generator_facility.trim()}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : site ? 'Save Changes' : 'Create Site'}
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

        {/* Site details */}
        <div>
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Site Details</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Generator Facility *</label>
              <input value={form.generator_facility} onChange={e => set('generator_facility', e.target.value)} className={inputCls} placeholder="e.g. Main Hospital Campus" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Generator Group</label>
              <input value={form.generator_group} onChange={e => set('generator_group', e.target.value)} className={inputCls} placeholder="e.g. Region North" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Site Code</label>
              <input value={form.site_code} onChange={e => set('site_code', e.target.value)} className={inputCls} placeholder="e.g. SITE-001" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
              <input value={form.province} onChange={e => set('province', e.target.value)} className={inputCls} placeholder="e.g. Gauteng" />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
          <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
          Active
        </label>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
      </div>
    </Modal>
  );
}
