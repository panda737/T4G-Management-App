import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { supabase, type CrmContact, type CrmActivity } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import {
  RecordHeader,
  RecordTabs,
  DetailFields,
  ActivityTimeline,
  type RecordTab,
  type TimelineActivity,
  type LogPayload,
} from '../../components/crm';
import ContactFormModal from './ContactFormModal';

type Tab = 'details' | 'activity';

export default function ContactView() {
  const { contactId } = useParams<{ contactId: string }>();
  const navigate = useNavigate();
  usePageTitle('Commercial — Contact');
  const { canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [contact, setContact] = useState<CrmContact | null>(null);
  const [clientName, setClientName] = useState('');
  const [activities, setActivities] = useState<TimelineActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('details');
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { if (contactId) load(); }, [contactId]);

  async function load() {
    setLoading(true);
    const [cRes, actRes] = await Promise.all([
      supabase.from('crm_contacts').select('*, clients(client_name)').eq('id', contactId!).maybeSingle(),
      supabase.from('crm_activities').select('*').eq('contact_id', contactId!).order('created_at', { ascending: false }),
    ]);

    const raw = cRes.data as (CrmContact & { clients: { client_name: string } | null }) | null;
    if (raw) {
      const { clients, ...rest } = raw;
      setContact(rest as CrmContact);
      setClientName(clients?.client_name ?? '');
    } else {
      setContact(null);
    }

    setActivities(((actRes.data ?? []) as CrmActivity[]).map(a => ({
      id: a.id, type: a.type, subject: a.subject,
      body: a.body || undefined, status: a.status,
      due_date: a.due_date, created_at: a.created_at,
    } satisfies TimelineActivity)));

    setLoading(false);
  }

  const TABS: RecordTab[] = useMemo(() => [
    { id: 'details', label: 'Details' },
    { id: 'activity', label: 'Activity', count: activities.length },
  ], [activities.length]);

  const openTasks = useMemo(() => activities.filter(a => a.type === 'task' && a.status === 'open').length, [activities]);

  if (loading) return <PageSpinner layout="h64" />;
  if (!contact) return <div className="p-10 text-center text-sm text-gray-400">Contact not found.</div>;

  const fullName = `${contact.first_name} ${contact.last_name}`.trim() || '(no name)';

  async function handleLog(payload: LogPayload) {
    const { data, error } = await supabase.from('crm_activities')
      .insert({ client_id: contact!.client_id, contact_id: contactId!, ...payload })
      .select().single();
    if (error) { addToast('Could not log activity: ' + error.message, 'error'); return; }
    const a = data as CrmActivity;
    setActivities(prev => [{
      id: a.id, type: a.type, subject: a.subject,
      body: a.body || undefined, status: a.status,
      due_date: a.due_date, created_at: a.created_at,
    }, ...prev]);
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
    const { error } = await supabase.from('crm_contacts').update(changes).eq('id', contactId!);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    setContact(prev => prev ? { ...prev, ...changes } as CrmContact : prev);
    addToast('Contact updated');
  }

  return (
    <div className="space-y-4">
      <SectionTabs tabs={CLIENT_TABS} />

      <RecordHeader
        title={fullName}
        subtitle={contact.job_title || undefined}
        badges={
          contact.is_primary
            ? <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">Primary</span>
            : undefined
        }
        highlights={[
          {
            label: 'Account',
            value: clientName
              ? <button onClick={() => navigate(`/commercial/clients/${contact.client_id}`)} className="text-indigo-600 hover:underline font-semibold">{clientName}</button>
              : '—',
          },
          {
            label: 'Email',
            value: contact.email
              ? <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline">{contact.email}</a>
              : '—',
          },
          { label: 'Phone', value: contact.phone || contact.mobile || '—' },
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
        onBack={() => navigate(-1)}
        backLabel="Back"
      />

      <RecordTabs tabs={TABS} active={tab} onChange={t => setTab(t as Tab)} />

      {/* ── Details ─────────────────────────────────────────────────────── */}
      {tab === 'details' && (
        <DetailFields
          title="Contact Details"
          canEdit={canEdit}
          columns={2}
          fields={[
            { key: 'first_name', label: 'First Name', value: contact.first_name },
            { key: 'last_name', label: 'Last Name', value: contact.last_name },
            { key: 'job_title', label: 'Job Title', value: contact.job_title },
            {
              key: 'email', label: 'Email', value: contact.email, type: 'email',
              display: contact.email ? <a href={`mailto:${contact.email}`} className="text-indigo-600 hover:underline">{contact.email}</a> : undefined,
            },
            { key: 'phone', label: 'Phone', value: contact.phone, type: 'tel' },
            { key: 'mobile', label: 'Mobile', value: contact.mobile, type: 'tel' },
            { key: 'is_primary', label: 'Primary Contact', value: contact.is_primary, type: 'checkbox' },
            { key: 'active', label: 'Active', value: contact.active, type: 'checkbox' },
            { key: 'notes', label: 'Notes', value: contact.notes, type: 'textarea', full: true },
          ]}
          onSave={handleDetailSave}
        />
      )}

      {/* ── Activity ─────────────────────────────────────────────────────── */}
      {tab === 'activity' && (
        <ActivityTimeline
          activities={activities}
          canWrite={canEdit}
          onLog={handleLog}
          onToggleComplete={handleToggleComplete}
          emptyMessage="No activity logged for this contact yet."
        />
      )}

      {editOpen && (
        <ContactFormModal
          contact={contact}
          lockedClientId={contact.client_id}
          onClose={() => setEditOpen(false)}
          onSave={saved => {
            setContact(saved);
            setEditOpen(false);
            addToast('Contact updated');
          }}
        />
      )}
    </div>
  );
}
