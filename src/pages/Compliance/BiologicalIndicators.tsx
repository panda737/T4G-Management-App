import { useState, useEffect } from 'react';
import { CheckSquare, Plus, Eye, Trash2, Calendar, AlertCircle, Camera, Search } from 'lucide-react';
import { supabase, BiologicalIndicator } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { PageHeader, Button } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import MobileNavButton from '../../components/MobileNavButton';
import SectionTabs from '../../components/SectionTabs';
import { COMPLIANCE_TABS } from './complianceTabs';
import { BI_PHOTO_BUCKET, COMPACTORS } from './constants';
import BiologicalIndicatorFormModal from './BiologicalIndicatorFormModal';
import BiologicalIndicatorViewModal from './BiologicalIndicatorViewModal';
import OperatorBiologicalIndicator from './OperatorBiologicalIndicator';

// Operators get the focused single-action view; everyone else gets the full tab.
export default function BiologicalIndicators() {
  const { isOperator } = useUser();
  return isOperator ? <OperatorBiologicalIndicator /> : <ManagerBiologicalIndicator />;
}

function ManagerBiologicalIndicator() {
  usePageTitle('Compliance — Biological Indicator');
  const { isAdmin, isManagement } = useUser();
  const canCapture = isAdmin || isManagement; // operators are routed to the focused view above
  const canManage = isAdmin || isManagement;
  const { addToast } = useToast();

  const [records, setRecords] = useState<BiologicalIndicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [compactorFilter, setCompactorFilter] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<BiologicalIndicator | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; photo_path: string | null; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadRecords(); }, []);

  async function loadRecords() {
    try {
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('biological_indicators')
        .select('*')
        .order('captured_date', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRecords(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load records. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = records.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = !q ||
      r.bi_number?.toLowerCase().includes(q) ||
      r.captured_by?.toLowerCase().includes(q) ||
      r.notes?.toLowerCase().includes(q);
    const matchesCompactor = compactorFilter === 'All' || String(r.compactor_no) === compactorFilter;
    const matchesMonth = !monthFilter || r.captured_date?.startsWith(monthFilter);
    return matchesSearch && matchesCompactor && matchesMonth;
  });

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('biological_indicators').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      if (deleteTarget.photo_path) {
        await supabase.storage.from(BI_PHOTO_BUCKET).remove([deleteTarget.photo_path]);
      }
      addToast('Record deleted');
      setSelected(null);
      loadRecords();
    } catch {
      addToast('Could not delete record', 'error');
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={loadRecords} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}

      <PageHeader
        title="Compliance"
        subtitle="Biological indicator checks per compactor"
        icon={CheckSquare}
        accent="teal"
        actions={
          <>
            {canCapture && <Button variant="primary" accent="teal" icon={Plus} onClick={() => setShowForm(true)}>Capture</Button>}
            <MobileNavButton />
          </>
        }
      />

      <SectionTabs tabs={COMPLIANCE_TABS} />

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search…"
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <select
          value={compactorFilter}
          onChange={e => setCompactorFilter(e.target.value)}
          className={`w-full text-sm border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${compactorFilter !== 'All' ? 'border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600'}`}
        >
          <option value="All">All Compactors</option>
          {COMPACTORS.map(n => <option key={n} value={String(n)}>Compactor {n}</option>)}
        </select>
        <div className="relative col-span-2">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 ${monthFilter ? 'border-teal-300 text-teal-700' : 'border-gray-200 text-gray-600'}`}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Camera className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500">No biological indicator records found</p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Record #', 'Date', 'Compactor', 'Captured By', 'Photo', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-sm font-semibold text-gray-700">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => (
                    <tr
                      key={r.id}
                      onClick={() => setSelected(r)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(r); } }}
                      role="button"
                      tabIndex={0}
                      className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer focus:outline-none focus:bg-teal-50"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.bi_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(r.captured_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">Compactor {r.compactor_no}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.captured_by}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.photo_path ? <Camera size={16} className="text-teal-600" /> : '—'}</td>
                      <td className="px-4 py-3 text-sm flex gap-2">
                        <button onClick={e => { e.stopPropagation(); setSelected(r); }} className="text-teal-600 hover:text-teal-700 transition" title="View"><Eye className="w-4 h-4" /></button>
                        {canManage && (
                          <button onClick={e => { e.stopPropagation(); setDeleteTarget({ id: r.id, photo_path: r.photo_path, label: r.bi_number }); }} className="text-red-600 hover:text-red-700 transition" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(r => (
                <button key={r.id} onClick={() => setSelected(r)} className="w-full text-left px-4 py-3 flex items-center gap-3 active:bg-gray-50">
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
                    <Camera size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{r.bi_number}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-50 text-teal-700">Compactor {r.compactor_no}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {new Date(r.captured_date).toLocaleDateString()}{r.captured_by ? ` · ${r.captured_by}` : ''}
                    </p>
                  </div>
                  <Eye size={16} className="text-gray-300 flex-shrink-0" />
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {showForm && (
        <BiologicalIndicatorFormModal
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadRecords(); }}
        />
      )}

      {selected && (
        <BiologicalIndicatorViewModal
          record={selected}
          canManage={canManage}
          onDelete={() => setDeleteTarget({ id: selected.id, photo_path: selected.photo_path, label: selected.bi_number })}
          onClose={() => setSelected(null)}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
