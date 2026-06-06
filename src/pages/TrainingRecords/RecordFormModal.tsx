import { TrainingRecord, TrainingCourse } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';

export interface RecordFormData {
  employee_name: string;
  employee_id: string | null;
  course_name: string;
  completion_date: string;
  expiry_date: string;
  score: string;
  result: string;
  instructor: string;
  status: string;
  notes: string;
}

interface Props {
  selectedRecord: TrainingRecord | null;
  formData: RecordFormData;
  courses: TrainingCourse[];
  onChange: (data: RecordFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function RecordFormModal({ selectedRecord, formData, courses, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<RecordFormData>) => onChange({ ...formData, ...patch });

  return (
    <Modal
      title={selectedRecord ? 'Edit Training Record' : 'Add Training Record'}
      onClose={onClose}
      size="lg"
      accent="green"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium">Save</button>
        </>
      }
    >
      <div className="space-y-4">
        <EmployeeSelect
          label="Employee *"
          value={formData.employee_id}
          displayValue={formData.employee_name}
          onChange={(id, name) => set({ employee_id: id, employee_name: name })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={formData.course_name}
              onChange={e => set({ course_name: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Type or select"
            />
            <select
              value={formData.course_name}
              onChange={e => set({ course_name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Select course</option>
              {courses.map(c => <option key={c.id} value={c.course_name}>{c.course_name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Completion Date</label>
            <input type="date" value={formData.completion_date} onChange={e => set({ completion_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
            <input type="date" value={formData.expiry_date} onChange={e => set({ expiry_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-100)</label>
            <input type="number" min="0" max="100" value={formData.score} onChange={e => set({ score: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
            <select value={formData.result} onChange={e => set({ result: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Pass</option><option>Fail</option><option>Incomplete</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instructor</label>
          <input type="text" value={formData.instructor} onChange={e => set({ instructor: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select value={formData.status} onChange={e => set({ status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option>Completed</option><option>Due</option><option>Overdue</option><option>In Progress</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea value={formData.notes} onChange={e => set({ notes: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" rows={3} />
        </div>
      </div>
    </Modal>
  );
}
