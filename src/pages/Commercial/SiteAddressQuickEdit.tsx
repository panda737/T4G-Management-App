import { useState } from 'react';
import { supabase, type ClientSite } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { useToast } from '../../lib/toast';

export type AddressPatch = Pick<
  ClientSite,
  'address_line_1' | 'address_line_2' | 'address_line_3' | 'province' | 'postal_code'
>;

interface Props {
  site: ClientSite & { client_name?: string };
  onClose: () => void;
  onSaved: (patch: AddressPatch) => void;
}

const inputCls =
  'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

/** Lightweight address-only editor launched from the Sites list — quick back-fill
 *  without opening the full site form. */
export default function SiteAddressQuickEdit({ site, onClose, onSaved }: Props) {
  const { addToast } = useToast();
  const [form, setForm] = useState<AddressPatch>({
    address_line_1: site.address_line_1 ?? '',
    address_line_2: site.address_line_2 ?? '',
    address_line_3: site.address_line_3 ?? '',
    province: site.province ?? '',
    postal_code: site.postal_code ?? '',
  });
  const [saving, setSaving] = useState(false);

  function set<K extends keyof AddressPatch>(field: K, value: AddressPatch[K]) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase.from('client_sites').update(form).eq('id', site.id);
    setSaving(false);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    onSaved(form);
    addToast('Address updated');
  }

  return (
    <Modal
      title={`Address — ${site.generator_facility}`}
      onClose={onClose}
      size="sm"
      accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm"
          >
            {saving ? 'Saving…' : 'Save Address'}
          </button>
        </>
      }
    >
      {site.client_name && (
        <p className="text-xs text-gray-500 mb-4">{site.client_name}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Address line 1</label>
          <input value={form.address_line_1} onChange={e => set('address_line_1', e.target.value)} className={inputCls} placeholder="Street address" autoFocus />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Address line 2</label>
          <input value={form.address_line_2} onChange={e => set('address_line_2', e.target.value)} className={inputCls} placeholder="Suburb / area (optional)" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Address line 3</label>
          <input value={form.address_line_3} onChange={e => set('address_line_3', e.target.value)} className={inputCls} placeholder="City / town" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Postal code</label>
          <input value={form.postal_code} onChange={e => set('postal_code', e.target.value)} className={inputCls} placeholder="e.g. 2191" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-700 mb-1">Province</label>
          <input value={form.province} onChange={e => set('province', e.target.value)} className={inputCls} placeholder="e.g. Gauteng" />
        </div>
      </div>
    </Modal>
  );
}
