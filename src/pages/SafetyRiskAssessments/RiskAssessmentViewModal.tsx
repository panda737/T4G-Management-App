import type { SafetyRiskAssessment } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { riskAssessmentStatusColors } from '../../lib/badgeColors';

export default function RiskAssessmentViewModal({
  assessment,
  onClose,
  onEdit,
}: {
  assessment: SafetyRiskAssessment;
  onClose: () => void;
  onEdit: () => void;
}) {
  const getStatusColor = (status: string) => riskAssessmentStatusColors[status] || 'bg-gray-100 text-gray-700';

  return (
    <Modal
      onClose={onClose}
      title={`${assessment.assessment_number} - Risk Assessment`}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Close</button>
          <button onClick={onEdit} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">Edit Assessment</button>
        </>
      }
    >
      <div>
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-4">Risk Assessment Matrix</h3>
          <div className="relative w-full h-48">
            <div className="absolute inset-0 grid grid-cols-5 gap-1">
              {[...Array(25)].map((_, i) => {
                const row = Math.floor(i / 5);
                const col = i % 5;
                const value = (row + 1) * (col + 1);
                let bgColor = 'bg-emerald-100';
                if (value > 4 && value <= 9) bgColor = 'bg-amber-100';
                if (value > 9 && value <= 14) bgColor = 'bg-orange-100';
                if (value > 14) bgColor = 'bg-red-100';
                const isSelected = row + 1 === assessment.likelihood && col + 1 === assessment.consequence;
                return (
                  <div
                    key={i}
                    className={`${bgColor} flex items-center justify-center text-xs font-bold rounded ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''}`}
                  >
                    {value}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>Likelihood: {assessment.likelihood} | Consequence: {assessment.consequence}</p>
            <p className="font-semibold text-gray-900 mt-2">
              Risk Rating: {assessment.risk_rating} ({assessment.risk_level})
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Area</p>
              <p className="text-gray-900">{assessment.area}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Activity</p>
              <p className="text-gray-900">{assessment.activity}</p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Hazard</p>
            <p className="text-gray-900">{assessment.hazard}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Risk Description</p>
            <p className="text-gray-900">{assessment.risk_description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Existing Controls</p>
              <p className="text-gray-900">{assessment.existing_controls}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Additional Controls</p>
              <p className="text-gray-900">{assessment.additional_controls}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Responsible Person</p>
              <p className="text-gray-900">{assessment.responsible_person}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Assessed By</p>
              <p className="text-gray-900">{assessment.assessed_by}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600">Review Date</p>
              <p className="text-gray-900">
                {assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : '—'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <p className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(assessment.status)}`}>
                {assessment.status}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
