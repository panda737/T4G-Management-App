import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert, GraduationCap, BarChart3,
  AlertTriangle, Clock, CheckCircle, Activity,
  ArrowRight, BookOpen, Award,
} from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import type { StockByCategory } from './constants';
import { StatusRow, LegendRow, EmptyChart } from './DashboardStatCards';

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

export function SafetyPanel({ safetyStats }: { safetyStats: SafetyStats }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50 text-amber-600"><ShieldAlert size={18} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Health & Safety</h2>
        </div>
        <button onClick={() => navigate('/safety')} className="text-xs text-amber-600 hover:text-amber-700 flex items-center gap-1">
          View <ArrowRight size={12} />
        </button>
      </div>
      <div className="space-y-4">
        <StatusRow
          icon={AlertTriangle}
          label="Open Incidents"
          value={safetyStats.openIncidents}
          total={safetyStats.openIncidents + safetyStats.closedIncidents}
          color={safetyStats.openIncidents > 0 ? 'text-red-600' : 'text-emerald-600'}
          barColor={safetyStats.openIncidents > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          bgColor={safetyStats.openIncidents > 0 ? 'bg-red-100' : 'bg-emerald-100'}
        />
        <StatusRow
          icon={Clock}
          label="Overdue Actions"
          value={safetyStats.overdueActions}
          total={safetyStats.totalActions}
          color={safetyStats.overdueActions > 0 ? 'text-red-600' : 'text-emerald-600'}
          barColor={safetyStats.overdueActions > 0 ? 'bg-red-500' : 'bg-emerald-500'}
          bgColor={safetyStats.overdueActions > 0 ? 'bg-red-100' : 'bg-emerald-100'}
        />
        <StatusRow
          icon={CheckCircle}
          label="Inspections Done"
          value={safetyStats.completedInspections}
          total={safetyStats.completedInspections + safetyStats.scheduledInspections}
          color="text-blue-600"
          barColor="bg-blue-500"
          bgColor="bg-blue-100"
        />
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
          <Activity size={14} className="text-amber-500" />
          <span className="text-xs text-gray-600">{safetyStats.upcomingDrills} upcoming drill{safetyStats.upcomingDrills !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  );
}

export function TrainingPanel({ trainingStats, certHealthPct }: { trainingStats: TrainingStats; certHealthPct: number }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600"><GraduationCap size={18} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Training & Certificates</h2>
        </div>
        <button onClick={() => navigate('/training')} className="text-xs text-sky-600 hover:text-sky-700 flex items-center gap-1">
          View <ArrowRight size={12} />
        </button>
      </div>
      <div className="flex justify-center mb-4">
        <DonutChart
          segments={[
            { value: trainingStats.validCerts, color: '#10b981', label: 'Valid' },
            { value: trainingStats.expiringSoon, color: '#f59e0b', label: 'Expiring' },
            { value: trainingStats.expiredCerts, color: '#ef4444', label: 'Expired' },
          ]}
          size={110}
          variant="thin"
          centerLabel={`${certHealthPct}%`}
          centerSub="valid"
        />
      </div>
      <div className="space-y-2 mb-4">
        <LegendRow color="bg-emerald-500" label="Valid" value={trainingStats.validCerts} />
        <LegendRow color="bg-amber-500" label="Expiring (30d)" value={trainingStats.expiringSoon} alert={trainingStats.expiringSoon > 0} />
        <LegendRow color="bg-red-500" label="Expired" value={trainingStats.expiredCerts} alert={trainingStats.expiredCerts > 0} />
      </div>
      <div className="flex items-center gap-4 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-1.5">
          <BookOpen size={13} className="text-sky-500" />
          <span className="text-xs text-gray-600">{trainingStats.totalCourses} courses</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Award size={13} className="text-sky-500" />
          <span className="text-xs text-gray-600">{trainingStats.upcomingSessions} upcoming</span>
        </div>
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
