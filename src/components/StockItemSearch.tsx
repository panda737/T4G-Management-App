import { useLayoutEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { StockItem } from '../lib/supabase';
import { useOnClickOutside } from '../lib/useOnClickOutside';

interface Props {
  items: StockItem[];
  /** Selected stock item id, or '' when nothing is chosen. */
  value: string;
  onSelect: (item: StockItem) => void;
  onClear: () => void;
  /** Ids picked on other lines, hidden from the results. */
  excludeIds?: string[];
  accent?: 'emerald' | 'blue';
  /** Light the field red (a required line left empty on submit). */
  invalid?: boolean;
}

const ACCENT = {
  emerald: { ring: 'focus:ring-emerald-400', chip: 'border-emerald-300 bg-emerald-50' },
  blue: { ring: 'focus:ring-blue-400', chip: 'border-blue-300 bg-blue-50' },
};

const DESIRED_MAX = 416; // 26rem — preferred dropdown height when there's room

// Strip a trailing "(...)" qualifier so the picker shows a clean product name.
function displayName(item: StockItem) {
  return (item.description || item.stock_item).replace(/\s*\([^)]*\)\s*$/, '').trim();
}

export default function StockItemSearch({ items, value, onSelect, onClear, excludeIds = [], accent = 'emerald', invalid = false }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [maxH, setMaxH] = useState(DESIRED_MAX);
  const containerRef = useRef<HTMLDivElement>(null);
  const a = ACCENT[accent];

  // Click-away closes the dropdown (only while it's actually open).
  useOnClickOutside(containerRef, () => setOpen(false), open);

  // The dropdown always opens downward; we just cap its height to the space left
  // below the field so it stays scrollable and never spills past (and gets clipped
  // by) the modal body — important once a line sits low in a long order.
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const el = containerRef.current;
      if (!el) return;
      const below = window.innerHeight - el.getBoundingClientRect().bottom;
      setMaxH(Math.max(160, Math.min(DESIRED_MAX, below - 16)));
    }
    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
    };
  }, [open]);

  const selected = items.find(i => i.id === value);

  const filtered = (() => {
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    return items
      .filter(i => !excludeIds.includes(i.id))
      .filter(i => {
        if (tokens.length === 0) return true;
        const haystack = `${i.stock_code} ${i.stock_item} ${i.description} ${i.category}`.toLowerCase();
        return tokens.every(t => haystack.includes(t));
      })
      .slice(0, 50);
  })();

  if (selected) {
    return (
      <div className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border-2 text-sm ${a.chip}`}>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-gray-900 text-sm truncate leading-tight">{displayName(selected)}</p>
          <p className="text-[10px] text-gray-500 font-mono leading-tight">{selected.stock_code || '(no code)'} &bull; {selected.category}</p>
        </div>
        <button
          type="button"
          onClick={() => { onClear(); setSearch(''); setOpen(false); }}
          className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0 text-xs underline"
        >
          change
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search and select item..."
          value={search}
          onChange={e => { setSearch(e.target.value); setOpen(true); }}
          onClick={() => setOpen(true)}
          className={`w-full pl-9 pr-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2 bg-white ${a.ring} ${invalid ? 'border-red-400 ring-1 ring-red-300' : 'border-gray-300'}`}
        />
      </div>
      {invalid && !open && (
        <p className="text-[10px] text-red-600 mt-0.5 ml-1">Select an item for this line</p>
      )}
      {open && (
        <div
          className="absolute z-30 left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-y-auto"
          style={{ maxHeight: maxH }}
        >
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-6">No items found</p>
          ) : filtered.map(item => (
            <button
              key={item.id}
              type="button"
              onMouseDown={e => e.preventDefault()}
              onClick={() => { onSelect(item); setSearch(''); setOpen(false); }}
              className="w-full text-left px-3 py-1.5 text-sm border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-medium text-gray-900 truncate">{displayName(item)}</p>
                <p className="text-[10px] text-gray-400 font-mono">{item.stock_code || '(no code)'} &bull; {item.category}</p>
              </div>
              <div className="text-right flex-shrink-0 leading-tight">
                <p className="text-[9px] text-gray-400 uppercase tracking-wide">on hand</p>
                <p className={`text-sm font-bold ${item.current_quantity === 0 ? 'text-red-600' : item.current_quantity <= (item.minimum_stock_level || 0) ? 'text-amber-600' : 'text-gray-700'}`}>{item.current_quantity}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
