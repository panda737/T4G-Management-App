import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';
import { SafetyEmergencyDrill } from '../../lib/supabase';

export interface DrillFormData {
  drill_date: string;
  drill_type: string;
  location: string;
  coordinator: string;
  coordinator_id: string | null;
  participants_count: string;
  evacuation_time_seconds: string;
  target_time_seconds: string;
  passed: boolean;
  observations: string;
  improvements: string;
  next_drill_date: string;
  status: string;
}

interface Props {
  editingDrill: SafetyEmergencyDrill | null;
  formData: DrillFormData;
  onChange: (data: DrillFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function DrillFormModal({ editingDrill, formData, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<DrillFormData>) => onChange({ ...formData, ...patch });

  return (
    <Modal
      onClose={onClose}
      title={editingDrill ? 'Edit Drill' : 'Schedule New Drill'}
      size="lg"
      accent="blue"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Drill</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Drill Date</label>
            <input
              type="date"
              value={formData.drill_date}
              onChange={e => set({ drill_date: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Drill Type</label>
            <select
              value={formData.drill_type}
              onChange={e => set({ drill_type: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Fire Evacuation</option>
              <option>Chemical Spill</option>
              <option>Medical Emergency</option>
              <option>Lockdown</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={e => set({ location: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <EmployeeSelect
              label="Coordinator"
              value={formData.coordinator_id}
              displayValue={formData.coordinator}
              onChange={(id, name) => set({ coordinator_id: id, coordinator: name })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Participants</label>
            <input
              type="number"
              value={formData.participants_count}
              onChange={e => set({ participants_count: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Target Time (seconds)</label>
            <input
              type="number"
              value={formData.target_time_seconds}
              onChange={e => set({ target_time_seconds: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Evacuation Time (seconds)</label>
          <input
            type="number"
            value={formData.evacuation_time_seconds}
            onChange={e => set({ evacuation_time_seconds: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Next Drill Date</label>
          <input
            type="date"
            value={formData.next_drill_date}
            onChange={e => set({ next_drill_date: e.target.value })}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              value={formData.status}
              onChange={e => set({ status: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option>Scheduled</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.passed}
                onChange={e => set({ passed: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-700">Passed</span>
            </label>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Observations</label>
          <textarea
            value={formData.observations}
            onChange={e => set({ observations: e.target.value })}
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Improvements</label>
          <textarea
            value={formData.improvements}
            onChange={e => set({ improvements: e.target.value })}
            rows={3}
            className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </Modal>
  );
}
