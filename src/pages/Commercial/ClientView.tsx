import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Building2, MapPin, User, Scale, Boxes, CalendarDays, Pencil, Plus } from 'lucide-react';
import {
  supabase,
  type Client,
  type ClientSite,
  type ReceivedWasteRecord,
  type EsgResult,
  type CrmActivity,
  type CrmContact,
  type UserProfile,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import DonutChart from '../../components/DonutChart';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import {
  RecordHeader,
  RecordTabs,
  RelatedList,
  DetailFields,
  ActivityTimeline,
  type RecordTab,
  type TimelineActivity,
  type LogPayload,
  fmtNum,
  fmtDate,
} from '../../components/crm';
import AccountFormModal from './AccountFormModal';
import ContactFormModal from './ContactFormModal';
import UserAccessModal from './UserAccessModal';
import SiteFormModal from './SiteFormModal';

type EnrichedRecord = ReceivedWasteRecord & { category_name: string; site_name: string; container_name: string };

type Tab = 'overview' | 'details' | 'contacts' | 'sites' | 'waste' | 'esg' | 'activity' | 'portal';

const PALETTE = ['#10b981','#f59e0b','#ef4444','#0ea5e9','#a855f7','#ec4899','#f97316','#14b8a6','#6366f1','#84cc16','#6b7280'];

function sumBy<T>(rows: T[], group: (r: T) => string, value: (r: T) => number): [string, number][] {
  const map: Record<string, number> = {};
  rows.forEach(r => { const k = group(r) || '—'; map[k] = (map[k] || 0) + value(r); });
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

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

export default function ClientView() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  usePageTitle('Commercial — Account');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [client, setClient] = useState<Client | null>(null);
  const [records, setRecords] = useState<EnrichedRecord[]>([]);
  const [sites, setSites] = useState<ClientSite[]>([]);
  const [esgResults, setEsgResults] = useState<EsgResult[]>([]);
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [portalUsers, setPortalUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  const [editOpen, setEditOpen] = useState(false);
  const [newContact, setNewContact] = useState(false);
  const [newSite, setNewSite] = useState(false);
  const [editingPortalUser, setEditingPortalUser] = useState<UserProfile | null>(null);
  const [allClients, setAllClients] = useState<Client[]>([]);

  useEffect(() => { if (clientId) load(); }, [clientId]);

  async function load() {
    setLoading(true);
    const [cRes, rRes, sitesRes, catsRes, contsRes, esgRes, actRes, contactsRes, portalRes, clientsRes] = await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId!).maybeSingle(),
      supabase.from('received_waste_records').select('*').eq('client_id', clientId!).eq('import_status', 'imported').order('received_date', { ascending: false }),
      supabase.from('client_sites').select('*').eq('client_id', clientId!).order('generator_facility'),
      supabase.from('waste_categories').select('id, waste_category_name'),
      supabase.from('container_types').select('id, container_type_name'),
      supabase.from('esg_results').select('*').eq('client_id', clientId!).order('period_month', { ascending: false }),
      supabase.from('crm_activities').select('*').eq('client_id', clientId!).order('created_at', { ascending: false }),
      supabase.from('crm_contacts').select('*').eq('client_id', clientId!).order('last_name').order('first_name'),
      supabase.from('user_profiles').select('*').eq('client_id', clientId!).eq('role', 'customer').order('display_name'),
      supabase.from('clients').select('*').order('client_name'),
    ]);

    setClient(cRes.data as Client | null);
    setSites((sitesRes.data ?? []) as ClientSite[]);
    setEsgResults((esgRes.data ?? []) as EsgResult[]);

    const catMap = new Map<string, string>();
    (catsRes.data ?? []).forEach((c: { id: string; waste_category_name: string }) => catMap.set(c.id, c.waste_category_name));
    const contMap = new Map<string, string>();
    (contsRes.data ?? []).forEach((c: { id: string; container_type_name: string }) => contMap.set(c.id, c.container_type_name));
    const siteMap = new Map<string, string>();
    (sitesRes.data ?? []).forEach((s: { id: string; generator_facility: string }) => siteMap.set(s.id, s.generator_facility));

    const enriched = ((rRes.data ?? []) as ReceivedWasteRecord[]).map(r => ({
      ...r,
      category_name: r.waste_category_id ? (catMap.get(r.waste_category_id) ?? '—') : '—',
      site_name: r.site_id ? (siteMap.get(r.site_id) ?? '—') : '—',
      container_name: r.container_type_id ? (contMap.get(r.container_type_id) ?? '—') : '—',
    }));
    setRecords(enriched);

    setActivities((actRes.data ?? []).map((a: CrmActivity) => ({
      id: a.id,
      type: a.type,
      subject: a.subject,
      body: a.body || undefined,
      status: a.status,
      due_date: a.due_date,
      created_at: a.created_at,
    } satisfies TimelineActivity)));

    setContacts((contactsRes.data ?? []) as CrmContact[]);
    setPortalUsers((portalRes.data ?? []) as UserProfile[]);
    setAllClients((clientsRes.data ?? []) as Client[]);

    setLoading(false);
  }

  // ── derived stats ─────────────────────────────────────────────────────────
  const totalKg = useMemo(() => records.reduce((s, r) => s + Number(r.nett_weight_kg), 0), [records]);
  const totalContainers = useMemo(() => records.reduce((s, r) => s + Number(r.containers_received), 0), [records]);
  const byCategory = useMemo(() => sumBy(records, r => r.category_name, r => Number(r.nett_weight_kg)), [records]);
  const bySite = useMemo(() => sumBy(records, r => r.site_name, r => Number(r.nett_weight_kg)), [records]);
  const openTasks = useMemo(() => activities.filter(a => a.type === 'task' && a.status === 'open').length, [activities]);

  // ── tabs ──────────────────────────────────────────────────────────────────
  const TABS: RecordTab[] = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'details', label: 'Details' },
    { id: 'contacts', label: 'Contacts', count: contacts.length },
    { id: 'sites', label: 'Sites', count: sites.length },
    { id: 'waste', label: 'Waste Records', count: records.length },
    { id: 'esg', label: 'ESG', count: esgResults.length },
    { id: 'activity', label: 'Activity', count: activities.length },
    { id: 'portal', label: 'Portal Access', count: portalUsers.length },
  ], [contacts.length, sites.length, records.length, esgResults.length, activities.length, portalUsers.length]);

  if (loading) return <PageSpinner layout="h64" />;
  if (!client) return <div className="p-10 text-center text-sm text-gray-400">Account not found.</div>;

  // ── activity handlers ─────────────────────────────────────────────────────
  async function handleLog(payload: LogPayload) {
    const { data, error } = await supabase
      .from('crm_activities')
      .insert({ client_id: clientId!, ...payload })
      .select()
      .single();
    if (error) { addToast('Could not log activity: ' + error.message, 'error'); return; }
    const a = data as CrmActivity;
    setActivities(prev => [{ id: a.id, type: a.type, subject: a.subject, body: a.body || undefined, status: a.status, due_date: a.due_date, created_at: a.created_at }, ...prev]);
  }

  async function handleToggleComplete(a: TimelineActivity) {
    const next = a.status === 'completed' ? 'open' : 'completed';
    const { error } = await supabase.from('crm_activities').update({
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    }).eq('id', a.id);
    if (error) { addToast('Could not update task: ' + error.message, 'error'); return; }
    setActivities(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
  }

  async function handleDetailSave(changes: Record<string, string | boolean>) {
    const { error } = await supabase.from('clients').update(changes).eq('id', clientId!);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    setClient(prev => prev ? { ...prev, ...changes } as Client : prev);
    addToast('Account updated');
  }

  return (
    <div className="space-y-4">
      <SectionTabs tabs={CLIENT_TABS} />

      <RecordHeader
        title={client.client_name}
        subtitle={client.client_code || undefined}
        badges={<StatusBadge status={client.account_status} />}
        highlights={[
          { label: 'Industry', value: client.industry || '—' },
          { label: 'Total Received', value: `${fmtNum(totalKg)} kg` },
          { label: 'Sites', value: String(sites.length) },
          { label: 'Open Tasks', value: openTasks > 0 ? <span className="text-amber-600">{openTasks}</span> : '0' },
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
        onBack={() => navigate('/commercial/clients')}
        backLabel="Back to Accounts"
      />

      <RecordTabs tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {/* ── Overview ────────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        records.length === 0 ? (
          <Empty>No waste records for this account yet.</Empty>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KpiCard icon={Scale} label="Total received" value={`${fmtNum(totalKg)} kg`} />
              <KpiCard icon={Boxes} label="Total containers" value={fmtNum(totalContainers)} />
              <KpiCard icon={MapPin} label="Sites" value={String(sites.length)} />
              <KpiCard icon={CalendarDays} label="Latest delivery" value={fmtDate(records[0]?.received_date ?? null)} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card title="By Waste Category">
                <DonutChart
                  segments={byCategory.map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] }))}
                  centerLabel={fmtNum(totalKg)} centerSub="kg total"
                />
              </Card>
              <Card title="By Site">
                <DonutChart
                  segments={bySite.map(([k, v], i) => ({ label: k, value: v, color: PALETTE[i % PALETTE.length] }))}
                  centerLabel={String(sites.length)} centerSub="sites"
                />
              </Card>
            </div>
          </div>
        )
      )}

      {/* ── Details ─────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <DetailFields
          title="Account Details"
          canEdit={canEdit}
          columns={2}
          fields={[
            { key: 'client_name', label: 'Account Name', value: client.client_name },
            { key: 'client_code', label: 'Account Code', value: client.client_code },
            { key: 'account_status', label: 'Status', value: client.account_status, type: 'select',
              options: [{ value: 'active', label: 'Active' }, { value: 'prospect', label: 'Prospect' }, { value: 'inactive', label: 'Inactive' }] },
            { key: 'industry', label: 'Industry', value: client.industry },
            { key: 'website', label: 'Website', value: client.website, type: 'url',
              display: client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline truncate block">{client.website}</a> : undefined },
            { key: 'contact_person', label: 'Contact Person', value: client.contact_person },
            { key: 'email', label: 'Email', value: client.email, type: 'email',
              display: client.email ? <a href={`mailto:${client.email}`} className="text-indigo-600 hover:underline">{client.email}</a> : undefined },
            { key: 'phone', label: 'Phone', value: client.phone, type: 'tel' },
            { key: 'address_line_1', label: 'Street Address', value: client.address_line_1 },
            { key: 'address_line_2', label: 'Suburb', value: client.address_line_2 },
            { key: 'address_line_3', label: 'City / Province', value: client.address_line_3 },
            { key: 'postal_code', label: 'Postal Code', value: client.postal_code },
            { key: 'active', label: 'Active', value: client.active, type: 'checkbox' },
            { key: 'notes', label: 'Notes', value: client.notes, type: 'textarea', full: true },
          ]}
          onSave={handleDetailSave}
        />
      )}

      {/* ── Contacts ─────────────────────────────────────────────────────── */}
      {tab === 'contacts' && (
        <RelatedList
          title="Contacts"
          icon={User}
          count={contacts.length}
          isEmpty={contacts.length === 0}
          empty="No contacts yet. Add the first contact for this account."
          action={
            canEdit ? (
              <button
                onClick={() => setNewContact(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50"
              >
                <Plus size={12} /> New Contact
              </button>
            ) : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Name</th>
                  <th className="text-left px-4 py-2.5 font-medium">Job Title</th>
                  <th className="text-left px-4 py-2.5 font-medium">Email</th>
                  <th className="text-left px-4 py-2.5 font-medium">Phone</th>
                  <th className="text-left px-4 py-2.5 font-medium w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {contacts.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/commercial/contacts/${c.id}`)}
                    className="cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-900 flex items-center gap-1.5">
                        {`${c.first_name} ${c.last_name}`.trim() || '(no name)'}
                        {c.is_primary && (
                          <span className="text-[10px] font-medium text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">Primary</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.job_title || '—'}</td>
                    <td className="px-4 py-2.5">
                      {c.email
                        ? <a href={`mailto:${c.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline">{c.email}</a>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">{c.phone || c.mobile || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-300 text-right">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {newContact && (
        <ContactFormModal
          contact={null}
          lockedClientId={clientId!}
          onClose={() => setNewContact(false)}
          onSave={saved => {
            setContacts(prev => [...prev, saved].sort((a, b) => `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)));
            setNewContact(false);
            addToast('Contact created');
          }}
        />
      )}

      {/* ── Sites ────────────────────────────────────────────────────────── */}
      {tab === 'sites' && (
        <RelatedList
          title="Sites"
          icon={MapPin}
          count={sites.length}
          isEmpty={sites.length === 0}
          empty="No sites linked to this account yet."
          action={
            canEdit ? (
              <button
                onClick={() => setNewSite(true)}
                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 rounded-lg px-2 py-1 hover:bg-indigo-50"
              >
                <Plus size={12} /> New Site
              </button>
            ) : undefined
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Facility</th>
                  <th className="text-left px-4 py-2.5 font-medium">Group</th>
                  <th className="text-left px-4 py-2.5 font-medium">Site Code</th>
                  <th className="text-left px-4 py-2.5 font-medium w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sites.map(s => (
                  <tr
                    key={s.id}
                    onClick={() => navigate(`/commercial/sites/${s.id}`)}
                    className="cursor-pointer hover:bg-indigo-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-800">{s.generator_facility}</td>
                    <td className="px-4 py-2.5 text-gray-500">{s.generator_group || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{s.site_code || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-300 text-right">›</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {newSite && (
        <SiteFormModal
          site={null}
          lockedClientId={clientId!}
          onClose={() => setNewSite(false)}
          onSave={saved => {
            setSites(prev => [...prev, saved].sort((a, b) => a.generator_facility.localeCompare(b.generator_facility)));
            setNewSite(false);
            addToast('Site created');
          }}
        />
      )}

      {/* ── Waste Records ────────────────────────────────────────────────── */}
      {tab === 'waste' && (
        <RelatedList title="Received Waste Records" icon={Building2} count={records.length} isEmpty={records.length === 0} empty="No waste records for this account yet.">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">Date</th>
                  <th className="text-left px-4 py-2.5 font-medium">Manifest</th>
                  <th className="text-left px-4 py-2.5 font-medium">Site</th>
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
                    <td className="px-4 py-2.5 text-gray-700">{r.site_name}</td>
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

      {/* ── ESG ──────────────────────────────────────────────────────────── */}
      {tab === 'esg' && (
        esgResults.length === 0 ? (
          <Empty>No ESG results yet. Run the ESG engine under Commercial → ESG Engine.</Empty>
        ) : (
          <div className="space-y-3">
            {esgResults.map(r => (
              <div key={r.id} className={`bg-white rounded-xl border shadow-sm p-4 ${r.approved ? 'border-gray-200' : 'border-dashed border-gray-300'}`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-gray-800">
                    {new Date(r.period_month).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' })}
                  </span>
                  {r.approved
                    ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Approved</span>
                    : <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Draft</span>}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <EsgTile label="CO₂e saved" value={r.co2e_saved_kg} unit="kg" />
                  <EsgTile label="Residual" value={r.residual_tco2e} unit="tCO₂e" />
                  <EsgTile label="Water saved" value={r.water_saved_kl} unit="kL" />
                  <EsgTile label="Diesel saved" value={r.diesel_saved_l} unit="L" />
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <ActivityTimeline
          activities={activities}
          canWrite={canEdit}
          onLog={handleLog}
          onToggleComplete={handleToggleComplete}
          emptyMessage="No activity logged for this account yet."
        />
      )}

      {/* ── Portal Access ─────────────────────────────────────────────── */}
      {tab === 'portal' && (
        <RelatedList
          title="Portal Access"
          icon={User}
          count={portalUsers.length}
          isEmpty={portalUsers.length === 0}
          empty="No portal users linked to this account. Go to Users & Access to link a portal login."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <th className="text-left px-4 py-2.5 font-medium">User</th>
                  <th className="text-left px-4 py-2.5 font-medium">Status</th>
                  <th className="text-left px-4 py-2.5 font-medium w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {portalUsers.map(u => (
                  <tr
                    key={u.id}
                    onClick={canEdit ? () => setEditingPortalUser(u) : undefined}
                    className={canEdit ? 'cursor-pointer hover:bg-indigo-50 transition-colors' : ''}
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">{u.display_name}</td>
                    <td className="px-4 py-2.5">
                      {u.is_active
                        ? <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Active</span>
                        : <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
                    </td>
                    <td className="px-4 py-2.5 text-gray-300 text-right">{canEdit ? '›' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </RelatedList>
      )}

      {editOpen && (
        <AccountFormModal
          client={client}
          onClose={() => setEditOpen(false)}
          onSave={saved => { setClient(saved); setEditOpen(false); addToast('Account updated'); }}
        />
      )}

      {editingPortalUser && (
        <UserAccessModal
          user={editingPortalUser}
          clients={allClients}
          onClose={() => setEditingPortalUser(null)}
          onSave={updated => {
            setPortalUsers(prev => {
              const next = prev.map(u => u.id === updated.id ? updated : u).filter(u => u.client_id === clientId);
              return next;
            });
            setEditingPortalUser(null);
            addToast('Portal access updated');
          }}
        />
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-3">
      <div className="p-2 bg-indigo-50 rounded-lg flex-shrink-0"><Icon size={18} className="text-indigo-600" /></div>
      <div className="min-w-0">
        <div className="text-xs text-gray-500">{label}</div>
        <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      </div>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-dashed border-gray-300 p-10 text-center text-sm text-gray-400">
      {children}
    </div>
  );
}

function EsgTile({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="text-[11px] text-gray-500 mb-0.5">{label}</div>
      <div className="text-sm font-bold text-gray-900">
        {value == null
          ? <span className="text-gray-300">—</span>
          : <>{Number(value).toLocaleString('en-ZA', { maximumFractionDigits: 2 })} <span className="text-xs font-normal text-gray-400">{unit}</span></>}
      </div>
    </div>
  );
}
