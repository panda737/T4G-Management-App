import { TrainingCourse } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';
import EmployeeMultiSelect from '../../components/EmployeeMultiSelect';

export interface SessionFormData {
  course_name: string;
  scheduled_date: string;
  scheduled_time: string;
  location: string;
  instructor: string;
  instructor_id?: string | null;
  capacity: number;
  enrolled_count: number;
  description: string;
  status: string;
  selected_attendee_ids: string[];
}

interface Props {
  title: string;
  formData: SessionFormData;
  courses: TrainingCourse[];
  onChange: (data: SessionFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export const SESSION_STATUS_COLORS: Record<string, string> = {
  Scheduled: 'bg-sky-100 text-sky-700',
  Completed: 'bg-emerald-100 text-emerald-700',
  Cancelled: 'bg-gray-100 text-gray-700',
  'In Progress': 'bg-amber-100 text-amber-700',
};

export default function SessionFormModal({ title, formData, courses, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<SessionFormData>) => onChange({ ...formData, ...patch });
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm';

  return (
    <Modal title={title} onClose={onClose} size="lg" accent="green" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
        <button onClick={onSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium">
          {title.startsWith('Edit') ? 'Update' : 'Create'} Session
        </button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
          <select value={formData.course_name} onChange={e => set({ course_name: e.target.value })} className={inp}>
            <option value="">Select course...</option>
            {courses.map(c => <option key={c.id} value={c.course_name}>{c.course_name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input type="date" value={formData.scheduled_date} onChange={e => set({ scheduled_date: e.target.value })} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
            <input type="time" value={formData.scheduled_time} onChange={e => set({ scheduled_time: e.target.value })} className={inp} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
            <input type="text" value={formData.location} onChange={e => set({ location: e.target.value })} className={inp} />
          </div>
          <div>
            <EmployeeSelect
              label="Instructor *"
              value={formData.instructor_id ?? null}
              displayValue={formData.instructor}
              onChange={(id, name) => set({ instructor_id: id, instructor: name })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
            <input type="number" value={formData.capacity} onChange={e => set({ capacity: parseInt(e.target.value) || 0 })} className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={formData.status} onChange={e => set({ status: e.target.value })} className={inp}>
              <option>Scheduled</option>
              <option>In Progress</option>
              <option>Completed</option>
              <option>Cancelled</option>
            </select>
          </div>
        </div>
        <div>
          <EmployeeMultiSelect
            label="Attendees"
            value={formData.selected_attendee_ids}
            onChange={(ids) => set({ selected_attendee_ids: ids, enrolled_count: ids.length > 0 ? ids.length : formData.enrolled_count })}
            placeholder="Select attendees..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={formData.description} onChange={e => set({ description: e.target.value })} rows={3} className={inp} />
        </div>
      </div>
    </Modal>
  );
}

