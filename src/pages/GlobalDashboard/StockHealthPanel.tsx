import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight } from 'lucide-react';
import DonutChart from '../../components/DonutChart';
import { LegendRow } from './DashboardStatCards';

interface StockStats {
  total: number;
  outOfStock: number;
  lowStock: number;
  inStock: number;
  movements: number;
}

export default function StockHealthPanel({ stockStats, stockHealthPct }: {
  stockStats: StockStats;
  stockHealthPct: number;
}) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Package size={18} /></div>
        <div>
          <h2 className="font-semibold text-gray-900 text-sm">Stock Health</h2>
          <p className="text-xs text-gray-500">{stockStats.total} items tracked</p>
        </div>
      </div>
      <div className="flex justify-center mb-5">
        <DonutChart
          segments={[
            { value: stockStats.inStock, color: '#10b981', label: 'In Stock' },
            { value: stockStats.lowStock, color: '#f59e0b', label: 'Low Stock' },
            { value: stockStats.outOfStock, color: '#ef4444', label: 'Out of Stock' },
          ]}
          size={140}
          variant="thin"
          centerLabel={`${stockHealthPct}%`}
          centerSub="healthy"
        />
      </div>
      <div className="space-y-2">
        <LegendRow color="bg-emerald-500" label="In Stock" value={stockStats.inStock} />
        <LegendRow color="bg-amber-500" label="Low Stock" value={stockStats.lowStock} alert={stockStats.lowStock > 0} />
        <LegendRow color="bg-red-500" label="Out of Stock" value={stockStats.outOfStock} alert={stockStats.outOfStock > 0} />
      </div>
      <button onClick={() => navigate('/stock')} className="mt-4 w-full text-xs font-medium text-emerald-600 hover:text-emerald-700 flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-emerald-50 transition-colors">
        View Stock Details <ArrowRight size={12} />
      </button>
    </div>
  );
}
