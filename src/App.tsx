import { useState, useEffect, Component, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Menu, XCircle } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import { UserProvider, useUser } from './lib/UserContext';
import { ToastProvider } from './lib/toast';
import Sidebar from './components/Sidebar';
import InstallPrompt from './components/InstallPrompt';
import { OpenNavContext } from './lib/mobileNav';
import Login from './pages/Login';
import GlobalDashboard from './pages/GlobalDashboard';
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
import TreatmentChemicals from './pages/TreatmentChemicals';
import SheqDashboard from './pages/SheqDashboard';
import SafetyIncidents from './pages/SafetyIncidents';
import Spillages from './pages/Spillages';
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
import MaintenanceWorkOrders from './pages/MaintenanceWorkOrders';
import MaintenanceAssets from './pages/MaintenanceAssets';
import MaintenanceParts from './pages/MaintenanceParts';
import PlantOverview from './pages/PlantOverview';
import AdminUsers from './pages/AdminUsers';
import DocumentLibrary from './pages/DocumentLibrary';
import ComplianceExpiry from './pages/ComplianceExpiry';
import AppointmentsRegister from './pages/EmployeeRegister/AppointmentsRegister';
import Organogram from './pages/EmployeeRegister/Organogram';
import VehicleRegister from './pages/Logistics/VehicleRegister';
import DriverCompliance from './pages/Logistics/DriverCompliance';
import WasteOnFloor from './pages/TreatmentWasteOnFloor';
import OperatorShiftEntry from './pages/OperatorShiftEntry';
import StockOrders from './pages/StockOrders';
import StockReceived from './pages/StockReceived';
import UploadReceivedWaste from './pages/Commercial/UploadReceivedWaste';
import ImportHistory from './pages/Commercial/ImportHistory';
import ImportErrorReview from './pages/Commercial/ImportErrorReview';
import ClientManagement from './pages/Commercial/ClientManagement';
import ClientView from './pages/Commercial/ClientView';
import SupplierManagement from './pages/Commercial/SupplierManagement';
import SupplierView from './pages/Commercial/SupplierView';
import SupplierOrderHistory from './pages/Commercial/SupplierOrderHistory';
import SupplierPriceList from './pages/Commercial/SupplierPriceList';
import SiteManagement from './pages/Commercial/SiteManagement';
import SiteView from './pages/Commercial/SiteView';
import EsgSetup from './pages/Commercial/EsgSetup';
import EsgFactors from './pages/Commercial/EsgFactors';
import EsgOperational from './pages/Commercial/EsgOperational';
import EsgRecalculate from './pages/Commercial/EsgRecalculate';
import EsgCreditEvidence from './pages/Commercial/EsgCreditEvidence';
import ContactList from './pages/Commercial/ContactList';
import ContactView from './pages/Commercial/ContactView';
import ActivityList from './pages/Commercial/ActivityList';
import UserAccessList from './pages/Commercial/UserAccessList';
import CommercialDashboard from './pages/Commercial/CommercialDashboard';
import CommercialReports from './pages/Commercial/CommercialReports';
import PortalDataAudit from './pages/Commercial/PortalDataAudit';
import GlobalSearch from './components/crm/GlobalSearch';
import PortalShell from './pages/Portal/PortalShell';

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error('Page error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-500" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-6">An unexpected error occurred on this page. Your data is safe.</p>
            <button
              onClick={() => this.setState({ error: null })}
              className="px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRedirect() {
  const { isOperator, isStockController, isLogisticsManager, isReceivingOfficer, isCustomer, loading } = useUser();
  if (loading) return null;
  if (isCustomer) return <Navigate to="/portal/dashboard" replace />;
  if (isOperator) return <Navigate to="/shift-report" replace />;
  if (isStockController) return <Navigate to="/stock/master-list" replace />;
  if (isLogisticsManager) return <Navigate to="/logistics/vehicles" replace />;
  if (isReceivingOfficer) return <Navigate to="/safety/spillages" replace />;
  return <GlobalDashboard />;
}

function StockControllerGuard({ children }: { children: ReactNode }) {
  const { isAdmin, isStockController, isLogisticsManager, isReceivingOfficer, loading } = useUser();
  const location = useLocation();
  if (loading) return null;
  if (isStockController && !location.pathname.startsWith('/stock')) {
    return <Navigate to="/stock/master-list" replace />;
  }
  if (isLogisticsManager && !location.pathname.startsWith('/logistics')) {
    return <Navigate to="/logistics/vehicles" replace />;
  }
  // Receiving officers are scoped to the Spillage register for now.
  if (isReceivingOfficer && !location.pathname.startsWith('/safety/spillages')) {
    return <Navigate to="/safety/spillages" replace />;
  }
  if (!isAdmin && location.pathname.startsWith('/commercial')) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

const ROUTE_LABELS: Record<string, string> = {
  '/': 'Dashboard',
  '/shift-report': 'Shift Report',
  '/stock/master-list': 'Master List',
  '/stock/orders': 'Orders & Deliveries',
  '/stock/received': 'Stock Received',
  '/stock/movements': 'Movements',
  '/stock/stock-take': 'Stock Take',
  '/stock/day-end': 'Day-End Report',
  '/stock/reports': 'Reports',
  '/stock/settings': 'Stock Categories',
  '/commercial/dashboard': 'Commercial Dashboard',
  '/commercial/reports': 'Reports',
  '/commercial/audit': 'Portal Data Audit',
  '/commercial/upload': 'Upload Received Waste',
  '/commercial/imports': 'Import History',
  '/commercial/import-errors': 'Import Errors',
  '/commercial/clients': 'Accounts',
  '/commercial/suppliers': 'Suppliers',
  '/commercial/suppliers/price-list': 'Price List',
  '/commercial/suppliers/history': 'Order History',
  '/commercial/contacts': 'Contacts',
  '/commercial/activities': 'Activities',
  '/commercial/users': 'Users & Access',
  '/commercial/sites': 'Sites',
  '/commercial/esg': 'ESG Setup',
  '/commercial/esg/factors': 'ESG Factors',
  '/commercial/esg/operational': 'ESG Operational Data',
  '/commercial/esg/recalculate': 'ESG Recalculate',
  '/commercial/esg/credits': 'Carbon Credit Evidence',
  '/treatment': 'Treatment Plant',
  '/treatment/daily-log': 'Daily Log',
  '/treatment/transfers': 'Transfers',
  '/treatment/waste-on-floor': 'Waste on Floor',
  '/treatment/chemicals': 'Chemicals',
  '/safety': 'Health & Safety',
  '/safety/incidents': 'Incidents',
  '/safety/spillages': 'Spillages',
  '/safety/inspections': 'Inspections',
  '/safety/risk-assessments': 'Risk Assessments',
  '/safety/corrective-actions': 'Corrective Actions',
  '/safety/toolbox-talks': 'Toolbox Talks',
  '/safety/drills': 'Emergency Drills',
  '/training': 'Training',
  '/training/modules': 'Training Modules',
  '/training/courses': 'Course Register',
  '/training/records': 'Staff Records',
  '/training/schedule': 'Schedule',
  '/training/certificates': 'Certificates',
  '/maintenance/plant-overview': 'Plant Overview',
  '/maintenance/assets': 'Equipment Register',
  '/maintenance/parts': 'Spare Parts',
  '/maintenance/work-orders': 'Service History',
  '/logistics/vehicles': 'Vehicle Register',
  '/logistics/drivers': 'Driver Compliance',
  '/compliance': 'Compliance',
  '/documents': 'Document Library',
  '/documents/expiry-dashboard': 'Expiry Dashboard',
  '/employees': 'Employee Register',
  '/employees/appointments': 'Legal Appointments',
  '/employees/organogram': 'Organogram',
  '/admin/users': 'User Management',
  '/admin/settings': 'Settings',
};

function usePageLabel(): string {
  const { pathname } = useLocation();
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith('/documents/')) return 'Document Library';
  if (pathname.startsWith('/employees/')) return 'Employee Profile';
  if (pathname.startsWith('/training/modules/')) return 'Assessment';
  if (pathname.startsWith('/commercial/clients/')) return 'Account';
  if (pathname.startsWith('/commercial/suppliers/')) return 'Supplier';
  if (pathname.startsWith('/commercial/contacts/')) return 'Contact';
  if (pathname.startsWith('/commercial/sites/')) return 'Site';
  return 'Tech4Green';
}

function StaffShell({ session }: { session: Session }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageLabel = usePageLabel();
  const { isAdmin } = useUser();

  return (
    <OpenNavContext.Provider value={() => setMobileOpen(true)}>
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
            aria-label="Open navigation"
            className="text-gray-300 hover:text-white transition-colors"
          >
            <Menu size={22} />
          </button>
          <img src="/T4G_Small_Logo.png" alt="Tech4Green" className="w-7 h-7 rounded-lg object-contain" />
          <p className="text-sm font-bold text-white tracking-tight">{pageLabel}</p>
        </div>
      </div>

      {/* Desktop global search bar — fixed, admin-only */}
      {isAdmin && (
        <div className={`hidden lg:flex fixed top-0 right-0 z-40 h-14 items-center justify-center px-6 bg-gray-50/80 backdrop-blur border-b border-gray-200/70 transition-all duration-300 print:hidden ${sidebarCollapsed ? 'left-16' : 'left-64'}`}>
          <GlobalSearch />
        </div>
      )}

      <main
        className={`flex-1 min-w-0 overflow-x-hidden transition-all duration-300 print:ml-0 pt-14 lg:pt-0 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}
      >
        <div className={`min-h-screen p-3 sm:p-4 lg:px-6 lg:pb-6 max-w-screen-2xl mx-auto ${isAdmin ? 'lg:pt-[4.5rem]' : 'lg:pt-6'}`}>
          <ErrorBoundary>
          <StockControllerGuard>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            {/* Operator shift entry */}
            <Route path="/shift-report" element={<OperatorShiftEntry />} />

            {/* Stock Management */}
            <Route path="/stock" element={<Navigate to="/stock/master-list" replace />} />
            <Route path="/stock/master-list" element={<StockMasterList />} />
            <Route path="/stock/orders" element={<StockOrders />} />
            <Route path="/stock/received" element={<StockReceived />} />
            <Route path="/stock/day-end" element={<Navigate to="/stock/reports" replace />} />
            <Route path="/stock/movements" element={<StockMovements />} />
            <Route path="/stock/stock-take" element={<StockTake />} />
            <Route path="/stock/reports" element={<Reports />} />
            <Route path="/stock/settings" element={<Navigate to="/stock/master-list" replace />} />

            {/* Commercial — Received Waste */}
            <Route path="/commercial" element={<Navigate to="/commercial/dashboard" replace />} />
            <Route path="/commercial/dashboard" element={<CommercialDashboard />} />
            <Route path="/commercial/reports" element={<CommercialReports />} />
            <Route path="/commercial/audit" element={<PortalDataAudit />} />
            <Route path="/commercial/upload" element={<UploadReceivedWaste />} />
            <Route path="/commercial/imports" element={<ImportHistory />} />
            <Route path="/commercial/import-errors" element={<ImportErrorReview />} />
            <Route path="/commercial/clients" element={<ClientManagement />} />
            <Route path="/commercial/clients/:clientId" element={<ClientView />} />
            <Route path="/commercial/suppliers" element={<SupplierManagement />} />
            <Route path="/commercial/suppliers/price-list" element={<SupplierPriceList />} />
            <Route path="/commercial/suppliers/history" element={<SupplierOrderHistory />} />
            <Route path="/commercial/suppliers/:supplierId" element={<SupplierView />} />
            <Route path="/commercial/sites" element={<SiteManagement />} />
            <Route path="/commercial/sites/:siteId" element={<SiteView />} />
            <Route path="/commercial/esg" element={<EsgSetup />} />
            <Route path="/commercial/esg/factors" element={<EsgFactors />} />
            <Route path="/commercial/esg/operational" element={<EsgOperational />} />
            <Route path="/commercial/esg/recalculate" element={<EsgRecalculate />} />
            <Route path="/commercial/esg/credits" element={<EsgCreditEvidence />} />
            <Route path="/commercial/contacts" element={<ContactList />} />
            <Route path="/commercial/contacts/:contactId" element={<ContactView />} />
            <Route path="/commercial/activities" element={<ActivityList />} />
            <Route path="/commercial/users" element={<UserAccessList />} />

            {/* Treatment Plant */}
            <Route path="/treatment" element={<TreatmentDashboard />} />
            <Route path="/treatment/daily-log" element={<TreatmentDailyLog />} />
            <Route path="/treatment/transfers" element={<TreatmentTransfers />} />
            <Route path="/treatment/waste-on-floor" element={<WasteOnFloor />} />
            <Route path="/treatment/chemicals" element={<TreatmentChemicals />} />

            {/* Health & Safety */}
            <Route path="/safety" element={<SheqDashboard />} />
            <Route path="/safety/incidents" element={<SafetyIncidents />} />
            <Route path="/safety/spillages" element={<Spillages />} />
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
            <Route path="/maintenance" element={<Navigate to="/maintenance/plant-overview" replace />} />
            <Route path="/maintenance/plant-overview" element={<PlantOverview />} />
            <Route path="/maintenance/assets" element={<MaintenanceAssets />} />
            <Route path="/maintenance/parts" element={<MaintenanceParts />} />
            <Route path="/maintenance/work-orders" element={<MaintenanceWorkOrders />} />

            {/* Logistics */}
            <Route path="/logistics" element={<Navigate to="/logistics/vehicles" replace />} />
            <Route path="/logistics/vehicles" element={<VehicleRegister />} />
            <Route path="/logistics/drivers" element={<DriverCompliance />} />

            {/* Compliance (Coming Soon) */}
            <Route path="/compliance" element={<ComingSoon title="Compliance Overview" description="Unified compliance view across all modules -- SHEQ, training, treatment, and stock management." />} />

            {/* Documents */}
            <Route path="/documents" element={<DocumentLibrary />} />
            <Route path="/documents/expiry-dashboard" element={<ComplianceExpiry />} />
            <Route path="/documents/:category" element={<DocumentLibrary />} />

            {/* Employee Register */}
            <Route path="/employees" element={<EmployeeRegister />} />
            <Route path="/employees/organogram" element={<Organogram />} />
            <Route path="/employees/appointments" element={<AppointmentsRegister />} />
            <Route path="/employees/:id" element={<EmployeeProfile />} />

            {/* Admin */}
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/settings" element={<Settings />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </StockControllerGuard>
          </ErrorBoundary>
        </div>
      </main>
    </div>
    </OpenNavContext.Provider>
  );
}

function RoleShell({ session }: { session: Session }) {
  const { isCustomer, isAdmin, loading } = useUser();
  const { pathname } = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <svg className="animate-spin h-8 w-8 text-emerald-500" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }
  if (isCustomer) return <PortalShell session={session} />;
  // Admins can preview the customer portal as any client.
  if (isAdmin && pathname.startsWith('/portal')) return <PortalShell session={session} adminPreview />;
  return <StaffShell session={session} />;
}

function AuthenticatedLayout({ session }: { session: Session }) {
  return (
    <UserProvider session={session}>
      <ToastProvider>
        <RoleShell session={session} />
      </ToastProvider>
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
      <>
        <BrowserRouter>
          <Login />
        </BrowserRouter>
        <InstallPrompt />
      </>
    );
  }

  return (
    <>
      <BrowserRouter>
        <AuthenticatedLayout session={session} />
      </BrowserRouter>
      <InstallPrompt />
    </>
  );
}
