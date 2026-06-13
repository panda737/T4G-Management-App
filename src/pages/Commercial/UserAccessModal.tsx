import { useEffect, useState } from 'react';
import { supabase, type UserProfile, type Client, type CrmContact } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

interface Props {
  user: UserProfile;
  clients: Client[];
  onClose: () => void;
  onSave: (updated: UserProfile) => void;
}

export default function UserAccessModal({ user, clients, onClose, onSave }: Props) {
  const { addToast } = useToast();
  const [clientId, setClientId] = useState(user.client_id ?? '');
  const [contactId, setContactId] = useState('');
  const [isActive, setIsActive] = useState(user.is_active);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadLinkedContact() {
      const { data } = await supabase
        .from('crm_contacts')
        .select('id')
        .eq('portal_user_id', user.id)
        .maybeSingle();
      if (data) setContactId((data as { id: string }).id);
    }
    loadLinkedContact();
  }, [user.id]);

  useEffect(() => {
    async function loadContacts() {
      if (!clientId) { setContacts([]); return; }
      const { data } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .order('last_name')
        .order('first_name');
      setContacts((data ?? []) as CrmContact[]);
    }
    loadContacts();
  }, [clientId]);

  async function handleSave() {
    setSaving(true);

    const { error: userErr } = await supabase
      .from('user_profiles')
      .update({ client_id: clientId || null, is_active: isActive })
      .eq('id', user.id);
    if (userErr) { addToast('Could not update user: ' + userErr.message, 'error'); setSaving(false); return; }

    const { error: clearErr } = await supabase
      .from('crm_contacts')
      .update({ portal_user_id: null })
      .eq('portal_user_id', user.id);
    if (clearErr) { addToast('Could not clear contact link: ' + clearErr.message, 'error'); setSaving(false); return; }

    if (contactId) {
      const { error: linkErr } = await supabase
        .from('crm_contacts')
        .update({ portal_user_id: user.id })
        .eq('id', contactId);
      if (linkErr) { addToast('Could not link contact: ' + linkErr.message, 'error'); setSaving(false); return; }
    }

    setSaving(false);
    onSave({ ...user, client_id: clientId || null, is_active: isActive });
  }

  const selectedClient = clients.find(c => c.id === clientId);

  return (
    <Modal
      title={`Portal Access — ${user.display_name}`}
      onClose={onClose}
      size="sm"
      accent="indigo"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">Linked Account</label>
          <select
            value={clientId}
            onChange={e => { setClientId(e.target.value); setContactId(''); }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— No access (unlinked) —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
        </div>

        {clientId && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Linked Contact{' '}
              <span className="text-gray-400 font-normal">(optional — scopes data to this person)</span>
            </label>
            <select
              value={contactId}
              onChange={e => setContactId(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— No specific contact —</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {`${c.first_name} ${c.last_name}`.trim() || '(no name)'}
                  {c.is_primary ? ' · Primary' : ''}
                </option>
              ))}
            </select>
            {contacts.length === 0 && (
              <p className="text-xs text-gray-400 mt-1.5">
                No active contacts for {selectedClient?.client_name}.
                Add contacts under the account record first.
              </p>
            )}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <input
            id="ua-active"
            type="checkbox"
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <label htmlFor="ua-active" className="text-sm text-gray-700">Portal account active</label>
        </div>
      </div>
    </Modal>
  );
}
