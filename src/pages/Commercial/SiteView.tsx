import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, Pencil } from 'lucide-react';
import {
  supabase,
  type ClientSite,
  type ReceivedWasteRecord,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import {
  RecordHeader,
  RecordTabs,
  RelatedList,
  DetailFields,
  type RecordTab,
  fmtNum,
  fmtDate,
} from '../../components/crm';
import SiteFormModal from './SiteFormModal';

type EnrichedRecord = ReceivedWasteRecord & { category_name: string; container_name: string };

type Tab = 'details' | 'waste';

export default function SiteView() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  usePageTitle('Commercial — Site');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [site, setSite] = useState<ClientSite | null>(null);
  const [clientName, setClientName] = useState('');
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { if (siteId) load(); }, [siteId]);

  async function load() {
    setLoading(true);
    const sRes = await supabase.from('client_sites').select('*, clients(client_name)').eq('id', siteId!).maybeSingle();

    const raw = sRes.data as (ClientSite & { clients: { client_name: string } | null }) | null;
    if (raw) {
      const { clients, ...rest } = raw;
      setSite(rest as ClientSite);
      setClientName(clients?.client_name ?? '');
    } else {
      setSite(null);
      setLoading(false);
      return;
    }

    const [rRes, catsRes, contsRes] = await Promise.all([
      supabase.from('received_waste_records').select('*').eq('site_id', siteId!).eq('import_status', 'imported').order('received_date', { ascending: false }),
      supabase.from('waste_categories').select('id, waste_category_name'),
      supabase.from('container_types').select('id, container_type_name'),
    ]);

    const catMap = new Map<string, string>();
    (catsRes.data ?? []).forEach((c: { id: string; waste_category_name: string }) => catMap.set(c.id, c.waste_category_name));
    const contMap = new Map<string, string>();
    (contsRes.data ?? []).forEach((c: { id: string; container_type_name: string }) => contMap.set(c.id, c.container_type_name));

    setRecords(((rRes.data ?? []) as ReceivedWasteRecord[]).map(r => ({
      ...r,
      category_name: r.waste_category_id ? (catMap.get(r.waste_category_id) ?? '—') : '—',
      container_name: r.container_type_id ? (contMap.get(r.container_type_id) ?? '—') : '—',
    })));

    setLoading(false);
  }

  const totalKg = useMemo(() => records.reduce((s, r) => s + Number(r.nett_weight_kg), 0), [records]);
  const totalContainers = useMemo(() => records.reduce((s, r) => s + Number(r.containers_received), 0), [records]);

  const TABS: RecordTab[] = useMemo(() => [
    { id: 'details', label: 'Details' },
    { id: 'waste', label: 'Waste Records', count: records.length },
  ], [records.length]);

  if (loading) return <PageSpinner layout="h64" />;
  if (!site) return <div className="p-10 text-center text-sm text-gray-400">Site not found.</div>;

  async function handleDetailSave(changes: Record<string, string | boolean>) {
    const { error } = await supabase.from('client_sites').update(changes).eq('id', siteId!);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    setSite(prev => prev ? { ...prev, ...changes } as ClientSite : prev);
    addToast('Site updated');
  }

  return (
    <div className="space-y-4">
      <SectionTabs tabs={CLIENT_TABS} />

      <RecordHeader
        title={site.generator_facility}
        subtitle={site.site_code || undefined}
        icon={Building2}
        badges={
          site.active
            ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
            : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
        }
        highlights={[
          {
            label: 'Account',
            value: clientName
              ? <button onClick={() => navigate(`/commercial/clients/${site.client_id}`)} className="text-indigo-600 hover:underline font-semibold">{clientName}</button>
              : '—',
          },
          { label: 'Group', value: site.generator_group || '—' },
          { label: 'Total Received', value: `${fmtNum(totalKg)} kg` },
          { label: 'Records', value: String(records.length) },
        ]}
        actions={
          canEdit ? (
            <button
              onClick={() => setEditOpen(true)}
              className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700"
            >
              <Pencil size={14} /> Edit
            </button>
          ) : undefined
        }
        onBack={() => navigate('/commercial/sites')}
        backLabel="Back to Sites"
      />

      <RecordTabs tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {/* ── Details ─────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <DetailFields
          title="Site Details"
          canEdit={canEdit}
          columns={2}
          fields={[
            { key: 'generator_facility', label: 'Generator Facility', value: site.generator_facility },
            { key: 'generator_group', label: 'Generator Group', value: site.generator_group },
            { key: 'site_code', label: 'Site Code', value: site.site_code },
            { key: 'active', label: 'Active', value: site.active, type: 'checkbox' },
            { key: 'address_line_1', label: 'Address Line 1', value: site.address_line_1, full: true },
            { key: 'address_line_2', label: 'Address Line 2', value: site.address_line_2, full: true },
            { key: 'address_line_3', label: 'City / Town', value: site.address_line_3 },
            { key: 'postal_code', label: 'Postal Code', value: site.postal_code },
            { key: 'province', label: 'Province', value: site.province },
          ]}
          onSave={handleDetailSave}
        />
      )}

      {/* ── Waste Records ───────────────────────────────────────────────── */}
      {tab === 'waste' && (
        <RelatedList
          title="Received Waste Records"
          icon={Building2}
          count={records.length}
          isEmpty={records.length === 0}
          empty="No waste records for this site yet."
        >
          <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50 flex gap-6 text-xs text-gray-500">
            <span>Total nett: <strong className="text-gray-800">{fmtNum(totalKg)} kg</strong></span>
            <span>Containers: <strong className="text-gray-800">{fmtNum(totalContainers)}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Manifest</th>
                  <th className="text-left px-4 py-2.5 font-medium">Category</th>
                  <th className="text-left px-4 py-2.5 font-medium">Container</th>
                  <th className="text-right px-4 py-2.5 font-medium">Qty</th>
                  <th className="text-right px-4 py-2.5 font-medium">Nett kg</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5 text-gray-700 whitespace-nowrap">{fmtDate(r.received_date)}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.waste_manifest_tracking_number}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.category_name}</td>
                    <td className="px-4 py-2.5 text-gray-700">{r.container_name}</td>
                    <td className="px-4 py-2.5 text-right text-gray-700">{r.containers_received}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtNum(Number(r.nett_weight_kg))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {editOpen && (
        <SiteFormModal
          site={site}
          lockedClientId={site.client_id}
          onClose={() => setEditOpen(false)}
          onSave={saved => { setSite(saved); setEditOpen(false); addToast('Site updated'); }}
        />
      )}
    </div>
  );
}
