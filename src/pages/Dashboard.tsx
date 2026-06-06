import { useEffect, useState } from 'react';
import { Package, AlertTriangle, XCircle, TrendingUp, ArrowUpCircle, ClipboardList } from 'lucide-react';
import { supabase, StockItem, StockMovement, StockTakeSession, getStockStatus } from '../lib/supabase';
import { PageSpinner } from '../components/Spinner';

interface DashboardStats {
  totalItems: number;
  outOfStock: number;
  lowStock: number;
  movementsThisMonth: number;
  belowMin: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({ totalItems: 0, outOfStock: 0, lowStock: 0, movementsThisMonth: 0, belowMin: 0 });
  const [recentMovements, setRecentMovements] = useState<(StockMovement & { stock_items?: { stock_item: string; description: string } | null })[]>([]);
  const [recentSessions, setRecentSessions] = useState<StockTakeSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const [itemsRes, movementsRes, sessionsRes] = await Promise.all([
      supabase.from('stock_items').select('*').eq('active', true),
      supabase.from('stock_movements').select('*, stock_items(stock_item, description)').order('created_at', { ascending: false }).limit(10),
      supabase.from('stock_take_sessions').select('*').order('created_at', { ascending: false }).limit(5),
    ]);

    const items: StockItem[] = itemsRes.data || [];
    const outOfStock = items.filter(i => getStockStatus(i) === 'Out of Stock').length;
    const lowStock = items.filter(i => getStockStatus(i) === 'Low Stock').length;
    const belowMin = items.filter(i => i.minimum_stock_level > 0 && i.current_quantity < i.minimum_stock_level).length;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthMovements = (movementsRes.data || []).filter(m => m.created_at >= startOfMonth);

    setStats({ totalItems: items.length, outOfStock, lowStock, movementsThisMonth: monthMovements.length, belowMin });
    setRecentMovements(movementsRes.data || []);
    setRecentSessions(sessionsRes.data || []);
    setLoading(false);
  }

  const kpis = [
    { label: 'Total Stock Items', value: stats.totalItems, icon: Package, color: 'bg-blue-500', light: 'bg-blue-50 text-blue-600' },
    { label: 'Out of Stock', value: stats.outOfStock, icon: XCircle, color: 'bg-red-500', light: 'bg-red-50 text-red-600' },
    { label: 'Low Stock Items', value: stats.lowStock, icon: AlertTriangle, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
    { label: 'Movements This Month', value: stats.movementsThisMonth, icon: TrendingUp, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-600' },
    { label: 'Below Min Level', value: stats.belowMin, icon: AlertTriangle, color: 'bg-orange-500', light: 'bg-orange-50 text-orange-600' },
  ];

  const movementColors: Record<string, string> = {
    'Stock Received': 'text-emerald-600',
    'Stock Returned': 'text-emerald-600',
    'Opening Stock': 'text-blue-600',
    'Stock Issued': 'text-red-600',
    'Stock Damaged': 'text-red-600',
    'Stock Adjusted': 'text-amber-600',
    'Stock Transferred': 'text-gray-600',
    'Stock Take Correction': 'text-purple-600',
  };

  const sessionStatusColors: Record<string, string> = {
    Draft: 'bg-gray-100 text-gray-600',
    'In Progress': 'bg-blue-100 text-blue-700',
    Completed: 'bg-emerald-100 text-emerald-700',
    Approved: 'bg-green-100 text-green-800',
  };

  if (loading) {
    return (
      <PageSpinner layout="h64" />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Overview of your stock management</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="bg-white rounded-xl border border-gray-200 p-3 sm:p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className={`inline-flex p-2 rounded-lg ${kpi.light} mb-3`}>
                <Icon size={18} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
              <p className="text-xs text-gray-500 mt-1 leading-tight">{kpi.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
        {/* Recent Movements */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ArrowUpCircle size={16} className="text-emerald-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Recent Stock Movements</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentMovements.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No movements yet</p>
            )}
            {recentMovements.slice(0, 8).map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {(m as any).stock_items?.stock_item || m.stock_code || 'Unknown'}
                  </p>
                  <p className="text-xs text-gray-500">{m.movement_type}</p>
                </div>
                <div className="text-right ml-4 flex-shrink-0">
                  <span className={`text-sm font-semibold ${movementColors[m.movement_type] || 'text-gray-600'}`}>
                    {['Stock Received', 'Opening Stock', 'Stock Returned'].includes(m.movement_type) ? '+' : ''}
                    {['Stock Issued', 'Stock Damaged'].includes(m.movement_type) ? '-' : ''}
                    {Math.abs(m.quantity)}
                  </span>
                  <p className="text-xs text-gray-400">{new Date(m.movement_date).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stock Take Sessions */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <ClipboardList size={16} className="text-blue-600" />
            <h2 className="font-semibold text-gray-900 text-sm">Latest Stock Take Sessions</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {recentSessions.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No stock take sessions yet</p>
            )}
            {recentSessions.map((s) => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{s.stock_take_name}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(s.stock_take_date).toLocaleDateString()} &bull; {s.conducted_by || 'N/A'}
                  </p>
                </div>
                <span className={`text-xs px-2 py-1 rounded font-medium ml-4 flex-shrink-0 ${sessionStatusColors[s.status] || 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
