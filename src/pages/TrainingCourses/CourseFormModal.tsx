import Modal from '../../components/Modal';

export interface CourseFormData {
  course_code: string;
  course_name: string;
  category: string;
  description: string;
  duration_hours: number;
  validity_months: number;
  provider: string;
  is_mandatory: boolean;
  status: string;
}

const CATEGORIES = ['Safety', 'Operational', 'Regulatory', 'Soft Skills'];
const STATUSES = ['Active', 'Inactive'];

interface Props {
  title: string;
  formData: CourseFormData;
  onChange: (data: CourseFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function CourseFormModal({ title, formData, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<CourseFormData>) => onChange({ ...formData, ...patch });
  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500';

  return (
    <Modal title={title} onClose={onClose} size="lg" accent="green" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onSave} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium shadow-sm transition-colors">Save Course</button>
      </>
    }>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Course Code</label>
          <input type="text" className={inp} value={formData.course_code} onChange={e => set({ course_code: e.target.value })} placeholder="Auto-generated if empty" />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Course Name *</label>
          <input type="text" className={inp} value={formData.course_name} onChange={e => set({ course_name: e.target.value })} required />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Category</label>
          <select className={inp} value={formData.category} onChange={e => set({ category: e.target.value })}>
            <option value="">Select Category</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
          <textarea className={inp} value={formData.description} onChange={e => set({ description: e.target.value })} rows={3} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Duration (hours)</label>
            <input type="number" className={inp} value={formData.duration_hours} onChange={e => set({ duration_hours: parseInt(e.target.value) || 0 })} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Validity (months)</label>
            <input type="number" className={inp} value={formData.validity_months} onChange={e => set({ validity_months: parseInt(e.target.value) || 0 })} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Provider</label>
          <input type="text" className={inp} value={formData.provider} onChange={e => set({ provider: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Status</label>
          <select className={inp} value={formData.status} onChange={e => set({ status: e.target.value })}>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={formData.is_mandatory} onChange={e => set({ is_mandatory: e.target.checked })} className="w-4 h-4" />
          <span className="text-sm font-semibold text-gray-700">Mandatory Course</span>
        </label>
      </div>
    </Modal>
  );
}
