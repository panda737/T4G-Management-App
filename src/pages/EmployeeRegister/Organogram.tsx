import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Building2, ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { Spinner } from '../../components/Spinner';
import { buildOrgTree, type OrgEmployee, type OrgNode, type OrgTier } from './orgChart';

const DEPT_STYLES: Record<string, { bar: string; chip: string; text: string }> = {
  Admin: { bar: 'bg-indigo-500', chip: 'bg-indigo-50 text-indigo-700', text: 'text-indigo-600' },
  Production: { bar: 'bg-emerald-500', chip: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-600' },
  Logistics: { bar: 'bg-sky-500', chip: 'bg-sky-50 text-sky-700', text: 'text-sky-600' },
  Maintenance: { bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700', text: 'text-amber-600' },
};
const deptStyle = (d: string) => DEPT_STYLES[d] ?? { bar: 'bg-gray-400', chip: 'bg-gray-100 text-gray-600', text: 'text-gray-500' };

const MIN_SCALE = 0.3;
const MAX_SCALE = 2;
const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), hi);

const TREE_CSS = `
.org-canvas { background-color: #fafbfc; background-image: radial-gradient(#e5e7eb 1px, transparent 1px); background-size: 22px 22px; }
.org-tree { display: inline-block; }
.org-tree ul { position: relative; padding: 16px 0 0; white-space: nowrap; margin: 0; text-align: center; }
.org-tree li { display: inline-block; vertical-align: top; text-align: center; list-style: none; position: relative; padding: 16px 7px 0; white-space: normal; }
.org-tree li::before, .org-tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #d4d8df; width: 50%; height: 16px; }
.org-tree li::after { right: auto; left: 50%; border-left: 2px solid #d4d8df; }
.org-tree li:only-child::after, .org-tree li:only-child::before { display: none; }
.org-tree li:only-child { padding-top: 0; }
.org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
.org-tree li:last-child::before { border-right: 2px solid #d4d8df; border-radius: 0 6px 0 0; }
.org-tree li:first-child::after { border-radius: 6px 0 0 0; }
.org-tree > ul { padding-top: 0; }
.org-tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #d4d8df; width: 0; height: 16px; }
`;

function Person({ p, onOpen }: { p: OrgEmployee; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      className="text-[9.5px] text-gray-700 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
      title="View profile"
    >
      {p.first_name} {p.surname}
    </button>
  );
}

function RoleCard({ node, onOpen }: { node: OrgNode; onOpen: (id: string) => void }) {
  const s = deptStyle(node.department);
  return (
    <div className="inline-block w-[150px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden align-top">
      <div className={`h-1 ${s.bar}`} />
      <div className="px-2 pt-1.5 pb-1.5">
        <div className="flex items-center justify-between gap-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-gray-800 leading-tight">{node.title}</p>
          {node.people.length > 1 && (
            <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${s.chip}`}>{node.people.length}</span>
          )}
        </div>
        <p className={`text-[8px] uppercase tracking-wider font-medium ${s.text} mt-0.5`}>{node.department}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {node.people.length === 0 ? (
            <p className="text-[9.5px] text-gray-300 italic px-1 py-0.5">Vacant</p>
          ) : (
            node.people.map((p) => <Person key={p.id} p={p} onOpen={onOpen} />)
          )}
        </div>
      </div>
    </div>
  );
}

function ShiftPoolCard({ tiers, onOpen }: { tiers: OrgTier[]; onOpen: (id: string) => void }) {
  const s = deptStyle('Production');
  const total = tiers.reduce((n, t) => n + t.people.length, 0);
  return (
    <div className="inline-block w-[360px] bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden align-top text-left">
      <div className={`h-1 ${s.bar}`} />
      <div className="px-3 pt-2 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-800">Shift Workforce</p>
          <span className="inline-flex items-center gap-1 text-[9px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
            <Repeat size={9} /> rotates across shifts
          </span>
        </div>
        <p className={`text-[8.5px] uppercase tracking-wider font-medium ${s.text} mt-0.5`}>Production · {total} people</p>
        <div className="mt-1.5 space-y-1.5">
          {tiers.map((t) => (
            <div key={t.position} className="rounded-md border border-gray-100 bg-gray-50/60 p-1.5">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[9.5px] font-bold uppercase tracking-wide text-gray-600">{t.position}</p>
                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${s.chip}`}>{t.people.length}</span>
              </div>
              {t.people.length === 0 ? (
                <p className="text-[9.5px] text-gray-300 italic">Vacant</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {t.people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onOpen(p.id)}
                      className="text-[9.5px] text-gray-700 bg-white border border-gray-200 rounded-full px-1.5 py-0.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
                      title="View profile"
                    >
                      {p.first_name} {p.surname}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Branch({ node, onOpen }: { node: OrgNode; onOpen: (id: string) => void }) {
  return (
    <li>
      {node.kind === 'shiftpool'
        ? <ShiftPoolCard tiers={node.tiers ?? []} onOpen={onOpen} />
        : <RoleCard node={node} onOpen={onOpen} />}
      {node.children.length > 0 && (
        <ul>
          {node.children.map((c) => <Branch key={c.title} node={c} onOpen={onOpen} />)}
        </ul>
      )}
    </li>
  );
}

type View = { x: number; y: number; scale: number };

export default function Organogram() {
  usePageTitle('Staff — Organogram');
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);

  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const movedRef = useRef(false);
  const dragOrigin = useRef({ sx: 0, sy: 0, ox: 0, oy: 0 });

  useEffect(() => { load(); }, []);
  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('employees')
      .select('id, first_name, surname, position')
      .eq('status', 'active');
    setEmployees((data ?? []) as OrgEmployee[]);
    setLoading(false);
  }

  const tree = useMemo(() => buildOrgTree(employees), [employees]);
  const openProfile = (id: string) => {
    if (movedRef.current) return; // suppress navigation that ends a pan
    navigate(`/employees/${id}`);
  };

  const fitToView = useCallback(() => {
    const vp = viewportRef.current, ct = contentRef.current;
    if (!vp || !ct) return;
    const vw = vp.clientWidth, vh = vp.clientHeight;
    const cw = ct.offsetWidth, ch = ct.offsetHeight;
    if (!cw || !ch) return;
    const scale = clamp(Math.min(vw / cw, vh / ch) * 0.94, MIN_SCALE, 1);
    setView({ x: (vw - cw * scale) / 2, y: Math.max((vh - ch * scale) / 2, 16), scale });
  }, []);

  const resetView = useCallback(() => {
    const vp = viewportRef.current, ct = contentRef.current;
    if (!vp || !ct) return;
    setView({ x: Math.max((vp.clientWidth - ct.offsetWidth) / 2, 16), y: 16, scale: 1 });
  }, []);

  const zoomBy = useCallback((factor: number) => {
    setView((v) => {
      const vp = viewportRef.current;
      if (!vp) return v;
      const px = vp.clientWidth / 2, py = vp.clientHeight / 2;
      const scale = clamp(v.scale * factor, MIN_SCALE, MAX_SCALE);
      const k = scale / v.scale;
      return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  // Fit the whole chart on first paint (and whenever the tree changes).
  useEffect(() => {
    if (loading || !tree) return;
    const id = requestAnimationFrame(() => fitToView());
    return () => cancelAnimationFrame(id);
  }, [loading, tree, fitToView]);

  // Wheel-to-zoom, anchored at the cursor (non-passive so we can preventDefault).
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = vp.getBoundingClientRect();
      const px = e.clientX - rect.left, py = e.clientY - rect.top;
      setView((v) => {
        const scale = clamp(v.scale * Math.exp(-e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
        const k = scale / v.scale;
        return { scale, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
      });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, [loading, tree]);

  // Drag-to-pan via window listeners (so the drag continues outside the box).
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const { sx, sy, ox, oy } = dragOrigin.current;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      setView((v) => ({ ...v, x: ox + dx, y: oy + dy }));
    };
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [dragging]);

  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    movedRef.current = false;
    dragOrigin.current = { sx: e.clientX, sy: e.clientY, ox: view.x, oy: view.y };
    setDragging(true);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organogram</h1>
          <p className="text-sm text-gray-500 mt-1">Company structure by role — drag to pan, scroll to zoom, click a name to open their profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(DEPT_STYLES).map(([dept, st]) => (
            <span key={dept} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${st.bar}`} /> {dept}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : !tree ? (
          <div className="py-16 text-center text-sm text-gray-400">
            <Building2 size={28} className="mx-auto text-gray-300 mb-2" />
            No structure to display.
          </div>
        ) : (
          <div className="relative">
            <style>{TREE_CSS}</style>
            <div
              ref={viewportRef}
              onMouseDown={onMouseDown}
              className="org-canvas relative h-[72vh] overflow-hidden select-none"
              style={{ cursor: dragging ? 'grabbing' : 'grab' }}
            >
              <div
                ref={contentRef}
                className="org-tree absolute top-0 left-0 origin-top-left"
                style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`, willChange: dragging ? 'transform' : 'auto' }}
              >
                <ul>
                  <Branch node={tree} onOpen={openProfile} />
                </ul>
              </div>
            </div>

            {/* Zoom controls */}
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-lg border border-gray-200 bg-white/95 backdrop-blur px-1 py-1 shadow-sm">
              <button onClick={() => zoomBy(1 / 1.2)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title="Zoom out"><ZoomOut size={15} /></button>
              <span className="w-11 text-center text-[11px] font-semibold text-gray-600 tabular-nums">{Math.round(view.scale * 100)}%</span>
              <button onClick={() => zoomBy(1.2)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title="Zoom in"><ZoomIn size={15} /></button>
              <span className="w-px h-5 bg-gray-200 mx-0.5" />
              <button onClick={fitToView} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title="Fit to view"><Maximize2 size={15} /></button>
              <button onClick={resetView} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100" title="Reset to 100%"><RotateCcw size={15} /></button>
            </div>

            <div className="absolute bottom-3 left-3 text-[11px] text-gray-400 pointer-events-none select-none">
              Drag to pan · scroll to zoom
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
