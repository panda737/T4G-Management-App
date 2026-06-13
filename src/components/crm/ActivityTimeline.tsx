import { useState } from 'react';
import { StickyNote, Phone, CheckSquare, Mail, Users, Loader2, CalendarClock, Square } from 'lucide-react';
import type { CrmActivityType, CrmActivityStatus } from '../../lib/supabase';
import { fmtDateTime, fmtDate } from './crmUtils';

export interface TimelineActivity {
  id: string;
  type: CrmActivityType;
  subject: string;
  body?: string;
  status: CrmActivityStatus;
  due_date?: string | null;
  created_at: string;
  owner_name?: string | null;
  contact_name?: string | null;
}

export interface LogPayload {
  type: CrmActivityType;
  subject: string;
  body: string;
  due_date: string | null;
  status: CrmActivityStatus;
}

interface ActivityTimelineProps {
  activities: TimelineActivity[];
  loading?: boolean;
  canWrite?: boolean;
  onLog?: (a: LogPayload) => Promise<void> | void;
  onToggleComplete?: (a: TimelineActivity) => void;
  emptyMessage?: string;
}

const TYPE_META: Record<CrmActivityType, { icon: React.ElementType; label: string; color: string; bg: string }> = {
  note:    { icon: StickyNote,  label: 'Note',    color: 'text-amber-600',   bg: 'bg-amber-50' },
  call:    { icon: Phone,       label: 'Call',    color: 'text-emerald-600', bg: 'bg-emerald-50' },
  task:    { icon: CheckSquare, label: 'Task',    color: 'text-indigo-600',  bg: 'bg-indigo-50' },
  email:   { icon: Mail,        label: 'Email',   color: 'text-sky-600',     bg: 'bg-sky-50' },
  meeting: { icon: Users,       label: 'Meeting', color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
};

const ORDER: CrmActivityType[] = ['note', 'call', 'task', 'email', 'meeting'];

export default function ActivityTimeline({
  activities, loading, canWrite, onLog, onToggleComplete, emptyMessage = 'No activity logged yet.',
}: ActivityTimelineProps) {
  const [type, setType] = useState<CrmActivityType>('note');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [due, setDue] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!onLog || !subject.trim()) return;
    setSaving(true);
    try {
      await onLog({
        type,
        subject: subject.trim(),
        body: body.trim(),
        due_date: type === 'task' && due ? due : null,
        status: type === 'task' ? 'open' : 'completed',
      });
      setSubject(''); setBody(''); setDue('');
    } finally {
      setSaving(false);
    }
  }

  const sorted = [...activities].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));

  return (
    <div className="space-y-4">
      {canWrite && onLog && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {ORDER.map(t => {
              const m = TYPE_META[t];
              const on = type === t;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border transition ${on ? `${m.bg} ${m.color} border-current font-medium` : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  <m.icon size={14} /> {m.label}
                </button>
              );
            })}
          </div>
          <input value={subject} onChange={e => setSubject(e.target.value)}
            placeholder={type === 'task' ? 'What needs doing?' : `Log a ${TYPE_META[type].label.toLowerCase()}…`}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={2} placeholder="Details (optional)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex items-center gap-3 mt-2">
            {type === 'task' && (
              <label className="flex items-center gap-1.5 text-sm text-gray-500">
                <CalendarClock size={15} className="text-gray-400" />
                <input type="date" value={due} onChange={e => setDue(e.target.value)}
                  className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
            )}
            <button onClick={submit} disabled={saving || !subject.trim()}
              className="ml-auto flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm px-4 py-1.5 rounded-lg font-medium">
              {saving && <Loader2 size={14} className="animate-spin" />} {type === 'task' ? 'Add task' : 'Log'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-10 text-center text-sm text-gray-400">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-400">{emptyMessage}</div>
      ) : (
        <div className="relative pl-2">
          <div className="absolute left-[18px] top-2 bottom-2 w-px bg-gray-200" />
          <ul className="space-y-3">
            {sorted.map(a => {
              const m = TYPE_META[a.type];
              const isOpenTask = a.type === 'task' && a.status === 'open';
              const overdue = isOpenTask && a.due_date && new Date(a.due_date) < new Date(new Date().toDateString());
              return (
                <li key={a.id} className="relative flex gap-3">
                  <div className={`relative z-10 w-9 h-9 rounded-full ${m.bg} flex items-center justify-center flex-shrink-0 ring-4 ring-gray-50`}>
                    <m.icon size={16} className={m.color} />
                  </div>
                  <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm p-3">
                    <div className="flex items-start gap-2">
                      {a.type === 'task' && onToggleComplete && (
                        <button onClick={() => onToggleComplete(a)} className="mt-0.5 flex-shrink-0" title={a.status === 'completed' ? 'Reopen' : 'Mark done'}>
                          {a.status === 'completed'
                            ? <CheckSquare size={16} className="text-emerald-600" />
                            : <Square size={16} className="text-gray-400 hover:text-indigo-600" />}
                        </button>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className={`text-sm font-medium ${a.status === 'completed' && a.type === 'task' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {a.subject}
                        </div>
                        {a.body && <div className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{a.body}</div>}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400 mt-1.5">
                          <span className={m.color}>{m.label}</span>
                          {a.contact_name && <span>· {a.contact_name}</span>}
                          {a.owner_name && <span>· {a.owner_name}</span>}
                          <span>· {fmtDateTime(a.created_at)}</span>
                          {isOpenTask && a.due_date && (
                            <span className={`px-1.5 py-0.5 rounded-full ${overdue ? 'bg-red-50 text-red-600' : 'bg-indigo-50 text-indigo-600'}`}>
                              Due {fmtDate(a.due_date)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
