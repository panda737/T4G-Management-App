import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Eye, Edit2, Trash2, AlertCircle, CheckCircle2, HardHat, Shield, Zap, Flame, Truck } from 'lucide-react';
import { supabase, SafetyInspection } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, FilterTabs, StatStrip } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { inspectionStatusColors, badgeColor } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import InspectionFormModal from './InspectionFormModal';
import InspectionViewModal from './InspectionViewModal';

const INSPECTION_TYPES = ['Site Walk', 'PPE Check', 'Equipment', 'Fire Safety', 'Housekeeping', 'Vehicle'];
const STATUS_OPTIONS = ['Scheduled', 'Completed', 'Requires Action'];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  'Site Walk': <Eye className="w-4 h-4" />,
  'PPE Check': <Shield className="w-4 h-4" />,
  'Equipment': <Zap className="w-4 h-4" />,
  'Fire Safety': <Flame className="w-4 h-4" />,
  'Housekeeping': <HardHat className="w-4 h-4" />,
  'Vehicle': <Truck className="w-4 h-4" />,
};

export default function SafetyInspections() {
  usePageTitle('Safety — Inspections');
  const [inspections, setInspections] = useState<SafetyInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<SafetyInspection>>({
    inspection_date: new Date().toISOString().split('T')[0],
    items_checked: 0,
    items_passed: 0,
  });
  const { addToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    loadInspections();
  }, []);

  const loadInspections = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('safety_inspections')
        .select('*')
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      setInspections(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load inspections. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const score = formData.items_checked && formData.items_passed
        ? Math.round((formData.items_passed / formData.items_checked) * 100)
        : formData.score_percentage || 0;

      const inspection_number = editingId
        ? formData.inspection_number
        : await generateSequentialNumber('safety_inspections', 'inspection_number', 'INS');

      const data = {
        ...formData,
        inspection_number,
        score_percentage: score,
      };

      if (editingId) {
        const { error } = await supabase.from('safety_inspections').update(data).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('safety_inspections').insert([data]);
        if (error) throw error;
      }

      addToast('Inspection saved');
      setShowAddModal(false);
      setEditingId(null);
      setFormData({ inspection_date: new Date().toISOString().split('T')[0] });
      loadInspections();
    } catch (error) {
      console.error('Error saving inspection:', error);
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('safety_inspections').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Inspection deleted');
      loadInspections();
    } catch (error) {
      console.error('Error deleting inspection:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filtered = inspections.filter(i => {
    const matchesSearch =
      i.inspection_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.area?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.inspector?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.findings?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'All' || i.inspection_type === filterType;
    const matchesStatus = filterStatus === 'All' || i.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const stats = {
    total: inspections.length,
    avgScore: Math.round(inspections.reduce((sum, i) => sum + (i.score_percentage || 0), 0) / (inspections.length || 1)),
    requiresAction: inspections.filter(i => i.status === 'Requires Action').length,
    completed: inspections.filter(i => i.status === 'Completed').length,
  };

  const currentInspection = viewingId ? inspections.find(i => i.id === viewingId) : null;

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={loadInspections} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}

      <PageHeader
        title="Inspections"
        subtitle={`${inspections.length} inspection${inspections.length !== 1 ? 's' : ''}`}
        icon={ClipboardCheck}
        accent="amber"
        actions={
          <Button variant="primary" accent="amber" icon={Plus} onClick={() => {
            setEditingId(null);
            setFormData({ inspection_date: new Date().toISOString().split('T')[0] });
            setShowAddModal(true);
          }}>New Inspection</Button>
        }
      />

      <FilterTabs
        accent="amber"
        value={filterStatus}
        onChange={setFilterStatus}
        tabs={['All', ...STATUS_OPTIONS].map(tab => ({
          value: tab,
          label: tab,
          count: tab === 'All' ? inspections.length : inspections.filter(i => i.status === tab).length,
        }))}
      />

      <Toolbar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search inspections…" />
        <FilterSelect value={filterType} onChange={setFilterType} accent="amber">
          <option value="All">All Types</option>
          {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </FilterSelect>
      </Toolbar>

      <StatStrip
        accent="amber"
        stats={[
          { label: 'Total', value: stats.total, icon: ClipboardCheck },
          { label: 'Avg Compliance', value: `${stats.avgScore}%`, icon: CheckCircle2, valueClass: 'text-emerald-600' },
          { label: 'Requires Action', value: stats.requiresAction, icon: AlertCircle, valueClass: 'text-amber-600' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle2, valueClass: 'text-emerald-600' },
        ]}
      />

      {/* Table & Mobile Cards */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Inspection #</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Area</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Inspector</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Next Due</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">Loading...</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-gray-500">No inspections found</td>
                  </tr>
                ) : (
                  filtered.map(inspection => (
                    <tr key={inspection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{inspection.inspection_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(inspection.inspection_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          {TYPE_ICONS[inspection.inspection_type]}
                          {inspection.inspection_type}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{inspection.area}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{inspection.inspector}</td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${inspection.score_percentage >= 90 ? 'bg-emerald-500' : inspection.score_percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${inspection.score_percentage}%` }}
                            />
                          </div>
                          <span className="font-medium">{inspection.score_percentage}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeColor(inspectionStatusColors, inspection.status)}`}>
                          {inspection.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {inspection.next_inspection_date ? new Date(inspection.next_inspection_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => { setViewingId(inspection.id); setShowViewModal(true); }}
                          className="text-amber-600 hover:text-amber-700"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => { setEditingId(inspection.id); setFormData(inspection); setShowAddModal(true); }}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(inspection.id, inspection.inspection_number || 'this inspection')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No inspections found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.map(inspection => (
                  <div key={inspection.id} className="px-4 py-3 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{inspection.inspection_number}</span>
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${badgeColor(inspectionStatusColors, inspection.status)}`}>{inspection.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {new Date(inspection.inspection_date).toLocaleDateString()} · {inspection.inspection_type}{inspection.area ? ` · ${inspection.area}` : ''}{inspection.inspector ? ` · ${inspection.inspector}` : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${inspection.score_percentage >= 90 ? 'bg-emerald-500' : inspection.score_percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${inspection.score_percentage}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-700 whitespace-nowrap">{inspection.score_percentage}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => { setViewingId(inspection.id); setShowViewModal(true); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded"><Eye size={15} /></button>
                      <button onClick={() => { setEditingId(inspection.id); setFormData(inspection); setShowAddModal(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={15} /></button>
                      <button onClick={() => handleDelete(inspection.id, inspection.inspection_number || 'this inspection')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {showAddModal && (
        <InspectionFormModal
          editingId={editingId}
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {showViewModal && currentInspection && (
        <InspectionViewModal
          inspection={currentInspection}
          onClose={() => setShowViewModal(false)}
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
