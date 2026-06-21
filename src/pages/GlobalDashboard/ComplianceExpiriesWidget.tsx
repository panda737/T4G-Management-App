import { useNavigate } from 'react-router-dom';
import { Truck, CheckCircle, ArrowRight, Car, User } from 'lucide-react';
import type { ComplianceItem } from './constants';

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysLabel(daysLeft: number) {
  if (daysLeft < 0) return { text: 'Expired', cls: 'text-red-700 bg-red-50 border-red-200' };
  if (daysLeft === 0) return { text: 'Today', cls: 'text-red-700 bg-red-50 border-red-200' };
  if (daysLeft <= 7) return { text: `${daysLeft}d left`, cls: 'text-red-600 bg-red-50 border-red-200' };
  return { text: `${daysLeft}d left`, cls: 'text-amber-600 bg-amber-50 border-amber-200' };
}

export default function ComplianceExpiriesWidget({ items }: { items: ComplianceItem[] }) {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
      <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-50 text-orange-600"><Truck size={16} /></div>
          <h2 className="font-semibold text-gray-900 text-sm">Fleet &amp; Driver Compliance</h2>
        </div>
        {items.length > 0 && (
          <span className="text-xs font-bold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full">{items.length}</span>
        )}
      </div>

      <div className="flex-1 p-4 sm:p-5">
        {items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-6">
            <CheckCircle size={22} className="text-emerald-500 mb-2" />
            <p className="text-sm text-gray-500">All vehicle &amp; driver documents up to date</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map(item => {
              const d = daysLabel(item.daysLeft);
              return (
                <div key={item.id} className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center flex-shrink-0">
                    {item.kind === 'vehicle' ? <Car size={14} /> : <User size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{item.subject}</p>
                    <p className="text-[11px] text-gray-400 truncate">{item.docType} · {fmtDate(item.expiryDate)}</p>
                  </div>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border whitespace-nowrap flex-shrink-0 ${d.cls}`}>
                    {d.text}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={() => navigate('/logistics/vehicles')}
        className="px-4 sm:px-6 py-3 border-t border-gray-100 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
      >
        View fleet <ArrowRight size={12} />
      </button>
    </div>
  );
}
