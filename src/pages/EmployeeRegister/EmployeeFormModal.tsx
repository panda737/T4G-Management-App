import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Employee } from '../../lib/supabase';
import Modal from '../../components/Modal';
import { Field, SelectField } from './FormFields';
import { POSITIONS } from './constants';

export default function EmployeeFormModal({
  employee,
  onClose,
  onSave,
}: {
  employee: Employee | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [form, setForm] = useState({
    employee_number: employee?.employee_number || '',
    surname: employee?.surname || '',
    first_name: employee?.first_name || '',
    gender: employee?.gender || 'Male',
    id_number: employee?.id_number || '',
    contact_number: employee?.contact_number || '',
    email: employee?.email || '',
    position: employee?.position || 'General Worker',
    department: employee?.department || 'Operations',
    hs_role: employee?.hs_role || 'employee',
    is_truck_handler: employee?.is_truck_handler || false,
    status: employee?.status || 'active',
    address_line_1: employee?.address_line_1 || '',
    address_line_2: employee?.address_line_2 || '',
    address_line_3: employee?.address_line_3 || '',
    postal_code: employee?.postal_code || '',
    medical_fund: employee?.medical_fund || '',
    medical_fund_number: employee?.medical_fund_number || '',
    chronic_medication: employee?.chronic_medication || '',
    emergency_contact_name: employee?.emergency_contact_name || '',
    emergency_contact_number: employee?.emergency_contact_number || '',
    notes: employee?.notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(field: string, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    if (!form.employee_number || !form.surname || !form.first_name) {
      setError('Employee number, surname, and first name are required.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = { ...form, updated_at: new Date().toISOString() };

    if (employee) {
      const { error: err } = await supabase.from('employees').update(payload).eq('id', employee.id);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { error: err } = await supabase.from('employees').insert(payload);
      if (err) { setError(err.message); setSaving(false); return; }
    }

    setSaving(false);
    onSave();
  }

  return (
    <Modal title={employee ? 'Edit Employee' : 'Add Employee'} onClose={onClose} size="xl">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Field label="Employee Number *" value={form.employee_number} onChange={v => update('employee_number', v)} />
        <Field label="Surname *" value={form.surname} onChange={v => update('surname', v)} />
        <Field label="First Name *" value={form.first_name} onChange={v => update('first_name', v)} />
        <SelectField label="Gender" value={form.gender} options={['Male', 'Female', 'Other']} onChange={v => update('gender', v)} />
        <Field label="ID Number" value={form.id_number} onChange={v => update('id_number', v)} />
        <Field label="Contact Number" value={form.contact_number} onChange={v => update('contact_number', v)} />
        <Field label="Email" value={form.email} onChange={v => update('email', v)} />
        <SelectField label="Position" value={form.position} options={POSITIONS} onChange={v => update('position', v)} />
        <Field label="Department" value={form.department} onChange={v => update('department', v)} />
        <SelectField label="H&S Role" value={form.hs_role} options={['employee', 'supervisor', 'hs_staff']} onChange={v => update('hs_role', v)} />
        <SelectField label="Status" value={form.status} options={['active', 'inactive']} onChange={v => update('status', v)} />

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.is_truck_handler}
              onChange={e => update('is_truck_handler', e.target.checked)}
              className="rounded border-gray-300"
            />
            Truck Handler (rotates between plant and truck duties)
          </label>
        </div>

        <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Address</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Address Line 1" value={form.address_line_1} onChange={v => update('address_line_1', v)} />
            <Field label="Address Line 2" value={form.address_line_2} onChange={v => update('address_line_2', v)} />
            <Field label="Address Line 3" value={form.address_line_3} onChange={v => update('address_line_3', v)} />
            <Field label="Postal Code" value={form.postal_code} onChange={v => update('postal_code', v)} />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Medical Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Medical Fund & Plan" value={form.medical_fund} onChange={v => update('medical_fund', v)} />
            <Field label="Medical Fund Number" value={form.medical_fund_number} onChange={v => update('medical_fund_number', v)} />
            <Field label="Chronic Medication" value={form.chronic_medication} onChange={v => update('chronic_medication', v)} />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3 border-t border-gray-100 pt-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Emergency Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Contact Name" value={form.emergency_contact_name} onChange={v => update('emergency_contact_name', v)} />
            <Field label="Contact Number" value={form.emergency_contact_number} onChange={v => update('emergency_contact_number', v)} />
          </div>
        </div>

        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={e => update('notes', e.target.value)}
            rows={2}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 flex items-center gap-2">
          <X size={14} /> {error}
        </div>
      )}

      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition-colors"
        >
          {saving ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}
        </button>
      </div>
    </Modal>
  );
}
