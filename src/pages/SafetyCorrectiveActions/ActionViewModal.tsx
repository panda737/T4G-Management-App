import { SafetyCorrectiveAction } from '../../lib/supabase';
import Modal from '../../components/Modal';

function PriorityBadge({ priority }: { priority: string }) {
  const styles: Record<string, string> = {
    Low: 'bg-gray-100 text-gray-700',
    Medium: 'bg-amber-100 text-amber-700',
    High: 'bg-orange-100 text-orange-700',
    Critical: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[priority] || styles.Low}`}>{priority}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Open: 'bg-amber-100 text-amber-700',
    'In Progress': 'bg-sky-100 text-sky-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Verified: 'bg-teal-100 text-teal-700',
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.Open}`}>{status}</span>;
}

interface Props {
  action: SafetyCorrectiveAction;
  onClose: () => void;
}

export default function ActionViewModal({ action, onClose }: Props) {
  return (
    <Modal onClose={onClose} title={action.action_number} size="lg" footer={
      <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">Close</button>
    }>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Source Type</p>
            <p className="font-medium text-gray-900">{action.source_type}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Source Reference</p>
            <p className="font-medium text-gray-900">{action.source_reference || '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Description</p>
          <p className="font-medium text-gray-900">{action.description}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Assigned To</p>
            <p className="font-medium text-gray-900">{action.assigned_to || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Priority</p>
            <PriorityBadge priority={action.priority} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Due Date</p>
            <p className="font-medium text-gray-900">{action.due_date ? new Date(action.due_date).toLocaleDateString() : '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <StatusBadge status={action.status} />
          </div>
        </div>
        {action.evidence && (
          <div>
            <p className="text-sm text-gray-600">Evidence</p>
            <p className="font-medium text-gray-900">{action.evidence}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
