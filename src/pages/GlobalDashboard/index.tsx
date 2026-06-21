import { useEffect, useState } from 'react';
import { Package, Factory, ShieldCheck, ShieldAlert, Users, RefreshCw } from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import DashboardError from '../../components/DashboardError';
import { supabase } from '../../lib/supabase';
import type { LogisticsVehicle } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import type { MonthlyTreatment, RecentMovement, UpcomingEvent, Washing, ComplianceItem } from './constants';
import { KpiCard } from './DashboardStatCards';
import TreatmentPanel from './TreatmentPanel';
import { SafetyPanel, TrainingPanel } from './SafetyTrainingPanels';
import { RecentMovementsPanel, QuickActionsPanel } from './ActivityPanel';
import AlertBanner from './AlertBanner';
import PlantPerformanceHero, { type YesterdayLog } from './PlantPerformanceHero';
import StockAlertsWidget, { type StockAlertItem } from './StockAlertsWidget';
import UpcomingEventsWidget from './UpcomingEventsWidget';
import ComplianceExpiriesWidget from './ComplianceExpiriesWidget';

export default function GlobalDashboard() {
  usePageTitle('Dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [stockStats, setStockStats] = useState({ total: 0, outOfStock: 0, lowStock: 0, inStock: 0 });
  const [treatmentMonths, setTreatmentMonths] = useState<MonthlyTreatment[]>([]);
  const [treatmentToday, setTreatmentToday] = useState({ kg: 0, cycles: 0 });
  const [yesterdayLog, setYesterdayLog] = useState<YesterdayLog | null>(null);
  const [safetyStats, setSafetyStats] = useState({ openIncidents: 0, closedIncidents: 0, overdueActions: 0, totalActions: 0, upcomingDrills: 0, scheduledInspections: 0, completedInspections: 0 });
  const [openIncidentsList, setOpenIncidentsList] = useState<Array<{ id: string; incident_type: string; severity: string }>>([]);
  const [nextDrillDate, setNextDrillDate] = useState<string | null>(null);
  const [oldestOverdueDate, setOldestOverdueDate] = useState<string | null>(null);
  const [trainingStats, setTrainingStats] = useState({ totalCourses: 0, validCerts: 0, expiringSoon: 0, expiredCerts: 0, totalCerts: 0, upcomingSessions: 0, completedSessions: 0 });
  const [expiringCertsList, setExpiringCertsList] = useState<Array<{ id: string; employee_name: string; course_name: string; expiry_date: string | null }>>([]);
  const [expiringCerts7dCount, setExpiringCerts7dCount] = useState(0);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [outOfStockItems, setOutOfStockItems] = useState<StockAlertItem[]>([]);
  const [belowMinItems, setBelowMinItems] = useState<StockAlertItem[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<UpcomingEvent[]>([]);
  const [monthWashing, setMonthWashing] = useState<Washing>({ ruc: 0, lids: 0, bins: 0 });
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [complianceExpiring7d, setComplianceExpiring7d] = useState(0);
  const [lastFetched, setLastFetched] = useState<Date | null>(null);

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    // Keep the "updated X mins ago" label fresh between refreshes.
    const label = setInterval(() => setLastFetched(d => d ? new Date(d) : d), 60000);
    // Silently refetch the dashboard data every 5 minutes (no spinner flash).
    const refresh = setInterval(() => loadData(true), 5 * 60000);
    return () => { clearInterval(label); clearInterval(refresh); };
  }, []);

  async function loadData(silent = false) {
    if (!silent) { setLoading(true); setError(''); }
    try {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const yDate = new Date(now);
    yDate.setDate(yDate.getDate() - 1);
    const yesterdayStr = yDate.toISOString().split('T')[0];
    const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];
    const in14Days = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];
    const in7Days = new Date(now.getTime() + 7 * 86400000).toISOString().split('T')[0];
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString().split('T')[0];

    const [
      itemsRes, recentMovRes, empRes, treatAllRes,
      incidentsRes, actionsRes, drillsRes, inspectionsRes,
      coursesRes, certsRes, scheduleRes, vehiclesRes, driversRes,
    ] = await Promise.all([
      supabase.from('stock_items').select('id, stock_code, stock_item, category, current_quantity, minimum_stock_level').eq('active', true),
      supabase.from('stock_movements').select('id, movement_type, quantity, movement_date, stock_items(stock_item)').order('created_at', { ascending: false }).limit(6),
      supabase.from('employees').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('treatment_daily_log').select('date, total_cycles, total_treated_kg, chemical_litres, downtime_minutes, day_shift_cycles, day_shift_treated_kg, afternoon_shift_cycles, afternoon_shift_treated_kg, night_shift_cycles, night_shift_treated_kg, day_shift_ruc_washed, day_shift_lids_washed, day_shift_wheelie_bins, afternoon_shift_ruc_washed, afternoon_shift_lids_washed, afternoon_shift_wheelie_bins, night_shift_ruc_washed, night_shift_lids_washed, night_shift_wheelie_bins').gte('date', twelveMonthsAgo),
      supabase.from('safety_incidents').select('id, status, incident_type, severity'),
      supabase.from('safety_corrective_actions').select('id, status, due_date'),
      supabase.from('safety_emergency_drills').select('id, status, drill_date, drill_type'),
      supabase.from('safety_inspections').select('id, status, next_inspection_date, inspection_type'),
      supabase.from('training_courses').select('id').eq('status', 'Active'),
      supabase.from('training_certificates').select('id, status, expiry_date, employee_name, course_name'),
      supabase.from('training_schedule').select('id, status, scheduled_date, course_name'),
      supabase.from('logistics_vehicles').select('id, registration, fleet_number, status, licence_disc_expiry, roadworthy_expiry, transport_permit_expiry, insurance_expiry'),
      supabase.from('logistics_driver_compliance').select('id, licence_expiry, prdp_expiry, medical_expiry, dg_training_expiry, employees(first_name, surname)'),
    ]);

    const firstErr = [
      itemsRes, recentMovRes, empRes, treatAllRes,
      incidentsRes, actionsRes, drillsRes, inspectionsRes,
      coursesRes, certsRes, scheduleRes, vehiclesRes, driversRes,
    ].find(r => r.error)?.error;
    if (firstErr) throw new Error(firstErr.message);

    setEmployeeCount(empRes.count || 0);
    setRecentMovements((recentMovRes.data || []) as unknown as RecentMovement[]);

    // Stock
    const rawItems = (itemsRes.data || []) as StockAlertItem[];
    const oos = rawItems.filter(i => i.current_quantity <= 0);
    const belowMin = rawItems.filter(i => i.current_quantity > 0 && i.minimum_stock_level > 0 && i.current_quantity < i.minimum_stock_level);
    setOutOfStockItems(oos);
    setBelowMinItems(belowMin);
    setStockStats({
      total: rawItems.length,
      outOfStock: oos.length,
      lowStock: belowMin.length,
      inStock: rawItems.length - oos.length - belowMin.length,
    });

    // Treatment
    type TreatLog = {
      date: string; total_treated_kg: number; total_cycles: number;
      chemical_litres: number; downtime_minutes: number;
      day_shift_cycles: number; day_shift_treated_kg: number;
      afternoon_shift_cycles: number; afternoon_shift_treated_kg: number;
      night_shift_cycles: number; night_shift_treated_kg: number;
      day_shift_ruc_washed: number; day_shift_lids_washed: number; day_shift_wheelie_bins: number;
      afternoon_shift_ruc_washed: number; afternoon_shift_lids_washed: number; afternoon_shift_wheelie_bins: number;
      night_shift_ruc_washed: number; night_shift_lids_washed: number; night_shift_wheelie_bins: number;
    };
    const treatLogs = (treatAllRes.data || []) as TreatLog[];
    const rucOf = (l: TreatLog) => Number(l.day_shift_ruc_washed) + Number(l.afternoon_shift_ruc_washed) + Number(l.night_shift_ruc_washed);
    const lidsOf = (l: TreatLog) => Number(l.day_shift_lids_washed) + Number(l.afternoon_shift_lids_washed) + Number(l.night_shift_lids_washed);
    const binsOf = (l: TreatLog) => Number(l.day_shift_wheelie_bins) + Number(l.afternoon_shift_wheelie_bins) + Number(l.night_shift_wheelie_bins);
    const monthMap = new Map<string, { kg: number; cycles: number; activeDays: number; chemicalLitres: number; downtimeMinutes: number; rucWashed: number; lidsWashed: number; binsWashed: number }>();
    treatLogs.forEach(l => {
      const m = l.date.substring(0, 7);
      const ex = monthMap.get(m) || { kg: 0, cycles: 0, activeDays: 0, chemicalLitres: 0, downtimeMinutes: 0, rucWashed: 0, lidsWashed: 0, binsWashed: 0 };
      const kg = Number(l.total_treated_kg);
      const cycles = Number(l.total_cycles);
      monthMap.set(m, {
        kg: ex.kg + kg,
        cycles: ex.cycles + cycles,
        activeDays: ex.activeDays + (cycles > 0 ? 1 : 0),
        chemicalLitres: ex.chemicalLitres + Number(l.chemical_litres),
        downtimeMinutes: ex.downtimeMinutes + Number(l.downtime_minutes),
        rucWashed: ex.rucWashed + rucOf(l),
        lidsWashed: ex.lidsWashed + lidsOf(l),
        binsWashed: ex.binsWashed + binsOf(l),
      });
    });
    const months: MonthlyTreatment[] = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, label: new Date(month + '-01').toLocaleString('en-ZA', { month: 'short' }), ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));
    setTreatmentMonths(months);

    const curMonthKey = todayStr.substring(0, 7);
    const curMonth = monthMap.get(curMonthKey);
    setMonthWashing(curMonth
      ? { ruc: curMonth.rucWashed, lids: curMonth.lidsWashed, bins: curMonth.binsWashed }
      : { ruc: 0, lids: 0, bins: 0 });

    const todayLog = treatLogs.find(l => l.date === todayStr);
    setTreatmentToday({ kg: todayLog ? Number(todayLog.total_treated_kg) : 0, cycles: todayLog ? Number(todayLog.total_cycles) : 0 });

    const yLog = treatLogs.find(l => l.date === yesterdayStr);
    setYesterdayLog(yLog ? {
      kg: Number(yLog.total_treated_kg),
      cycles: Number(yLog.total_cycles),
      chemicalLitres: Number(yLog.chemical_litres),
      downtimeMinutes: Number(yLog.downtime_minutes),
      dayShiftCycles: Number(yLog.day_shift_cycles),
      dayShiftKg: Number(yLog.day_shift_treated_kg),
      afternoonShiftCycles: Number(yLog.afternoon_shift_cycles),
      afternoonShiftKg: Number(yLog.afternoon_shift_treated_kg),
      nightShiftCycles: Number(yLog.night_shift_cycles),
      nightShiftKg: Number(yLog.night_shift_treated_kg),
      washing: { ruc: rucOf(yLog), lids: lidsOf(yLog), bins: binsOf(yLog) },
    } : null);

    // Safety
    type Incident = { id: string; status: string; incident_type: string; severity: string };
    type Action = { id: string; status: string; due_date: string | null };
    type Drill = { id: string; status: string; drill_date: string; drill_type: string };
    type Inspection = { id: string; status: string; next_inspection_date: string | null; inspection_type: string };
    const incidents = (incidentsRes.data || []) as Incident[];
    const actions = (actionsRes.data || []) as Action[];
    const drills = (drillsRes.data || []) as Drill[];
    const inspections = (inspectionsRes.data || []) as Inspection[];

    const openIncidents = incidents.filter(i => i.status === 'Open');
    const overdueActionsArr = actions.filter(a => a.status === 'Open' && a.due_date && a.due_date < todayStr);
    setOpenIncidentsList(openIncidents.slice(0, 3).map(i => ({ id: i.id, incident_type: i.incident_type, severity: i.severity })));

    const upcomingDrillsSorted = drills
      .filter(d => d.status === 'Scheduled' && d.drill_date >= todayStr)
      .sort((a, b) => a.drill_date.localeCompare(b.drill_date));
    setNextDrillDate(upcomingDrillsSorted[0]?.drill_date ?? null);

    const sortedOverdue = [...overdueActionsArr].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
    setOldestOverdueDate(sortedOverdue[0]?.due_date ?? null);

    setSafetyStats({
      openIncidents: openIncidents.length,
      closedIncidents: incidents.filter(i => i.status === 'Closed').length,
      overdueActions: overdueActionsArr.length,
      totalActions: actions.length,
      upcomingDrills: upcomingDrillsSorted.length,
      scheduledInspections: inspections.filter(i => i.status === 'Scheduled').length,
      completedInspections: inspections.filter(i => i.status === 'Completed').length,
    });

    // Training
    type Cert = { id: string; status: string; expiry_date: string | null; employee_name: string; course_name: string };
    type Session = { id: string; status: string; scheduled_date: string; course_name: string };
    const courses = coursesRes.data || [];
    const certs = (certsRes.data || []) as Cert[];
    const sessions = (scheduleRes.data || []) as Session[];

    const validCerts = certs.filter(c => c.status === 'Valid' && (!c.expiry_date || c.expiry_date > in30Days)).length;
    const expiringSoon = certs.filter(c => c.status === 'Valid' && c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in30Days).length;
    const expiredCerts = certs.filter(c => c.status === 'Expired').length;
    setTrainingStats({
      totalCourses: courses.length,
      validCerts,
      expiringSoon,
      expiredCerts,
      totalCerts: certs.length,
      upcomingSessions: sessions.filter(s => s.status === 'Scheduled' && s.scheduled_date >= todayStr).length,
      completedSessions: sessions.filter(s => s.status === 'Completed').length,
    });

    const expiringList = certs
      .filter(c => c.status === 'Valid' && c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in30Days)
      .sort((a, b) => (a.expiry_date || '').localeCompare(b.expiry_date || ''))
      .slice(0, 3);
    setExpiringCertsList(expiringList);
    setExpiringCerts7dCount(
      certs.filter(c => c.status === 'Valid' && c.expiry_date && c.expiry_date >= todayStr && c.expiry_date <= in7Days).length
    );

    // Upcoming events (next 14 days)
    const events: UpcomingEvent[] = [];
    drills
      .filter(d => d.status === 'Scheduled' && d.drill_date >= todayStr && d.drill_date <= in14Days)
      .forEach(d => events.push({ id: `drill-${d.id}`, date: d.drill_date, label: d.drill_type || 'Emergency Drill', type: 'drill' }));
    sessions
      .filter(s => s.status === 'Scheduled' && s.scheduled_date >= todayStr && s.scheduled_date <= in14Days)
      .forEach(s => events.push({ id: `session-${s.id}`, date: s.scheduled_date, label: s.course_name || 'Training Session', type: 'training' }));
    inspections
      .filter(i => i.next_inspection_date && i.next_inspection_date >= todayStr && i.next_inspection_date <= in14Days)
      .forEach(i => events.push({ id: `inspection-${i.id}`, date: i.next_inspection_date!, label: i.inspection_type || 'Inspection', type: 'inspection' }));
    events.sort((a, b) => a.date.localeCompare(b.date));
    setUpcomingEvents(events);

    // Logistics compliance — vehicle papers + driver docs expired or expiring within 30 days.
    type VehicleRow = Pick<LogisticsVehicle, 'id' | 'registration' | 'fleet_number' | 'status' | 'licence_disc_expiry' | 'roadworthy_expiry' | 'transport_permit_expiry' | 'insurance_expiry'>;
    type DriverEmp = { first_name: string; surname: string };
    type DriverRow = {
      id: string;
      licence_expiry: string | null; prdp_expiry: string | null;
      medical_expiry: string | null; dg_training_expiry: string | null;
      employees: DriverEmp | DriverEmp[] | null;
    };
    const vehicles = (vehiclesRes.data || []) as VehicleRow[];
    const driverRows = (driversRes.data || []) as unknown as DriverRow[];
    const compItems: ComplianceItem[] = [];
    const addExpiry = (kind: 'vehicle' | 'driver', id: string, subject: string, docType: string, expiry: string | null) => {
      if (!expiry) return;
      const daysLeft = Math.floor((new Date(expiry + 'T00:00:00').getTime() - new Date(todayStr + 'T00:00:00').getTime()) / 86400000);
      if (daysLeft <= 30) compItems.push({ id: `${id}-${docType}`, kind, subject, docType, expiryDate: expiry, daysLeft });
    };
    vehicles.filter(v => v.status !== 'Decommissioned').forEach(v => {
      const subj = v.registration || v.fleet_number || 'Vehicle';
      addExpiry('vehicle', v.id, subj, 'Licence disc', v.licence_disc_expiry);
      addExpiry('vehicle', v.id, subj, 'Roadworthy', v.roadworthy_expiry);
      addExpiry('vehicle', v.id, subj, 'Transport permit', v.transport_permit_expiry);
      addExpiry('vehicle', v.id, subj, 'Insurance', v.insurance_expiry);
    });
    driverRows.forEach(d => {
      const emp = Array.isArray(d.employees) ? d.employees[0] : d.employees;
      const subj = emp ? `${emp.first_name} ${emp.surname}` : 'Driver';
      addExpiry('driver', d.id, subj, 'Licence', d.licence_expiry);
      addExpiry('driver', d.id, subj, 'PrDP', d.prdp_expiry);
      addExpiry('driver', d.id, subj, 'Medical', d.medical_expiry);
      addExpiry('driver', d.id, subj, 'DG training', d.dg_training_expiry);
    });
    compItems.sort((a, b) => a.daysLeft - b.daysLeft);
    setComplianceItems(compItems);
    setComplianceExpiring7d(compItems.filter(i => i.daysLeft <= 7).length);

    setLastFetched(new Date());
    } catch (e) {
      if (!silent) setError(e instanceof Error ? e.message : 'Failed to load dashboard');
    } finally {
      if (!silent) setLoading(false);
    }
  }

  function timeSince(d: Date) {
    const mins = Math.floor((Date.now() - d.getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins === 1) return '1 min ago';
    return `${mins} mins ago`;
  }

  if (loading) return <PageSpinner layout="h64" />;
  if (error) return <DashboardError title="Management Dashboard" message={error} onRetry={loadData} />;

  const stockHealthPct = stockStats.total > 0 ? Math.round(stockStats.inStock / stockStats.total * 100) : 100;
  const certHealthPct = trainingStats.totalCerts > 0 ? Math.round(trainingStats.validCerts / trainingStats.totalCerts * 100) : 100;

  const now = new Date();
  const yDate = new Date(now);
  yDate.setDate(yDate.getDate() - 1);
  const yesterdayLabel = yDate.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`;
  const currentMonthData = treatmentMonths.find(m => m.month === currentMonthKey);
  const prevMonthData = treatmentMonths.find(m => m.month === prevMonthKey);
  const thisMonthKg = currentMonthData?.kg ?? 0;
  const monthTrendPct = prevMonthData && prevMonthData.kg > 0
    ? ((thisMonthKg - prevMonthData.kg) / prevMonthData.kg * 100)
    : 0;
  const monthTrendStr = monthTrendPct !== 0
    ? `${monthTrendPct > 0 ? '▲' : '▼'}${Math.abs(monthTrendPct).toFixed(0)}% vs ${prevMonthData?.label ?? 'prev'}`
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all Tech4Green operations</p>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <p className="text-xs text-gray-400">
            {now.toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          {lastFetched && (
            <span className="text-xs text-gray-400 flex items-center gap-1.5">
              · Updated {timeSince(lastFetched)}
              <button onClick={() => loadData()} title="Refresh" className="text-gray-400 hover:text-gray-600 transition-colors">
                <RefreshCw size={12} />
              </button>
            </span>
          )}
        </div>
      </div>

      {/* Alert Banner — only renders when issues exist */}
      <AlertBanner
        openIncidents={safetyStats.openIncidents}
        overdueActions={safetyStats.overdueActions}
        outOfStockCount={outOfStockItems.length}
        expiringCertsCount={expiringCerts7dCount}
        complianceExpiringCount={complianceExpiring7d}
      />

      {/* Plant Performance Hero */}
      <PlantPerformanceHero
        yesterdayLog={yesterdayLog}
        treatmentToday={treatmentToday}
        yesterdayLabel={yesterdayLabel}
        monthWashing={monthWashing}
      />

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          icon={Users}
          label="Active Employees"
          value={employeeCount}
          color="bg-blue-500"
          lightBg="bg-blue-50 text-blue-600"
        />
        <KpiCard
          icon={Factory}
          label="This Month's Output"
          value={thisMonthKg >= 1000 ? `${(thisMonthKg / 1000).toFixed(1)}t` : `${thisMonthKg.toLocaleString()} kg`}
          color="bg-cyan-500"
          lightBg="bg-cyan-50 text-cyan-600"
          sub={monthTrendStr}
        />
        <KpiCard
          icon={Package}
          label="Stock Health"
          value={`${stockHealthPct}%`}
          color="bg-emerald-500"
          lightBg="bg-emerald-50 text-emerald-600"
          sub={outOfStockItems.length > 0 ? `${outOfStockItems.length} out of stock` : `${stockStats.inStock} of ${stockStats.total} items OK`}
        />
        <KpiCard
          icon={ShieldAlert}
          label="Safety Status"
          value={safetyStats.openIncidents > 0 ? `${safetyStats.openIncidents} open` : 'Clear'}
          color={safetyStats.openIncidents > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          lightBg={safetyStats.openIncidents > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}
          sub={safetyStats.overdueActions > 0 ? `${safetyStats.overdueActions} overdue action${safetyStats.overdueActions !== 1 ? 's' : ''}` : undefined}
        />
        <KpiCard
          icon={ShieldCheck}
          label="Cert Compliance"
          value={`${certHealthPct}%`}
          color="bg-sky-500"
          lightBg="bg-sky-50 text-sky-600"
          sub={`${trainingStats.validCerts} of ${trainingStats.totalCerts} valid`}
        />
      </div>

      {/* Treatment Trend + Safety Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TreatmentPanel treatmentMonths={treatmentMonths} />
        <SafetyPanel
          safetyStats={safetyStats}
          openIncidentsList={openIncidentsList}
          nextDrillDate={nextDrillDate}
          oldestOverdueDate={oldestOverdueDate}
        />
      </div>

      {/* Stock Alerts · Upcoming Events · Training */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StockAlertsWidget outOfStockItems={outOfStockItems} belowMinItems={belowMinItems} />
        <UpcomingEventsWidget events={upcomingEvents} />
        <TrainingPanel
          trainingStats={trainingStats}
          certHealthPct={certHealthPct}
          expiringCerts={expiringCertsList}
        />
      </div>

      {/* Activity + Fleet compliance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentMovementsPanel recentMovements={recentMovements} />
        <ComplianceExpiriesWidget items={complianceItems} />
      </div>

      {/* Quick actions footer */}
      <QuickActionsPanel />
    </div>
  );
}
