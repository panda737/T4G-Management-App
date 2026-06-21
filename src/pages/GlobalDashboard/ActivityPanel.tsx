import { useNavigate } from 'react-router-dom';
import {
  Package, Factory, ShieldAlert, GraduationCap, Users,
  TrendingUp, TrendingDown, Activity, ArrowRight,
} from 'lucide-react';
import type { RecentMovement } from './constants';
import { MOVEMENT_COLORS } from './constants';
import { QuickAction } from './DashboardStatCards';

export function RecentMovementsPanel({ recentMovements }: { recentMovements: RecentMovement[] }) {
  const navigate = useNavigate();
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gray-100 text-gray-600"><Activity size={16} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Recent Stock Movements</h2>
        </div>
        <button onClick={() => navigate('/stock/movements')} className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
          View All <ArrowRight size={12} />
        </button>
      </div>
      <div className="divide-y divide-gray-50">
        {recentMovements.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No recent movements</p>
        ) : recentMovements.map((m) => {
          const colors = MOVEMENT_COLORS[m.movement_type] || 'text-gray-600 bg-gray-100';
          const [textColor, bgColor] = colors.split(' ');
          const isIn = ['Stock Received', 'Opening Stock', 'Stock Returned'].includes(m.movement_type);
          const isOut = ['Stock Issued', 'Stock Damaged'].includes(m.movement_type);
          return (
            <div key={m.id} className="px-4 sm:px-6 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 transition-colors">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${bgColor} flex-shrink-0`}>
                {isIn ? <TrendingUp size={14} className={textColor} /> : isOut ? <TrendingDown size={14} className={textColor} /> : <Activity size={14} className={textColor} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{m.stock_items?.stock_item || 'Unknown item'}</p>
                <p className="text-xs text-gray-500">{m.movement_type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <span className={`text-sm font-bold ${textColor}`}>
                  {isIn ? '+' : isOut ? '-' : ''}{Math.abs(m.quantity)}
                </span>
                <p className="text-xs text-gray-400">{new Date(m.movement_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function QuickActionsPanel() {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <h2 className="font-semibold text-gray-900 text-sm mb-4">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
        <QuickAction icon={Package} label="View Stock Master List" onClick={() => navigate('/stock/master-list')} color="text-emerald-600 bg-emerald-50" />
        <QuickAction icon={TrendingUp} label="Record Stock Movement" onClick={() => navigate('/stock/movements')} color="text-blue-600 bg-blue-50" />
        <QuickAction icon={Factory} label="Treatment Daily Log" onClick={() => navigate('/treatment/daily-log')} color="text-cyan-600 bg-cyan-50" />
        <QuickAction icon={ShieldAlert} label="Log Safety Incident" onClick={() => navigate('/safety/incidents')} color="text-amber-600 bg-amber-50" />
        <QuickAction icon={GraduationCap} label="Training Records" onClick={() => navigate('/training/records')} color="text-sky-600 bg-sky-50" />
        <QuickAction icon={Users} label="Employee Register" onClick={() => navigate('/admin/employees')} color="text-gray-600 bg-gray-100" />
      </div>
    </div>
  );
}
