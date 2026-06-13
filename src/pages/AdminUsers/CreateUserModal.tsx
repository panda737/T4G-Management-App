import { useState } from 'react';
import { Eye, EyeOff, Loader } from 'lucide-react';
import { supabase, AppRole, ROLE_LABELS } from '../../lib/supabase';
import Modal from '../../components/Modal';

const ROLES: AppRole[] = ['admin', 'management', 'stock_controller', 'production', 'operator', 'viewer', 'customer'];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to everything including user management',
  management: 'Full access to all modules — cannot manage users',
  stock_controller: 'Write access to Stock Management only',
  production: 'Write access to Treatment Plant only',
  operator: 'Treatment Plant shift entry only',
  viewer: 'Read-only access across all modules',
  customer: 'Customer portal only — link to a client in Commercial → Client Management',
};

interface Props {
  onClose: () => void;
  onSave: () => void;
}

export default function CreateUserModal({ onClose, onSave }: Props) {
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'viewer' as AppRole });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const inp = 'w-full px-3.5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

  async function handleCreate() {
    setError('');
    if (!form.email || !form.password || !form.display_name) { setError('All fields are required.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setError('Session expired — please log out and log in again.'); return; }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      let res: Response;
      try {
        res = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
              'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ email: form.email, password: form.password, display_name: form.display_name, role: form.role }),
            signal: controller.signal,
          }
        );
      } finally {
        clearTimeout(timeout);
      }

      let result: { error?: string; success?: boolean };
      try {
        result = await res.json();
      } catch {
        setError(`Server error (HTTP ${res.status}). Please try again.`);
        return;
      }

      if (!res.ok || result.error) { setError(result.error ?? 'Failed to create user.'); return; }
      onSave();
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Request timed out. Check your connection and try again.');
      } else {
        setError('Network error. Check your connection and try again.');
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <Modal title="Create New User" onClose={onClose} size="md" accent="indigo">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Display Name *</label>
          <input type="text" value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} placeholder="e.g. John Smith" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email Address *</label>
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="user@tech4green.co.za" className={inp} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password *</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Minimum 8 characters" className={`${inp} pr-10`} />
            <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {form.password.length > 0 && form.password.length < 8 && (
            <p className="text-xs text-red-600 mt-1 font-medium">Password must be at least 8 characters</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role *</label>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as AppRole })} className={inp}>
            {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <p className="text-xs text-gray-500 mt-1.5 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{ROLE_DESCRIPTIONS[form.role]}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-3.5 py-2.5 font-medium">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
          <button onClick={handleCreate} disabled={creating} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition disabled:opacity-50">
            {creating ? <><Loader size={14} className="animate-spin" /> Creating...</> : 'Create User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
