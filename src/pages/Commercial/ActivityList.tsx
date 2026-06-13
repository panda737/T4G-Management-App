import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  StickyNote, Phone, CheckSquare, Mail, Users,
  Square, Loader2, CalendarClock,
} from 'lucide-react';
import { supabase, type CrmActivity, type CrmActivityType, type CrmActivityStatus } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import SectionTabs from '../../components/SectionTabs';
import { CLIENT_TABS } from './commercialTabs';
import { fmtDate, fmtDateTime } from '../../components/crm/crmUtils';

type ActivityRow = CrmActivity & { client_name: string; contact_name: string | null };

const TYPE_META: Record<CrmActivityType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  note:    { icon: StickyNote,  label: 'Note',    color: 'text-amber-600',   bg: 'bg-amber-50' },
  call:    { icon: Phone,       label: 'Call',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  task:    { icon: CheckSquare, label: 'Task',    color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  email:   { icon: Mail,        label: 'Email',   color: 'text-sky-600',     bg: 'bg-sky-50' },
  meeting: { icon: Users,       label: 'Meeting', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
};

const TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'call', label: 'Call' },
  { value: 'note', label: 'Note' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Meeting' },
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'completed', label: 'Completed' },
];

const selectCls =
  'text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500';

export default function ActivityList() {
  usePageTitle('Commercial — Activities');
  const navigate = useNavigate();
  const { canWrite } = useUser();
  const { addToast } = useToast();

  const [activities, setActivities] = useState<ActivityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('crm_activities')
      .select('*, clients(client_name), crm_contacts(first_name, last_name)')
      .order('created_at', { ascending: false })
      .limit(500);

    setActivities(
      ((data ?? []) as Array<Record<string, unknown>>).map(a => ({
        ...(a as unknown as CrmActivity),
        client_name: (a.clients as { client_name: string } | null)?.client_name ?? '—',
        contact_name: (() => {
          const c = a.crm_contacts as { first_name: string; last_name: string } | null;
          return c ? `${c.first_name} ${c.last_name}`.trim() || null : null;
        })(),
      })),
    );
    setLoading(false);
  }

  const clientOptions = useMemo(
    () => [...new Map(activities.map(a => [a.client_id, a.client_name])).entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label })),
    [activities],
  );

  const filtered = useMemo(() => activities.filter(a => {
    if (typeFilter && a.type !== typeFilter) return false;
    if (statusFilter && a.status !== statusFilter) return false;
    if (clientFilter && a.client_id !== clientFilter) return false;
    return true;
  }), [activities, typeFilter, statusFilter, clientFilter]);

  const openTasks = useMemo(() => filtered.filter(a => a.type === 'task' && a.status === 'open'), [filtered]);

  async function toggleComplete(a: ActivityRow) {
    const next: CrmActivityStatus = a.status === 'completed' ? 'open' : 'completed';
    setToggling(a.id);
    const { error } = await supabase.from('crm_activities').update({
      status: next,
      completed_at: next === 'completed' ? new Date().toISOString() : null,
    }).eq('id', a.id);
    setToggling(null);
    if (error) { addToast('Could not update task: ' + error.message, 'error'); return; }
    setActivities(prev => prev.map(x => x.id === a.id ? { ...x, status: next } : x));
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={CLIENT_TABS} />

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activities</h1>
        <p className="text-sm text-gray-500 mt-1">All logged calls, notes, tasks, emails and meetings across accounts.</p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className={`${selectCls} ${typeFilter ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
          <option value="">Type: All</option>
          {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className={`${selectCls} ${statusFilter ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
          <option value="">Status: All</option>
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)}
          className={`${selectCls} ${clientFilter ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
          <option value="">Account: All</option>
          {clientOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {(typeFilter || statusFilter || clientFilter) && (
          <button onClick={() => { setTypeFilter(''); setStatusFilter(''); setClientFilter(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline">Clear</button>
        )}
        <span className="ml-auto text-sm text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Open tasks summary */}
      {(!typeFilter || typeFilter === 'task') && (!statusFilter || statusFilter === 'open') && openTasks.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <CheckSquare size={16} className="text-indigo-500" />
            <span className="text-sm font-semibold text-gray-900">Open Tasks</span>
            <span className="text-xs text-gray-400">({openTasks.length})</span>
          </div>
          <ul className="divide-y divide-gray-100">
            {openTasks.slice(0, 10).map(a => {
              const overdue = a.due_date && new Date(a.due_date) < new Date(new Date().toDateString());
              return (
                <li key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                  {canWrite('commercial') && (
                    <button onClick={() => toggleComplete(a)} disabled={toggling === a.id} title="Mark done" className="flex-shrink-0">
                      {toggling === a.id
                        ? <Loader2 size={16} className="animate-spin text-gray-300" />
                        : <Square size={16} className="text-gray-400 hover:text-indigo-600" />}
                    </button>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-gray-900 truncate">{a.subject}</div>
                    <div className="text-xs text-gray-400 truncate">
                      <button onClick={() => navigate(`/commercial/clients/${a.client_id}`)} className="text-indigo-600 hover:underline">{a.client_name}</button>
                      {a.contact_name && <span> · {a.contact_name}</span>}
                    </div>
                  </div>
                  {a.due_date && (
                    <div className={`flex items-center gap-1 text-xs flex-shrink-0 px-2 py-0.5 rounded-full ${overdue ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      <CalendarClock size={11} /> {fmtDate(a.due_date)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {openTasks.length > 10 && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
              Showing 10 of {openTasks.length} open tasks. Use the Status filter to see all.
            </div>
          )}
        </div>
      )}

      {/* All activities table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-[11px] uppercase tracking-wider">
                <th className="text-left px-4 py-2.5 font-medium w-8" />
                <th className="text-left px-4 py-2.5 font-medium">Subject</th>
                <th className="text-left px-4 py-2.5 font-medium">Account</th>
                <th className="text-left px-4 py-2.5 font-medium">Contact</th>
                <th className="text-left px-4 py-2.5 font-medium">Status</th>
                <th className="text-left px-4 py-2.5 font-medium">Due</th>
                <th className="text-left px-4 py-2.5 font-medium">Logged</th>
                <th className="px-4 py-2.5 w-24" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-gray-400">No activities match the current filters.</td>
                </tr>
              ) : filtered.map((a, i) => {
                const m = TYPE_META[a.type];
                const isTask = a.type === 'task';
                const overdue = isTask && a.status === 'open' && a.due_date && new Date(a.due_date) < new Date(new Date().toDateString());
                return (
                  <tr key={a.id} className={i % 2 ? 'bg-gray-50/40' : 'bg-white'}>
                    <td className="px-4 py-2.5">
                      <div className={`w-7 h-7 rounded-full ${m.bg} flex items-center justify-center`}>
                        <m.icon size={14} className={m.color} />
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className={`font-medium ${a.status === 'completed' && isTask ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{a.subject}</div>
                      {a.body && <div className="text-xs text-gray-400 truncate max-w-[280px]">{a.body}</div>}
                    </td>
                    <td className="px-4 py-2.5">
                      <button onClick={() => navigate(`/commercial/clients/${a.client_id}`)}
                        className="text-indigo-600 hover:underline text-left truncate block max-w-[140px]">
                        {a.client_name}
                      </button>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {a.contact_name
                        ? <button onClick={() => a.contact_id && navigate(`/commercial/contacts/${a.contact_id}`)} className="text-indigo-600 hover:underline">{a.contact_name}</button>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      {a.status === 'open'
                        ? <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">Open</span>
                        : <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">Done</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {isTask && a.due_date
                        ? <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>{fmtDate(a.due_date)}</span>
                        : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">{fmtDateTime(a.created_at)}</td>
                    <td className="px-4 py-2.5 text-right">
                      {isTask && canWrite('commercial') && (
                        <button onClick={() => toggleComplete(a)} disabled={toggling === a.id}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40 whitespace-nowrap">
                          {toggling === a.id
                            ? <Loader2 size={12} className="animate-spin inline" />
                            : a.status === 'open' ? 'Mark Done' : 'Reopen'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
            {filtered.length} activit{filtered.length !== 1 ? 'ies' : 'y'} · most recent first · capped at 500
          </div>
        )}
      </div>
    </div>
  );
}
