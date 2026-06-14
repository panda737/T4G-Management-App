import { useEffect, useMemo, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { LayoutDashboard, FileBarChart2, Building2, Recycle, FileText, Leaf, LogOut, Menu, X, Eye, ChevronDown } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import ReceivedWasteDashboard from './ReceivedWasteDashboard';
import MonthlyReport from './MonthlyReport';
import SiteBreakdown from './SiteBreakdown';
import CategoryBreakdown from './CategoryBreakdown';
import ManifestHistory from './ManifestHistory';
import EsgDashboard from './EsgDashboard';
import { PortalClientContext } from './PortalClientContext';

const NAV = [
  { to: '/portal/dashboard', label: 'Received Waste', icon: LayoutDashboard },
  { to: '/portal/report', label: 'Monthly Report', icon: FileBarChart2 },
  { to: '/portal/sites', label: 'Site Breakdown', icon: Building2 },
  { to: '/portal/categories', label: 'Waste Categories', icon: Recycle },
  { to: '/portal/manifests', label: 'Manifest History', icon: FileText },
  { to: '/portal/esg', label: 'ESG & Sustainability', icon: Leaf },
];

export default function PortalShell({ session, adminPreview = false }: { session: Session; adminPreview?: boolean }) {
  const { profile } = useUser();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [clients, setClients] = useState<{ id: string; client_name: string }[]>([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [sites, setSites] = useState<{ id: string; generator_facility: string }[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState(''); // '' = whole account

  useEffect(() => {
    if (!adminPreview) return;
    supabase.from('clients').select('id, client_name').order('client_name').then(({ data }) => {
      const list = (data ?? []) as { id: string; client_name: string }[];
      setClients(list);
      setSelectedClientId(prev => prev || searchParams.get('client') || list[0]?.id || '');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminPreview]);

  // Load the selected account's sites for the admin site switcher.
  useEffect(() => {
    if (!adminPreview || !selectedClientId) { setSites([]); return; }
    setSelectedSiteId('');
    supabase.from('client_sites').select('id, generator_facility').eq('client_id', selectedClientId).order('generator_facility')
      .then(({ data }) => setSites((data ?? []) as { id: string; generator_facility: string }[]));
  }, [adminPreview, selectedClientId]);

  const portalClient = useMemo(
    () => adminPreview
      ? { clientId: selectedClientId || null, siteId: selectedSiteId || null, siteScoped: !!selectedSiteId, adminPreview: true }
      : { clientId: null, siteId: null, siteScoped: !!profile?.site_id, adminPreview: false },
    [adminPreview, selectedClientId, selectedSiteId, profile?.site_id],
  );

  const selectedClientName = clients.find(c => c.id === selectedClientId)?.client_name;

  const nav = (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {NAV.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setMobileOpen(false)}
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
            isActive ? 'bg-emerald-600 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
          }`}
        >
          <Icon size={18} /> {label}
        </NavLink>
      ))}
    </nav>
  );

  const sidebarInner = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2.5">
          <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-8 h-8 rounded-lg object-contain" />
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{adminPreview ? 'Portal Preview' : 'Customer Portal'}</p>
            <p className="text-[11px] text-gray-400 truncate">{adminPreview ? (selectedClientName ?? 'Select a client') : (profile?.display_name || session.user.email)}</p>
          </div>
        </div>
      </div>
      {nav}
      <div className="px-3 py-4 border-t border-gray-800">
        {adminPreview ? (
          <button onClick={() => navigate('/commercial/dashboard')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <X size={18} /> Exit preview
          </button>
        ) : (
          <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
            <LogOut size={18} /> Sign out
          </button>
        )}
      </div>
    </div>
  );

  return (
    <PortalClientContext.Provider value={portalClient}>
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-gray-900 print:hidden">{sidebarInner}</aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-gray-900 z-50">
            <button onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>
            {sidebarInner}
          </aside>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => setMobileOpen(true)} aria-label="Open navigation" className="text-gray-300 hover:text-white"><Menu size={22} /></button>
          <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-7 h-7 rounded-lg object-contain" />
          <p className="text-sm font-bold text-white">Customer Portal</p>
        </div>
      </div>

      <main className="flex-1 min-w-0 overflow-x-hidden pt-14 lg:pt-0 lg:ml-64 print:ml-0">
        <div className="min-h-screen p-3 sm:p-4 lg:p-6 max-w-screen-2xl mx-auto">
          {adminPreview && (
            <div className="mb-4 flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 print:hidden">
              <Eye size={16} className="text-indigo-500 flex-shrink-0" />
              <span className="text-sm font-medium text-indigo-900">Admin preview — viewing portal as</span>
              <div className="relative">
                <select
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                  className="appearance-none bg-white border border-indigo-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {clients.length === 0 && <option value="">Loading…</option>}
                  {clients.map(c => <option key={c.id} value={c.id}>{c.client_name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
              </div>
              {sites.length > 0 && (
                <div className="relative">
                  <select
                    value={selectedSiteId}
                    onChange={e => setSelectedSiteId(e.target.value)}
                    className="appearance-none bg-white border border-indigo-200 rounded-lg pl-3 pr-8 py-1.5 text-sm font-medium text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Whole account</option>
                    {sites.map(s => <option key={s.id} value={s.id}>{s.generator_facility}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-400 pointer-events-none" />
                </div>
              )}
              <button onClick={() => navigate('/commercial/dashboard')} className="ml-auto text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                Exit preview
              </button>
            </div>
          )}
          <Routes>
            <Route path="/portal" element={<Navigate to="/portal/dashboard" replace />} />
            <Route path="/portal/dashboard" element={<ReceivedWasteDashboard />} />
            <Route path="/portal/report" element={<MonthlyReport />} />
            <Route path="/portal/sites" element={<SiteBreakdown />} />
            <Route path="/portal/categories" element={<CategoryBreakdown />} />
            <Route path="/portal/manifests" element={<ManifestHistory />} />
            <Route path="/portal/esg" element={<EsgDashboard />} />
            <Route path="*" element={<Navigate to="/portal/dashboard" replace />} />
          </Routes>
        </div>
      </main>
    </div>
    </PortalClientContext.Provider>
  );
}
