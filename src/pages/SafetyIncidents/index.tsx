import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Eye, Trash2, Search, Calendar, AlertCircle, Download, Pencil } from 'lucide-react';
import { supabase, SafetyIncident } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { severityColors, incidentStatusColors, badgeColor } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import IncidentFormModal, { IncidentFormData } from './IncidentFormModal';
import IncidentViewModal from './IncidentViewModal';

const INCIDENT_TYPES = ['Injury', 'Near Miss', 'Property Damage', 'Environmental', 'Unsafe Act', 'Unsafe Condition'];
const SEVERITIES = ['Minor', 'Moderate', 'Serious', 'Critical'];
const STATUSES = ['Open', 'Under Investigation', 'Corrective Action', 'Closed'];

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    Injury: '🤕',
    'Near Miss': '⚠️',
    'Property Damage': '💔',
    Environmental: '🌍',
    'Unsafe Act': '⚡',
    'Unsafe Condition': '🚷',
  };
  return icons[type] || '•';
};

const EMPTY_FORM: IncidentFormData = {
  incident_date: new Date().toISOString().split('T')[0],
  incident_time: null,
  incident_type: 'Injury',
  severity: 'Minor',
  location: '',
  reported_by: '',
  reported_by_id: null,
  description: '',
  immediate_action: '',
  injured_person: '',
  injured_person_id: null,
  injury_type: '',
  body_part: '',
  witnesses: '',
  root_cause: '',
  status: 'Open',
  closed_date: null,
};

export default function SafetyIncidents() {
  usePageTitle('Safety — Incidents');
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const { canWrite } = useUser();
  const canEditSafety = canWrite('safety');
  const [sortConfig, setSortConfig] = useState<{ key: string; ascending: boolean }>({
    key: 'incident_date',
    ascending: false,
  });
  const { addToast } = useToast();
  const [formData, setFormData] = useState<IncidentFormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [showQuickModal, setShowQuickModal] = useState(false);
  const [quickForm, setQuickForm] = useState({ incident_type: 'Injury', location: '', description: '' });
  const [quickSaving, setQuickSaving] = useState(false);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      setLoadError('');
      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .order('incident_date', { ascending: false });
      if (error) throw error;
      setIncidents(data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load incidents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filteredIncidents = incidents
    .filter(incident => {
      const matchesSearch =
        incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.incident_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.reported_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incident.location?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'All' || incident.incident_type === typeFilter;
      const matchesSeverity = severityFilter === 'All' || incident.severity === severityFilter;
      const matchesStatus = statusFilter === 'All' || incident.status === statusFilter;
      const matchesTab = statusTab === 'All' || incident.status === statusTab;
      const matchesMonth = !monthFilter || incident.incident_date?.startsWith(monthFilter);
      return matchesSearch && matchesType && matchesSeverity && matchesStatus && matchesTab && matchesMonth;
    })
    .sort((a, b) => {
      const aVal = a[sortConfig.key as keyof SafetyIncident] ?? '';
      const bVal = b[sortConfig.key as keyof SafetyIncident] ?? '';
      if (aVal < bVal) return sortConfig.ascending ? -1 : 1;
      if (aVal > bVal) return sortConfig.ascending ? 1 : -1;
      return 0;
    });

  const handleSort = (key: string) => {
    setSortConfig({
      key,
      ascending: sortConfig.key === key ? !sortConfig.ascending : false,
    });
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        const { error } = await supabase
          .from('safety_incidents')
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq('id', editingId);
        if (error) throw error;
        addToast('Incident updated');
      } else {
        const incident_number = await generateSequentialNumber('safety_incidents', 'incident_number', 'INC');
        const { error } = await supabase.from('safety_incidents').insert([{ ...formData, incident_number }]);
        if (error) throw error;
        addToast('Incident saved');
      }
      setShowAddModal(false);
      setEditingId(null);
      loadIncidents();
    } catch (error) {
      console.error('Error saving incident:', error);
      addToast('Could not save incident', 'error');
    }
  };

  const openEditModal = (incident: SafetyIncident) => {
    setEditingId(incident.id);
    setFormData({
      incident_date: incident.incident_date,
      incident_time: incident.incident_time,
      incident_type: incident.incident_type,
      severity: incident.severity,
      location: incident.location,
      reported_by: incident.reported_by,
      reported_by_id: incident.reported_by_id,
      description: incident.description,
      immediate_action: incident.immediate_action,
      injured_person: incident.injured_person,
      injured_person_id: incident.injured_person_id,
      injury_type: incident.injury_type,
      body_part: incident.body_part,
      witnesses: incident.witnesses,
      root_cause: incident.root_cause,
      status: incident.status,
      closed_date: incident.closed_date,
    });
    setShowViewModal(false);
    setShowAddModal(true);
  };

  const handleCloseIncident = async (incident: SafetyIncident) => {
    const { error } = await supabase
      .from('safety_incidents')
      .update({ status: 'Closed', closed_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', incident.id);
    if (error) { addToast('Could not close incident', 'error'); return; }
    addToast('Incident closed');
    setShowViewModal(false);
    setSelectedIncident(null);
    loadIncidents();
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('safety_incidents').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Incident deleted');
      loadIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({ ...EMPTY_FORM, incident_date: new Date().toISOString().split('T')[0] });
    setShowAddModal(true);
  };

  const handleQuickSave = async () => {
    if (!quickForm.location.trim() || !quickForm.description.trim()) return;
    setQuickSaving(true);
    try {
      const incident_number = await generateSequentialNumber('safety_incidents', 'incident_number', 'INC');
      const { error } = await supabase.from('safety_incidents').insert([{
        ...EMPTY_FORM,
        incident_number,
        incident_date: new Date().toISOString().split('T')[0],
        incident_type: quickForm.incident_type,
        location: quickForm.location.trim(),
        description: quickForm.description.trim(),
        severity: 'Minor',
        status: 'Open',
      }]);
      if (error) throw error;
      addToast('Incident reported');
      setShowQuickModal(false);
      setQuickForm({ incident_type: 'Injury', location: '', description: '' });
      loadIncidents();
    } catch (err) {
      console.error(err);
    } finally {
      setQuickSaving(false);
    }
  };

  const stats = [
    { label: 'Total', count: filteredIncidents.length },
    { label: 'Open', count: filteredIncidents.filter(i => i.status === 'Open').length },
    { label: 'Under Investigation', count: filteredIncidents.filter(i => i.status === 'Under Investigation').length },
    { label: 'Closed', count: filteredIncidents.filter(i => i.status === 'Closed').length },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-6 flex items-center justify-between">
            <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
            <button onClick={loadIncidents} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
          </div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Incident Register</h1>
              <p className="text-gray-600 mt-1">Log and manage workplace safety incidents</p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowQuickModal(true)}
              className="sm:hidden flex items-center gap-1.5 text-sm border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-lg font-medium transition-colors"
              title="Quick incident report"
            >
              <Plus className="w-4 h-4" /> Quick
            </button>
            <button
              onClick={() => downloadCSV(filteredIncidents.map(i => ({
                'Incident No': i.incident_number || '',
                Type: i.incident_type,
                Severity: i.severity,
                Status: i.status,
                Date: i.incident_date,
                Time: i.incident_time || '',
                Location: i.location || '',
                'Reported By': i.reported_by || '',
                Description: i.description || '',
              })), 'safety-incidents')}
              className="flex items-center gap-1.5 text-sm border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 px-3 py-2 rounded-lg font-medium transition-colors shadow-sm"
              title="Export to CSV"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex-1 sm:flex-none justify-center sm:justify-start"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Report Incident</span>
              <span className="sm:hidden">Report</span>
            </button>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {(['All', ...STATUSES] as const).map(tab => {
            const count = tab === 'All' ? incidents.length : incidents.filter(i => i.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === tab
                    ? 'bg-amber-600 text-white shadow-sm'
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

        {/* Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto"
            >
              <option>All Types</option>
              {INCIDENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
            <select
              value={severityFilter}
              onChange={e => setSeverityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-auto"
            >
              <option value="All">All Severities</option>
              {SEVERITIES.map(sev => <option key={sev} value={sev}>{sev}</option>)}
            </select>
            <div className="relative flex-1 sm:flex-none">
              <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="month"
                value={monthFilter}
                onChange={e => setMonthFilter(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          {stats.map(stat => (
            <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stat.count}</p>
            </div>
          ))}
        </div>

        {/* Table & Mobile Cards */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : filteredIncidents.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No incidents found</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {[
                        { key: 'incident_number', label: 'Incident #' },
                        { key: 'incident_date', label: 'Date' },
                        { key: 'incident_type', label: 'Type' },
                        { key: 'severity', label: 'Severity' },
                        { key: 'location', label: 'Location' },
                        { key: 'reported_by', label: 'Reported By' },
                        { key: 'status', label: 'Status' },
                        { key: 'actions', label: 'Actions' },
                      ].map(col => (
                        <th
                          key={col.key}
                          onClick={() => col.key !== 'actions' && handleSort(col.key)}
                          className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100"
                        >
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.map(incident => (
                      <tr key={incident.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{incident.incident_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{new Date(incident.incident_date).toLocaleDateString()}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="mr-2">{getTypeIcon(incident.incident_type)}</span>
                          {incident.incident_type}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor(severityColors, incident.severity)}`}>
                            {incident.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{incident.location}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{incident.reported_by}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor(incidentStatusColors, incident.status)}`}>
                            {incident.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm flex gap-2">
                          <button
                            onClick={() => { setSelectedIncident(incident); setShowViewModal(true); }}
                            className="text-amber-600 hover:text-amber-700 transition"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canEditSafety && (
                            <button
                              onClick={() => openEditModal(incident)}
                              className="text-gray-500 hover:text-amber-700 transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canEditSafety && (
                            <button
                              onClick={() => handleDelete(incident.id, incident.incident_number || 'this incident')}
                              className="text-red-600 hover:text-red-700 transition"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredIncidents.map(incident => (
                  <div key={incident.id} className="px-4 py-3 flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-gray-900">{incident.incident_number}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor(severityColors, incident.severity)}`}>{incident.severity}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${badgeColor(incidentStatusColors, incident.status)}`}>{incident.status}</span>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {new Date(incident.incident_date).toLocaleDateString()} · {incident.incident_type}{incident.location ? ` · ${incident.location}` : ''}
                      </p>
                      {incident.reported_by && <p className="text-xs text-gray-400 truncate">By {incident.reported_by}</p>}
                    </div>
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      <button onClick={() => { setSelectedIncident(incident); setShowViewModal(true); }} className="p-2 text-amber-600 hover:bg-amber-50 rounded"><Eye size={15} /></button>
                      {canEditSafety && <button onClick={() => openEditModal(incident)} className="p-2 text-gray-500 hover:bg-amber-50 rounded"><Pencil size={15} /></button>}
                      {canEditSafety && <button onClick={() => handleDelete(incident.id, incident.incident_number || 'this incident')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showQuickModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowQuickModal(false)} />
          <div className="relative bg-white w-full rounded-t-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Quick Incident Report</h2>
              <button onClick={() => setShowQuickModal(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <span className="sr-only">Close</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Type *</label>
              <select
                value={quickForm.incident_type}
                onChange={e => setQuickForm(f => ({ ...f, incident_type: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              >
                {INCIDENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location *</label>
              <input
                type="text"
                value={quickForm.location}
                onChange={e => setQuickForm(f => ({ ...f, location: e.target.value }))}
                placeholder="Where did it happen?"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">What happened? *</label>
              <textarea
                value={quickForm.description}
                onChange={e => setQuickForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                placeholder="Brief description..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
            <p className="text-xs text-gray-400">Saved as Minor / Open. Open the full form to add more detail.</p>
            <button
              onClick={handleQuickSave}
              disabled={quickSaving || !quickForm.location.trim() || !quickForm.description.trim()}
              className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              {quickSaving ? 'Saving…' : 'Submit Report'}
            </button>
          </div>
        </div>
      )}

      {showAddModal && (
        <IncidentFormModal
          formData={formData}
          isEdit={!!editingId}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setEditingId(null); }}
        />
      )}

      {selectedIncident && showViewModal && (
        <IncidentViewModal
          incident={selectedIncident}
          canEdit={canEditSafety}
          onEdit={() => openEditModal(selectedIncident)}
          onCloseIncident={() => handleCloseIncident(selectedIncident)}
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
