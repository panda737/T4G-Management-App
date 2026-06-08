import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Plus, Trash2, Search, Users, Eye, EyeOff,
  CheckCircle, XCircle, AlertTriangle, Loader, RefreshCw, UserCog,
} from 'lucide-react';
import { supabase, UserProfile, AppRole, ROLE_LABELS } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

// Reference section shows Operator instead of Production (operator is the active shift role)
const ROLES: AppRole[] = ['admin', 'management', 'stock_controller', 'operator', 'viewer'];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to everything including user management',
  management: 'Full access to all modules — cannot manage users',
  stock_controller: 'Write access to Stock Management only',
  production: 'Write access to Treatment Plant only',
  operator: 'Treatment Plant shift entry only',
  viewer: 'Read-only access across all modules',
};

const ROLE_BADGE: Record<AppRole, string> = {
  admin: 'bg-orange-500 text-white',
  management: 'bg-teal-600 text-white',
  stock_controller: 'bg-emerald-600 text-white',
  production: 'bg-cyan-600 text-white',
  operator: 'bg-indigo-600 text-white',
  viewer: 'bg-gray-500 text-white',
};

const ROLE_DOT: Record<AppRole, string> = {
  admin: 'bg-orange-400',
  management: 'bg-teal-500',
  stock_controller: 'bg-emerald-500',
  production: 'bg-cyan-500',
  operator: 'bg-indigo-500',
  viewer: 'bg-gray-400',
};

const ROLE_AVATAR: Record<AppRole, string> = {
  admin: 'bg-orange-100 text-orange-700',
  management: 'bg-teal-100 text-teal-700',
  stock_controller: 'bg-emerald-100 text-emerald-700',
  production: 'bg-cyan-100 text-cyan-700',
  operator: 'bg-indigo-100 text-indigo-700',
  viewer: 'bg-gray-100 text-gray-600',
};

export default function AdminUsers() {
  const { profile: myProfile, isAdmin } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const { addToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ user: UserProfile; label: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [opError, setOpError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: emailRows }] = await Promise.all([
      supabase.from('user_profiles').select('id, auth_user_id, display_name, role, is_active, created_at').order('created_at'),
      supabase.rpc('get_auth_user_emails'),
    ]);
    setUsers((profiles ?? []) as UserProfile[]);
    setEmailMap(new Map((emailRows ?? []).map((r: { auth_user_id: string; email: string }) => [r.auth_user_id, r.email])));
    setLoading(false);
  }

  async function handleToggleActive(user: UserProfile) {
    if (user.auth_user_id === myProfile?.auth_user_id) return;
    setOpError('');
    const { error } = await supabase.from('user_profiles').update({ is_active: !user.is_active, updated_at: new Date().toISOString() }).eq('id', user.id);
    if (error) { setOpError(error.message); return; }
    load();
  }

  function handleDelete(user: UserProfile) {
    if (user.auth_user_id === myProfile?.auth_user_id) return;
    setDeleteTarget({ user, label: user.display_name });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const { user } = deleteTarget;
    setDeletingId(user.id);
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ target_auth_user_id: user.auth_user_id }),
      }
    );
    setDeletingId(null);
    setDeleteTarget(null);
    addToast('User deleted');
    load();
  }

  const filtered = useMemo(() =>
    users.filter(u => {
      if (!search) return true;
      const q = search.toLowerCase();
      return u.display_name.toLowerCase().includes(q)
        || u.role.toLowerCase().includes(q)
        || (emailMap.get(u.auth_user_id) ?? '').toLowerCase().includes(q);
    }),
    [users, search, emailMap]
  );

  const stats = { total: users.length, active: users.filter(u => u.is_active).length, admins: users.filter(u => u.role === 'admin').length };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">Access Denied</h2>
          <p className="text-gray-500 text-sm mt-1">Only administrators can access user management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 mx-4 sm:mx-8 mt-4">{opError}</div>}
      <div className="bg-gray-900 px-4 py-4 sm:px-8 sm:py-6 mb-8">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <UserCog className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-gray-400 text-sm mt-0.5 hidden sm:block">Create and manage platform users and their access roles</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2.5 text-gray-400 hover:text-white border border-gray-700 rounded-lg hover:bg-gray-800 transition" title="Refresh">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm">
              <Plus size={18} /> <span className="hidden sm:inline">Create User</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-8 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Users, color: 'bg-gray-100 text-gray-600', label: 'Total Users', value: stats.total },
            { icon: CheckCircle, color: 'bg-emerald-100 text-emerald-600', label: 'Active', value: stats.active, bold: 'text-emerald-600' },
            { icon: Shield, color: 'bg-orange-100 text-orange-500', label: 'Administrators', value: stats.admins, bold: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${s.color.split(' ')[0]}`}>
                <s.icon className={`w-6 h-6 ${s.color.split(' ')[1]}`} />
              </div>
              <div>
                <p className={`text-3xl font-bold ${s.bold || 'text-gray-900'}`}>{s.value}</p>
                <p className="text-sm text-gray-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">Role Permissions Reference</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {ROLES.map(r => (
              <div key={r} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOT[r]}`} />
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${ROLE_BADGE[r]}`}>{ROLE_LABELS[r]}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or role..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm"
            />
          </div>
        </div>

        {/* Desktop Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hidden md:block">
          {loading ? (
            <div className="p-16 text-center"><Loader className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No users found</p></div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-800">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Name</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3.5 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider">Created</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(user => {
                  const isMe = user.auth_user_id === myProfile?.auth_user_id;
                  return (
                    <tr key={user.id} className={`transition-colors ${!user.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'}`}>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_AVATAR[user.role]}`}>
                            {user.display_name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.display_name}</p>
                            <p className="text-xs text-gray-400">{emailMap.get(user.auth_user_id) ?? '—'}</p>
                            {isMe && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">you</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2.5 py-1 rounded text-xs font-bold ${ROLE_BADGE[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        {user.is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                            <CheckCircle size={11} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full">
                            <XCircle size={11} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-500 font-medium">{new Date(user.created_at).toLocaleDateString('en-ZA')}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!isMe ? (
                            <>
                              <button onClick={() => setEditingUser(user)} className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Edit</button>
                              <button
                                onClick={() => handleToggleActive(user)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${user.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                              >
                                {user.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              <button
                                onClick={() => handleDelete(user)}
                                disabled={deletingId === user.id}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                              >
                                {deletingId === user.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                              </button>
                            </>
                          ) : (
                            <span className="px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg">Protected</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Cards */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden md:hidden">
          {loading ? (
            <div className="p-16 text-center"><Loader className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
          ) : filtered.length === 0 ? (
            <div className="p-16 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No users found</p></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(user => {
                const isMe = user.auth_user_id === myProfile?.auth_user_id;
                return (
                  <div key={user.id} className={`p-4 ${!user.is_active ? 'bg-gray-50 opacity-60' : ''}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_AVATAR[user.role]}`}>
                        {user.display_name[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name}</p>
                        <p className="text-xs text-gray-400 truncate">{emailMap.get(user.auth_user_id) ?? '—'}</p>
                        {isMe && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">you</span>}
                      </div>
                    </div>
                    <div className="flex gap-2 mb-3 flex-wrap">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${ROLE_BADGE[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full"><CheckCircle size={11} /> Active</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full"><XCircle size={11} /> Inactive</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mb-3">Created {new Date(user.created_at).toLocaleDateString('en-ZA')}</p>
                    <div className="flex gap-2">
                      {!isMe ? (
                        <>
                          <button onClick={() => setEditingUser(user)} className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition">Edit</button>
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition ${user.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                          >
                            {user.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="px-3 py-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                          >
                            {deletingId === user.id ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
                          </button>
                        </>
                      ) : (
                        <span className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg text-center">Protected</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-start gap-2 text-xs text-gray-400">
          <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
          <p>User credentials are managed securely via encrypted Supabase authentication. Passwords are never stored in plain text. Your own account cannot be deleted or deactivated.</p>
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onSave={() => { setShowCreate(false); addToast('User created'); load(); }} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={() => { setEditingUser(null); addToast('User updated'); load(); }} />}
      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          deleting={deletingId !== null}
        />
      )}
    </div>
  );
}
