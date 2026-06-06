import { TrainingRecord } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  record: TrainingRecord;
  onClose: () => void;
}

export default function RecordViewModal({ record, onClose }: Props) {
  return (
    <Modal title="Training Record Details" onClose={onClose} size="lg">
      <div className="grid grid-cols-2 gap-4">
        {([
          ['Employee Name', record.employee_name],
          ['Course Name', record.course_name],
          ['Completion Date', record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '-'],
          ['Expiry Date', record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : '-'],
          ['Score', record.score !== null ? `${record.score}%` : '-'],
          ['Result', record.result],
          ['Instructor', record.instructor],
          ['Status', record.status],
        ] as [string, string][]).map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-gray-500 uppercase">{label}</p>
            <p className="text-gray-900 font-medium mt-1">{value}</p>
          </div>
        ))}
      </div>
      {record.notes && (
        <div className="mt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
          <p className="text-gray-900 mt-1">{record.notes}</p>
        </div>
      )}
    </Modal>
  );
}
