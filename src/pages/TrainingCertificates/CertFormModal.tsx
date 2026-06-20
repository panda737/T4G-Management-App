import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';

export interface CertFormData {
  employee_name: string;
  employee_id: string | null;
  course_name: string;
  certificate_number: string;
  issue_date: string;
  expiry_date: string;
  issuing_body: string;
  document_reference: string;
  status: 'Valid' | 'Expired' | 'Revoked';
  notes: string;
}

interface Props {
  title: string;
  formData: CertFormData;
  onChange: (data: CertFormData) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function CertFormModal({ title, formData, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<CertFormData>) => onChange({ ...formData, ...patch });

  return (
    <Modal title={title} onClose={onClose} size="lg" accent="green" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onSave} className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium">Save</button>
      </>
    }>
      <div className="space-y-4">
        <EmployeeSelect
          label="Employee *"
          value={formData.employee_id}
          displayValue={formData.employee_name}
          onChange={(id, name) => set({ employee_id: id, employee_name: name })}
        />
        <input type="text" placeholder="Course Name *" value={formData.course_name} onChange={e => set({ course_name: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="text" placeholder="Certificate Number" value={formData.certificate_number} onChange={e => set({ certificate_number: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="date" value={formData.issue_date} onChange={e => set({ issue_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="date" value={formData.expiry_date} onChange={e => set({ expiry_date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="text" placeholder="Issuing Body" value={formData.issuing_body} onChange={e => set({ issuing_body: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <input type="text" placeholder="Document Reference" value={formData.document_reference} onChange={e => set({ document_reference: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
        <select value={formData.status} onChange={e => set({ status: e.target.value as CertFormData['status'] })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <option>Valid</option><option>Expired</option><option>Revoked</option>
        </select>
        <textarea placeholder="Notes" value={formData.notes} onChange={e => set({ notes: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" rows={3} />
      </div>
    </Modal>
  );
}
