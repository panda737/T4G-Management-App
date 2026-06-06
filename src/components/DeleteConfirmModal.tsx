import { Trash2 } from 'lucide-react';
import Modal from './Modal';

export default function DeleteConfirmModal({
  label,
  onConfirm,
  onClose,
  deleting,
}: {
  label: string;
  onConfirm: () => void;
  onClose: () => void;
  deleting: boolean;
}) {
  return (
    <Modal
      title="Confirm Delete"
      onClose={onClose}
      size="sm"
      accent="red"
      footer={
        <>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex items-center gap-1.5 px-5 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors"
          >
            <Trash2 size={14} /> {deleting ? 'Deleting...' : 'Delete'}
          </button>
        </>
      }
    >
      <p className="text-sm text-gray-700">
        Are you sure you want to delete <span className="font-semibold">{label}</span>?
      </p>
      <p className="text-xs text-red-600 mt-2">This action cannot be undone.</p>
    </Modal>
  );
}
