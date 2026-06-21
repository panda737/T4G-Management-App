import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Repeat, Building2 } from 'lucide-react';
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
const initials = (p: OrgEmployee) => `${p.first_name[0] ?? ''}${p.surname[0] ?? ''}`.toUpperCase();

const TREE_CSS = `
.org-tree { display: inline-block; min-width: 100%; }
.org-tree ul { position: relative; padding: 26px 0 0; white-space: nowrap; margin: 0; text-align: center; }
.org-tree li { display: inline-block; vertical-align: top; text-align: center; list-style: none; position: relative; padding: 26px 14px 0; white-space: normal; }
.org-tree li::before, .org-tree li::after { content: ''; position: absolute; top: 0; right: 50%; border-top: 2px solid #d1d5db; width: 50%; height: 26px; }
.org-tree li::after { right: auto; left: 50%; border-left: 2px solid #d1d5db; }
.org-tree li:only-child::after, .org-tree li:only-child::before { display: none; }
.org-tree li:only-child { padding-top: 0; }
.org-tree li:first-child::before, .org-tree li:last-child::after { border: 0 none; }
.org-tree li:last-child::before { border-right: 2px solid #d1d5db; border-radius: 0 6px 0 0; }
.org-tree li:first-child::after { border-radius: 6px 0 0 0; }
.org-tree > ul { padding-top: 0; }
.org-tree ul ul::before { content: ''; position: absolute; top: 0; left: 50%; border-left: 2px solid #d1d5db; width: 0; height: 26px; }
`;

function Person({ p, onOpen }: { p: OrgEmployee; onOpen: (id: string) => void }) {
  return (
    <button
      onClick={() => onOpen(p.id)}
      className="flex items-center gap-2 w-full text-left rounded-md px-1.5 py-1 hover:bg-gray-50 transition-colors group"
      title="View profile"
    >
      <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
        {initials(p)}
      </span>
      <span className="text-xs text-gray-700 group-hover:text-emerald-700 truncate">
        {p.first_name} {p.surname}
      </span>
    </button>
  );
}

function RoleCard({ node, onOpen }: { node: OrgNode; onOpen: (id: string) => void }) {
  const s = deptStyle(node.department);
  return (
    <div className="inline-block w-[210px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden align-top">
      <div className={`h-1.5 ${s.bar}`} />
      <div className="px-3 pt-2.5 pb-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-800 leading-tight">{node.title}</p>
          {node.people.length > 1 && (
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.chip}`}>{node.people.length}</span>
          )}
        </div>
        <p className={`text-[9px] uppercase tracking-wider font-medium ${s.text} mt-0.5`}>{node.department}</p>
        <div className="mt-2 space-y-0.5">
          {node.people.length === 0 ? (
            <p className="text-[11px] text-gray-300 italic px-1.5 py-1">Vacant</p>
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
    <div className="inline-block w-[440px] bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden align-top text-left">
      <div className={`h-1.5 ${s.bar}`} />
      <div className="px-3 pt-2.5 pb-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-800">Shift Workforce</p>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
            <Repeat size={10} /> rotates across shifts
          </span>
        </div>
        <p className={`text-[9px] uppercase tracking-wider font-medium ${s.text} mt-0.5`}>Production · {total} people</p>
        <div className="mt-2 space-y-2">
          {tiers.map((t) => (
            <div key={t.position} className="rounded-lg border border-gray-100 bg-gray-50/60 p-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-600">{t.position}</p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${s.chip}`}>{t.people.length}</span>
              </div>
              {t.people.length === 0 ? (
                <p className="text-[10px] text-gray-300 italic">Vacant</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {t.people.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onOpen(p.id)}
                      className="text-[10px] text-gray-700 bg-white border border-gray-200 rounded-full px-2 py-0.5 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors"
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

export default function Organogram() {
  usePageTitle('Staff — Organogram');
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<OrgEmployee[]>([]);
  const [loading, setLoading] = useState(true);

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
  const openProfile = (id: string) => navigate(`/employees/${id}`);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organogram</h1>
          <p className="text-sm text-gray-500 mt-1">Company structure by role — click a name to open their profile.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {Object.entries(DEPT_STYLES).map(([dept, st]) => (
            <span key={dept} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${st.bar}`} /> {dept}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sm:p-6 overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !tree ? (
          <div className="py-12 text-center text-sm text-gray-400">
            <Building2 size={28} className="mx-auto text-gray-300 mb-2" />
            No structure to display.
          </div>
        ) : (
          <>
            <style>{TREE_CSS}</style>
            <div className="org-tree">
              <ul>
                <Branch node={tree} onOpen={openProfile} />
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
