import { useState } from 'react';
import { Loader } from 'lucide-react';
import { supabase, UserProfile, AppRole, ROLE_LABELS } from '../../lib/supabase';
import Modal from '../../components/Modal';

const ROLES: AppRole[] = ['admin', 'management', 'stock_controller', 'production', 'viewer'];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to everything including user management',
  management: 'Full access to all modules — cannot manage users',
  stock_controller: 'Write access to Stock Management only',
  production: 'Write access to Treatment Plant only',
  viewer: 'Read-only access across all modules',
};

interface Props {
  user: UserProfile;
  onClose: () => void;
  onSave: () => void;
}

export default function EditUserModal({ user: initialUser, onClose, onSave }: Props) {
  const [user, setUser] = useState({ display_name: initialUser.display_name, role: initialUser.role as AppRole });
  const [saving, setSaving] = useState(false);

  const inp = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';

  async function handleSave() {
    setSaving(true);
    await supabase
      .from('user_profiles')
      .update({ display_name: user.display_name, role: user.role, updated_at: new Date().toISOString() })
      .eq('id', initialUser.id);
    setSaving(false);
    onSave();
  }

  return (
    <Modal title="Edit User" onClose={onClose} size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Name</label>
          <input type="text" value={user.display_name} onChange={e => setUser({ ...user, display_name: e.target.value })} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
          <select value={user.role} onChange={e => setUser({ ...user, role: e.target.value as AppRole })} className={inp}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{ROLE_DESCRIPTIONS[user.role]}</p>
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
