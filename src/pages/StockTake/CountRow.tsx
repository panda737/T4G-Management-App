import { useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { StockTakeLineItem } from '../../lib/supabase';

interface CountRowProps {
  line: StockTakeLineItem;
  odd: boolean;
  isReadOnly: boolean;
  onSave: (id: string, counted: number | null, comment: string) => Promise<void>;
}

export default function CountRow({ line, odd, isReadOnly, onSave }: CountRowProps) {
  const [counted, setCounted] = useState<string>(line.counted_quantity !== null ? String(line.counted_quantity) : '');
  const [comment, setComment] = useState(line.comment || '');

  const countedNum = counted === '' ? null : Number(counted);
  const variance = countedNum !== null ? countedNum - line.system_quantity : null;
  const hasCounted = countedNum !== null;

  function handleBlur() {
    onSave(line.id, countedNum, comment);
  }

  const rowBg = hasCounted
    ? variance !== 0 ? (odd ? 'bg-amber-50/60' : 'bg-amber-50/30') : (odd ? 'bg-emerald-50/40' : 'bg-emerald-50/20')
    : (odd ? 'bg-gray-50/40' : 'bg-white');

  return (
    <tr className={`${rowBg} hover:bg-blue-50/30 transition-colors`}>
      <td className="px-5 py-2 font-mono text-xs text-gray-500">{line.stock_code || '—'}</td>
      <td className="px-4 py-2 text-gray-800 text-xs leading-tight">
        {line.description?.replace(/\s*\([^)]*\)\s*$/, '').trim() || line.stock_item}
      </td>
      <td className="px-4 py-2 text-center">
        <span className="inline-block bg-gray-100 text-gray-700 font-semibold text-sm px-3 py-0.5 rounded-md min-w-[3rem]">
          {line.system_quantity}
        </span>
      </td>
      <td className="px-4 py-2 text-center">
        {isReadOnly ? (
          <span className="font-semibold text-gray-800">{counted !== '' ? counted : '—'}</span>
        ) : (
          <input
            type="number"
            min="0"
            value={counted}
            onChange={e => setCounted(e.target.value)}
            onBlur={handleBlur}
            placeholder="—"
            className={`w-24 text-center border rounded-lg px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-2 transition-colors ${
              hasCounted && variance !== 0
                ? 'border-amber-300 bg-amber-50 text-amber-800 focus:ring-amber-400'
                : hasCounted
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 focus:ring-emerald-400'
                : 'border-gray-200 bg-white text-gray-800 focus:ring-emerald-400'
            }`}
          />
        )}
      </td>
      <td className="px-4 py-2 text-center">
        {variance !== null ? (
          <span className={`inline-flex items-center gap-0.5 text-sm font-bold ${
            variance > 0 ? 'text-emerald-600' : variance < 0 ? 'text-red-600' : 'text-gray-400'
          }`}>
            {variance > 0 ? <TrendingUp size={13} /> : variance < 0 ? <TrendingDown size={13} /> : <Minus size={13} />}
            {variance > 0 ? `+${variance}` : variance}
          </span>
        ) : <span className="text-gray-300 text-xs">—</span>}
      </td>
      <td className="px-4 py-2">
        {isReadOnly ? (
          <span className="text-xs text-gray-500">{comment || '—'}</span>
        ) : (
          <input
            type="text"
            value={comment}
            onChange={e => setComment(e.target.value)}
            onBlur={handleBlur}
            placeholder="Optional note..."
            className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        )}
      </td>
    </tr>
  );
}
