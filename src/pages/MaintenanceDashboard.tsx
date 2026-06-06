import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, AlertTriangle, CheckCircle, Package, ChevronRight, Calendar, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Equipment, Part, MaintenanceHistory } from '../lib/supabase';
import { equipmentStatusColors as STATUS_COLORS, maintenanceTypeColors as TYPE_COLORS } from '../lib/badgeColors';

export default function MaintenanceDashboard() {
  const navigate = useNavigate();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [eq, pt, ht] = await Promise.all([
        supabase.from('equipment').select('*').order('name'),
        supabase.from('parts').select('*'),
        supabase.from('maintenance_history').select('*').order('service_date', { ascending: false }).limit(50),
      ]);
      setEquipment(eq.data || []);
      setParts(pt.data || []);
      setHistory(ht.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const operational = equipment.filter(e => e.status === 'Operational').length;
  const underMaintenance = equipment.filter(e => e.status === 'Under Maintenance').length;
  const faulty = equipment.filter(e => e.status === 'Faulty').length;
  const lowParts = parts.filter(p => p.qty_on_hand < p.qty_required).length;

  const recentHistory = history.slice(0, 8);

  const equipMap = Object.fromEntries(equipment.map(e => [e.id, e.name]));

  const kpis = [
    {
      label: 'Operational',
      value: operational,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      onClick: () => navigate('/maintenance/assets'),
    },
    {
      label: 'Under Maintenance',
      value: underMaintenance,
      icon: Wrench,
      color: underMaintenance > 0 ? 'text-amber-600' : 'text-gray-400',
      bg: underMaintenance > 0 ? 'bg-amber-50' : 'bg-gray-50',
      border: underMaintenance > 0 ? 'border-amber-100' : 'border-gray-100',
      onClick: () => navigate('/maintenance/assets'),
    },
    {
      label: 'Faulty Equipment',
      value: faulty,
      icon: AlertTriangle,
      color: faulty > 0 ? 'text-red-600' : 'text-gray-400',
      bg: faulty > 0 ? 'bg-red-50' : 'bg-gray-50',
      border: faulty > 0 ? 'border-red-100' : 'border-gray-100',
      onClick: () => navigate('/maintenance/assets'),
    },
    {
      label: 'Total Equipment',
      value: equipment.length,
      icon: Settings,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-100',
      onClick: () => navigate('/maintenance/assets'),
    },
    {
      label: 'Parts Below Required',
      value: lowParts,
      icon: Package,
      color: lowParts > 0 ? 'text-amber-600' : 'text-gray-400',
      bg: lowParts > 0 ? 'bg-amber-50' : 'bg-gray-50',
      border: lowParts > 0 ? 'border-amber-100' : 'border-gray-100',
      onClick: () => navigate('/maintenance/parts'),
    },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Maintenance Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Plant equipment status, spare parts, and service history</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map(kpi => {
          const Icon = kpi.icon;
          return (
            <button
              key={kpi.label}
              onClick={kpi.onClick}
              className={`${kpi.bg} ${kpi.border} border rounded-xl p-4 text-left hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-start justify-between">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <Icon size={18} className={kpi.color} />
                </div>
                <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors mt-1" />
              </div>
              <p className={`text-2xl font-bold mt-2 ${kpi.color}`}>{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{kpi.label}</p>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Equipment Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Settings size={15} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-800">Equipment Status</h2>
            </div>
            <button onClick={() => navigate('/maintenance/assets')} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              Manage
            </button>
          </div>
          {equipment.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No equipment registered yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {equipment.map(e => (
                <div key={e.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {[e.category, e.location].filter(Boolean).join(' · ') || '\u00A0'}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-3 ${STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-500'}`}>
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Service History */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar size={15} className="text-orange-500" />
              <h2 className="text-sm font-semibold text-gray-800">Recent Service Records</h2>
            </div>
            <button onClick={() => navigate('/maintenance/work-orders')} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              View all
            </button>
          </div>
          {recentHistory.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400">No service records yet</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentHistory.map(h => (
                <div key={h.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50/50 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{equipMap[h.equipment_id] || 'Unknown'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{h.description}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[h.type] || 'bg-gray-100 text-gray-500'}`}>
                      {h.type}
                    </span>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(h.service_date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Parts needing attention */}
      {lowParts > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-gray-800">Parts Below Required Quantity</h2>
            </div>
            <button onClick={() => navigate('/maintenance/parts')} className="text-xs text-orange-600 hover:text-orange-700 font-medium">
              View all parts
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs">
                  <th className="text-left px-5 py-2.5 font-medium">Part</th>
                  <th className="text-left px-4 py-2.5 font-medium">Equipment</th>
                  <th className="text-center px-4 py-2.5 font-medium">On Hand</th>
                  <th className="text-center px-4 py-2.5 font-medium">Required</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {parts.filter(p => p.qty_on_hand < p.qty_required).map(p => (
                  <tr key={p.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-gray-800">{p.name}</td>
                    <td className="px-4 py-2.5 text-gray-600">{equipMap[p.equipment_id] || '--'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-600">{p.qty_on_hand}</td>
                    <td className="px-4 py-2.5 text-center text-gray-500">{p.qty_required}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
