import { SafetyIncident } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  incident: SafetyIncident;
  onClose: () => void;
}

export default function IncidentViewModal({ incident, onClose }: Props) {
  return (
    <Modal title="Incident Details" onClose={onClose} size="lg" accent="green">
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
