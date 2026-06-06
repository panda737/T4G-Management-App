import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Eye, Trash2, Search, Calendar } from 'lucide-react';
import { supabase, SafetyIncident } from '../../lib/supabase';
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
  const [incidents, setIncidents] = useState<SafetyIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [severityFilter, setSeverityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('All');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SafetyIncident | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; ascending: boolean }>({
    key: 'incident_date',
    ascending: false,
  });
  const [formData, setFormData] = useState<IncidentFormData>(EMPTY_FORM);

  useEffect(() => {
    loadIncidents();
  }, []);

  const loadIncidents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('safety_incidents')
        .select('*')
        .order('incident_date', { ascending: false });
      if (error) throw error;
      setIncidents(data || []);
    } catch (error) {
      console.error('Error loading incidents:', error);
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
      const incident_number = await generateSequentialNumber('safety_incidents', 'incident_number', 'INC');
      const { error } = await supabase.from('safety_incidents').insert([{ ...formData, incident_number }]);
      if (error) throw error;
      setShowAddModal(false);
      loadIncidents();
    } catch (error) {
      console.error('Error saving incident:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this incident?')) return;
    try {
      const { error } = await supabase.from('safety_incidents').delete().eq('id', id);
      if (error) throw error;
      loadIncidents();
    } catch (error) {
      console.error('Error deleting incident:', error);
    }
  };

  const openAddModal = () => {
    setFormData({ ...EMPTY_FORM, incident_date: new Date().toISOString().split('T')[0] });
    setShowAddModal(true);
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Incident Register</h1>
              <p className="text-gray-600 mt-1">Log and manage workplace safety incidents</p>
            </div>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Report Incident</span>
            <span className="sm:hidden">Report</span>
          </button>
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
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(incident.id)}
                            className="text-red-600 hover:text-red-700 transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden divide-y divide-gray-100">
                {filteredIncidents.map(incident => (
                  <div key={incident.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{incident.incident_number}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(incident.incident_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor(severityColors, incident.severity)}`}>
                        {incident.severity}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Type:</span> <span className="mr-1">{getTypeIcon(incident.incident_type)}</span>{incident.incident_type}</p>
                      <p><span className="text-gray-600">Location:</span> {incident.location}</p>
                      <p><span className="text-gray-600">Reported By:</span> {incident.reported_by}</p>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-gray-100">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${badgeColor(incidentStatusColors, incident.status)}`}>
                        {incident.status}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setSelectedIncident(incident); setShowViewModal(true); }}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(incident.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {showAddModal && (
        <IncidentFormModal
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {selectedIncident && showViewModal && (
        <IncidentViewModal
          incident={selectedIncident}
          onClose={() => setShowViewModal(false)}
        />
      )}
    </div>
  );
}
