import { useEffect, useState } from 'react';
import { supabase, SafetyCorrectiveAction } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';
import { generateSequentialNumber } from '../../lib/numberGenerator';

interface Props {
  action?: SafetyCorrectiveAction | null;
  onClose: () => void;
  onSave: () => void;
}

type IncidentOption = { id: string; incident_number: string; description: string };

const EMPTY_FORM = {
  source_type: 'Incident',
  source_reference: '',
  source_incident_id: null as string | null,
  description: '',
  assigned_to: '',
  assigned_to_id: null as string | null,
  priority: 'Medium',
  due_date: '',
  status: 'Open',
  completed_date: '',
  evidence: '',
};

export default function ActionFormModal({ action, onClose, onSave }: Props) {
  const isEdit = !!action;
  const [formData, setFormData] = useState(() => action ? {
    source_type: action.source_type,
    source_reference: action.source_reference,
    source_incident_id: action.source_incident_id,
    description: action.description,
    assigned_to: action.assigned_to,
    assigned_to_id: action.assigned_to_id,
    priority: action.priority,
    due_date: action.due_date ?? '',
    status: action.status,
    completed_date: action.completed_date ?? '',
    evidence: action.evidence,
  } : EMPTY_FORM);
  const [incidents, setIncidents] = useState<IncidentOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load incidents to link when the source is an incident.
  useEffect(() => {
    if (formData.source_type !== 'Incident') return;
    if (incidents.length > 0) return;
    supabase
      .from('safety_incidents')
      .select('id, incident_number, description')
      .order('incident_date', { ascending: false })
      .then(({ data }) => setIncidents((data ?? []) as IncidentOption[]));
  }, [formData.source_type, incidents.length]);

  async function handleSave() {
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...formData,
        completed_date: formData.completed_date || null,
        due_date: formData.due_date || null,
        // Only keep the incident link when the source is an incident.
        source_incident_id: formData.source_type === 'Incident' ? formData.source_incident_id : null,
      };
      if (isEdit) {
        const { error: updErr } = await supabase
          .from('safety_corrective_actions')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', action!.id);
        if (updErr) { setError(updErr.message); return; }
      } else {
        const action_number = await generateSequentialNumber('safety_corrective_actions', 'action_number', 'CA');
        const { error: insErr } = await supabase.from('safety_corrective_actions').insert([{ ...payload, action_number }]);
        if (insErr) { setError(insErr.message); return; }
      }
      onSave();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const set = (patch: Partial<typeof EMPTY_FORM>) => setFormData(prev => ({ ...prev, ...patch }));
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none';

  return (
    <Modal onClose={onClose} title={isEdit ? `Edit ${action!.action_number}` : 'New Corrective Action'} size="lg" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
        <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
          <select value={formData.source_type} onChange={e => set({ source_type: e.target.value, source_incident_id: null, source_reference: e.target.value === 'Incident' ? formData.source_reference : '' })} className={inp}>
            <option>Incident</option>
            <option>Inspection</option>
            <option>Risk Assessment</option>
            <option>Audit</option>
            <option>Toolbox Talk</option>
          </select>
        </div>

        {formData.source_type === 'Incident' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Linked Incident</label>
            <select
              value={formData.source_incident_id ?? ''}
              onChange={e => {
                const sel = incidents.find(i => i.id === e.target.value);
                set({ source_incident_id: e.target.value || null, source_reference: sel?.incident_number ?? '' });
              }}
              className={inp}
            >
              <option value="">Select an incident…</option>
              {incidents.map(i => (
                <option key={i.id} value={i.id}>
                  {i.incident_number}{i.description ? ` — ${i.description.substring(0, 50)}` : ''}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Source Reference</label>
            <input type="text" placeholder="Source Reference" value={formData.source_reference} onChange={e => set({ source_reference: e.target.value })} className={inp} />
          </div>
        )}

        <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => set({ description: e.target.value })} className={inp} />
        <EmployeeSelect
          value={formData.assigned_to_id}
          displayValue={formData.assigned_to}
          onChange={(id, name) => set({ assigned_to_id: id, assigned_to: name })}
          placeholder="Select employee..."
          label="Assigned To"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
          <select value={formData.priority} onChange={e => set({ priority: e.target.value })} className={inp}>
            <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
          <input type="date" value={formData.due_date} onChange={e => set({ due_date: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={formData.status} onChange={e => set({ status: e.target.value })} className={inp}>
            <option>Open</option><option>In Progress</option><option>Completed</option><option>Verified</option>
          </select>
        </div>
        {['Completed', 'Verified'].includes(formData.status) && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed Date</label>
              <input type="date" value={formData.completed_date} onChange={e => set({ completed_date: e.target.value })} className={inp} />
            </div>
            <textarea placeholder="Evidence" rows={3} value={formData.evidence} onChange={e => set({ evidence: e.target.value })} className={inp} />
          </>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3 py-2">{error}</div>}
      </div>
    </Modal>
  );
}
