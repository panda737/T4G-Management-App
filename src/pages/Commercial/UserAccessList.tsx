import { useEffect, useMemo, useState } from 'react';
import { Link2, ShieldOff, Info } from 'lucide-react';
import { supabase, type UserProfile, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import UserAccessModal from './UserAccessModal';

type LinkedContact = { id: string; first_name: string; last_name: string; portal_user_id: string };

type UserRow = UserProfile & {
  client_name: string;
  contact_name: string | null;
  contact_id: string | null;
};

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

function StatusBadge({ active }: { active: boolean }) {
  return active
    ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
    : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>;
}

export default function UserAccessList() {
  usePageTitle('Commercial — Users & Access');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [users, setUsers] = useState<UserRow[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<UserRow | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [uRes, cRes, linkRes] = await Promise.all([
      supabase.from('user_profiles').select('*').eq('role', 'customer').order('display_name'),
      supabase.from('clients').select('*').order('client_name'),
      supabase
        .from('crm_contacts')
        .select('id, first_name, last_name, portal_user_id')
        .not('portal_user_id', 'is', null),
    ]);

    const loadedClients = (cRes.data ?? []) as Client[];
    setClients(loadedClients);

    const clientMap = new Map<string, string>(loadedClients.map(c => [c.id, c.client_name]));

    const contactByUser = new Map<string, LinkedContact>();
    ((linkRes.data ?? []) as LinkedContact[]).forEach(c => {
      if (c.portal_user_id) contactByUser.set(c.portal_user_id, c);
    });

    const rows: UserRow[] = ((uRes.data ?? []) as UserProfile[]).map(u => {
      const contact = contactByUser.get(u.id);
      return {
        ...u,
        client_name: u.client_id ? (clientMap.get(u.client_id) ?? '—') : '—',
        contact_name: contact
          ? `${contact.first_name} ${contact.last_name}`.trim() || null
          : null,
        contact_id: contact?.id ?? null,
      };
    });

    setUsers(rows);
    setLoading(false);
  }

  const accountOptions = useMemo(
    () =>
      [...new Map(
        users.filter(u => u.client_id).map(u => [u.client_id!, u.client_name]),
      ).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([value, label]) => ({ value, label })),
    [users],
  );

  const columns: Column<UserRow>[] = useMemo(() => [
    {
      key: 'name',
      header: 'User',
      cell: u => <span className="font-medium text-gray-900">{u.display_name}</span>,
      sortValue: u => u.display_name,
      exportValue: u => u.display_name,
    },
    {
      key: 'account',
      header: 'Account',
      cell: u => u.client_id
        ? <span className="text-indigo-600 font-medium">{u.client_name}</span>
        : <span className="text-gray-300">—</span>,
      sortValue: u => u.client_name,
      exportValue: u => u.client_name,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: u => u.contact_name
        ? <span className="text-gray-700">{u.contact_name}</span>
        : <span className="text-gray-300">—</span>,
      sortValue: u => u.contact_name ?? '',
      exportValue: u => u.contact_name ?? '',
    },
    {
      key: 'status',
      header: 'Status',
      cell: u => <StatusBadge active={u.is_active} />,
      sortValue: u => (u.is_active ? 'a' : 'z'),
      exportValue: u => (u.is_active ? 'Active' : 'Inactive'),
    },
    {
      key: 'linked',
      header: '',
      cell: u => u.client_id
        ? <Link2 size={14} className="text-indigo-300" />
        : <ShieldOff size={14} className="text-gray-200" />,
      align: 'right',
    },
  ], []);

  const filters: FilterDef<UserRow>[] = useMemo(() => [
    { key: 'account', label: 'Account', options: accountOptions, predicate: (u, v) => u.client_id === v },
    { key: 'active', label: 'Status', options: ACTIVE_OPTIONS, predicate: (u, v) => String(u.is_active) === v },
  ], [accountOptions]);

  function handleSaved(_updated: UserProfile) {
    setEditing(null);
    addToast('Portal access updated');
    load();
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <ListView<UserRow>
        objectKey="user_access"
        title="Users & Access"
        subtitle={`${users.length} portal user${users.length !== 1 ? 's' : ''}`}
        rows={users}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={u => u.id}
        search={u => `${u.display_name} ${u.client_name} ${u.contact_name ?? ''}`}
        searchPlaceholder="Search portal users…"
        onRowClick={canEdit ? u => setEditing(u) : undefined}
        exportName="portal_users"
        emptyMessage="No portal users yet."
      />

      {users.length === 0 && !loading && (
        <div className="flex items-start gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm text-indigo-700">
          <Info size={16} className="flex-shrink-0 mt-0.5 text-indigo-400" />
          <p>
            Create customer portal accounts under{' '}
            <span className="font-medium">Admin → User Management</span>{' '}
            (role: Customer), then link them here to grant access to a specific account.
          </p>
        </div>
      )}

      {editing && (
        <UserAccessModal
          user={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
