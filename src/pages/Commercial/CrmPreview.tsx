/*
  TEMPORARY Phase-2 verification page for the CRM component foundation.
  Visit /commercial/crm-preview to eyeball ListView + the record scaffolding
  against real clients data. This page is removed in Phase 3 when the real
  Accounts hub (ClientManagement / ClientView) is rebuilt on these primitives.
*/
import { useEffect, useMemo, useState } from 'react';
import { Building2, Trash2, Download } from 'lucide-react';
import { supabase, type Client } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import {
  ListView, RecordHeader, RecordTabs, RelatedList, DetailFields, ActivityTimeline,
  type Column, type FilterDef, type RecordTab, type TimelineActivity, fmtNum,
} from '../../components/crm';

export default function CrmPreview() {
  usePageTitle('Commercial — CRM Preview');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Client | null>(null);
  const [tab, setTab] = useState('details');
  const [activities, setActivities] = useState<TimelineActivity[]>([]);

  useEffect(() => {
    supabase.from('clients').select('*').order('client_name').then(({ data }) => {
      setClients((data ?? []) as Client[]);
      setLoading(false);
    });
  }, []);

  const columns: Column<Client>[] = useMemo(() => [
    { key: 'name', header: 'Account', cell: c => <span className="font-medium text-gray-800">{c.client_name}</span>, sortValue: c => c.client_name, exportValue: c => c.client_name },
    { key: 'code', header: 'Code', cell: c => c.client_code || '—', sortValue: c => c.client_code },
    { key: 'status', header: 'Status', cell: c => c.account_status, sortValue: c => c.account_status },
    { key: 'industry', header: 'Industry', cell: c => c.industry || '—', defaultHidden: true },
    { key: 'contact', header: 'Contact', cell: c => c.contact_person || '—' },
    { key: 'email', header: 'Email', cell: c => c.email || '—', defaultHidden: true },
  ], []);

  const filters: FilterDef<Client>[] = [
    { key: 'status', label: 'Status', options: [
      { value: 'active', label: 'Active' }, { value: 'prospect', label: 'Prospect' }, { value: 'inactive', label: 'Inactive' },
    ], predicate: (c, v) => c.account_status === v },
  ];

  const tabs: RecordTab[] = [
    { id: 'details', label: 'Details' },
    { id: 'related', label: 'Related' },
    { id: 'activity', label: 'Activity' },
  ];

  if (selected) {
    return (
      <div className="space-y-4">
        <RecordHeader
          title={selected.client_name}
          subtitle={selected.client_code}
          onBack={() => { setSelected(null); setTab('details'); }}
          badges={<span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{selected.account_status}</span>}
          highlights={[
            { label: 'Status', value: selected.account_status },
            { label: 'Industry', value: selected.industry || '—' },
            { label: 'Email', value: selected.email || '—' },
            { label: 'Phone', value: selected.phone || '—' },
          ]}
        />
        <RecordTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === 'details' && (
          <DetailFields
            title="Account details"
            canEdit
            fields={[
              { key: 'client_name', label: 'Name', value: selected.client_name },
              { key: 'client_code', label: 'Code', value: selected.client_code },
              { key: 'account_status', label: 'Status', value: selected.account_status, type: 'select', options: [
                { value: 'active', label: 'Active' }, { value: 'prospect', label: 'Prospect' }, { value: 'inactive', label: 'Inactive' }] },
              { key: 'industry', label: 'Industry', value: selected.industry },
              { key: 'email', label: 'Email', value: selected.email, type: 'email' },
              { key: 'phone', label: 'Phone', value: selected.phone, type: 'tel' },
              { key: 'notes', label: 'Notes', value: selected.notes, type: 'textarea', full: true },
            ]}
            onSave={async (changes) => {
              await supabase.from('clients').update(changes).eq('id', selected.id);
              setSelected({ ...selected, ...changes } as Client);
            }}
          />
        )}

        {tab === 'related' && (
          <RelatedList title="Contacts" icon={Building2} count={0} isEmpty empty="Contacts land in Phase 4." >
            <div />
          </RelatedList>
        )}

        {tab === 'activity' && (
          <ActivityTimeline
            activities={activities}
            canWrite
            onLog={async (a) => {
              const { data } = await supabase.from('crm_activities')
                .insert({ client_id: selected.id, ...a }).select().single();
              if (data) setActivities(prev => [{ ...(data as TimelineActivity) }, ...prev]);
            }}
            onToggleComplete={async (a) => {
              const next = a.status === 'completed' ? 'open' : 'completed';
              await supabase.from('crm_activities').update({ status: next, completed_at: next === 'completed' ? new Date().toISOString() : null }).eq('id', a.id);
              setActivities(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
            }}
          />
        )}
      </div>
    );
  }

  return (
    <ListView<Client>
      objectKey="accounts"
      title="CRM Preview — Accounts"
      subtitle={`${fmtNum(clients.length)} accounts · this is a temporary Phase-2 demo`}
      rows={clients}
      loading={loading}
      columns={columns}
      filters={filters}
      rowId={c => c.id}
      search={c => `${c.client_name} ${c.client_code} ${c.contact_person} ${c.email}`}
      searchPlaceholder="Search accounts…"
      onRowClick={c => setSelected(c)}
      exportName="accounts"
      bulkActions={[
        { label: 'Export selection', icon: Download, onClick: rows => console.log('export', rows) },
        { label: 'Delete', icon: Trash2, danger: true, onClick: rows => console.log('delete', rows) },
      ]}
    />
  );
}
