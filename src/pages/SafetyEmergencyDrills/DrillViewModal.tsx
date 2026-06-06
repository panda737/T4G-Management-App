import { Flame, Droplets, Heart, Lock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { SafetyEmergencyDrill } from '../../lib/supabase';
import Modal from '../../components/Modal';

function getDrillIcon(type: string) {
  switch (type) {
    case 'Fire Evacuation': return <Flame className="w-4 h-4" />;
    case 'Chemical Spill': return <Droplets className="w-4 h-4" />;
    case 'Medical Emergency': return <Heart className="w-4 h-4" />;
    case 'Lockdown': return <Lock className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
}

interface Props {
  drill: SafetyEmergencyDrill;
  onClose: () => void;
}

export default function DrillViewModal({ drill, onClose }: Props) {
  return (
    <Modal
      onClose={onClose}
      title="Drill Details"
      size="lg"
      footer={
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{drill.drill_number}</h3>
          {drill.status === 'Completed' && (
            <div>
              {drill.passed ? (
                <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 rounded-full font-semibold">
                  <CheckCircle className="w-5 h-5" /> PASSED
                </span>
              ) : (
                <span className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold">
                  <XCircle className="w-5 h-5" /> FAILED
                </span>
              )}
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Date</p>
            <p className="text-lg font-semibold text-gray-900">{new Date(drill.drill_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Type</p>
            <p className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              {getDrillIcon(drill.drill_type)} {drill.drill_type}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Location</p>
            <p className="text-lg font-semibold text-gray-900">{drill.location}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Coordinator</p>
            <p className="text-lg font-semibold text-gray-900">{drill.coordinator}</p>
          </div>
        </div>
        {drill.status === 'Completed' && drill.evacuation_time_seconds && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">Evacuation Time vs Target</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(drill.evacuation_time_seconds / 60)}m {drill.evacuation_time_seconds % 60}s
                </p>
                <p className="text-xs text-gray-600">Actual</p>
              </div>
              <div className="text-center">
                <p className="text-xl text-gray-600">vs</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {Math.floor(drill.target_time_seconds / 60)}m {drill.target_time_seconds % 60}s
                </p>
                <p className="text-xs text-gray-600">Target</p>
              </div>
            </div>
          </div>
        )}
        {drill.observations && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Observations</p>
            <p className="text-gray-900">{drill.observations}</p>
          </div>
        )}
        {drill.improvements && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Improvements</p>
            <p className="text-gray-900">{drill.improvements}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
