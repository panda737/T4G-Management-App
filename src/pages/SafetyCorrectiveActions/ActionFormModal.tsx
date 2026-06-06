import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Modal from '../../components/Modal';
import EmployeeSelect from '../../components/EmployeeSelect';
import { generateSequentialNumber } from '../../lib/numberGenerator';

interface Props {
  onClose: () => void;
  onSave: () => void;
}

const EMPTY_FORM = {
  source_type: 'Incident',
  source_reference: '',
  description: '',
  assigned_to: '',
  assigned_to_id: null as string | null,
  priority: 'Medium',
  due_date: '',
  status: 'Open',
  completed_date: '',
  evidence: '',
};

export default function ActionFormModal({ onClose, onSave }: Props) {
  const [formData, setFormData] = useState(EMPTY_FORM);

  async function handleSave() {
    const action_number = await generateSequentialNumber('safety_corrective_actions', 'action_number', 'CA');
    const { error } = await supabase.from('safety_corrective_actions').insert([{
      ...formData,
      action_number,
      completed_date: formData.completed_date || null,
      due_date: formData.due_date || null,
    }]);
    if (!error) {
      onSave();
      onClose();
    }
  }

  const set = (patch: Partial<typeof EMPTY_FORM>) => setFormData(prev => ({ ...prev, ...patch }));

  return (
    <Modal onClose={onClose} title="New Corrective Action" size="lg" footer={
      <>
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
        <button onClick={handleSave} className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition font-medium">Save</button>
      </>
    }>
      <div className="space-y-4">
        <select value={formData.source_type} onChange={e => set({ source_type: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none">
          <option>Incident</option>
          <option>Inspection</option>
          <option>Risk Assessment</option>
          <option>Audit</option>
          <option>Toolbox Talk</option>
        </select>
        <input type="text" placeholder="Source Reference" value={formData.source_reference} onChange={e => set({ source_reference: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none" />
        <textarea placeholder="Description" rows={3} value={formData.description} onChange={e => set({ description: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none" />
        <EmployeeSelect
          value={formData.assigned_to_id}
          displayValue={formData.assigned_to}
          onChange={(id, name) => set({ assigned_to_id: id, assigned_to: name })}
          placeholder="Select employee..."
          label="Assigned To"
        />
        <select value={formData.priority} onChange={e => set({ priority: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none">
          <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
        </select>
        <input type="date" value={formData.due_date} onChange={e => set({ due_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none" />
        <select value={formData.status} onChange={e => set({ status: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none">
          <option>Open</option><option>In Progress</option><option>Completed</option><option>Verified</option>
        </select>
        {['Completed', 'Verified'].includes(formData.status) && (
          <>
            <input type="date" value={formData.completed_date} onChange={e => set({ completed_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none" placeholder="Completed Date" />
            <textarea placeholder="Evidence" rows={3} value={formData.evidence} onChange={e => set({ evidence: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500 outline-none" />
          </>
        )}
      </div>
    </Modal>
  );
}
