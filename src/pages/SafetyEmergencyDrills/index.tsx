import { useState, useEffect } from 'react';
import { Siren, Plus, Search, Flame, Droplets, Heart, Lock, AlertCircle, Eye, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase, SafetyEmergencyDrill } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { drillStatusColors, badgeColor } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import DrillFormModal, { DrillFormData } from './DrillFormModal';
import DrillViewModal from './DrillViewModal';

const EMPTY_FORM: DrillFormData = {
  drill_date: '',
  drill_type: 'Fire Evacuation',
  location: '',
  coordinator: '',
  coordinator_id: null,
  participants_count: '',
  evacuation_time_seconds: '',
  target_time_seconds: '',
  passed: false,
  observations: '',
  improvements: '',
  next_drill_date: '',
  status: 'Scheduled',
};

function getDrillIcon(type: string) {
  switch (type) {
    case 'Fire Evacuation': return <Flame className="w-4 h-4" />;
    case 'Chemical Spill': return <Droplets className="w-4 h-4" />;
    case 'Medical Emergency': return <Heart className="w-4 h-4" />;
    case 'Lockdown': return <Lock className="w-4 h-4" />;
    default: return <AlertCircle className="w-4 h-4" />;
  }
}

function formatEvacTime(seconds: number | null, target: number | null) {
  if (!seconds || seconds === 0) return '-';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const isGood = target && seconds <= target;
  const color = isGood ? 'text-green-600' : 'text-red-600';
  return <span className={color}>{`${mins}m ${secs}s`}</span>;
}

export default function SafetyEmergencyDrills() {
  const [drills, setDrills] = useState<SafetyEmergencyDrill[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState<SafetyEmergencyDrill | null>(null);
  const [viewingDrill, setViewingDrill] = useState<SafetyEmergencyDrill | null>(null);
  const [formData, setFormData] = useState<DrillFormData>(EMPTY_FORM);
  const { addToast } = useToast();
  const [opError, setOpError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  const filtered = drills.filter(d => {
    if (search && !(
      d.drill_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.location?.toLowerCase().includes(search.toLowerCase()) ||
      d.coordinator?.toLowerCase().includes(search.toLowerCase())
    )) return false;
    if (typeFilter && d.drill_type !== typeFilter) return false;
    if (statusTab !== 'All' && d.status !== statusTab) return false;
    return true;
  });

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const { data, error } = await supabase.from('safety_emergency_drills').select('*').order('drill_date', { ascending: false });
      if (error) throw error;
      setDrills(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load drills. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const handleSaveDrill = async () => {
    const drill_number = editingDrill?.drill_number || await generateSequentialNumber('safety_emergency_drills', 'drill_number', 'DRL');
    const payload = {
      ...formData,
      drill_number,
      participants_count: parseInt(formData.participants_count) || 0,
      evacuation_time_seconds: formData.evacuation_time_seconds ? parseInt(formData.evacuation_time_seconds) : null,
      target_time_seconds: parseInt(formData.target_time_seconds) || 0,
    };

    setOpError('');
    const { error } = editingDrill
      ? await supabase.from('safety_emergency_drills').update(payload).eq('id', editingDrill.id)
      : await supabase.from('safety_emergency_drills').insert([payload]);
    if (error) { setOpError(error.message); return; }

    addToast('Drill saved');
    load();
    handleCloseModal();
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setOpError('');
    const { error } = await supabase.from('safety_emergency_drills').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { setOpError(error.message); return; }
    addToast('Drill deleted');
    load();
  };

  const handleOpenEdit = (drill: SafetyEmergencyDrill) => {
    setEditingDrill(drill);
    setFormData({
      drill_date: drill.drill_date || '',
      drill_type: drill.drill_type || 'Fire Evacuation',
      location: drill.location || '',
      coordinator: drill.coordinator || '',
      coordinator_id: drill.coordinator_id || null,
      participants_count: drill.participants_count?.toString() || '',
      evacuation_time_seconds: drill.evacuation_time_seconds?.toString() || '',
      target_time_seconds: drill.target_time_seconds?.toString() || '',
      passed: drill.passed || false,
      observations: drill.observations || '',
      improvements: drill.improvements || '',
      next_drill_date: drill.next_drill_date || '',
      status: drill.status || 'Scheduled',
    });
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingDrill(null);
    setFormData(EMPTY_FORM);
  };

  const stats = {
    total: drills.length,
    completed: drills.filter(d => d.status === 'Completed').length,
    passRate: drills.filter(d => d.status === 'Completed').length > 0
      ? Math.round((drills.filter(d => d.status === 'Completed' && d.passed).length / drills.filter(d => d.status === 'Completed').length) * 100)
      : 0,
    upcoming: drills.filter(d => d.status === 'Scheduled' && new Date(d.drill_date) >= new Date()).length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mx-4 mt-4 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={load} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}
      {opError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 mx-4 mt-4 rounded-lg">
          {opError}
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-8 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-3">
            <Siren className="w-8 h-8 text-gray-700 flex-shrink-0" />
            <h1 className="text-3xl font-bold text-gray-900">Emergency Drills</h1>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Schedule Drill</span>
            <span className="sm:hidden">Schedule</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(['All', 'Scheduled', 'Completed', 'Cancelled'] as const).map(tab => {
            const count = tab === 'All' ? drills.length : drills.filter(d => d.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === tab
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {tab}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                  statusTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by drill #, location, or coordinator..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            <option value="">All Types</option>
            <option value="Fire Evacuation">Fire Evacuation</option>
            <option value="Chemical Spill">Chemical Spill</option>
            <option value="Medical Emergency">Medical Emergency</option>
            <option value="Lockdown">Lockdown</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Drills', value: stats.total },
            { label: 'Completed', value: stats.completed },
            { label: 'Pass Rate', value: `${stats.passRate}%` },
            { label: 'Upcoming', value: stats.upcoming },
          ].map((stat, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
            </div>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-12">
            <svg className="animate-spin h-8 w-8 text-gray-400" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        )}

        {!loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Drill #</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Coordinator</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Participants</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Evac Time</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Result</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map(drill => (
                    <tr key={drill.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{drill.drill_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{new Date(drill.drill_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-900 flex items-center gap-2">
                        {getDrillIcon(drill.drill_type)}
                        {drill.drill_type}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{drill.location}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{drill.coordinator}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{drill.participants_count}</td>
                      <td className="px-6 py-4 text-sm">{formatEvacTime(drill.evacuation_time_seconds, drill.target_time_seconds)}</td>
                      <td className="px-6 py-4 text-sm">
                        {drill.status === 'Completed' ? (
                          drill.passed ? (
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-4 h-4" /> Passed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" /> Failed
                            </span>
                          )
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${badgeColor(drillStatusColors, drill.status)}`}>
                          {drill.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button onClick={() => { setViewingDrill(drill); setShowViewModal(true); }} className="p-2 hover:bg-gray-100 rounded">
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleOpenEdit(drill)} className="p-2 hover:bg-gray-100 rounded">
                          <Edit2 className="w-4 h-4 text-gray-600" />
                        </button>
                        <button onClick={() => handleDelete(drill.id, drill.drill_number || drill.drill_type)} className="p-2 hover:bg-gray-100 rounded">
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(drill => (
                <div key={drill.id} className="px-4 py-3 flex items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">{drill.drill_number}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${badgeColor(drillStatusColors, drill.status)}`}>{drill.status}</span>
                      {drill.status === 'Completed' && (drill.passed
                        ? <span className="text-[10px] text-emerald-600 font-medium">✓ Passed</span>
                        : <span className="text-[10px] text-red-600 font-medium">✗ Failed</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {new Date(drill.drill_date).toLocaleDateString()} · {drill.drill_type}{drill.location ? ` · ${drill.location}` : ''}{drill.coordinator ? ` · ${drill.coordinator}` : ''}{drill.participants_count ? ` · ${drill.participants_count} participants` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => { setViewingDrill(drill); setShowViewModal(true); }} className="p-2 text-gray-600 hover:bg-gray-50 rounded"><Eye size={15} /></button>
                    <button onClick={() => handleOpenEdit(drill)} className="p-2 text-gray-600 hover:bg-gray-50 rounded"><Edit2 size={15} /></button>
                    <button onClick={() => handleDelete(drill.id, drill.drill_number || drill.drill_type)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showAddModal && (
        <DrillFormModal
          editingDrill={editingDrill}
          formData={formData}
          onChange={setFormData}
          onSave={handleSaveDrill}
          onClose={handleCloseModal}
        />
      )}

      {showViewModal && viewingDrill && (
        <DrillViewModal
          drill={viewingDrill}
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
