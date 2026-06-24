import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Trash2, Calendar, AlertCircle, Download, Pencil } from 'lucide-react';
import { supabase, SafetyIncident } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useToast } from '../../lib/toast';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, FilterTabs } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { severityColors, incidentStatusColors, badgeColor } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { useBackClose } from '../../lib/useBackClose';
import IncidentFormModal, { IncidentFormData } from './IncidentFormModal';
import IncidentDetailView from './IncidentDetailView';

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
  const [statusFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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

  // Keep the open detail view in sync with the list after edit/close/delete:
  // re-point to the fresh row by id, or back to the list if it was removed.
  useEffect(() => {
    if (!selectedIncident) return;
    const fresh = incidents.find(i => i.id === selectedIncident.id) ?? null;
    if (fresh !== selectedIncident) setSelectedIncident(fresh);
  }, [incidents, selectedIncident]);

  // Device/browser Back returns from the incident detail view to the list.
  useBackClose(!!selectedIncident, () => setSelectedIncident(null));

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
    setShowAddModal(true);
  };

  const handleCloseIncident = async (incident: SafetyIncident) => {
    const { error } = await supabase
      .from('safety_incidents')
      .update({ status: 'Closed', closed_date: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() })
      .eq('id', incident.id);
    if (error) { addToast('Could not close incident', 'error'); return; }
    addToast('Incident closed');
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
      setSelectedIncident(null);
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

  return (
    <div className="space-y-4">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={loadIncidents} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}

      {selectedIncident ? (
        <IncidentDetailView
          incident={selectedIncident}
          canEdit={canEditSafety}
          onBack={() => setSelectedIncident(null)}
          onEdit={() => openEditModal(selectedIncident)}
          onCloseIncident={() => handleCloseIncident(selectedIncident)}
          onDelete={() => handleDelete(selectedIncident.id, selectedIncident.incident_number || 'this incident')}
        />
      ) : (
        <>
      <PageHeader
        title="Incident Register"
        subtitle="Log and manage workplace safety incidents"
        icon={AlertTriangle}
        accent="amber"
        actions={
          <>
            <Button variant="secondary" accent="amber" icon={Plus} onClick={() => setShowQuickModal(true)} className="sm:hidden">Quick</Button>
            <Button
              variant="secondary"
              accent="amber"
              icon={Download}
              hideLabelOnMobile
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
            >Export</Button>
            <Button variant="primary" accent="amber" icon={Plus} onClick={openAddModal}>Report Incident</Button>
          </>
        }
      />

      <FilterTabs
        accent="amber"
        value={statusTab}
        onChange={setStatusTab}
        tabs={['All', ...STATUSES].map(tab => ({
          value: tab,
          label: tab,
          count: tab === 'All' ? incidents.length : incidents.filter(i => i.status === tab).length,
        }))}
      />

      <Toolbar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search incidents…" />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} accent="amber">
          <option value="All">All Types</option>
          {INCIDENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
        </FilterSelect>
        <FilterSelect value={severityFilter} onChange={setSeverityFilter} accent="amber">
          <option value="All">All Severities</option>
          {SEVERITIES.map(sev => <option key={sev} value={sev}>{sev}</option>)}
        </FilterSelect>
        <div className="relative">
          <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="month"
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
            className={`pl-10 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${monthFilter ? 'border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600'}`}
          />
        </div>
      </Toolbar>

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
                      <tr
                        key={incident.id}
                        onClick={() => setSelectedIncident(incident)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedIncident(incident); } }}
                        role="button"
                        tabIndex={0}
                        className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer focus:outline-none focus:bg-amber-50"
                      >
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
                          {canEditSafety && (
                            <button
                              onClick={e => { e.stopPropagation(); openEditModal(incident); }}
                              className="text-gray-500 hover:text-amber-700 transition"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          )}
                          {canEditSafety && (
                            <button
                              onClick={e => { e.stopPropagation(); handleDelete(incident.id, incident.incident_number || 'this incident'); }}
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
                  <div
                    key={incident.id}
                    onClick={() => setSelectedIncident(incident)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedIncident(incident); } }}
                    role="button"
                    tabIndex={0}
                    className="px-4 py-3 flex items-start gap-2 cursor-pointer hover:bg-gray-50 transition focus:outline-none focus:bg-amber-50"
                  >
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
                      {canEditSafety && <button onClick={e => { e.stopPropagation(); openEditModal(incident); }} className="p-2 text-gray-500 hover:bg-amber-50 rounded"><Pencil size={15} /></button>}
                      {canEditSafety && <button onClick={e => { e.stopPropagation(); handleDelete(incident.id, incident.incident_number || 'this incident'); }} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        </>
      )}

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
