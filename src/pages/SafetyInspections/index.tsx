import React, { useEffect, useState } from 'react';
import { ClipboardCheck, Plus, Search, Eye, Edit2, Trash2, AlertCircle, CheckCircle2, HardHat, Shield, Zap, Flame, Truck } from 'lucide-react';
import { supabase, SafetyInspection } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="w-8 h-8 text-amber-600 flex-shrink-0" />
            <h1 className="text-3xl font-bold text-gray-900">Inspections</h1>
          </div>
          <button
            onClick={() => {
              setEditingId(null);
              setFormData({ inspection_date: new Date().toISOString().split('T')[0] });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-amber-600 text-white px-4 py-2 rounded-lg hover:bg-amber-700 transition w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Inspection</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
            <button onClick={loadInspections} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
          </div>
        )}
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(['All', ...STATUS_OPTIONS] as const).map(tab => {
            const count = tab === 'All' ? inspections.length : inspections.filter(i => i.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setFilterStatus(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === tab
                    ? tab === 'Requires Action' ? 'bg-amber-600 text-white shadow-sm'
                      : tab === 'Completed' ? 'bg-emerald-600 text-white shadow-sm'
                      : tab === 'Scheduled' ? 'bg-sky-600 text-white shadow-sm'
                      : 'bg-gray-700 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  filterStatus === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 flex-1">
              <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent outline-none text-sm"
              />
            </div>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm w-full sm:w-auto"
            >
              <option>All</option>
              {INSPECTION_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {[
            { label: 'Total Inspections', value: stats.total, icon: ClipboardCheck, color: 'text-blue-600' },
            { label: 'Avg Compliance', value: `${stats.avgScore}%`, icon: CheckCircle2, color: 'text-emerald-600' },
            { label: 'Requires Action', value: stats.requiresAction, icon: AlertCircle, color: 'text-amber-600' },
            { label: 'Completed', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
              </div>
            </div>
          ))}
        </div>

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
                  <div key={inspection.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{inspection.inspection_number}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(inspection.inspection_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${badgeColor(inspectionStatusColors, inspection.status)}`}>
                        {inspection.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        {TYPE_ICONS[inspection.inspection_type]}
                        <span className="text-gray-600">{inspection.inspection_type}</span>
                      </div>
                      <p><span className="text-gray-600">Area:</span> {inspection.area}</p>
                      <p><span className="text-gray-600">Inspector:</span> {inspection.inspector}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${inspection.score_percentage >= 90 ? 'bg-emerald-500' : inspection.score_percentage >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${inspection.score_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">{inspection.score_percentage}%</span>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => { setViewingId(inspection.id); setShowViewModal(true); }}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingId(inspection.id); setFormData(inspection); setShowAddModal(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(inspection.id, inspection.inspection_number || 'this inspection')}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
