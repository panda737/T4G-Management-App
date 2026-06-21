import { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';
import { supabase, UserProfile, AppRole, ROLE_LABELS } from '../../lib/supabase';
import Modal from '../../components/Modal';

const ROLES: AppRole[] = ['admin', 'management', 'stock_controller', 'logistics_manager', 'production', 'operator', 'viewer', 'customer'];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to everything including user management',
  management: 'Full access to all modules — cannot manage users',
  stock_controller: 'Write access to Stock Management only',
  logistics_manager: 'Write access to Logistics only',
  production: 'Write access to Treatment Plant only',
  operator: 'Treatment Plant shift entry only',
  viewer: 'Read-only access across all modules',
  customer: 'Customer portal only — link to a client in Commercial → Client Management',
};

interface Employee { id: string; first_name: string; surname: string; }

interface Props {
  user: UserProfile;
  onClose: () => void;
  onSave: () => void;
}

export default function EditUserModal({ user: initialUser, onClose, onSave }: Props) {
  const [form, setForm] = useState({
    display_name: initialUser.display_name,
    role: initialUser.role as AppRole,
    employee_id: initialUser.employee_id ?? '',
  });
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [saving, setSaving] = useState(false);

  const inp = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  useEffect(() => {
    supabase
      .from('employees')
      .select('id, first_name, surname')
      .eq('status', 'active')
      .order('surname')
      .then(({ data }) => setEmployees((data ?? []) as Employee[]));
  }, []);

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('user_profiles')
      .update({
        display_name: form.display_name,
        role: form.role,
        employee_id: form.employee_id || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', initialUser.id);
    setSaving(false);
    onSave();
  }

  return (
    <Modal title="Edit User" onClose={onClose} size="md" accent="indigo">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Name</label>
          <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as AppRole })} className={inp}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{ROLE_DESCRIPTIONS[form.role]}</p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Linked Employee</label>
          <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className={inp}>
            <option value="">— Not linked —</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.first_name} {e.surname}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Links this login to an employee record so shift reports show the correct name.</p>
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
            {saving ? <Loader size={14} className="animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
