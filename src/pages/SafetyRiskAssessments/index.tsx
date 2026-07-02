import { useState, useEffect } from 'react';
import { Shield, Plus, Eye, Edit2, Trash2 } from 'lucide-react';
import { supabase, SafetyRiskAssessment } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageHeader, Button, Toolbar, SearchInput, FilterSelect, FilterTabs, StatStrip } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { getRiskRatingColor, riskLevelColors, riskAssessmentStatusColors } from '../../lib/badgeColors';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { STATUS_TABS, EMPTY_FORM, calculateRiskRating, getRiskLevel } from './constants';
import RiskAssessmentFormModal from './RiskAssessmentFormModal';
import RiskAssessmentViewModal from './RiskAssessmentViewModal';

export default function SafetyRiskAssessments() {
  const { canWrite } = useUser();
  const canEdit = canWrite('safety');
  usePageTitle('Safety — Risk Assessments');
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
    <div className="space-y-4">
      <PageHeader
        title="Risk Assessments"
        subtitle={`${assessments.length} assessment${assessments.length !== 1 ? 's' : ''}`}
        icon={Shield}
        accent="amber"
        actions={
          canEdit && <Button variant="primary" accent="amber" icon={Plus} onClick={openAddModal}>New Assessment</Button>
        }
      />

      <FilterTabs
        accent="amber"
        value={statusTab}
        onChange={setStatusTab}
        tabs={STATUS_TABS.map(tab => ({
          value: tab,
          label: tab,
          count: tab === 'All' ? assessments.length : assessments.filter(a => a.status === tab).length,
        }))}
      />

      <Toolbar>
        <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search assessments…" />
        <FilterSelect value={riskFilter} onChange={setRiskFilter} accent="amber">
          <option value="All">All Risk Levels</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Extreme">Extreme</option>
        </FilterSelect>
        <FilterSelect value={statusFilter} onChange={setStatusFilter} accent="amber">
          <option value="All">All Statuses</option>
          <option value="Draft">Draft</option>
          <option value="Active">Active</option>
          <option value="Under Review">Under Review</option>
          <option value="Archived">Archived</option>
        </FilterSelect>
      </Toolbar>

      <StatStrip
        accent="amber"
        stats={[
          { label: 'Total Active', value: stats.total },
          { label: 'High/Extreme', value: stats.highExtremeRisks, valueClass: 'text-red-600' },
          { label: 'Due for Review', value: stats.dueForReview, valueClass: 'text-amber-600' },
          { label: 'Archived', value: stats.archived },
        ]}
      />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Assessment #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Area</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Activity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Hazard</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 whitespace-nowrap">Risk Rating</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Risk Level</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Responsible</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 whitespace-nowrap">Review Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
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
                      <td className="px-4 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">{assessment.assessment_number}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{new Date(assessment.assessment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{assessment.area}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{assessment.activity}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 max-w-[180px] truncate">{assessment.hazard}</td>
                      <td className="px-4 py-2.5 text-center whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getRiskColor(assessment.risk_rating)}`}>
                          {assessment.risk_rating}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRiskLevelColor(assessment.risk_level)}`}>
                          {assessment.risk_level}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">{assessment.responsible_person}</td>
                      <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">
                        {assessment.review_date ? new Date(assessment.review_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(assessment.status)}`}>
                          {assessment.status}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm flex gap-2">
                        <button onClick={() => { setSelectedAssessment(assessment); setShowViewModal(true); }} className="text-gray-600 hover:text-gray-900" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        {canEdit && (
                          <>
                            <button onClick={() => openEditModal(assessment)} className="text-gray-600 hover:text-gray-900" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => handleDelete(assessment.id, `${assessment.area} — ${assessment.activity}`)} className="text-gray-600 hover:text-red-600" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
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
                      {canEdit && (
                        <>
                          <button onClick={() => openEditModal(assessment)} className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(assessment.id, `${assessment.area} — ${assessment.activity}`)} className="p-2 text-red-600 hover:bg-red-50 rounded">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
