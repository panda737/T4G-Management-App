import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Menu } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { UserProvider } from './lib/UserContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import GlobalDashboard from './pages/GlobalDashboard';
import Dashboard from './pages/Dashboard';
import StockMasterList from './pages/StockMasterList';
import StockMovements from './pages/StockMovements';
import StockTake from './pages/StockTake';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import EmployeeRegister from './pages/EmployeeRegister';
import EmployeeProfile from './pages/EmployeeRegister/EmployeeProfile';
import ComingSoon from './pages/ComingSoon';
import TreatmentDashboard from './pages/TreatmentDashboard';
import TreatmentDailyLog from './pages/TreatmentDailyLog';
import TreatmentTransfers from './pages/TreatmentTransfers';
import SheqDashboard from './pages/SheqDashboard';
import SafetyIncidents from './pages/SafetyIncidents';
import SafetyInspections from './pages/SafetyInspections';
import SafetyRiskAssessments from './pages/SafetyRiskAssessments';
import SafetyCorrectiveActions from './pages/SafetyCorrectiveActions';
import SafetyToolboxTalks from './pages/SafetyToolboxTalks';
import SafetyEmergencyDrills from './pages/SafetyEmergencyDrills';
import TrainingDashboard from './pages/TrainingDashboard';
import TrainingCourses from './pages/TrainingCourses';
import TrainingRecords from './pages/TrainingRecords';
import TrainingSchedule from './pages/TrainingSchedule';
import TrainingCertificates from './pages/TrainingCertificates';
import TrainingModules from './pages/TrainingModules';
import TrainingAssessment from './pages/TrainingAssessment';
import MaintenanceDashboard from './pages/MaintenanceDashboard';
import MaintenanceWorkOrders from './pages/MaintenanceWorkOrders';
import MaintenanceAssets from './pages/MaintenanceAssets';
import MaintenanceParts from './pages/MaintenanceParts';
import PlantOverview from './pages/PlantOverview';
import AdminUsers from './pages/AdminUsers';

function AuthenticatedLayout({ session }: { session: Session }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <UserProvider session={session}>
    <div className="min-h-screen bg-gray-50 flex">
      <div className="print:hidden">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(c => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          userEmail={session.user.email}
          onSignOut={() => supabase.auth.signOut()}
        />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 print:hidden">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-gray-300 hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>
          <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-7 h-7 rounded-lg object-contain" />
          <p className="text-sm font-bold text-white tracking-tight">Tech4Green</p>
        </div>
      </div>

      <main
        className={`flex-1 transition-all duration-300 print:ml-0 pt-14 lg:pt-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
      >
        <div className="min-h-screen p-3 sm:p-4 lg:p-6 max-w-screen-2xl mx-auto">
          <Routes>
            <Route path="/" element={<GlobalDashboard />} />

            {/* Stock Management */}
            <Route path="/stock" element={<Dashboard />} />
            <Route path="/stock/master-list" element={<StockMasterList />} />
            <Route path="/stock/movements" element={<StockMovements />} />
            <Route path="/stock/stock-take" element={<StockTake />} />
            <Route path="/stock/reports" element={<Reports />} />
            <Route path="/stock/settings" element={<Settings />} />

            {/* Treatment Plant */}
            <Route path="/treatment" element={<TreatmentDashboard />} />
            <Route path="/treatment/daily-log" element={<TreatmentDailyLog />} />
            <Route path="/treatment/transfers" element={<TreatmentTransfers />} />

            {/* Health & Safety */}
            <Route path="/safety" element={<SheqDashboard />} />
            <Route path="/safety/incidents" element={<SafetyIncidents />} />
            <Route path="/safety/inspections" element={<SafetyInspections />} />
            <Route path="/safety/risk-assessments" element={<SafetyRiskAssessments />} />
            <Route path="/safety/corrective-actions" element={<SafetyCorrectiveActions />} />
            <Route path="/safety/toolbox-talks" element={<SafetyToolboxTalks />} />
            <Route path="/safety/drills" element={<SafetyEmergencyDrills />} />

            {/* Training */}
            <Route path="/training" element={<TrainingDashboard />} />
            <Route path="/training/modules" element={<TrainingModules />} />
            <Route path="/training/modules/:moduleId/assess" element={<TrainingAssessment />} />
            <Route path="/training/courses" element={<TrainingCourses />} />
            <Route path="/training/records" element={<TrainingRecords />} />
            <Route path="/training/schedule" element={<TrainingSchedule />} />
            <Route path="/training/certificates" element={<TrainingCertificates />} />

            {/* Maintenance */}
            <Route path="/maintenance" element={<MaintenanceDashboard />} />
            <Route path="/maintenance/plant-overview" element={<PlantOverview />} />
            <Route path="/maintenance/assets" element={<MaintenanceAssets />} />
            <Route path="/maintenance/parts" element={<MaintenanceParts />} />
            <Route path="/maintenance/work-orders" element={<MaintenanceWorkOrders />} />

            {/* Compliance (Coming Soon) */}
            <Route path="/compliance" element={<ComingSoon title="Compliance Overview" description="Unified compliance view across all modules -- SHEQ, training, treatment, and stock management." />} />

            {/* Employee Register */}
            <Route path="/employees" element={<EmployeeRegister />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />

            {/* Admin */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<Settings />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
    </UserProvider>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (!session) {
    return (
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    );
  }

  return (
    <BrowserRouter>
      <AuthenticatedLayout session={session} />
    </BrowserRouter>
  );
}
