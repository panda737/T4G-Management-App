import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';

const INCIDENT_TYPES = ['Injury', 'Near Miss', 'Property Damage', 'Environmental', 'Unsafe Act', 'Unsafe Condition'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'Critical'];
const STATUSES = ['Open', 'Under Investigation', 'Corrective Action', 'Closed'];

export interface IncidentFormData {
  incident_date: string;
  incident_time: string | null;
  incident_type: string;
  severity: string;
  location: string;
  reported_by: string;
  reported_by_id: string | null;
  description: string;
  immediate_action: string;
  injured_person: string;
  injured_person_id: string | null;
  injury_type: string;
  body_part: string;
  witnesses: string;
  root_cause: string;
  status: string;
  closed_date: string | null;
}

interface Props {
  formData: IncidentFormData;
  isEdit?: boolean;
  onChange: (data: IncidentFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function IncidentFormModal({ formData, isEdit = false, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<IncidentFormData>) => onChange({ ...formData, ...patch });

  return (
    <Modal
      title={isEdit ? 'Edit Incident' : 'Report Safety Incident'}
      onClose={onClose}
      size="xl"
      accent="amber"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition text-sm font-medium">Save</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
          <input
            type="date"
            value={formData.incident_date}
            onChange={e => set({ incident_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
          <input
            type="time"
            value={formData.incident_time || ''}
            onChange={e => set({ incident_time: e.target.value || null })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
          <select
            value={formData.incident_type}
            onChange={e => set({ incident_type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {INCIDENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
          <select
            value={formData.severity}
            onChange={e => set({ severity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {SEVERITIES.map(sev => <option key={sev} value={sev}>{sev}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
          <input
            type="text"
            value={formData.location}
            onChange={e => set({ location: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <EmployeeSelect
            label="Reported By"
            value={formData.reported_by_id}
            displayValue={formData.reported_by}
            onChange={(id, name) => set({ reported_by_id: id, reported_by: name })}
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={formData.description}
            onChange={e => set({ description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Immediate Action</label>
          <textarea
            value={formData.immediate_action}
            onChange={e => set({ immediate_action: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        {formData.incident_type === 'Injury' && (
          <>
            <div>
              <EmployeeSelect
                label="Injured Person"
                value={formData.injured_person_id}
                displayValue={formData.injured_person}
                onChange={(id, name) => set({ injured_person_id: id, injured_person: name })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Injury Type</label>
              <input
                type="text"
                value={formData.injury_type}
                onChange={e => set({ injury_type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Body Part</label>
              <input
                type="text"
                value={formData.body_part}
                onChange={e => set({ body_part: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </>
        )}
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Witnesses</label>
          <input
            type="text"
            value={formData.witnesses}
            onChange={e => set({ witnesses: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
          <textarea
            value={formData.root_cause}
            onChange={e => set({ root_cause: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={formData.status}
            onChange={e => set({ status: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
          </select>
        </div>
        {formData.status === 'Closed' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Closed Date</label>
            <input
              type="date"
              value={formData.closed_date || ''}
              onChange={e => set({ closed_date: e.target.value || null })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
