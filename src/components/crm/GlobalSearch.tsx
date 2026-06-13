import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, User, MapPin, CornerDownLeft, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';

type ResultKind = 'account' | 'contact' | 'site';
interface Result {
  kind: ResultKind;
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

const KIND_META: Record<ResultKind, { icon: React.ElementType; label: string; color: string }> = {
  account: { icon: Building2, label: 'Accounts', color: 'text-indigo-600' },
  contact: { icon: User, label: 'Contacts', color: 'text-emerald-600' },
  site: { icon: MapPin, label: 'Sites', color: 'text-amber-600' },
};

/**
 * Cmd/Ctrl+K command palette searching CRM accounts, contacts and sites.
 * Mounted once at the app shell. Admin-only (Commercial is admin-gated).
 */
export default function GlobalSearch() {
  const { isAdmin } = useUser();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // global hotkey
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (open) { setTimeout(() => inputRef.current?.focus(), 30); }
    else { setQ(''); setResults([]); setActive(0); }
  }, [open]);

  // debounced search
  useEffect(() => {
    if (!open) return;
    const needle = q.trim();
    if (needle.length < 2) { setResults([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      const like = `%${needle}%`;
      const [acc, con, sit] = await Promise.all([
        supabase.from('clients').select('id, client_name, client_code').ilike('client_name', like).order('client_name').limit(6),
        supabase.from('crm_contacts').select('id, client_id, first_name, last_name, email').or(`first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`).limit(6),
        supabase.from('client_sites').select('id, client_id, generator_facility').ilike('generator_facility', like).order('generator_facility').limit(6),
      ]);
      const out: Result[] = [];
      (acc.data ?? []).forEach((c: { id: string; client_name: string; client_code: string }) =>
        out.push({ kind: 'account', id: c.id, title: c.client_name, subtitle: c.client_code || 'Account', to: `/commercial/clients/${c.id}` }));
      (con.data ?? []).forEach((c: { id: string; client_id: string; first_name: string; last_name: string; email: string }) =>
        out.push({ kind: 'contact', id: c.id, title: `${c.first_name} ${c.last_name}`.trim() || c.email, subtitle: c.email || 'Contact', to: `/commercial/clients/${c.client_id}` }));
      (sit.data ?? []).forEach((s: { id: string; client_id: string; generator_facility: string }) =>
        out.push({ kind: 'site', id: s.id, title: s.generator_facility, subtitle: 'Site', to: `/commercial/sites/${s.id}` }));
      setResults(out);
      setActive(0);
      setLoading(false);
    }, 200);
    return () => clearTimeout(t);
  }, [q, open]);

  function go(r: Result) {
    setOpen(false);
    navigate(r.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]); }
  }

  if (!isAdmin) return null;

  // grouped for display
  const groups = (['account', 'contact', 'site'] as ResultKind[])
    .map(k => ({ kind: k, items: results.filter(r => r.kind === k) }))
    .filter(g => g.items.length > 0);

  return (
    <>
      {/* trigger pill (desktop) */}
      <button onClick={() => setOpen(true)}
        className="hidden lg:flex fixed top-3 right-4 z-30 items-center gap-2 text-sm text-gray-400 bg-white border border-gray-200 rounded-lg px-3 py-1.5 shadow-sm hover:border-gray-300 print:hidden">
        <Search size={14} /> Search… <kbd className="text-[10px] bg-gray-100 rounded px-1.5 py-0.5 text-gray-500">⌘K</kbd>
      </button>

      {open && (
        <div className="fixed inset-0 z-[120] flex items-start justify-center pt-[12vh] px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center gap-2 px-4 border-b border-gray-100">
              <Search size={18} className="text-gray-400" />
              <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKeyDown}
                placeholder="Search accounts, contacts, sites…"
                className="flex-1 py-3.5 text-sm focus:outline-none" />
              {loading && <Loader2 size={16} className="animate-spin text-gray-300" />}
            </div>

            <div className="max-h-[55vh] overflow-y-auto py-2">
              {q.trim().length < 2 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">Type at least 2 characters…</p>
              ) : !loading && results.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-gray-400">No matches for “{q}”.</p>
              ) : (
                groups.map(g => {
                  const meta = KIND_META[g.kind];
                  return (
                    <div key={g.kind} className="mb-1">
                      <div className="px-4 py-1 text-[11px] uppercase tracking-wider text-gray-400">{meta.label}</div>
                      {g.items.map(r => {
                        const idx = results.indexOf(r);
                        return (
                          <button key={`${r.kind}-${r.id}`} onClick={() => go(r)} onMouseEnter={() => setActive(idx)}
                            className={`w-full flex items-center gap-3 px-4 py-2 text-left ${active === idx ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}>
                            <meta.icon size={16} className={meta.color} />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm text-gray-900 truncate">{r.title}</div>
                              <div className="text-xs text-gray-400 truncate">{r.subtitle}</div>
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
          </div>
        </div>
      )}
    </>
  );
}
