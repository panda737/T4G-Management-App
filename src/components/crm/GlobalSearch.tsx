import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, MapPin, CornerDownLeft, Loader2, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { SEARCH_OBJECTS, SEARCH_GROUPS, type SearchGroup, type SearchObject } from './searchObjects';

type Scope = 'all' | SearchGroup;

interface Hit {
  id: string;          // unique key (objectKey-rowId)
  obj: SearchObject;
  title: string;
  subtitle: string;
  to: string;
}

const QUICK_LINKS = [
  { icon: Building2, color: 'text-indigo-600', label: 'Browse all Accounts', to: '/commercial/clients' },
  { icon: User, color: 'text-emerald-600', label: 'Browse all Contacts', to: '/commercial/contacts' },
  { icon: MapPin, color: 'text-amber-600', label: 'Browse all Sites', to: '/commercial/sites' },
];

/**
 * Truly-global search. A fixed top-bar box that grows on focus and opens a rich
 * dropdown of grouped results spanning every module (accounts, people, stock, safety,
 * training, maintenance, documents…). Queries fan out over the searchObjects registry.
 * Cmd/Ctrl+K focuses it. Mounted once at the shell; admin-only.
 */
export default function GlobalSearch() {
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // ⌘K / Ctrl-K focuses the search; Esc closes it.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // close the dropdown on an outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  // debounced fan-out search across the registry, scoped to the selected group
  useEffect(() => {
    // strip PostgREST or()-control chars so a typed comma/paren can't break the query
    const needle = q.trim().replace(/[,()]/g, ' ').trim();
    if (needle.length < 2) { setHits([]); setLoading(false); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${needle}%`;
      const objs = SEARCH_OBJECTS.filter(o => scope === 'all' || o.group === scope);
      const settled = await Promise.allSettled(
        objs.map(o =>
          supabase
            .from(o.table)
            .select(o.select)
            .or(o.columns.map(c => `${c}.ilike.${like}`).join(','))
            .limit(5)
            .then(r => ({ o, rows: (r.data ?? []) as any[] })),
        ),
      );
      const out: Hit[] = [];
      settled.forEach(s => {
        if (s.status !== 'fulfilled') return;
        const { o, rows } = s.value;
        rows.forEach(row =>
          out.push({ id: `${o.key}-${row.id}`, obj: o, title: o.title(row), subtitle: o.subtitle(row), to: o.to(row) }));
      });
      setHits(out);
      setActive(0);
      setLoading(false);
    }, 300);
    return () => clearTimeout(t);
  }, [q, scope]);

  function go(to: string) {
    setOpen(false);
    setQ('');
    setHits([]);
    navigate(to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && hits[active]) { e.preventDefault(); go(hits[active].to); }
  }

  if (!isAdmin) return null;

  const needle = q.trim();
  // group hits by object, preserving registry order (== flat hits order for keyboard nav)
  const groups = SEARCH_OBJECTS
    .map(o => ({ obj: o, items: hits.filter(h => h.obj.key === o.key) }))
    .filter(g => g.items.length > 0);

  return (
    <div ref={boxRef} className={`relative w-full transition-all duration-200 ${open ? 'max-w-3xl' : 'max-w-xl'}`}>
      {/* search bar */}
      <div
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}
        className={`flex items-center bg-white rounded-lg shadow-sm cursor-text transition-colors ${
          open ? 'border border-indigo-300 ring-2 ring-indigo-100' : 'border border-gray-200 hover:border-gray-300'
        }`}
      >
        {/* scope selector */}
        <div className="relative flex items-center border-r border-gray-200">
          <select
            value={scope}
            onChange={e => setScope(e.target.value as Scope)}
            onClick={e => e.stopPropagation()}
            aria-label="Search scope"
            className="appearance-none bg-transparent text-sm text-gray-600 font-medium pl-3 pr-7 py-2 rounded-l-lg cursor-pointer focus:outline-none"
          >
            <option value="all">All</option>
            {SEARCH_GROUPS.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-2 text-gray-400 pointer-events-none" />
        </div>

        <Search size={16} className="text-gray-400 ml-3 flex-shrink-0" />
        <input
          ref={inputRef}
          value={q}
          onChange={e => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search across the whole platform…"
          className="flex-1 min-w-0 px-2 py-2 text-sm bg-transparent focus:outline-none placeholder:text-gray-400"
        />
        {loading
          ? <Loader2 size={15} className="animate-spin text-gray-300 mr-3 flex-shrink-0" />
          : <kbd className="mr-3 hidden sm:block text-[10px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-500 flex-shrink-0">⌘K</kbd>}
      </div>

      {/* dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50">
          <div className="max-h-[60vh] overflow-y-auto py-2">
            {needle.length < 2 ? (
              <>
                <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-gray-400">Quick links</div>
                {QUICK_LINKS.map(ql => (
                  <button key={ql.to} onClick={() => go(ql.to)}
                    className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-gray-50">
                    <ql.icon size={16} className={ql.color} />
                    <span className="text-sm text-gray-700">{ql.label}</span>
                  </button>
                ))}
                <p className="px-4 pt-3 pb-1 text-xs text-gray-400">Type at least 2 characters to search every module.</p>
              </>
            ) : !loading && hits.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-gray-400">No matches for “{q}”.</p>
            ) : (
              groups.map(g => {
                const Icon = g.obj.icon;
                return (
                  <div key={g.obj.key} className="mb-1">
                    <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-gray-400">{g.obj.label}</div>
                    {g.items.map(h => {
                      const idx = hits.indexOf(h);
                      return (
                        <button key={h.id} onClick={() => go(h.to)} onMouseEnter={() => setActive(idx)}
                          className={`w-full flex items-center gap-3 px-4 py-2 text-left ${active === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                          <Icon size={16} className={g.obj.color} />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm text-gray-900 truncate">{h.title}</div>
                            <div className="text-xs text-gray-400 truncate">{h.subtitle}</div>
                          </div>
                          {active === idx && <CornerDownLeft size={14} className="text-gray-300" />}
                        </button>
                      );
                    })}
                  </div>
                );
              })
            )}
          </div>
          <div className="border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400 flex items-center gap-4">
            <span className="flex items-center gap-1"><CornerDownLeft size={12} /> select</span>
            <span>↑↓ navigate</span>
            <span>Esc close</span>
          </div>
        </div>
      )}
    </div>
  );
}
