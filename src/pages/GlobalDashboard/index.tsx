import { useEffect, useState } from 'react';
import {
  Package, Factory, ShieldCheck, Users,
} from 'lucide-react';
import { PageSpinner } from '../../components/Spinner';
import { supabase, StockItem, getStockStatus } from '../../lib/supabase';
import type { MonthlyTreatment, StockByCategory, RecentMovement } from './constants';
import { KpiCard } from './DashboardStatCards';
import TreatmentPanel from './TreatmentPanel';
import StockHealthPanel from './StockHealthPanel';
import { SafetyPanel, TrainingPanel, StockCategoryPanel } from './SafetyTrainingPanels';
import { RecentMovementsPanel, QuickActionsPanel } from './ActivityPanel';

export default function GlobalDashboard() {
  const [loading, setLoading] = useState(true);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [stockStats, setStockStats] = useState({ total: 0, outOfStock: 0, lowStock: 0, inStock: 0, movements: 0 });
  const [stockCategories, setStockCategories] = useState<StockByCategory[]>([]);
  const [treatmentMonths, setTreatmentMonths] = useState<MonthlyTreatment[]>([]);
  const [treatmentToday, setTreatmentToday] = useState({ kg: 0, cycles: 0 });
  const [safetyStats, setSafetyStats] = useState({ openIncidents: 0, closedIncidents: 0, overdueActions: 0, totalActions: 0, upcomingDrills: 0, scheduledInspections: 0, completedInspections: 0 });
  const [trainingStats, setTrainingStats] = useState({ totalCourses: 0, validCerts: 0, expiringSoon: 0, expiredCerts: 0, totalCerts: 0, upcomingSessions: 0, completedSessions: 0 });
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const in30Days = new Date(now.getTime() + 30 * 86400000).toISOString().split('T')[0];

    const [
      itemsRes, movRes, recentMovRes, empRes, treatAllRes,
      incidentsRes, actionsRes, drillsRes, inspectionsRes,
      coursesRes, certsRes, scheduleRes,
    ] = await Promise.all([
      supabase.from('stock_items').select('*').eq('active', true),
      supabase.from('stock_movements').select('id, created_at'),
      supabase.from('stock_movements').select('id, movement_type, quantity, movement_date, stock_items(stock_item)').order('created_at', { ascending: false }).limit(6),
      supabase.from('employees').select('id', { count: 'exact' }).eq('status', 'active'),
      supabase.from('treatment_daily_log').select('date, total_cycles, total_treated_kg, chemical_litres, downtime_minutes'),
      supabase.from('safety_incidents').select('id, status'),
      supabase.from('safety_corrective_actions').select('id, status, due_date'),
      supabase.from('safety_emergency_drills').select('id, status, drill_date'),
      supabase.from('safety_inspections').select('id, status'),
      supabase.from('training_courses').select('id').eq('status', 'Active'),
      supabase.from('training_certificates').select('id, status, expiry_date'),
      supabase.from('training_schedule').select('id, status, scheduled_date'),
    ]);

    setEmployeeCount(empRes.count || 0);

    const items: StockItem[] = itemsRes.data || [];
    const outOfStock = items.filter(i => getStockStatus(i) === 'Out of Stock').length;
    const lowStock = items.filter(i => getStockStatus(i) === 'Low Stock').length;
    const inStock = items.length - outOfStock - lowStock;
    const monthMovements = (movRes.data || []).filter(m => m.created_at >= startOfMonth);
    setStockStats({ total: items.length, outOfStock, lowStock, inStock, movements: monthMovements.length });
    setRecentMovements((recentMovRes.data || []) as unknown as RecentMovement[]);

    const catMap = new Map<string, { count: number; qty: number }>();
    items.forEach(i => {
      const c = i.category || 'Other';
      const existing = catMap.get(c) || { count: 0, qty: 0 };
      catMap.set(c, { count: existing.count + 1, qty: existing.qty + Number(i.current_quantity) });
    });
    setStockCategories(Array.from(catMap.entries()).map(([category, v]) => ({ category, ...v })).sort((a, b) => b.count - a.count));

    const treatLogs = treatAllRes.data || [];
    const monthMap = new Map<string, { kg: number; cycles: number; activeDays: number; chemicalLitres: number; downtimeMinutes: number }>();
    treatLogs.forEach((l: { date: string; total_treated_kg: number; total_cycles: number; chemical_litres: number; downtime_minutes: number }) => {
      const m = l.date.substring(0, 7);
      const existing = monthMap.get(m) || { kg: 0, cycles: 0, activeDays: 0, chemicalLitres: 0, downtimeMinutes: 0 };
      const kg = Number(l.total_treated_kg);
      const cycles = Number(l.total_cycles);
      monthMap.set(m, {
        kg: existing.kg + kg,
        cycles: existing.cycles + cycles,
        activeDays: existing.activeDays + (cycles > 0 ? 1 : 0),
        chemicalLitres: existing.chemicalLitres + Number(l.chemical_litres),
        downtimeMinutes: existing.downtimeMinutes + Number(l.downtime_minutes),
      });
    });
    const months: MonthlyTreatment[] = Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, label: new Date(month + '-01').toLocaleString('en-ZA', { month: 'short' }), ...v }))
      .sort((a, b) => a.month.localeCompare(b.month));
    setTreatmentMonths(months);

    const todayLog = treatLogs.find((l: { date: string }) => l.date === todayStr);
    setTreatmentToday({ kg: todayLog ? Number(todayLog.total_treated_kg) : 0, cycles: todayLog ? Number(todayLog.total_cycles) : 0 });

    const incidents = incidentsRes.data || [];
    const actions = actionsRes.data || [];
    const drills = drillsRes.data || [];
    const inspections = inspectionsRes.data || [];
    setSafetyStats({
      openIncidents: incidents.filter(i => i.status === 'Open').length,
      closedIncidents: incidents.filter(i => i.status === 'Closed').length,
      overdueActions: actions.filter(a => a.status === 'Open' && a.due_date && a.due_date < todayStr).length,
      totalActions: actions.length,
      upcomingDrills: drills.filter(d => d.status === 'Scheduled' && d.drill_date >= todayStr).length,
      scheduledInspections: inspections.filter(i => i.status === 'Scheduled').length,
      completedInspections: inspections.filter(i => i.status === 'Completed').length,
    });

    const courses = coursesRes.data || [];
    const certs = certsRes.data || [];
    const sessions = scheduleRes.data || [];
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

    setLoading(false);
  }

  if (loading) {
    return (
      <PageSpinner layout="h64" />
    );
  }

  const totalTreatedAllTime = treatmentMonths.reduce((s, m) => s + m.kg, 0);
  const stockHealthPct = stockStats.total > 0 ? Math.round(stockStats.inStock / stockStats.total * 100) : 100;
  const certHealthPct = trainingStats.totalCerts > 0 ? Math.round(trainingStats.validCerts / trainingStats.totalCerts * 100) : 100;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Overview of all Tech4Green operations</p>
        </div>
        <p className="hidden sm:block text-xs text-gray-400">{new Date().toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Active Employees" value={employeeCount} color="bg-blue-500" lightBg="bg-blue-50 text-blue-600" />
        <KpiCard icon={Factory} label="Total Treated (All Time)" value={`${(totalTreatedAllTime / 1000).toFixed(0)}t`} color="bg-cyan-500" lightBg="bg-cyan-50 text-cyan-600" />
        <KpiCard icon={Package} label="Stock Health" value={`${stockHealthPct}%`} color="bg-emerald-500" lightBg="bg-emerald-50 text-emerald-600" sub={`${stockStats.inStock} of ${stockStats.total} items OK`} />
        <KpiCard icon={ShieldCheck} label="Cert Compliance" value={`${certHealthPct}%`} color="bg-sky-500" lightBg="bg-sky-50 text-sky-600" sub={`${trainingStats.validCerts} of ${trainingStats.totalCerts} valid`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TreatmentPanel treatmentMonths={treatmentMonths} treatmentToday={treatmentToday} />
        <StockHealthPanel stockStats={stockStats} stockHealthPct={stockHealthPct} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SafetyPanel safetyStats={safetyStats} />
        <TrainingPanel trainingStats={trainingStats} certHealthPct={certHealthPct} />
        <StockCategoryPanel stockCategories={stockCategories} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentMovementsPanel recentMovements={recentMovements} />
        <QuickActionsPanel />
      </div>
    </div>
  );
}
