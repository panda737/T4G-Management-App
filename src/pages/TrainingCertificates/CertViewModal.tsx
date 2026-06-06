import { TrainingCertificate } from '../../lib/supabase';
import Modal from '../../components/Modal';

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-gray-200 pb-3 last:border-0">
      <p className="text-sm font-medium text-gray-600">{label}</p>
      <p className="text-sm text-gray-900 mt-1">{value}</p>
    </div>
  );
}

interface Props {
  cert: TrainingCertificate;
  onClose: () => void;
}

export default function CertViewModal({ cert, onClose }: Props) {
  return (
    <Modal title="Certificate Details" onClose={onClose} size="lg">
      <div className="space-y-4">
        <DetailRow label="Certificate Number" value={cert.certificate_number} />
        <DetailRow label="Employee Name" value={cert.employee_name} />
        <DetailRow label="Course Name" value={cert.course_name} />
        <DetailRow label="Issue Date" value={new Date(cert.issue_date).toLocaleDateString()} />
        <DetailRow label="Expiry Date" value={cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString() : 'N/A'} />
        <DetailRow label="Issuing Body" value={cert.issuing_body} />
        <DetailRow label="Document Reference" value={cert.document_reference} />
        <DetailRow label="Status" value={cert.status} />
        <DetailRow label="Notes" value={cert.notes} />
      </div>
    </Modal>
  );
}
