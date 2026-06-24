import { useEffect, useState } from 'react';
import {
  ArrowLeft, Pencil, Trash2, CheckCircle2, Droplets, ClipboardList, ListChecks,
} from 'lucide-react';
import { supabase, SafetyIncident, SafetyCorrectiveAction } from '../../lib/supabase';
import { severityColors, incidentStatusColors, priorityColors, badgeColor } from '../../lib/badgeColors';

interface Props {
  incident: SafetyIncident;
  canEdit: boolean;
  onBack: () => void;
  onEdit: () => void;
  onCloseIncident: () => void;
  onDelete: () => void;
}

const TYPE_ICON: Record<string, string> = {
  Injury: '🤕',
  'Near Miss': '⚠️',
  'Property Damage': '💔',
  Environmental: '🌍',
  'Unsafe Act': '⚡',
  'Unsafe Condition': '🚷',
};

const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleDateString() : '—');
const val = (s: string | null | undefined) => (s && s.trim() !== '' ? s : '—');

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 mt-0.5">{children}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">{title}</p>
      <p className="text-sm text-gray-700 whitespace-pre-wrap">{body && body.trim() !== '' ? body : '—'}</p>
    </div>
  );
}

export default function IncidentDetailView({ incident, canEdit, onBack, onEdit, onCloseIncident, onDelete }: Props) {
  const [actions, setActions] = useState<SafetyCorrectiveAction[]>([]);
  const [actionsLoading, setActionsLoading] = useState(true);
  const isClosed = incident.status === 'Closed';

  useEffect(() => {
    let active = true;
    (async () => {
      setActionsLoading(true);
      const { data } = await supabase
        .from('safety_corrective_actions')
        .select('*')
        .eq('source_incident_id', incident.id)
        .order('created_at', { ascending: false });
      if (active) { setActions(data || []); setActionsLoading(false); }
    })();
    return () => { active = false; };
  }, [incident.id]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Back to incidents">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{incident.incident_number}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeColor(severityColors, incident.severity)}`}>
                {incident.severity}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${badgeColor(incidentStatusColors, incident.status)}`}>
                {incident.status}
              </span>
              {incident.source_spillage_id && (
                <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-50 text-amber-700 inline-flex items-center gap-1" title="Created automatically from a spillage report">
                  <Droplets size={12} /> From spillage
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              <span className="mr-1.5">{TYPE_ICON[incident.incident_type] || '•'}</span>
              {incident.incident_type} · {new Date(incident.incident_date).toLocaleDateString()}
              {incident.incident_time && <> · {incident.incident_time}</>}
              {incident.location && <> · {incident.location}</>}
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium">
              <Pencil size={14} /> Edit
            </button>
            {!isClosed && (
              <button onClick={onCloseIncident} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-semibold shadow-sm">
                <CheckCircle2 size={14} /> Close Incident
              </button>
            )}
            <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Info panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Panel title="What happened">
          <Field label="Type">{TYPE_ICON[incident.incident_type] || '•'} {incident.incident_type}</Field>
          <Field label="Severity">{incident.severity}</Field>
          <Field label="Date">{new Date(incident.incident_date).toLocaleDateString()}</Field>
          <Field label="Time">{val(incident.incident_time)}</Field>
          <Field label="Location">{val(incident.location)}</Field>
          <Field label="Reported by">{val(incident.reported_by)}</Field>
        </Panel>

        <Panel title="People &amp; impact">
          <Field label="Injured person">{val(incident.injured_person)}</Field>
          <Field label="Injury type">{val(incident.injury_type)}</Field>
          <Field label="Body part">{val(incident.body_part)}</Field>
          <Field label="Witnesses">{val(incident.witnesses)}</Field>
        </Panel>

        <Panel title="Status &amp; dates">
          <Field label="Status">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${badgeColor(incidentStatusColors, incident.status)}`}>{incident.status}</span>
          </Field>
          <Field label="Closed date">{fmtDate(incident.closed_date)}</Field>
          <Field label="Logged">{fmtDate(incident.created_at)}</Field>
        </Panel>
      </div>

      {/* Narrative sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section title="Description" body={incident.description} />
        <Section title="Immediate Action" body={incident.immediate_action} />
        <Section title="Root Cause" body={incident.root_cause} />
      </div>

      {/* Related corrective actions */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <ListChecks size={15} className="text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-900">Corrective Actions</h2>
          {actions.length > 0 && (
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{actions.length}</span>
          )}
        </div>
        {actionsLoading ? (
          <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : actions.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <ClipboardList size={22} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm text-gray-400">No corrective actions linked to this incident.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {actions.map(a => (
              <div key={a.id} className="px-4 py-3 flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-mono font-semibold text-gray-900">{a.action_number}</span>
                    {a.priority && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${badgeColor(priorityColors, a.priority)}`}>{a.priority}</span>
                    )}
                    <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-gray-100 text-gray-600">{a.status}</span>
                  </div>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{a.description}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider">Due</p>
                  <p className="text-xs text-gray-700">{fmtDate(a.due_date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
