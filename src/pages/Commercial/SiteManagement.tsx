import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Merge, Trash2 } from 'lucide-react';
import { supabase, type ClientSite } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { ListView, type Column, type FilterDef } from '../../components/crm';
import { fmtNum } from '../../components/crm/crmUtils';
import SiteFormModal from './SiteFormModal';
import SiteMergeModal from './SiteMergeModal';
import SiteAddressQuickEdit, { type AddressPatch } from './SiteAddressQuickEdit';

type SiteRow = ClientSite & { client_name: string; records: number; kg: number };

const ACTIVE_OPTIONS = [
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
];

export default function SiteManagement() {
  usePageTitle('Commercial — Sites');
  const navigate = useNavigate();
  const { isAdmin, canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'new' | ClientSite | null>(null);
  const [mergeRows, setMergeRows] = useState<ClientSite[] | null>(null);
  const [addrEdit, setAddrEdit] = useState<SiteRow | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sRes, cRes, rRes] = await Promise.all([
      supabase.from('client_sites').select('*').order('generator_facility'),
      supabase.from('clients').select('id, client_name'),
      supabase.from('received_waste_records').select('site_id, nett_weight_kg'),
    ]);

    const clientMap = new Map<string, string>();
    (cRes.data ?? []).forEach((c: { id: string; client_name: string }) => clientMap.set(c.id, c.client_name));

    const stats: Record<string, { n: number; kg: number }> = {};
    (rRes.data ?? []).forEach((r: { site_id: string | null; nett_weight_kg: number }) => {
      if (!r.site_id) return;
      const e = stats[r.site_id] || { n: 0, kg: 0 };
      e.n++; e.kg += Number(r.nett_weight_kg);
      stats[r.site_id] = e;
    });

    setSites(((sRes.data ?? []) as ClientSite[]).map(s => ({
      ...s,
      client_name: clientMap.get(s.client_id) ?? '—',
      records: stats[s.id]?.n ?? 0,
      kg: stats[s.id]?.kg ?? 0,
    })));
    setLoading(false);
  }

  // ── stats lookup for the merge modal ────────────────────────────────────────
  const statsById = useMemo(() => {
    const m: Record<string, { n: number; kg: number }> = {};
    sites.forEach(s => { m[s.id] = { n: s.records, kg: s.kg }; });
    return m;
  }, [sites]);

  const clientNameById = useMemo(() => {
    const m: Record<string, string> = {};
    sites.forEach(s => { m[s.client_id] = s.client_name; });
    return m;
  }, [sites]);

  // ── columns ─────────────────────────────────────────────────────────────────
  const columns: Column<SiteRow>[] = useMemo(() => [
    {
      key: 'facility',
      header: 'Generator Facility',
      cell: s => (
        <div>
          <div className="font-medium text-gray-900">{s.generator_facility}</div>
          {s.generator_group && <div className="text-xs text-gray-400 mt-0.5">{s.generator_group}</div>}
        </div>
      ),
      sortValue: s => s.generator_facility,
      exportValue: s => s.generator_facility,
    },
    {
      key: 'group',
      header: 'Group',
      cell: s => s.generator_group || '—',
      sortValue: s => s.generator_group,
      exportValue: s => s.generator_group,
      defaultHidden: true,
    },
    {
      key: 'client',
      header: 'Account',
      cell: s => <span className="text-indigo-600 font-medium">{s.client_name}</span>,
      sortValue: s => s.client_name,
      exportValue: s => s.client_name,
    },
    {
      key: 'code',
      header: 'Site Code',
      cell: s => s.site_code ? <span className="font-mono text-xs text-gray-500">{s.site_code}</span> : '—',
      sortValue: s => s.site_code,
      exportValue: s => s.site_code,
    },
    {
      key: 'address',
      header: 'Address',
      cell: s => {
        const summary = [s.address_line_1, s.address_line_3, s.postal_code].filter(Boolean).join(', ');
        if (!canEdit) return summary || <span className="text-gray-300">—</span>;
        return (
          <button
            onClick={e => { e.stopPropagation(); setAddrEdit(s); }}
            className={summary
              ? 'text-left text-gray-700 hover:text-indigo-600 hover:underline'
              : 'text-left text-xs font-medium text-indigo-500 hover:text-indigo-700'}
          >
            {summary || '+ Add address'}
          </button>
        );
      },
      sortValue: s => s.address_line_1,
      exportValue: s => [s.address_line_1, s.address_line_2, s.address_line_3, s.postal_code].filter(Boolean).join(', '),
    },
    {
      key: 'records',
      header: 'Records',
      cell: s => fmtNum(s.records),
      sortValue: s => s.records,
      exportValue: s => s.records,
      align: 'right',
    },
    {
      key: 'kg',
      header: 'Nett kg',
      cell: s => fmtNum(s.kg),
      sortValue: s => s.kg,
      exportValue: s => s.kg,
      align: 'right',
    },
    {
      key: 'active',
      header: 'Status',
      cell: s => s.active
        ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
        : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>,
      sortValue: s => (s.active ? 'a' : 'z'),
      exportValue: s => (s.active ? 'Active' : 'Inactive'),
      defaultHidden: true,
    },
  ], [canEdit]);

  // ── filters ───────────────────────────────────────────────────────────────
  const accountOptions = useMemo(
    () => [...new Map(sites.map(s => [s.client_id, s.client_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
    [sites],
  );
  const groupOptions = useMemo(
    () => [...new Set(sites.map(s => s.generator_group).filter(Boolean))].sort().map(v => ({ value: v, label: v })),
    [sites],
  );

  const filters: FilterDef<SiteRow>[] = useMemo(() => [
    { key: 'account', label: 'Account', options: accountOptions, predicate: (s, v) => s.client_id === v },
    { key: 'group', label: 'Group', options: groupOptions, predicate: (s, v) => s.generator_group === v },
    { key: 'active', label: 'Status', options: ACTIVE_OPTIONS, predicate: (s, v) => String(s.active) === v },
  ], [accountOptions, groupOptions]);

  // ── handlers ──────────────────────────────────────────────────────────────
  function handleSaved(_saved: ClientSite) {
    setModal(null);
    addToast(modal === 'new' ? 'Site created' : 'Site updated');
    load();
  }

  async function deleteSites(rows: SiteRow[]) {
    const withRecords = rows.filter(r => r.records > 0);
    if (withRecords.length > 0) {
      addToast(`${withRecords.length} site(s) still have waste records — merge them instead of deleting.`, 'error');
      return;
    }
    if (!window.confirm(`Delete ${rows.length} site${rows.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    const ids = rows.map(r => r.id);
    const { error } = await supabase.from('client_sites').delete().in('id', ids);
    if (error) { addToast('Delete failed: ' + error.message, 'error'); return; }
    setSites(prev => prev.filter(s => !ids.includes(s.id)));
    addToast(`Deleted ${rows.length} site${rows.length > 1 ? 's' : ''}`);
  }

  function startMerge(rows: SiteRow[]) {
    if (rows.length < 2) { addToast('Select at least two sites to merge.', 'error'); return; }
    setMergeRows(rows);
  }

  function handleAddrSaved(patch: AddressPatch) {
    if (!addrEdit) return;
    setSites(prev => prev.map(s => (s.id === addrEdit.id ? { ...s, ...patch } : s)));
    setAddrEdit(null);
  }

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <ListView<SiteRow>
        objectKey="sites"
        title="Sites"
        subtitle={`${fmtNum(sites.length)} generator facilit${sites.length !== 1 ? 'ies' : 'y'}`}
        rows={sites}
        loading={loading}
        columns={columns}
        filters={filters}
        rowId={s => s.id}
        search={s => `${s.generator_facility} ${s.generator_group} ${s.client_name} ${s.site_code}`}
        searchPlaceholder="Search facility, group or account…"
        onRowClick={s => navigate(`/commercial/sites/${s.id}`)}
        onNew={canEdit ? () => setModal('new') : undefined}
        newLabel="New Site"
        exportName="sites"
        savedViews
        bulkActions={canEdit ? [
          { label: 'Merge', icon: Merge, onClick: startMerge },
          ...(isAdmin ? [{ label: 'Delete', icon: Trash2, danger: true, onClick: deleteSites }] : []),
        ] : []}
        emptyMessage="No sites found."
      />

      {modal !== null && (
        <SiteFormModal
          site={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSaved}
        />
      )}

      {mergeRows && (
        <SiteMergeModal
          sites={mergeRows}
          clientName={clientNameById}
          stats={statsById}
          onClose={() => setMergeRows(null)}
          onMerged={() => { setMergeRows(null); load(); }}
        />
      )}

      {addrEdit && (
        <SiteAddressQuickEdit
          site={addrEdit}
          onClose={() => setAddrEdit(null)}
          onSaved={handleAddrSaved}
        />
      )}
    </div>
  );
}
