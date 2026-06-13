import { useEffect, useState } from 'react';
import { Pencil, Trash2, KeyRound, CheckCircle, XCircle, Loader } from 'lucide-react';
import { supabase, UserProfile, AppRole, ROLE_LABELS } from '../../lib/supabase';
import Modal from '../../components/Modal';

const ROLE_BADGE: Record<AppRole, string> = {
  admin: 'bg-orange-500 text-white',
  management: 'bg-teal-600 text-white',
  stock_controller: 'bg-emerald-600 text-white',
  production: 'bg-cyan-600 text-white',
  operator: 'bg-indigo-600 text-white',
  viewer: 'bg-gray-500 text-white',
  customer: 'bg-blue-600 text-white',
};

function formatDate(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface Props {
  user: UserProfile;
  emailMap: Map<string, string>;
  isMe: boolean;
  onClose: () => void;
  onEdit: (user: UserProfile) => void;
  onToggleActive: (user: UserProfile) => void;
  onDelete: (user: UserProfile) => void;
}

export default function UserDetailModal({ user, emailMap, isMe, onClose, onEdit, onToggleActive, onDelete }: Props) {
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  useEffect(() => {
    async function load() {
      setLoading(true);
      const fetches: Promise<void>[] = [];

      if (user.employee_id) {
        fetches.push(
          supabase.from('employees').select('first_name, surname').eq('id', user.employee_id).maybeSingle()
            .then(({ data }) => { if (data) setEmployeeName(`${data.first_name} ${data.surname}`); })
        );
      }

      if (user.created_by) {
        fetches.push(
          supabase.from('user_profiles').select('display_name').eq('auth_user_id', user.created_by).maybeSingle()
            .then(({ data }) => { if (data) setCreatorName(data.display_name); })
        );
      }

      await Promise.all(fetches);
      setLoading(false);
    }
    load();
  }, [user.id]);

  async function handlePasswordReset() {
    setResetError('');
    setResetLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const email = emailMap.get(user.auth_user_id);
      if (!email) { setResetError('Email address not found.'); return; }

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-user-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ target_email: email }),
        }
      );
      const result = await res.json();
      if (!res.ok || result.error) { setResetError(result.error ?? 'Failed to send reset email.'); return; }
      setResetSent(true);
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }

  const email = emailMap.get(user.auth_user_id) ?? '—';

  return (
    <Modal title={user.display_name} onClose={onClose} size="md" accent="indigo">
      <div className="space-y-5">
        {/* Role + Status */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className={`px-2.5 py-1 rounded text-xs font-bold ${ROLE_BADGE[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
          {user.is_active ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
              <CheckCircle size={11} /> Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full">
              <XCircle size={11} /> Inactive
            </span>
          )}
        </div>

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-gray-100 pt-4">
          <div className="col-span-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Email</p>
            <p className="text-sm text-gray-700 break-all">{email}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Linked Employee</p>
            {loading
              ? <span className="text-sm text-gray-400">...</span>
              : <p className="text-sm text-gray-700">{employeeName ?? '— Not linked —'}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Created By</p>
            {loading
              ? <span className="text-sm text-gray-400">...</span>
              : <p className="text-sm text-gray-700">{creatorName ?? '—'}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Created</p>
            <p className="text-sm text-gray-700">{formatDate(user.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Modified</p>
            <p className="text-sm text-gray-700">{formatDate(user.updated_at)}</p>
          </div>
        </div>

        {/* Password reset */}
        {!isMe && user.is_active && (
          <div className="border-t border-gray-100 pt-4">
            {resetSent ? (
              <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle size={14} /> Reset email sent to {email}
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Password Reset</p>
                  <p className="text-xs text-gray-400">Send a reset link to the user's email</p>
                </div>
                <button
                  onClick={handlePasswordReset}
                  disabled={resetLoading}
                  className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                >
                  {resetLoading ? <Loader size={12} className="animate-spin" /> : <KeyRound size={12} />}
                  Send Reset Email
                </button>
              </div>
            )}
            {resetError && <p className="text-xs text-red-600 mt-2">{resetError}</p>}
          </div>
        )}

        {/* Actions */}
        {!isMe && (
          <div className="flex gap-2 border-t border-gray-100 pt-4">
            <button
              onClick={() => onEdit(user)}
              className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition"
            >
              <Pencil size={12} /> Edit
            </button>
            <button
              onClick={() => onToggleActive(user)}
              className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition ${user.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
            >
              {user.is_active ? <XCircle size={12} /> : <CheckCircle size={12} />}
              {user.is_active ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={() => onDelete(user)}
              className="ml-auto flex items-center gap-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 px-2.5 py-1.5 rounded-lg transition"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
