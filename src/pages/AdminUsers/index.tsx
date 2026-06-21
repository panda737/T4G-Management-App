import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Plus, Trash2, Search, Users,
  CheckCircle, XCircle, AlertTriangle, Loader, RefreshCw,
  ChevronUp, ChevronDown, Link2, Download, Pencil, Power,
} from 'lucide-react';
import { supabase, UserProfile, AppRole, ROLE_LABELS } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { downloadCSV } from '../../lib/csvExport';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';
import UserDetailModal from './UserDetailModal';

const ROLES: AppRole[] = ['admin', 'management', 'stock_controller', 'logistics_manager', 'production', 'operator', 'viewer', 'customer'];

const ROLE_DESCRIPTIONS: Record<AppRole, string> = {
  admin: 'Full access to everything including user management',
  management: 'Full access to all modules — cannot manage users',
  stock_controller: 'Write access to Stock Management only',
  logistics_manager: 'Write access to Logistics only',
  production: 'Write access to Treatment Plant only',
  operator: 'Treatment Plant shift entry only',
  viewer: 'Read-only access across all modules',
  customer: 'Customer portal only — sees their own received-waste data',
};

const ROLE_BADGE: Record<AppRole, string> = {
  admin: 'bg-orange-500 text-white',
  management: 'bg-teal-600 text-white',
  stock_controller: 'bg-emerald-600 text-white',
  logistics_manager: 'bg-slate-600 text-white',
  production: 'bg-cyan-600 text-white',
  operator: 'bg-indigo-600 text-white',
  viewer: 'bg-gray-500 text-white',
  customer: 'bg-blue-600 text-white',
};

const ROLE_DOT: Record<AppRole, string> = {
  admin: 'bg-orange-400',
  management: 'bg-teal-500',
  stock_controller: 'bg-emerald-500',
  logistics_manager: 'bg-slate-500',
  production: 'bg-cyan-500',
  operator: 'bg-indigo-500',
  viewer: 'bg-gray-400',
  customer: 'bg-blue-500',
};

const ROLE_AVATAR: Record<AppRole, string> = {
  admin: 'bg-orange-100 text-orange-700',
  management: 'bg-teal-100 text-teal-700',
  stock_controller: 'bg-emerald-100 text-emerald-700',
  logistics_manager: 'bg-slate-100 text-slate-700',
  production: 'bg-cyan-100 text-cyan-700',
  operator: 'bg-indigo-100 text-indigo-700',
  viewer: 'bg-gray-100 text-gray-600',
  customer: 'bg-blue-100 text-blue-700',
};

type SortKey = 'display_name' | 'role' | 'is_active' | 'created_at';

export default function AdminUsers() {
  usePageTitle('Admin — Users');
  const { profile: myProfile, isAdmin } = useUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [emailMap, setEmailMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | ''>('');
  const [sortKey, setSortKey] = useState<SortKey>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showCreate, setShowCreate] = useState(false);
  const { addToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ user: UserProfile; label: string } | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [viewUser, setViewUser] = useState<UserProfile | null>(null);
  const [opError, setOpError] = useState('');
  const [refOpen, setRefOpen] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [{ data: profiles }, { data: emailRows }] = await Promise.all([
      supabase.from('user_profiles')
        .select('id, auth_user_id, display_name, role, is_active, employee_id, created_by, created_at, updated_at')
        .order('created_at'),
      supabase.rpc('get_auth_user_emails'),
    ]);
    setUsers((profiles ?? []) as UserProfile[]);
    setEmailMap(new Map((emailRows ?? []).map((r: { auth_user_id: string; email: string }) => [r.auth_user_id, r.email])));
    setLoading(false);
  }

  async function handleToggleActive(user: UserProfile) {
    if (user.auth_user_id === myProfile?.auth_user_id) return;
    setOpError('');
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active: !user.is_active, updated_at: new Date().toISOString() })
      .eq('id', user.id);
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
    setViewUser(null);
    addToast('User deleted');
    load();
  }

  const filtered = useMemo(() => {
    const list = users.filter(u => {
      if (roleFilter && u.role !== roleFilter) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return u.display_name.toLowerCase().includes(q)
        || u.role.toLowerCase().includes(q)
        || (emailMap.get(u.auth_user_id) ?? '').toLowerCase().includes(q);
    });
    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'display_name') return dir * a.display_name.localeCompare(b.display_name);
      if (sortKey === 'role') return dir * a.role.localeCompare(b.role);
      if (sortKey === 'is_active') return dir * (Number(a.is_active) - Number(b.is_active));
      return dir * (a.created_at < b.created_at ? -1 : 1);
    });
  }, [users, search, emailMap, roleFilter, sortKey, sortDir]);

  const stats = {
    total: users.length,
    active: users.filter(u => u.is_active).length,
    admins: users.filter(u => u.role === 'admin').length,
  };

  function handleSort(sk: SortKey) {
    if (sortKey === sk) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(sk); setSortDir('asc'); }
  }

  function SortIcon({ sk }: { sk: SortKey }) {
    if (sortKey !== sk) return <span className="inline-block w-3" />;
    return sortDir === 'asc'
      ? <ChevronUp size={12} className="inline ml-1" />
      : <ChevronDown size={12} className="inline ml-1" />;
  }

  function handleExport() {
    const rows = filtered.map(u => ({
      'Display Name': u.display_name,
      'Email': emailMap.get(u.auth_user_id) ?? '',
      'Role': ROLE_LABELS[u.role],
      'Status': u.is_active ? 'Active' : 'Inactive',
      'Employee Linked': u.employee_id ? 'Yes' : 'No',
      'Created': new Date(u.created_at).toLocaleDateString('en-ZA'),
    }));
    downloadCSV(rows, 'users');
  }

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
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

  const stat = [
    { icon: Users, color: 'text-gray-500', label: 'Total Users', value: stats.total, bold: 'text-gray-900' },
    { icon: CheckCircle, color: 'text-emerald-500', label: 'Active', value: stats.active, bold: 'text-emerald-600' },
    { icon: Shield, color: 'text-orange-500', label: 'Administrators', value: stats.admins, bold: 'text-orange-500' },
  ];

  return (
    <div className="space-y-5">
      {opError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">
          {opError}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-1">Manage platform users and their access roles.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Refresh" className="p-2.5 text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={16} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition font-medium text-sm shadow-sm"
          >
            <Plus size={16} /> Create User
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex divide-x divide-gray-100">
        {stat.map(s => (
          <div key={s.label} className="flex-1 flex items-center gap-3 px-4 py-3">
            <s.icon className={`w-5 h-5 flex-shrink-0 ${s.color}`} />
            <div className="min-w-0">
              <p className={`text-xl font-bold leading-none ${s.bold}`}>{s.value}</p>
              <p className="text-xs text-gray-500 font-medium mt-1 truncate">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsible role reference */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setRefOpen(o => !o)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition"
        >
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Role permissions reference</span>
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${refOpen ? 'rotate-180' : ''}`} />
        </button>
        {refOpen && (
          <div className="px-4 pb-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ROLES.map(r => (
              <div key={r} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ROLE_DOT[r]}`} />
                  <span className={`inline-flex items-center whitespace-nowrap px-2 py-0.5 rounded text-xs font-bold ${ROLE_BADGE[r]}`}>{ROLE_LABELS[r]}</span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">{ROLE_DESCRIPTIONS[r]}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search + Filter + Export */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value as AppRole | '')}
          className="bg-white border border-gray-300 rounded-lg text-sm text-gray-900 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        >
          <option value="">All Roles</option>
          {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
        <button
          onClick={handleExport}
          disabled={filtered.length === 0}
          title="Export CSV"
          className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
        >
          <Download size={15} />
          <span className="hidden sm:inline">Export</span>
        </button>
      </div>

      {/* Desktop Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto hidden md:block">
        {loading ? (
          <div className="p-16 text-center"><Loader className="w-6 h-6 text-gray-400 animate-spin mx-auto" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center"><Users className="w-12 h-12 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-medium">No users found</p></div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-800">
                <th
                  onClick={() => handleSort('display_name')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                >
                  Name <SortIcon sk="display_name" />
                </th>
                <th
                  onClick={() => handleSort('role')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                >
                  Role <SortIcon sk="role" />
                </th>
                <th
                  onClick={() => handleSort('is_active')}
                  className="px-4 py-3 text-center text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                >
                  Status <SortIcon sk="is_active" />
                </th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wider cursor-pointer select-none hover:text-white"
                >
                  Created <SortIcon sk="created_at" />
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(user => {
                const isMe = user.auth_user_id === myProfile?.auth_user_id;
                return (
                  <tr
                    key={user.id}
                    onClick={() => setViewUser(user)}
                    className={`cursor-pointer transition-colors ${!user.is_active ? 'bg-gray-50 opacity-60' : 'hover:bg-indigo-50/30'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_AVATAR[user.role]}`}>
                          {user.display_name[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name}</p>
                            {isMe && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">you</span>}
                            {user.employee_id && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-medium">
                                <Link2 size={9} /> Linked
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 truncate">{emailMap.get(user.auth_user_id) ?? '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded text-xs font-bold ${ROLE_BADGE[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full whitespace-nowrap">
                          <CheckCircle size={11} /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full whitespace-nowrap">
                          <XCircle size={11} /> Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 font-medium whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString('en-ZA')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {!isMe ? (
                          <>
                            <button
                              onClick={e => { e.stopPropagation(); setEditingUser(user); }}
                              title="Edit"
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleToggleActive(user); }}
                              title={user.is_active ? 'Deactivate' : 'Activate'}
                              className={`p-1.5 rounded-lg transition ${user.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              <Power size={15} />
                            </button>
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(user); }}
                              disabled={deletingId === user.id}
                              title="Delete"
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            >
                              {deletingId === user.id ? <Loader size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          </>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-medium text-gray-400 bg-gray-100 rounded-lg">Protected</span>
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
                <div
                  key={user.id}
                  onClick={() => setViewUser(user)}
                  className={`p-4 cursor-pointer ${!user.is_active ? 'bg-gray-50 opacity-60' : 'active:bg-indigo-50/30'}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${ROLE_AVATAR[user.role]}`}>
                      {user.display_name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user.display_name}</p>
                      <p className="text-xs text-gray-400 truncate">{emailMap.get(user.auth_user_id) ?? '—'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isMe && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">you</span>}
                        {user.employee_id && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded font-medium">
                            <Link2 size={9} /> Linked
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-3 flex-wrap">
                    <span className={`inline-flex items-center whitespace-nowrap px-2.5 py-1 rounded text-xs font-bold ${ROLE_BADGE[user.role]}`}>{ROLE_LABELS[user.role]}</span>
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full"><CheckCircle size={11} /> Active</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-200 text-gray-500 text-xs font-semibold rounded-full"><XCircle size={11} /> Inactive</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 font-medium mb-3">Created {new Date(user.created_at).toLocaleDateString('en-ZA')}</p>
                  <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                    {!isMe ? (
                      <>
                        <button onClick={() => setEditingUser(user)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"><Pencil size={13} /> Edit</button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${user.is_active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                        >
                          <Power size={13} /> {user.is_active ? 'Deactivate' : 'Activate'}
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

      <div className="flex items-start gap-2 text-xs text-gray-400">
        <AlertTriangle size={13} className="mt-0.5 flex-shrink-0 text-amber-400" />
        <p>User credentials are managed securely via encrypted Supabase authentication. Passwords are never stored in plain text. Your own account cannot be deleted or deactivated.</p>
      </div>

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); addToast('User created'); load(); }}
        />
      )}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={() => { setEditingUser(null); addToast('User updated'); load(); }}
        />
      )}
      {viewUser && (
        <UserDetailModal
          user={viewUser}
          emailMap={emailMap}
          isMe={viewUser.auth_user_id === myProfile?.auth_user_id}
          onClose={() => setViewUser(null)}
          onEdit={u => { setViewUser(null); setEditingUser(u); }}
          onToggleActive={u => { setViewUser(null); handleToggleActive(u); }}
          onDelete={u => { setViewUser(null); handleDelete(u); }}
        />
      )}
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
