import type { SafetyRiskAssessment } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';
import { getRiskRatingColor } from '../../lib/badgeColors';
import { calculateRiskRating, getRiskLevel } from './constants';

export default function RiskAssessmentFormModal({
  formData,
  setFormData,
  isEdit,
  onClose,
  onSave,
}: {
  formData: Partial<SafetyRiskAssessment>;
  setFormData: (d: Partial<SafetyRiskAssessment>) => void;
  isEdit: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const riskRating = calculateRiskRating(formData.likelihood || 1, formData.consequence || 1);
  const getRiskColor = (rating: number) => getRiskRatingColor(rating);

  return (
    <Modal
      onClose={onClose}
      title={isEdit ? 'Edit Assessment' : 'New Risk Assessment'}
      size="xl"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium">Save Assessment</button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Assessment Date</label>
          <input
            type="date"
            value={formData.assessment_date || ''}
            onChange={e => setFormData({ ...formData, assessment_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Area</label>
          <input
            type="text"
            value={formData.area || ''}
            onChange={e => setFormData({ ...formData, area: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Activity</label>
          <input
            type="text"
            value={formData.activity || ''}
            onChange={e => setFormData({ ...formData, activity: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Hazard</label>
          <input
            type="text"
            value={formData.hazard || ''}
            onChange={e => setFormData({ ...formData, hazard: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-1">Risk Description</label>
        <textarea
          value={formData.risk_description || ''}
          onChange={e => setFormData({ ...formData, risk_description: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Likelihood</label>
          <select
            value={formData.likelihood || 1}
            onChange={e => setFormData({ ...formData, likelihood: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value={1}>1 - Rare</option>
            <option value={2}>2 - Unlikely</option>
            <option value={3}>3 - Possible</option>
            <option value={4}>4 - Likely</option>
            <option value={5}>5 - Almost Certain</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Consequence</label>
          <select
            value={formData.consequence || 1}
            onChange={e => setFormData({ ...formData, consequence: parseInt(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value={1}>1 - Insignificant</option>
            <option value={2}>2 - Minor</option>
            <option value={3}>3 - Moderate</option>
            <option value={4}>4 - Major</option>
            <option value={5}>5 - Catastrophic</option>
          </select>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-900 mb-1">Risk Rating</label>
        <div className={`p-4 rounded-lg text-center text-lg font-bold ${getRiskColor(riskRating)}`}>
          {riskRating} ({getRiskLevel(riskRating)})
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Existing Controls</label>
          <textarea
            value={formData.existing_controls || ''}
            onChange={e => setFormData({ ...formData, existing_controls: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Additional Controls</label>
          <textarea
            value={formData.additional_controls || ''}
            onChange={e => setFormData({ ...formData, additional_controls: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <EmployeeSelect
          label="Responsible Person"
          value={formData.responsible_person_id ?? null}
          displayValue={formData.responsible_person || ''}
          onChange={(id, name) => setFormData({ ...formData, responsible_person_id: id, responsible_person: name })}
        />
        <EmployeeSelect
          label="Assessed By"
          value={formData.assessed_by_id ?? null}
          displayValue={formData.assessed_by || ''}
          onChange={(id, name) => setFormData({ ...formData, assessed_by_id: id, assessed_by: name })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Review Date</label>
          <input
            type="date"
            value={formData.review_date || ''}
            onChange={e => setFormData({ ...formData, review_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
          <select
            value={formData.status || 'Draft'}
            onChange={e => setFormData({ ...formData, status: e.target.value as 'Draft' | 'Active' | 'Under Review' | 'Archived' })}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option>Draft</option>
            <option>Active</option>
            <option>Under Review</option>
            <option>Archived</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}
