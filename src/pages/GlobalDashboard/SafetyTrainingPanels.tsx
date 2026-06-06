import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, GraduationCap, BarChart3,
  AlertTriangle, Clock, CheckCircle, Activity,
  ArrowRight, BookOpen,
} from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import type { StockByCategory } from './constants';
import { LegendRow, EmptyChart } from './DashboardStatCards';

interface SafetyStats {
  openIncidents: number;
  closedIncidents: number;
  overdueActions: number;
  totalActions: number;
  upcomingDrills: number;
  scheduledInspections: number;
  completedInspections: number;
}

interface TrainingStats {
  totalCourses: number;
  validCerts: number;
  expiringSoon: number;
  expiredCerts: number;
  totalCerts: number;
  upcomingSessions: number;
  completedSessions: number;
}

export function SafetyPanel({
  safetyStats,
  openIncidentsList,
  nextDrillDate,
  oldestOverdueDate,
}: {
  safetyStats: SafetyStats;
  openIncidentsList: Array<{ id: string; incident_type: string; severity: string }>;
  nextDrillDate: string | null;
  oldestOverdueDate: string | null;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><ShieldAlert size={16} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Health & Safety</h2>
        </div>
        <button onClick={() => navigate('/safety')} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
          View <ArrowRight size={12} />
        </button>
      </div>

      {/* Open Incidents */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className={safetyStats.openIncidents > 0 ? 'text-red-500' : 'text-emerald-500'} />
            <span className="text-xs font-medium text-gray-700">Open Incidents</span>
          </div>
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${safetyStats.openIncidents > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {safetyStats.openIncidents}
          </span>
        </div>
        {openIncidentsList.length > 0 && (
          <div className="ml-5 space-y-0.5 mt-1">
            {openIncidentsList.map(i => (
              <div key={i.id} className="text-[11px] text-gray-500 flex items-center gap-1.5">
                <span className={`w-1 h-1 rounded-full flex-shrink-0 ${['High', 'Critical'].includes(i.severity) ? 'bg-red-500' : 'bg-amber-400'}`} />
                <span className="truncate">{i.incident_type || 'Incident'}</span>
                {i.severity && <span className="text-gray-400 flex-shrink-0">· {i.severity}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Overdue Actions */}
      <div className="mb-3 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={13} className={safetyStats.overdueActions > 0 ? 'text-red-500' : 'text-emerald-500'} />
            <span className="text-xs font-medium text-gray-700">Overdue Actions</span>
          </div>
          <span className={`text-xs font-bold ${safetyStats.overdueActions > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {safetyStats.overdueActions}
          </span>
        </div>
        {safetyStats.overdueActions > 0 && oldestOverdueDate && (
          <p className="ml-5 text-[11px] text-gray-400 mt-0.5">
            Oldest due: {new Date(oldestOverdueDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
          </p>
        )}
      </div>

      {/* Drills & Inspections */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Activity size={13} className="text-amber-500 flex-shrink-0" />
          {nextDrillDate ? (
            <span className="text-xs text-gray-600">
              Next drill: <strong className="text-gray-800">{new Date(nextDrillDate + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</strong>
            </span>
          ) : (
            <span className="text-xs text-gray-400">No drills scheduled</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle size={13} className="text-blue-500 flex-shrink-0" />
          <span className="text-xs text-gray-600">
            Inspections: <strong className="text-gray-800">{safetyStats.completedInspections}</strong> done
            {safetyStats.scheduledInspections > 0 && (
              <span className="text-gray-400"> · {safetyStats.scheduledInspections} pending</span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

export function TrainingPanel({
  trainingStats,
  certHealthPct,
  expiringCerts,
}: {
  trainingStats: TrainingStats;
  certHealthPct: number;
  expiringCerts: Array<{ id: string; employee_name: string; course_name: string; expiry_date: string | null }>;
}) {
  const navigate = useNavigate();
  const today = new Date();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600"><GraduationCap size={16} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Training & Certs</h2>
        </div>
        <button onClick={() => navigate('/training')} className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
          View <ArrowRight size={12} />
        </button>
      </div>
      <div className="flex justify-center mb-3">
        <DonutChart
          segments={[
            { value: trainingStats.validCerts, color: '#10b981', label: 'Valid' },
            { value: trainingStats.expiringSoon, color: '#f59e0b', label: 'Expiring' },
            { value: trainingStats.expiredCerts, color: '#ef4444', label: 'Expired' },
          ]}
          size={100}
          variant="thin"
          centerLabel={`${certHealthPct}%`}
          centerSub="valid"
        />
      </div>
      <div className="space-y-2 mb-3">
        <LegendRow color="bg-emerald-500" label="Valid" value={trainingStats.validCerts} />
        <LegendRow color="bg-amber-500" label="Expiring (30d)" value={trainingStats.expiringSoon} alert={trainingStats.expiringSoon > 0} />
        <LegendRow color="bg-red-500" label="Expired" value={trainingStats.expiredCerts} alert={trainingStats.expiredCerts > 0} />
      </div>

      {expiringCerts.length > 0 && (
        <div className="pt-3 border-t border-gray-100">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">Expiring Soon</p>
          <div className="space-y-1.5">
            {expiringCerts.map(c => {
              const daysLeft = c.expiry_date
                ? Math.ceil((new Date(c.expiry_date).getTime() - today.getTime()) / 86400000)
                : null;
              return (
                <div key={c.id} className="flex items-center gap-2 text-xs">
                  <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                  <span className="text-gray-700 truncate flex-1">{c.employee_name}</span>
                  <span className={`flex-shrink-0 font-semibold ${daysLeft !== null && daysLeft <= 7 ? 'text-red-600' : 'text-amber-600'}`}>
                    {daysLeft !== null ? `${daysLeft}d` : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <button
        onClick={() => navigate('/training/certificates')}
        className="mt-3 w-full text-xs font-medium text-sky-600 hover:text-sky-700 flex items-center justify-center gap-1 py-1.5 rounded-lg hover:bg-sky-50 transition-colors"
      >
        View Certificates <ArrowRight size={11} />
      </button>

      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 mt-2">
        <BookOpen size={12} className="text-sky-400" />
        <span className="text-xs text-gray-500">{trainingStats.totalCourses} active courses</span>
        {trainingStats.upcomingSessions > 0 && (
          <>
            <span className="text-gray-200">·</span>
            <span className="text-xs text-gray-500">{trainingStats.upcomingSessions} upcoming</span>
          </>
        )}
      </div>
    </div>
  );
}

export function StockCategoryPanel({ stockCategories }: { stockCategories: StockByCategory[] }) {
  const maxCatCount = Math.max(...stockCategories.map(c => c.count), 1);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><BarChart3 size={18} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Stock by Category</h2>
        </div>
      </div>
      {stockCategories.length > 0 ? (
        <div className="space-y-3">
          {stockCategories.map((cat) => {
            const pct = Math.round((cat.count / maxCatCount) * 100);
            return (
              <div key={cat.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-700 font-medium truncate mr-2">{cat.category}</span>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{cat.count} items</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyChart label="No stock categories" />
      )}
    </div>
  );
}
