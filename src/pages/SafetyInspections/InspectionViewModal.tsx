import React from 'react';
import { Eye, Shield, Zap, Flame, HardHat, Truck } from 'lucide-react';
import { SafetyInspection } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { inspectionStatusColors, badgeColor } from '../../lib/badgeColors';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Site Walk': <Eye className="w-4 h-4" />,
  'PPE Check': <Shield className="w-4 h-4" />,
  'Equipment': <Zap className="w-4 h-4" />,
  'Fire Safety': <Flame className="w-4 h-4" />,
  'Housekeeping': <HardHat className="w-4 h-4" />,
  'Vehicle': <Truck className="w-4 h-4" />,
};

interface Props {
  inspection: SafetyInspection;
  onClose: () => void;
}

export default function InspectionViewModal({ inspection, onClose }: Props) {
  return (
    <Modal
      title="Inspection Details"
      onClose={onClose}
      size="lg"
      accent="amber"
      footer={
        <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Close</button>
      }
    >
      <div className="space-y-6">
        <div className="flex items-end gap-4">
          <div>
            <p className="text-gray-600 text-sm">Inspection Number</p>
            <p className="text-2xl font-bold text-gray-900">{inspection.inspection_number}</p>
          </div>
          <div className="flex-1">
            <p className="text-gray-600 text-sm">Compliance Score</p>
            <div className="flex items-baseline gap-3">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl"
                style={{
                  backgroundColor: inspection.score_percentage >= 90 ? '#10b981' : inspection.score_percentage >= 75 ? '#f59e0b' : '#ef4444',
                }}
              >
                <span className="text-white">{inspection.score_percentage}%</span>
              </div>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium ${badgeColor(inspectionStatusColors, inspection.status)}`}>
            {inspection.status}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600 text-sm">Date</p>
            <p className="font-medium">{new Date(inspection.inspection_date).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Type</p>
            <p className="font-medium flex items-center gap-2">
              {TYPE_ICONS[inspection.inspection_type]}
              {inspection.inspection_type}
            </p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Area</p>
            <p className="font-medium">{inspection.area}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Inspector</p>
            <p className="font-medium">{inspection.inspector}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Items Checked</p>
            <p className="font-medium">{inspection.items_checked}</p>
          </div>
          <div>
            <p className="text-gray-600 text-sm">Items Passed</p>
            <p className="font-medium">{inspection.items_passed}</p>
          </div>
        </div>

        {inspection.findings && (
          <div>
            <p className="text-gray-600 text-sm mb-2">Findings</p>
            <p className="text-gray-900">{inspection.findings}</p>
          </div>
        )}

        {inspection.next_inspection_date && (
          <div>
            <p className="text-gray-600 text-sm">Next Inspection Due</p>
            <p className="font-medium">{new Date(inspection.next_inspection_date).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
