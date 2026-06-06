import { useNavigate } from 'react-router-dom';
import { Package, ArrowRight, CheckCircle } from 'lucide-react';

export interface StockAlertItem {
  id: string;
  stock_code: string;
  stock_item: string;
  current_quantity: number;
  minimum_stock_level: number;
}

interface StockAlertsWidgetProps {
  outOfStockItems: StockAlertItem[];
  belowMinItems: StockAlertItem[];
}

const MAX_ITEMS = 10;

export default function StockAlertsWidget({ outOfStockItems, belowMinItems }: StockAlertsWidgetProps) {
  const navigate = useNavigate();
  const allClear = outOfStockItems.length === 0 && belowMinItems.length === 0;

  const oosVisible = outOfStockItems.slice(0, MAX_ITEMS);
  const remaining = MAX_ITEMS - oosVisible.length;
  const belowVisible = belowMinItems.slice(0, remaining);
  const totalHidden = (outOfStockItems.length - oosVisible.length) + (belowMinItems.length - belowVisible.length);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600"><Package size={16} /></div>
        <h2 className="font-semibold text-gray-900 text-sm">Stock Alerts</h2>
      </div>

      {allClear ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <CheckCircle size={22} className="text-emerald-500 mb-2" />
          <p className="text-sm font-medium text-emerald-700">All items adequately stocked</p>
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          {oosVisible.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-2">
                Out of Stock <span className="text-red-400 font-normal normal-case tracking-normal">({outOfStockItems.length})</span>
              </p>
              <div className="space-y-1.5">
                {oosVisible.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                    <span className="text-gray-800 font-medium truncate flex-1">{item.stock_item}</span>
                    <span className="text-gray-400 flex-shrink-0">{item.stock_code}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {belowVisible.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2">
                Below Minimum <span className="text-amber-400 font-normal normal-case tracking-normal">({belowMinItems.length})</span>
              </p>
              <div className="space-y-1.5">
                {belowVisible.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                    <span className="text-gray-800 font-medium truncate flex-1">{item.stock_item}</span>
                    <span className="text-gray-400 flex-shrink-0 whitespace-nowrap">
                      {item.current_quantity} / {item.minimum_stock_level}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {totalHidden > 0 && (
            <p className="text-[11px] text-gray-400">+{totalHidden} more — see master list</p>
          )}
        </div>
      )}

      <button
        onClick={() => navigate('/stock/master-list')}
        className="mt-4 pt-3 border-t border-gray-100 w-full flex items-center justify-center gap-1.5 text-xs font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        View Master List <ArrowRight size={11} />
      </button>
    </div>
  );
}
