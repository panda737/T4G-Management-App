import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Package,
  Settings, Menu, X, LogOut, ChevronDown, Users, Factory,
  ShieldAlert, GraduationCap, CheckSquare, UserCog, Wrench,
  FileText, TrendingUp, Truck,
} from 'lucide-react';
import { useUser } from '../lib/UserContext';
import { supabase, ROLE_LABELS, ROLE_COLORS } from '../lib/supabase';

interface ModuleGroup {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  items: { path: string; label: string; soon?: boolean; adminOnly?: boolean; match?: string[] }[];
}

const moduleGroups: ModuleGroup[] = [
  {
    id: 'treatment',
    label: 'Treatment Plant',
    icon: Factory,
    color: 'text-cyan-400',
    items: [
      { path: '/treatment', label: 'Plant Dashboard' },
      { path: '/treatment/daily-log', label: 'Daily Log' },
      { path: '/treatment/transfers', label: 'Transfers' },
      { path: '/treatment/waste-on-floor', label: 'Waste on Floor' },
    ],
  },
  {
    id: 'commercial',
    label: 'Commercial',
    icon: TrendingUp,
    color: 'text-indigo-400',
    items: [
      { path: '/commercial/dashboard', label: 'Dashboard', match: ['/commercial/dashboard', '/commercial/upload', '/commercial/imports', '/commercial/import-errors'] },
      { path: '/commercial/clients', label: 'Clients', match: ['/commercial/clients', '/commercial/sites', '/commercial/contacts', '/commercial/activities', '/commercial/users'] },
      { path: '/commercial/suppliers', label: 'Suppliers', match: ['/commercial/suppliers'] },
      { path: '/commercial/reports', label: 'Reports', match: ['/commercial/reports'] },
      { path: '/commercial/esg', label: 'ESG Engine', match: ['/commercial/esg'] },
      { path: '/commercial/audit', label: 'Portal Data Audit', match: ['/commercial/audit'] },
      { path: '/portal/dashboard', label: 'Portal Preview', match: ['/portal'] },
    ],
  },
  {
    id: 'stock',
    label: 'Stock Management',
    icon: Package,
    color: 'text-emerald-400',
    items: [
      { path: '/stock/master-list', label: 'Master List' },
      { path: '/stock/orders', label: 'Orders & Deliveries' },
      { path: '/stock/received', label: 'Stock Received' },
      { path: '/stock/movements', label: 'Movements' },
      { path: '/stock/stock-take', label: 'Stock Take' },
      { path: '/stock/reports', label: 'Reports' },
    ],
  },
  {
    id: 'safety',
    label: 'Health & Safety',
    icon: ShieldAlert,
    color: 'text-amber-400',
    items: [
      { path: '/safety', label: 'SHEQ Dashboard' },
      { path: '/safety/incidents', label: 'Incidents' },
      { path: '/safety/spillages', label: 'Spillages' },
      { path: '/safety/inspections', label: 'Inspections' },
      { path: '/safety/risk-assessments', label: 'Risk Assessments' },
      { path: '/safety/corrective-actions', label: 'Corrective Actions' },
      { path: '/safety/toolbox-talks', label: 'Toolbox Talks' },
      { path: '/safety/drills', label: 'Emergency Drills' },
    ],
  },
  {
    id: 'training',
    label: 'Training',
    icon: GraduationCap,
    color: 'text-sky-400',
    items: [
      { path: '/training', label: 'Training Dashboard' },
      { path: '/training/modules', label: 'Training Modules' },
      { path: '/training/courses', label: 'Course Register' },
      { path: '/training/records', label: 'Staff Records' },
      { path: '/training/schedule', label: 'Schedule' },
      { path: '/training/certificates', label: 'Certificates' },
    ],
  },
  {
    id: 'maintenance',
    label: 'Maintenance',
    icon: Wrench,
    color: 'text-orange-400',
    items: [
      { path: '/maintenance/plant-overview', label: 'Plant Overview' },
      { path: '/maintenance/assets', label: 'Equipment Register' },
      { path: '/maintenance/parts', label: 'Spare Parts' },
      { path: '/maintenance/work-orders', label: 'Service History' },
    ],
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: CheckSquare,
    color: 'text-teal-400',
    items: [
      { path: '/compliance', label: 'Compliance Overview', soon: true },
    ],
  },
  {
    id: 'documents',
    label: 'Documents',
    icon: FileText,
    color: 'text-violet-400',
    items: [
      { path: '/documents/sops',               label: 'SOPs' },
      { path: '/documents/policies',            label: 'Policies' },
      { path: '/documents/risk-assessments',    label: 'Risk Assessments' },
      { path: '/documents/licences-permits',    label: 'Licences & Permits' },
      { path: '/documents/templates',           label: 'Templates' },
      { path: '/documents/company',             label: 'Company & Compliance', adminOnly: true },
      { path: '/documents/expiry-dashboard',    label: 'Expiry Dashboard', adminOnly: true },
      { path: '/documents/archived',            label: 'Archived Documents' },
    ],
  },
  {
    id: 'logistics',
    label: 'Logistics',
    icon: Truck,
    color: 'text-slate-400',
    items: [
      { path: '/logistics/vehicles', label: 'Vehicle Register' },
      { path: '/logistics/drivers', label: 'Driver Compliance' },
    ],
  },
  {
    id: 'employees',
    label: 'Staff',
    icon: Users,
    color: 'text-rose-400',
    items: [
      { path: '/employees', label: 'Employee Register' },
      { path: '/employees/appointments', label: 'Legal Appointments' },
      { path: '/employees/organogram', label: 'Organogram' },
    ],
  },
];

const adminItems = [
  { path: '/admin/users', label: 'User Management', icon: UserCog },
  { path: '/admin/settings', label: 'System Settings', icon: Settings },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  userEmail?: string;
  onSignOut: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose, userEmail, onSignOut }: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, profile, isStockController, isLogisticsManager } = useUser();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const activeGroup = moduleGroups.find(g =>
      g.items.some(item => location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
    );
    return new Set(activeGroup ? [activeGroup.id] : []);
  });

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  function toggleGroup(groupId: string) {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  function handleNavigate(path: string) {
    navigate(path);
    onMobileClose();
  }

  function isActive(path: string) {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  }

  // An item is active for its own path, or any of its grouped `match` paths
  // (covers in-page tabs whose URLs don't share the item's prefix).
  function isItemActive(item: ModuleGroup['items'][number]) {
    if (location.pathname === item.path) return true;
    // Employee Register stays highlighted on employee profile pages (/employees/:id),
    // but NOT on sibling Staff sub-routes that have their own sidebar items.
    if (item.path === '/employees'
      && location.pathname.startsWith('/employees/')
      && !location.pathname.startsWith('/employees/appointments')
      && !location.pathname.startsWith('/employees/organogram')) return true;
    if (item.match) return item.match.some(m => location.pathname === m || location.pathname.startsWith(m + '/'));
    return false;
  }

  function isGroupActive(group: ModuleGroup) {
    return group.items.some(item => isItemActive(item) || location.pathname.startsWith(item.path + '/'));
  }

  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';
  const isReceivingOfficer = role === 'receiving_officer';

  useEffect(() => {
    if (isOperator) setExpandedGroups(new Set(['treatment', 'safety']));
  }, [isOperator]);

  useEffect(() => {
    if (isStockController) setExpandedGroups(new Set(['stock']));
  }, [isStockController]);

  useEffect(() => {
    if (isLogisticsManager) setExpandedGroups(new Set(['logistics']));
  }, [isLogisticsManager]);

  // Show the user's full name (name + surname) from their linked employee record,
  // falling back to the profile display name / email.
  const [employeeName, setEmployeeName] = useState<string | null>(null);
  useEffect(() => {
    const empId = profile?.employee_id;
    if (!empId) { setEmployeeName(null); return; }
    let active = true;
    supabase
      .from('employees')
      .select('first_name, surname')
      .eq('id', empId)
      .maybeSingle()
      .then(({ data }) => {
        if (active && data) setEmployeeName(`${data.first_name} ${data.surname}`.trim());
      });
    return () => { active = false; };
  }, [profile?.employee_id]);

  const displayName = employeeName ?? profile?.display_name ?? userEmail ?? 'User';
  const roleLabel = role ? ROLE_LABELS[role] : 'Loading...';
  const roleColor = role ? ROLE_COLORS[role] : 'bg-gray-500/20 text-gray-400';

  const rawVisibleGroups: ModuleGroup[] = isOperator
    ? [
        {
          id: 'treatment',
          label: 'Treatment Plant',
          icon: Factory,
          color: 'text-cyan-400',
          items: [
            { path: '/treatment', label: 'Plant Dashboard' },
            { path: '/shift-report', label: 'Add Shift Record' },
          ],
        },
        {
          id: 'safety',
          label: 'Health & Safety',
          icon: ShieldAlert,
          color: 'text-amber-400',
          items: [
            { path: '/safety/spillages', label: 'Spillages' },
            { path: '/safety/toolbox-talks', label: 'Toolbox Talks' },
          ],
        },
      ]
    : isReceivingOfficer
    ? [
        {
          id: 'safety',
          label: 'Health & Safety',
          icon: ShieldAlert,
          color: 'text-amber-400',
          items: [
            { path: '/safety/spillages', label: 'Spillages' },
          ],
        },
      ]
    : isStockController
      ? moduleGroups.filter(g => g.id === 'stock')
      : isLogisticsManager
        ? moduleGroups.filter(g => g.id === 'logistics')
        : moduleGroups.filter(g => {
            if (g.id === 'logistics') return isAdmin || role === 'management';
            if (g.id === 'commercial') return isAdmin;
            return true;
          });

  // Hide admin-only items (e.g. Company docs, Expiry Dashboard) from non-admins.
  const visibleGroups: ModuleGroup[] = rawVisibleGroups.map(g => ({
    ...g,
    items: g.items.filter(item => isAdmin || !item.adminOnly),
  }));

  const navContent = (isMobileDrawer: boolean) => {
    const showLabels = isMobileDrawer || !collapsed;

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700/50 min-h-[64px]">
          {showLabels ? (
            <div className="flex items-center gap-2.5">
              <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-8 h-8 rounded-lg flex-shrink-0 object-contain" />
              <div className="leading-tight">
                <p className="text-sm font-bold text-white tracking-tight">Tech4Green</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-medium">Management Platform</p>
              </div>
            </div>
          ) : (
            <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-7 h-7 rounded-lg mx-auto object-contain" />
          )}
          {isMobileDrawer ? (
            <button onClick={onMobileClose} aria-label="Close navigation" className="text-gray-400 hover:text-white transition-colors ml-auto">
              <X size={20} />
            </button>
          ) : (
            <button onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="text-gray-400 hover:text-white transition-colors ml-auto">
              {collapsed ? <Menu size={18} /> : <X size={18} />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
          {!isOperator && !isStockController && !isLogisticsManager && !isReceivingOfficer && (
            <>
              <button
                onClick={() => handleNavigate('/')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 group relative ${
                  isActive('/')
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                }`}
              >
                {isActive('/') && <span className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500 rounded-r" />}
                <LayoutDashboard size={18} className="flex-shrink-0" />
                {showLabels && <span className="font-medium">Dashboard</span>}
                {!showLabels && (
                  <span className="absolute left-16 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700">
                    Dashboard
                  </span>
                )}
              </button>
              <div className="mx-4 my-2 border-t border-gray-800" />
            </>
          )}

          {visibleGroups.map((group) => {
            const Icon = group.icon;
            const expanded = expandedGroups.has(group.id);
            const active = isGroupActive(group);

            return (
              <div key={group.id}>
                <button
                  onClick={() => {
                    if (!showLabels) {
                      handleNavigate(group.items[0].path);
                    } else {
                      toggleGroup(group.id);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 group relative ${
                    active && !showLabels
                      ? 'bg-gray-800 text-white'
                      : active
                      ? 'text-white'
                      : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                  }`}
                >
                  <Icon size={18} className={`flex-shrink-0 ${active ? group.color : ''}`} />
                  {showLabels && (
                    <>
                      <span className="font-medium flex-1 text-left">{group.label}</span>
                      <ChevronDown
                        size={14}
                        className={`transition-transform duration-200 text-gray-500 ${expanded ? 'rotate-180' : ''}`}
                      />
                    </>
                  )}
                  {!showLabels && (
                    <span className="absolute left-16 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700">
                      {group.label}
                    </span>
                  )}
                </button>

                {showLabels && expanded && (
                  <div className="overflow-hidden">
                    {group.items.map((item) => {
                      const itemActive = isItemActive(item);
                      return (
                      <button
                        key={item.path}
                        onClick={() => handleNavigate(item.path)}
                        className={`w-full flex items-center gap-2 pl-11 pr-4 py-2 text-[13px] transition-all duration-150 relative ${
                          itemActive
                            ? 'text-white bg-emerald-600/15'
                            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                        }`}
                      >
                        {itemActive && (
                          <span className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500 rounded-r" />
                        )}
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${itemActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
                        <span className={item.soon ? 'text-gray-500' : ''}>{item.label}</span>
                        {item.soon && <span className="ml-auto text-[10px] font-medium text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">Soon</span>}
                      </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {isAdmin && (
            <>
              <div className="mx-4 my-2 border-t border-gray-800" />
              {showLabels && (
                <p className="px-4 py-1 text-[10px] text-gray-500 uppercase tracking-widest font-semibold">Admin</p>
              )}
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 group relative ${
                      isActive(item.path)
                        ? 'bg-emerald-600/20 text-emerald-400'
                        : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'
                    }`}
                  >
                    {isActive(item.path) && <span className="absolute left-0 top-0 h-full w-[3px] bg-emerald-500 rounded-r" />}
                    <Icon size={18} className="flex-shrink-0" />
                    {showLabels && <span className="font-medium">{item.label}</span>}
                    {!showLabels && (
                      <span className="absolute left-16 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700">
                        {item.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </nav>

        {/* User / Sign-out footer */}
        <div className="border-t border-gray-700/50">
          {showLabels ? (
            <div className="px-4 py-3 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700/80 flex items-center justify-center flex-shrink-0 text-xs font-bold text-white uppercase">
                {displayName[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white font-medium truncate">{displayName}</p>
                <span className={`inline-block text-[10px] font-medium px-1.5 py-0.5 rounded ${roleColor}`}>
                  {roleLabel}
                </span>
              </div>
              <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="text-gray-400 hover:text-red-400 transition-colors flex-shrink-0">
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center py-3 group relative">
              <button onClick={onSignOut} title="Sign out" aria-label="Sign out" className="text-gray-400 hover:text-red-400 transition-colors">
                <LogOut size={16} />
              </button>
              <span className="absolute left-16 bg-gray-800 text-white text-xs px-2.5 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50 shadow-xl border border-gray-700">
                Sign out
              </span>
            </div>
          )}
        </div>
      </>
    );
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex fixed left-0 top-0 h-screen bg-gray-900 text-white flex-col transition-all duration-300 z-40 ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {navContent(false)}
      </aside>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onMobileClose} />
          <aside className="relative w-72 max-w-[85vw] h-full bg-gray-900 text-white flex flex-col shadow-2xl">
            {navContent(true)}
          </aside>
        </div>
      )}
    </>
  );
}
