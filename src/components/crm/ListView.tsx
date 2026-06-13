import { useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Download, ChevronUp, ChevronDown, ChevronRight,
  Columns3, Check, Bookmark, Save, Trash2, X,
} from 'lucide-react';
import { supabase, type CrmSavedView } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../Spinner';
import { downloadCsv } from './crmUtils';

export interface Column<T> {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortValue?: (row: T) => string | number;
  exportValue?: (row: T) => string | number;
  align?: 'left' | 'right' | 'center';
  defaultHidden?: boolean;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  predicate: (row: T, value: string) => boolean;
}

export interface BulkAction<T> {
  label: string;
  icon?: React.ElementType;
  onClick: (rows: T[]) => void;
  danger?: boolean;
}

interface SortState { key: string; dir: 'asc' | 'desc' }
interface ViewConfig {
  search?: string;
  filters?: Record<string, string>;
  sort?: SortState | null;
  hidden?: string[];
}

interface ListViewProps<T> {
  /** Stable key used to scope saved views, e.g. 'accounts' | 'contacts' | 'sites'. */
  objectKey: string;
  title?: string;
  subtitle?: string;
  rows: T[];
  columns: Column<T>[];
  rowId: (row: T) => string;
  /** Text blob used for the free-text search box. */
  search: (row: T) => string;
  loading?: boolean;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  bulkActions?: BulkAction<T>[];
  onRowClick?: (row: T) => void;
  onNew?: () => void;
  newLabel?: string;
  pageSize?: number;
  savedViews?: boolean;
  exportName?: string;
  toolbarExtra?: React.ReactNode;
  emptyMessage?: string;
}

const alignCls = (a?: 'left' | 'right' | 'center') =>
  a === 'right' ? 'text-right' : a === 'center' ? 'text-center' : 'text-left';

export default function ListView<T>(props: ListViewProps<T>) {
  const {
    objectKey, title, subtitle, rows, columns, rowId, search,
    loading, searchPlaceholder = 'Search…', filters = [], bulkActions = [],
    onRowClick, onNew, newLabel = 'New', pageSize = 25,
    savedViews = true, exportName, toolbarExtra, emptyMessage = 'No records match.',
  } = props;

  const { profile, canWrite } = useUser();
  const { addToast } = useToast();
  const canEdit = canWrite('commercial');

  const [q, setQ] = useState('');
  const [filterVals, setFilterVals] = useState<Record<string, string>>({});
  const [sort, setSort] = useState<SortState | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(
    () => new Set(columns.filter(c => c.defaultHidden).map(c => c.key)),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);
  const [colMenu, setColMenu] = useState(false);
  const [viewMenu, setViewMenu] = useState(false);
  const [views, setViews] = useState<CrmSavedView[]>([]);
  const [activeView, setActiveView] = useState<string | null>(null);
  const [newViewName, setNewViewName] = useState('');
  const [shareView, setShareView] = useState(false);

  // ── saved views ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!savedViews) return;
    supabase.from('crm_saved_views').select('*').eq('object_key', objectKey).order('name')
      .then(({ data }) => setViews((data ?? []) as CrmSavedView[]));
  }, [objectKey, savedViews]);

  function applyView(v: CrmSavedView) {
    const cfg = (v.config ?? {}) as ViewConfig;
    setQ(cfg.search ?? '');
    setFilterVals(cfg.filters ?? {});
    setSort(cfg.sort ?? null);
    setHidden(new Set(cfg.hidden ?? []));
    setActiveView(v.id);
    setPage(0);
    setViewMenu(false);
  }

  async function saveView() {
    const name = newViewName.trim();
    if (!name) return;
    const config: ViewConfig = { search: q, filters: filterVals, sort, hidden: [...hidden] };
    const { data, error } = await supabase.from('crm_saved_views')
      .insert({ object_key: objectKey, name, config, is_shared: shareView, owner_id: profile?.auth_user_id })
      .select().single();
    if (error) { addToast('Could not save view: ' + error.message, 'error'); return; }
    setViews(prev => [...prev, data as CrmSavedView].sort((a, b) => a.name.localeCompare(b.name)));
    setActiveView((data as CrmSavedView).id);
    setNewViewName(''); setShareView(false); setViewMenu(false);
    addToast('View saved');
  }

  async function deleteView(id: string) {
    const { error } = await supabase.from('crm_saved_views').delete().eq('id', id);
    if (error) { addToast('Could not delete view: ' + error.message, 'error'); return; }
    setViews(prev => prev.filter(v => v.id !== id));
    if (activeView === id) setActiveView(null);
  }

  // ── derive rows ───────────────────────────────────────────────────────────
  const visibleCols = columns.filter(c => !hidden.has(c.key));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = rows.filter(r => {
      if (needle && !search(r).toLowerCase().includes(needle)) return false;
      for (const f of filters) {
        const v = filterVals[f.key];
        if (v && !f.predicate(r, v)) return false;
      }
      return true;
    });
    if (sort) {
      const col = columns.find(c => c.key === sort.key);
      const get = col?.sortValue;
      if (get) {
        out = [...out].sort((a, b) => {
          const av = get(a), bv = get(b);
          const cmp = typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv));
          return sort.dir === 'asc' ? cmp : -cmp;
        });
      }
    }
    return out;
  }, [rows, q, filterVals, sort, filters, columns, search]);

  // reset page when result set shrinks
  useEffect(() => { setPage(0); }, [q, filterVals, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const paged = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const allFilteredIds = useMemo(() => filtered.map(rowId), [filtered, rowId]);
  const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id));
  const selectedRows = filtered.filter(r => selected.has(rowId(r)));

  function toggleRow(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected(prev => {
      if (allSelected) { const n = new Set(prev); allFilteredIds.forEach(id => n.delete(id)); return n; }
      return new Set([...prev, ...allFilteredIds]);
    });
  }
  function setSortKey(key: string) {
    setSort(prev => prev?.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' });
  }
  function exportCsv() {
    const cols = visibleCols;
    const headers = cols.map(c => c.header);
    const data = filtered.map(r => cols.map(c => {
      if (c.exportValue) return c.exportValue(r);
      const v = c.cell(r);
      return typeof v === 'string' || typeof v === 'number' ? v : '';
    }));
    downloadCsv(exportName || objectKey, headers, data);
  }

  const showBulk = bulkActions.length > 0 && canEdit;

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-4">
      {(title || onNew) && (
        <div className="flex items-start justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-bold text-gray-900">{title}</h1>}
            {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
          </div>
          {onNew && canEdit && (
            <button onClick={onNew}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg font-medium shadow-sm flex-shrink-0">
              <Plus size={16} /> {newLabel}
            </button>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder={searchPlaceholder}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        </div>

        {filters.map(f => (
          <select key={f.key} value={filterVals[f.key] ?? ''}
            onChange={e => setFilterVals(prev => ({ ...prev, [f.key]: e.target.value }))}
            className={`text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${filterVals[f.key] ? 'border-indigo-300 text-indigo-700' : 'border-gray-200 text-gray-600'}`}>
            <option value="">{f.label}: All</option>
            {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        ))}

        {toolbarExtra}

        <div className="flex items-center gap-2 ml-auto">
          {savedViews && (
            <div className="relative">
              <button onClick={() => { setViewMenu(v => !v); setColMenu(false); }}
                className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700">
                <Bookmark size={15} className={activeView ? 'text-indigo-600' : 'text-gray-400'} />
                {activeView ? views.find(v => v.id === activeView)?.name ?? 'View' : 'Views'}
                <ChevronDown size={14} className="text-gray-400" />
              </button>
              {viewMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setViewMenu(false)} />
                  <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-2">
                    <button onClick={() => { setQ(''); setFilterVals({}); setSort(null); setActiveView(null); setViewMenu(false); }}
                      className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50 text-gray-600">All records (reset)</button>
                    {views.length > 0 && <div className="border-t border-gray-100 my-1" />}
                    {views.map(v => (
                      <div key={v.id} className="flex items-center group">
                        <button onClick={() => applyView(v)}
                          className={`flex-1 text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50 ${activeView === v.id ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}>
                          {v.name}{v.is_shared && <span className="ml-1 text-[10px] text-gray-400">shared</span>}
                        </button>
                        <button onClick={() => deleteView(v.id)} title="Delete view"
                          className="p-1.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={13} /></button>
                      </div>
                    ))}
                    {canEdit && (
                      <div className="border-t border-gray-100 mt-1 pt-2 px-1">
                        <input value={newViewName} onChange={e => setNewViewName(e.target.value)} placeholder="Save current as…"
                          className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 mb-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 cursor-pointer">
                          <input type="checkbox" checked={shareView} onChange={e => setShareView(e.target.checked)} className="rounded border-gray-300" /> Share with team
                        </label>
                        <button onClick={saveView} disabled={!newViewName.trim()}
                          className="w-full flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm px-2 py-1.5 rounded">
                          <Save size={13} /> Save view
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="relative">
            <button onClick={() => { setColMenu(c => !c); setViewMenu(false); }}
              className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700">
              <Columns3 size={15} className="text-gray-400" /> Columns
            </button>
            {colMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setColMenu(false)} />
                <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 p-1.5 max-h-72 overflow-y-auto">
                  {columns.map(c => {
                    const on = !hidden.has(c.key);
                    return (
                      <button key={c.key} onClick={() => setHidden(prev => { const n = new Set(prev); on ? n.add(c.key) : n.delete(c.key); return n; })}
                        className="w-full flex items-center gap-2 text-sm px-2 py-1.5 rounded hover:bg-gray-50 text-gray-700">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${on ? 'bg-indigo-600 border-indigo-600' : 'border-gray-300'}`}>
                          {on && <Check size={12} className="text-white" />}
                        </span>
                        {c.header}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <button onClick={exportCsv} title="Export CSV"
            className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 text-gray-700">
            <Download size={15} className="text-gray-400" /> Export
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {showBulk && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2">
          <span className="text-sm text-indigo-900 font-medium">{selected.size} selected</span>
          {bulkActions.map((a, i) => (
            <button key={i} onClick={() => a.onClick(selectedRows)}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-medium ${a.danger ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100'}`}>
              {a.icon && <a.icon size={14} />} {a.label}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto text-indigo-400 hover:text-indigo-700"><X size={16} /></button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-800 text-white">
                {showBulk && (
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded border-gray-300" />
                  </th>
                )}
                {visibleCols.map(c => (
                  <th key={c.key}
                    onClick={() => c.sortValue && setSortKey(c.key)}
                    className={`px-4 py-2.5 text-[11px] font-medium uppercase tracking-wider ${alignCls(c.align)} ${c.sortValue ? 'cursor-pointer select-none hover:bg-gray-700' : ''}`}>
                    <span className="inline-flex items-center gap-1">
                      {c.header}
                      {sort?.key === c.key && (sort.dir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                    </span>
                  </th>
                ))}
                {onRowClick && <th className="px-4 py-2.5 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paged.length === 0 ? (
                <tr><td colSpan={visibleCols.length + (showBulk ? 1 : 0) + (onRowClick ? 1 : 0)}
                  className="px-4 py-10 text-center text-sm text-gray-400">{emptyMessage}</td></tr>
              ) : paged.map((r, i) => {
                const id = rowId(r);
                const sel = selected.has(id);
                return (
                  <tr key={id}
                    onClick={onRowClick ? () => onRowClick(r) : undefined}
                    className={`${onRowClick ? 'cursor-pointer hover:bg-indigo-50' : ''} transition-colors ${sel ? 'bg-indigo-50/60' : i % 2 ? 'bg-gray-50/40' : 'bg-white'}`}>
                    {showBulk && (
                      <td className="px-3 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={sel} onChange={() => toggleRow(id)} className="rounded border-gray-300" />
                      </td>
                    )}
                    {visibleCols.map(c => (
                      <td key={c.key} className={`px-4 py-2.5 text-gray-700 ${alignCls(c.align)}`}>{c.cell(r)}</td>
                    ))}
                    {onRowClick && <td className="px-4 py-2.5 text-gray-300"><ChevronRight size={15} /></td>}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer / pagination */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
          <span>
            {filtered.length === 0 ? '0' : `${safePage * pageSize + 1}–${Math.min(filtered.length, safePage * pageSize + pageSize)}`} of {filtered.length}
          </span>
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button disabled={safePage === 0} onClick={() => setPage(p => p - 1)}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Prev</button>
              <span className="px-2">Page {safePage + 1} / {pageCount}</span>
              <button disabled={safePage >= pageCount - 1} onClick={() => setPage(p => p + 1)}
                className="px-2 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
