import { ArrowLeft, ArrowDownCircle, Package, Building2 } from 'lucide-react';
import { StockReceipt, StockReceiptItem } from '../../lib/supabase';

interface Props {
  receipt: StockReceipt;
  items: StockReceiptItem[];
  onBack: () => void;
}

export default function ReceiptDetailView({ receipt, items, onBack }: Props) {
  const sorted = [...items].sort((a, b) => a.line_no - b.line_no);
  const totalUnits = sorted.reduce((s, i) => s + i.qty_received, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button onClick={onBack} className="mt-1 p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors" title="Back to stock received">
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200">
                <ArrowDownCircle size={13} /> Stock Received
              </span>
              <h1 className="text-2xl font-bold text-gray-900 font-mono">{receipt.receipt_number}</h1>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Goods received note · {new Date(receipt.received_date).toLocaleDateString()}
            </p>
          </div>
        </div>

      </div>

      {/* Supplier / receipt details — the "who we got what from" record */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
          <Building2 size={14} className="text-gray-500" />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Supplier &amp; receipt details</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 p-4">
          <div className="sm:col-span-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Supplier</p>
            <p className="text-sm font-semibold text-gray-900">{receipt.supplier || <span className="text-amber-600">Not recorded</span>}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Supplier Ref / DN No.</p>
            <p className="text-sm font-mono text-gray-800">{receipt.supplier_ref || '—'}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">Received Date</p>
            <p className="text-sm text-gray-800">{new Date(receipt.received_date).toLocaleDateString()}</p>
          </div>
          {receipt.notes && (
            <div className="col-span-2 sm:col-span-4 pt-1 border-t border-gray-100">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5 mt-2">Notes</p>
              <p className="text-sm text-gray-700">{receipt.notes}</p>
            </div>
          )}
        </div>
        {receipt.movement_group_id && (
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <p className="text-[10px] text-gray-400 inline-flex items-center gap-1">
              <Package size={11} /> Stock movement recorded — see Movements for group{' '}
              <span className="font-mono">Stock Received · {receipt.receipt_number}</span>.
            </p>
          </div>
        )}
      </div>

      {/* Items table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-medium w-10">#</th>
                <th className="text-left px-4 py-3 font-medium w-28">Code</th>
                <th className="text-left px-4 py-3 font-medium">Item</th>
                <th className="text-center px-3 py-3 font-medium w-16">Unit</th>
                <th className="text-center px-3 py-3 font-medium w-24">Received</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map(item => (
                <tr key={item.id}>
                  <td className="px-4 py-2.5 text-xs text-gray-400 font-bold">{item.line_no + 1}</td>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{item.stock_code || '—'}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-900">{item.stock_item}</p>
                    {item.description && <p className="text-xs text-gray-400 truncate max-w-md">{item.description}</p>}
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs text-gray-500">{item.unit_of_measure || '—'}</td>
                  <td className="px-3 py-2.5 text-center font-bold text-emerald-700">+{item.qty_received}</td>
                </tr>
              ))}
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td colSpan={4} className="px-4 py-2.5 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Total units</td>
                <td className="px-3 py-2.5 text-center font-extrabold text-emerald-700">+{totalUnits}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
