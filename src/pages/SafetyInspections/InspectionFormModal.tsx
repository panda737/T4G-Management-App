import React from 'react';
import { SafetyInspection } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';

const INSPECTION_TYPES = ['Site Walk', 'PPE Check', 'Equipment', 'Fire Safety', 'Housekeeping', 'Vehicle'];
const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Requires Action'];

interface Props {
  editingId: string | null;
  formData: Partial<SafetyInspection>;
  onChange: (data: Partial<SafetyInspection>) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function InspectionFormModal({ editingId, formData, onChange, onSave, onClose }: Props) {
  const set = (patch: Partial<SafetyInspection>) => onChange({ ...formData, ...patch });

  return (
    <Modal
      title={editingId ? 'Edit Inspection' : 'New Inspection'}
      onClose={onClose}
      size="lg"
      accent="amber"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button onClick={onSave} className="flex items-center gap-1.5 px-5 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium shadow-sm transition-colors">
            {editingId ? 'Update' : 'Create'} Inspection
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
            <input
              type="date"
              value={formData.inspection_date || ''}
              onChange={e => set({ inspection_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
            <select
              value={formData.inspection_type || ''}
              onChange={e => set({ inspection_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
            >
              <option value="">Select type</option>
              {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Area"
            value={formData.area || ''}
            onChange={e => set({ area: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          />
          <EmployeeSelect
            label="Inspector"
            value={formData.inspector_id ?? null}
            displayValue={formData.inspector || ''}
            onChange={(id, name) => set({ inspector_id: id, inspector: name })}
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input
            type="number"
            placeholder="Items Checked"
            value={formData.items_checked || ''}
            onChange={e => set({ items_checked: parseInt(e.target.value) || 0 })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            placeholder="Items Passed"
            value={formData.items_passed || ''}
            onChange={e => set({ items_passed: parseInt(e.target.value) || 0 })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          />
          <input
            type="number"
            placeholder="Score %"
            value={formData.score_percentage || ''}
            onChange={e => set({ score_percentage: parseInt(e.target.value) || 0 })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>

        <textarea
          placeholder="Findings"
          value={formData.findings || ''}
          onChange={e => set({ findings: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg"
        />

        <div className="grid grid-cols-2 gap-4">
          <select
            value={formData.status || ''}
            onChange={e => set({ status: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          >
            <option value="">Select status</option>
            {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
          <input
            type="date"
            placeholder="Next Inspection Date"
            value={formData.next_inspection_date || ''}
            onChange={e => set({ next_inspection_date: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg"
          />
        </div>
      </div>
    </Modal>
  );
}
