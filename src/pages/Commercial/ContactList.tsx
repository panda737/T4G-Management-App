import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase, type CrmContact } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum } from '../../components/crm/crmUtils';
import ContactFormModal from './ContactFormModal';

type ContactRow = CrmContact & { client_name: string };

function PrimaryBadge({ primary }: { primary: boolean }) {
  if (!primary) return null;
  return <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">Primary</span>;
}

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function ContactList() {
  usePageTitle('Commercial — Contacts');
  const navigate = useNavigate();
  const { isAdmin, canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | ContactRow | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('crm_contacts')
      .select('*, clients(client_name)')
      .order('last_name')
      .order('first_name');
    setContacts(
      ((data ?? []) as Array<Record<string, unknown>>).map(c => ({
        ...(c as unknown as CrmContact),
        client_name: (c.clients as { client_name: string } | null)?.client_name ?? '—',
      })),
    );
    setLoading(false);
  }

  // ── columns ───────────────────────────────────────────────────────────────
  const clientOptions = useMemo(
    () => [...new Map(contacts.map(c => [c.client_id, c.client_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
    [contacts],
  );

  const columns: Column<ContactRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Contact',
      cell: c => (
        <div>
          <div className="font-medium text-gray-900 flex items-center gap-1.5">
            {`${c.first_name} ${c.last_name}`.trim() || '(no name)'}
            <PrimaryBadge primary={c.is_primary} />
          </div>
          {c.job_title && <div className="text-xs text-gray-400 mt-0.5">{c.job_title}</div>}
        </div>
      ),
      sortValue: c => `${c.last_name} ${c.first_name}`,
      exportValue: c => `${c.first_name} ${c.last_name}`.trim(),
    },
    {
      key: 'account',
      header: 'Account',
      cell: c => (
        <button
          onClick={e => { e.stopPropagation(); navigate(`/commercial/clients/${c.client_id}`); }}
          className="text-indigo-600 hover:underline text-left truncate block max-w-[160px]"
        >
          {c.client_name}
        </button>
      ),
      sortValue: c => c.client_name,
      exportValue: c => c.client_name,
    },
    {
      key: 'email',
      header: 'Email',
      cell: c => c.email
        ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline truncate block max-w-[180px]">{c.email}</a>
        : '—',
      exportValue: c => c.email,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: c => c.phone || '—',
      exportValue: c => c.phone,
      defaultHidden: true,
    },
    {
      key: 'mobile',
      header: 'Mobile',
      cell: c => c.mobile || '—',
      exportValue: c => c.mobile,
      defaultHidden: true,
    },
    {
      key: 'status',
      header: 'Status',
      cell: c => c.active
        ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
        : <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>,
      sortValue: c => c.active ? 'a' : 'z',
      exportValue: c => c.active ? 'Active' : 'Inactive',
      defaultHidden: true,
    },
  ], [navigate]);

  const filters: FilterDef<ContactRow>[] = useMemo(() => [
    { key: 'client', label: 'Account', options: clientOptions, predicate: (c, v) => c.client_id === v },
    { key: 'active', label: 'Status', options: ACTIVE_OPTIONS, predicate: (c, v) => String(c.active) === v },
  ], [clientOptions]);

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleSaved(saved: CrmContact) {
    setContacts(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      const row: ContactRow = { ...saved, client_name: prev[idx]?.client_name ?? '—' };
      if (idx >= 0) return prev.map((c, i) => i === idx ? row : c);
      return [row, ...prev].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`));
    });
    setModal(null);
    addToast(modal === 'new' ? 'Contact created' : 'Contact updated');
    // Reload to get updated client_name if client changed
    if (modal !== 'new') load();
  }

  async function deleteContacts(rows: ContactRow[]) {
    if (!window.confirm(`Delete ${rows.length} contact${rows.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = rows.map(r => r.id);
    const { error } = await supabase.from('crm_contacts').delete().in('id', ids);
    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    setContacts(prev => prev.filter(c => !ids.includes(c.id)));
    addToast(`Deleted ${rows.length} contact${rows.length > 1 ? 's' : ''}`);
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <ListView<ContactRow>
        objectKey="contacts"
        title="Contacts"
        subtitle={`${fmtNum(contacts.length)} contact${contacts.length !== 1 ? 's' : ''}`}
        rows={contacts}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={c => c.id}
        search={c => `${c.first_name} ${c.last_name} ${c.email} ${c.job_title} ${c.client_name} ${c.phone} ${c.mobile}`}
        searchPlaceholder="Search contacts…"
        onRowClick={c => navigate(`/commercial/contacts/${c.id}`)}
        onNew={canEdit ? () => setModal('new') : undefined}
        newLabel="New Contact"
        exportName="contacts"
        savedViews
        bulkActions={isAdmin ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: deleteContacts },
        ] : []}
        emptyMessage="No contacts found."
      />

      {modal !== null && (
        <ContactFormModal
          contact={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
