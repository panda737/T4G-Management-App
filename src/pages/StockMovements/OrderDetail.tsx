import { OrderGroup, INCREASE_TYPES, DECREASE_TYPES, directionColor, qtySign } from './constants';
import { MovementIcon } from './MovementIcon';

interface Props {
  group: OrderGroup;
  onBack: () => void;
}

export default function OrderDetail({ group, onBack }: Props) {
  const c = directionColor(group.movementType);
  const isIncrease = INCREASE_TYPES.includes(group.movementType);
  const isDecrease = DECREASE_TYPES.includes(group.movementType);

  return (
    <div className="space-y-5">
      <div>
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-800 mb-2 transition-colors">
          ← Back to movements
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded font-semibold ${c.badge}`}>
                <MovementIcon type={group.movementType} size={13} />
                {group.movementType}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              {group.label !== group.movementType ? group.label : group.reference || group.movementType}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 flex-wrap">
              <span>{new Date(group.date).toLocaleString([], { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              {group.reference && <span>&bull; Ref: <strong>{group.reference}</strong></span>}
              {group.supplierClient && <span>&bull; {group.supplierClient}</span>}
              {group.capturedBy && <span>&bull; By: {group.capturedBy}</span>}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-center shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{group.itemCount}</p>
              <p className="text-xs text-gray-500">Line items</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${isIncrease ? 'text-emerald-700' : isDecrease ? 'text-red-600' : 'text-amber-700'}`}>
                {isIncrease ? '+' : isDecrease ? '-' : ''}{group.totalQty}
              </p>
              <p className="text-xs text-gray-500">Total units</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <div className={`px-5 py-2.5 ${isIncrease ? 'bg-emerald-700' : isDecrease ? 'bg-red-600' : 'bg-amber-600'}`}>
          <span className="text-xs font-bold text-white uppercase tracking-widest">Line Items</span>
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-28">Code</th>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500">Item</th>
                <th className="text-center px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500 w-24">Qty</th>
                <th className="text-left px-4 py-2 font-semibold text-xs uppercase tracking-wider text-gray-500">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {group.lines.map((line, idx) => (
                <tr key={line.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                  <td className="px-5 py-2.5 font-mono text-xs text-gray-500">{line.stock_code || '—'}</td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-gray-800">{line.stock_items?.stock_item || '—'}</p>
                    {line.stock_items?.description && <p className="text-xs text-gray-400 truncate max-w-sm">{line.stock_items.description}</p>}
                  </td>
                  <td className="px-4 py-2.5 text-center font-bold">
                    <span className={isIncrease ? 'text-emerald-700' : isDecrease ? 'text-red-600' : 'text-amber-700'}>
                      {qtySign(line.movement_type, line.quantity)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{line.notes || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="md:hidden divide-y divide-gray-100">
          {group.lines.map((line) => (
            <div key={line.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-gray-500 mb-1">{line.stock_code || '—'}</p>
                  <p className="font-semibold text-sm text-gray-900">{line.stock_items?.stock_item || '—'}</p>
                  {line.stock_items?.description && <p className="text-xs text-gray-400 mt-0.5">{line.stock_items.description}</p>}
                </div>
                <span className={`font-bold text-sm flex-shrink-0 ${isIncrease ? 'text-emerald-700' : isDecrease ? 'text-red-600' : 'text-amber-700'}`}>
                  {qtySign(line.movement_type, line.quantity)}
                </span>
              </div>
              {line.notes && <p className="text-xs text-gray-500">{line.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
