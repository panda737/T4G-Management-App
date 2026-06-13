import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { supabase, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum } from '../../components/crm/crmUtils';
import AccountFormModal from './AccountFormModal';

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
  const [portalLinked, setPortalLinked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | Client | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [cRes, sRes, rRes, uRes] = await Promise.all([
      supabase.from('clients').select('*').order('client_name'),
      supabase.from('client_sites').select('client_id'),
      supabase.from('received_waste_records').select('client_id, nett_weight_kg'),
      supabase.from('user_profiles').select('client_id').eq('role', 'customer').not('client_id', 'is', null),
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

    setPortalLinked(new Set(
      ((uRes.data ?? []) as { client_id: string }[]).map(u => u.client_id),
    ));
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
      cell: c => portalLinked.has(c.id)
        ? <span className="text-xs text-emerald-600 font-medium">Linked</span>
        : <span className="text-xs text-gray-300">—</span>,
      sortValue: c => (portalLinked.has(c.id) ? 'a' : 'z'),
      defaultHidden: true,
    },
  ], [siteCounts, recCounts, portalLinked]);

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
      return idx >= 0
        ? prev.map((c, i) => i === idx ? saved : c)
        : [saved, ...prev].sort((a, b) => a.client_name.localeCompare(b.client_name));
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
