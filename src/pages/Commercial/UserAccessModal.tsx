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

type AccessMode = 'all_sites' | 'selected_sites';

export default function UserAccessModal({ user, clients, onClose, onSave }: Props) {
  const { addToast } = useToast();
  const [clientId, setClientId] = useState(user.client_id ?? '');
  const [contactId, setContactId] = useState('');
  const [accessMode, setAccessMode] = useState<AccessMode>(user.portal_access_mode ?? 'all_sites');
  const [selectedSiteIds, setSelectedSiteIds] = useState<Set<string>>(new Set());
  const [isActive, setIsActive] = useState(user.is_active);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [sites, setSites] = useState<{ id: string; generator_facility: string; province: string }[]>([]);
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
    async function loadAllowList() {
      const { data } = await supabase
        .from('portal_user_sites')
        .select('site_id')
        .eq('user_profile_id', user.id);
      setSelectedSiteIds(new Set(((data ?? []) as { site_id: string }[]).map(r => r.site_id)));
    }
    loadLinkedContact();
    loadAllowList();
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

  useEffect(() => {
    async function loadSites() {
      if (!clientId) { setSites([]); return; }
      const { data } = await supabase
        .from('client_sites')
        .select('id, generator_facility, province')
        .eq('client_id', clientId)
        .order('generator_facility');
      setSites((data ?? []) as { id: string; generator_facility: string; province: string }[]);
    }
    loadSites();
  }, [clientId]);

  function toggleSite(id: string) {
    setSelectedSiteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);

    // user_profiles: client + access mode (+ deprecate the legacy single site_id).
    const { error: userErr } = await supabase
      .from('user_profiles')
      .update({ client_id: clientId || null, portal_access_mode: accessMode, site_id: null, is_active: isActive })
      .eq('id', user.id);
    if (userErr) { addToast('Could not update user: ' + userErr.message, 'error'); setSaving(false); return; }

    // Replace the site allow-list.
    const { error: delErr } = await supabase.from('portal_user_sites').delete().eq('user_profile_id', user.id);
    if (delErr) { addToast('Could not update site access: ' + delErr.message, 'error'); setSaving(false); return; }
    if (accessMode === 'selected_sites' && selectedSiteIds.size > 0) {
      const rows = [...selectedSiteIds].map(site_id => ({ user_profile_id: user.id, site_id }));
      const { error: insErr } = await supabase.from('portal_user_sites').insert(rows);
      if (insErr) { addToast('Could not save selected sites: ' + insErr.message, 'error'); setSaving(false); return; }
    }

    // Re-point the optional linked contact.
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
    onSave({ ...user, client_id: clientId || null, portal_access_mode: accessMode, site_id: null, is_active: isActive });
  }

  const selectedClient = clients.find(c => c.id === clientId);
  const noneSelected = accessMode === 'selected_sites' && selectedSiteIds.size === 0;

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
            onChange={e => { setClientId(e.target.value); setContactId(''); setSelectedSiteIds(new Set()); }}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— No access (unlinked) —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
          </select>
        </div>

        {clientId && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">Site access</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="access-mode" checked={accessMode === 'all_sites'}
                  onChange={() => setAccessMode('all_sites')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                <span><b>All sites</b> — sees every site on the account</span>
              </label>
              <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer">
                <input type="radio" name="access-mode" checked={accessMode === 'selected_sites'}
                  onChange={() => setAccessMode('selected_sites')}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300" />
                <span><b>Selected sites only</b> — tick the sites below</span>
              </label>
            </div>

            {accessMode === 'selected_sites' && (
              <div className="mt-3 border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                {sites.length === 0 ? (
                  <p className="text-xs text-gray-400 px-3 py-3">No sites for {selectedClient?.client_name}. Add sites under the account first.</p>
                ) : sites.map(s => (
                  <label key={s.id} className="flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" checked={selectedSiteIds.has(s.id)} onChange={() => toggleSite(s.id)}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                    <span className="flex-1 truncate">{s.generator_facility}</span>
                    {s.province && <span className="text-[11px] text-gray-400">{s.province}</span>}
                  </label>
                ))}
              </div>
            )}

            {noneSelected && (
              <p className="text-xs text-amber-600 mt-2">
                No sites selected — this login will see <b>no data</b> until at least one site is ticked.
              </p>
            )}
            {accessMode === 'selected_sites' && selectedSiteIds.size > 0 && (
              <p className="text-xs text-gray-400 mt-2">
                {selectedSiteIds.size} site{selectedSiteIds.size === 1 ? '' : 's'} selected. ESG &amp; sustainability figures are shown as an allocated estimate for the visible sites.
              </p>
            )}
          </div>
        )}

        {clientId && (
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">
              Linked Contact{' '}
              <span className="text-gray-400 font-normal">(optional)</span>
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
