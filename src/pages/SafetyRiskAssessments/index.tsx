import { useState, useEffect } from 'react';
import { Shield, Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react';
import { supabase, SafetyRiskAssessment } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getRiskRatingColor, riskLevelColors, riskAssessmentStatusColors } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { STATUS_TABS, EMPTY_FORM, calculateRiskRating, getRiskLevel } from './constants';
import RiskAssessmentFormModal from './RiskAssessmentFormModal';
import RiskAssessmentViewModal from './RiskAssessmentViewModal';

export default function SafetyRiskAssessments() {
  const [assessments, setAssessments] = useState<SafetyRiskAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [statusTab, setStatusTab] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<SafetyRiskAssessment | null>(null);
  const [formData, setFormData] = useState<Partial<SafetyRiskAssessment>>(EMPTY_FORM);
  const { addToast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const { data, error } = await supabase
        .from('safety_risk_assessments')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAssessments(data || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const riskRating = calculateRiskRating(formData.likelihood || 1, formData.consequence || 1);
    const riskLevel = getRiskLevel(riskRating);
    try {
      if (selectedAssessment?.id) {
        const { error } = await supabase
          .from('safety_risk_assessments')
          .update({ ...formData, risk_rating: riskRating, risk_level: riskLevel, updated_at: new Date().toISOString() })
          .eq('id', selectedAssessment.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('safety_risk_assessments').insert({
          assessment_number: await generateSequentialNumber('safety_risk_assessments', 'assessment_number', 'RA'),
          ...formData,
          risk_rating: riskRating,
          risk_level: riskLevel,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      addToast('Assessment saved');
      load();
      setShowModal(false);
      setSelectedAssessment(null);
      setFormData(EMPTY_FORM);
    } catch (error) {
      console.error('Error saving assessment:', error);
    }
  };

  const handleDelete = (id: string, label: string) => {
    setDeleteTarget({ id, label });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const { error } = await supabase.from('safety_risk_assessments').delete().eq('id', deleteTarget.id);
      if (error) throw error;
      addToast('Assessment deleted');
      load();
    } catch (error) {
      console.error('Error deleting assessment:', error);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const openAddModal = () => {
    setSelectedAssessment(null);
    setFormData(EMPTY_FORM);
    setShowModal(true);
  };

  const openEditModal = (assessment: SafetyRiskAssessment) => {
    setSelectedAssessment(assessment);
    setFormData(assessment);
    setShowModal(true);
  };

  const filteredAssessments = assessments.filter(a => {
    const matchesSearch =
      a.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.activity.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.hazard.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'All' || a.risk_level === riskFilter;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesTab = statusTab === 'All' || a.status === statusTab;
    return matchesSearch && matchesRisk && matchesStatus && matchesTab;
  });

  const stats = {
    total: assessments.filter(a => a.status === 'Active').length,
    highExtremeRisks: assessments.filter(a => ['High', 'Extreme'].includes(a.risk_level)).length,
    dueForReview: assessments.filter(a => a.review_date && new Date(a.review_date) <= new Date()).length,
    archived: assessments.filter(a => a.status === 'Archived').length,
  };

  const getRiskColor = (rating: number) => getRiskRatingColor(rating);
  const getRiskLevelColor = (level: string) => riskLevelColors[level] || 'bg-gray-100 text-gray-700';
  const getStatusColor = (status: string) => riskAssessmentStatusColors[status] || 'bg-gray-100 text-gray-700';

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Shield className="w-8 h-8 text-gray-900 flex-shrink-0" />
            <h1 className="text-3xl font-bold text-gray-900">Risk Assessments</h1>
          </div>
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition w-full sm:w-auto justify-center sm:justify-start"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">New Assessment</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap mb-4">
          {STATUS_TABS.map(tab => {
            const count = tab === 'All' ? assessments.length : assessments.filter(a => a.status === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setStatusTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  statusTab === tab
                    ? 'bg-gray-900 text-white shadow-sm'
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

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search assessments..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg bg-white"
            />
          </div>
          <select
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white w-full sm:w-auto"
          >
            <option>All</option>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
            <option>Extreme</option>
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg bg-white w-full sm:w-auto"
          >
            <option>All</option>
            <option>Draft</option>
            <option>Active</option>
            <option>Under Review</option>
            <option>Archived</option>
          </select>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-6 sm:mb-8">
          {[
            { label: 'Total Active', value: stats.total },
            { label: 'High/Extreme Risks', value: stats.highExtremeRisks },
            { label: 'Due for Review', value: stats.dueForReview },
            { label: 'Archived', value: stats.archived },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
              <p className="text-gray-600 text-sm">{stat.label}</p>
              <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Assessment #</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Area</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Activity</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Hazard</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-900">Risk Rating</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Risk Level</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Responsible</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Review Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                ) : filteredAssessments.length === 0 ? (
                  <tr><td colSpan={11} className="px-6 py-8 text-center text-gray-500">No assessments found</td></tr>
                ) : (
                  filteredAssessments.map(assessment => (
                    <tr key={assessment.id} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{assessment.assessment_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{assessment.area}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{assessment.activity}</td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{assessment.hazard}</td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(assessment.risk_rating)}`}>
                          {assessment.risk_rating}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskLevelColor(assessment.risk_level)}`}>
                          {assessment.risk_level}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{assessment.responsible_person}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(assessment.status)}`}>
                          {assessment.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button onClick={() => { setSelectedAssessment(assessment); setShowViewModal(true); }} className="text-gray-600 hover:text-gray-900" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => openEditModal(assessment)} className="text-gray-600 hover:text-gray-900" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(assessment.id, `${assessment.area} — ${assessment.activity}`)} className="text-gray-600 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : filteredAssessments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No assessments found</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAssessments.map(assessment => (
                  <div key={assessment.id} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">{assessment.assessment_number}</p>
                        <p className="text-xs text-gray-500 mt-1">{new Date(assessment.assessment_date).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRiskLevelColor(assessment.risk_level)}`}>
                        {assessment.risk_level}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p><span className="text-gray-600">Area:</span> {assessment.area}</p>
                      <p><span className="text-gray-600">Activity:</span> {assessment.activity}</p>
                      <p><span className="text-gray-600">Hazard:</span> <span className="truncate">{assessment.hazard}</span></p>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Risk Rating:</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${getRiskColor(assessment.risk_rating)}`}>
                          {assessment.risk_rating}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                      <button onClick={() => { setSelectedAssessment(assessment); setShowViewModal(true); }} className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => openEditModal(assessment)} className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(assessment.id, `${assessment.area} — ${assessment.activity}`)} className="p-2 text-red-600 hover:bg-red-50 rounded">
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

      {showModal && (
        <RiskAssessmentFormModal
          formData={formData}
          setFormData={setFormData}
          isEdit={!!selectedAssessment}
          onClose={() => { setShowModal(false); setSelectedAssessment(null); }}
          onSave={handleSave}
        />
      )}

      {showViewModal && selectedAssessment && (
        <RiskAssessmentViewModal
          assessment={selectedAssessment}
          onClose={() => setShowViewModal(false)}
          onEdit={() => { setShowViewModal(false); openEditModal(selectedAssessment); }}
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
