import { Pencil, CheckCircle } from 'lucide-react';
import { SafetyIncident } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  incident: SafetyIncident;
  canEdit?: boolean;
  onEdit?: () => void;
  onCloseIncident?: () => void;
  onClose: () => void;
}

export default function IncidentViewModal({ incident, canEdit = false, onEdit, onCloseIncident, onClose }: Props) {
  const isClosed = incident.status === 'Closed';
  return (
    <Modal
      title="Incident Details"
      onClose={onClose}
      size="lg"
      accent="green"
      footer={canEdit ? (
        <>
          {!isClosed && onCloseIncident && (
            <button
              onClick={onCloseIncident}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium"
            >
              <CheckCircle size={15} /> Close Incident
            </button>
          )}
          {onEdit && (
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition font-medium"
            >
              <Pencil size={15} /> Edit
            </button>
          )}
        </>
      ) : undefined}
    >
      <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500">
        <p className="text-sm text-amber-900 font-semibold">Severity: {incident.severity}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {[
          ['Incident #', incident.incident_number],
          ['Date', new Date(incident.incident_date).toLocaleDateString()],
          ['Time', incident.incident_time || 'N/A'],
          ['Type', incident.incident_type],
          ['Severity', incident.severity],
          ['Status', incident.status],
          ['Closed Date', incident.closed_date ? new Date(incident.closed_date).toLocaleDateString() : 'N/A'],
          ['Location', incident.location],
          ['Reported By', incident.reported_by],
          ['Injured Person', incident.injured_person || 'N/A'],
          ['Injury Type', incident.injury_type || 'N/A'],
          ['Body Part', incident.body_part || 'N/A'],
          ['Witnesses', incident.witnesses || 'N/A'],
        ].map(([label, value]) => (
          <div key={label}>
            <p className="text-xs font-semibold text-gray-600 uppercase">{label}</p>
            <p className="text-sm text-gray-900 mt-1">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Description</p>
        <p className="text-sm text-gray-700">{incident.description}</p>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Immediate Action</p>
        <p className="text-sm text-gray-700">{incident.immediate_action}</p>
      </div>
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Root Cause</p>
        <p className="text-sm text-gray-700">{incident.root_cause}</p>
      </div>
    </Modal>
  );
}
