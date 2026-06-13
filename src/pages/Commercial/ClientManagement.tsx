import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Link2, Users } from 'lucide-react';
import { supabase, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum } from '../../components/crm/crmUtils';
import AccountFormModal from './AccountFormModal';

interface PortalUser { id: string; display_name: string; client_id: string | null }

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'inactive', label: 'Inactive' },
];

function StatusBadge({ status }: { status: Client['account_status'] }) {
  const cls = {
    active: 'text-emerald-700 bg-emerald-50',
    prospect: 'text-amber-700 bg-amber-50',
    inactive: 'text-gray-500 bg-gray-100',
  }[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function ClientManagement() {
  usePageTitle('Commercial — Accounts');
  const navigate = useNavigate();
  const { isAdmin, canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [clients, setClients] = useState<Client[]>([]);
  const [siteCounts, setSiteCounts] = useState<Record<string, number>>({});
  const [recCounts, setRecCounts] = useState<Record<string, { n: number; kg: number }>>({});
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | Client | null>(null);
  const [savingUser, setSavingUser] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [cRes, sRes, rRes, uRes] = await Promise.all([
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('client_sites').select('client_id'),
      supabase.from('received_waste_records').select('client_id, nett_weight_kg'),
      supabase.from('user_profiles').select('id, display_name, client_id').eq('role', 'customer'),
    ]);
    setClients((cRes.data ?? []) as Client[]);

    const sc: Record<string, number> = {};
    (sRes.data ?? []).forEach((s: { client_id: string }) => { sc[s.client_id] = (sc[s.client_id] || 0) + 1; });
    setSiteCounts(sc);

    const rc: Record<string, { n: number; kg: number }> = {};
    (rRes.data ?? []).forEach((r: { client_id: string; nett_weight_kg: number }) => {
      const e = rc[r.client_id] || { n: 0, kg: 0 };
      e.n++; e.kg += Number(r.nett_weight_kg);
      rc[r.client_id] = e;
    });
    setRecCounts(rc);

    setPortalUsers((uRes.data ?? []) as PortalUser[]);
    setLoading(false);
  }

  // ── columns ───────────────────────────────────────────────────────────────
  const columns: Column<Client>[] = useMemo(() => [
    {
      key: 'name',
      header: 'Account',
      cell: c => (
        <div>
          <div className="font-medium text-gray-900">{c.client_name}</div>
          {c.industry && <div className="text-xs text-gray-400 mt-0.5">{c.industry}</div>}
        </div>
      ),
      sortValue: c => c.client_name,
      exportValue: c => c.client_name,
    },
    {
      key: 'code',
      header: 'Code',
      cell: c => c.client_code || '—',
      sortValue: c => c.client_code,
      exportValue: c => c.client_code,
    },
    {
      key: 'status',
      header: 'Status',
      cell: c => <StatusBadge status={c.account_status} />,
      sortValue: c => c.account_status,
      exportValue: c => c.account_status,
    },
    {
      key: 'contact',
      header: 'Contact',
      cell: c => c.contact_person || '—',
      sortValue: c => c.contact_person,
    },
    {
      key: 'email',
      header: 'Email',
      cell: c => c.email
        ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline truncate block max-w-[180px]">{c.email}</a>
        : '—',
      exportValue: c => c.email,
      defaultHidden: true,
    },
    {
      key: 'phone',
      header: 'Phone',
      cell: c => c.phone || '—',
      exportValue: c => c.phone,
      defaultHidden: true,
    },
    {
      key: 'sites',
      header: 'Sites',
      cell: c => siteCounts[c.id] ?? 0,
      sortValue: c => siteCounts[c.id] ?? 0,
      exportValue: c => siteCounts[c.id] ?? 0,
      align: 'right',
    },
    {
      key: 'nett_kg',
      header: 'Nett kg',
      cell: c => fmtNum(recCounts[c.id]?.kg ?? 0),
      sortValue: c => recCounts[c.id]?.kg ?? 0,
      exportValue: c => recCounts[c.id]?.kg ?? 0,
      align: 'right',
      defaultHidden: true,
    },
    {
      key: 'portal',
      header: 'Portal',
      cell: c => portalUsers.some(u => u.client_id === c.id)
        ? <span className="text-xs text-emerald-600 font-medium">Linked</span>
        : <span className="text-xs text-gray-300">—</span>,
      sortValue: c => portalUsers.some(u => u.client_id === c.id) ? 'a' : 'z',
      defaultHidden: true,
    },
  ], [siteCounts, recCounts, portalUsers]);

  // ── filters ───────────────────────────────────────────────────────────────
  const industryOptions = useMemo(
    () => [...new Set(clients.map(c => c.industry).filter(Boolean))].sort().map(v => ({ value: v, label: v })),
    [clients],
  );

  const filters: FilterDef<Client>[] = useMemo(() => [
    { key: 'status', label: 'Status', options: STATUS_OPTIONS, predicate: (c, v) => c.account_status === v },
    { key: 'industry', label: 'Industry', options: industryOptions, predicate: (c, v) => c.industry === v },
  ], [industryOptions]);

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleSaved(saved: Client) {
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === saved.id);
      return idx >= 0 ? prev.map((c, i) => i === idx ? saved : c) : [saved, ...prev].sort((a, b) => a.client_name.localeCompare(b.client_name));
    });
    setModal(null);
    addToast(modal === 'new' ? 'Account created' : 'Account updated');
  }

  async function deleteAccounts(rows: Client[]) {
    if (!window.confirm(`Delete ${rows.length} account${rows.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = rows.map(r => r.id);
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    setClients(prev => prev.filter(c => !ids.includes(c.id)));
    addToast(`Deleted ${rows.length} account${rows.length > 1 ? 's' : ''}`);
  }

  async function linkUser(userId: string, clientId: string) {
    setSavingUser(userId);
    const { error } = await supabase.from('user_profiles').update({ client_id: clientId || null }).eq('id', userId);
    setSavingUser(null);
    if (error) { addToast('Could not update: ' + error.message, 'error'); return; }
    setPortalUsers(prev => prev.map(u => u.id === userId ? { ...u, client_id: clientId || null } : u));
    addToast('Portal access updated');
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <ListView<Client>
        objectKey="accounts"
        title="Accounts"
        subtitle={`${fmtNum(clients.length)} account${clients.length !== 1 ? 's' : ''}`}
        rows={clients}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={c => c.id}
        search={c => `${c.client_name} ${c.client_code} ${c.contact_person} ${c.email} ${c.industry}`}
        searchPlaceholder="Search accounts…"
        onRowClick={c => navigate(`/commercial/clients/${c.id}`)}
        onNew={canEdit ? () => setModal('new') : undefined}
        newLabel="New Account"
        exportName="accounts"
        savedViews
        bulkActions={isAdmin ? [
          { label: 'Delete', icon: Trash2, danger: true, onClick: deleteAccounts },
        ] : []}
        emptyMessage="No accounts found."
      />

      {/* Portal user linking — Phase 5 will promote this to a first-class tab */}
      {isAdmin && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <Users size={16} className="text-indigo-500" />
            <h2 className="text-sm font-semibold text-gray-900">Portal Users</h2>
            <span className="text-xs text-gray-400 ml-1">· link a login account to a client</span>
          </div>
          {portalUsers.length === 0 ? (
            <p className="text-sm text-gray-400">No customer users yet. Create one in <span className="font-medium">Admin → Users</span> with role "Customer", then link them here.</p>
          ) : (
            <div className="space-y-2">
              {portalUsers.map(u => (
                <div key={u.id} className="flex items-center gap-3 py-1.5 border-b border-gray-50 last:border-0">
                  <Link2 size={14} className="text-gray-400 flex-shrink-0" />
                  <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{u.display_name}</span>
                  <select
                    value={u.client_id ?? ''}
                    disabled={savingUser === u.id}
                    onChange={e => linkUser(u.id, e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-w-[260px]"
                  >
                    <option value="">— No client (no access) —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modal !== null && (
        <AccountFormModal
          client={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}
    </div>
  );
}
