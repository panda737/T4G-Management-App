import { useEffect, useState, useMemo } from 'react';
import { ClipboardList, Plus, Eye, Edit2, Trash2, User, BookOpen, AlertCircle, Download } from 'lucide-react';
import { supabase, TrainingRecord, TrainingCourse, TrainingModule, TrainingAssessment, Employee } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { downloadCSV } from '../../lib/csvExport';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import { trainingResultColors, trainingStatusColors, badgeColor } from '../../lib/badgeColors';
import RecordFormModal, { RecordFormData } from './RecordFormModal';
import RecordViewModal from './RecordViewModal';
import ByEmployeeView from './ByEmployeeView';
import ByModuleView from './ByModuleView';

type ViewTab = 'all' | 'by-employee' | 'by-module';

const EMPTY_FORM: RecordFormData = {
  employee_name: '',
  employee_id: null,
  course_name: '',
  completion_date: '',
  expiry_date: '',
  score: '',
  result: 'Pass',
  instructor: '',
  status: 'Completed',
  notes: '',
};

export default function TrainingRecords() {
  usePageTitle('Training — Records');
  const { canWrite } = useUser();
  const canEdit = canWrite('training');
  const [records, setRecords] = useState<TrainingRecord[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [assessments, setAssessments] = useState<TrainingAssessment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [activeTab, setActiveTab] = useState<ViewTab>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<TrainingRecord | null>(null);
  const [formData, setFormData] = useState<RecordFormData>(EMPTY_FORM);
  const { addToast } = useToast();
  const [opError, setOpError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [recordsRes, coursesRes, modulesRes, assessmentsRes, empRes] = await Promise.all([
        supabase.from('training_records').select('*').order('created_at', { ascending: false }),
        supabase.from('training_courses').select('*'),
        supabase.from('training_modules').select('*').eq('status', 'Active').order('category'),
        supabase.from('training_assessments').select('*').order('taken_at', { ascending: false }),
        supabase.from('employees').select('*').eq('status', 'active').order('first_name'),
      ]);
      if (recordsRes.error) throw recordsRes.error;
      setRecords(recordsRes.data || []);
      setCourses(coursesRes.data || []);
      setModules(modulesRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load training records. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return records.filter(r => {
      const matchSearch = !search ||
        r.employee_name.toLowerCase().includes(search.toLowerCase()) ||
        r.course_name.toLowerCase().includes(search.toLowerCase());
      const matchResult = filterResult === 'All' || r.result === filterResult;
      const matchStatus = filterStatus === 'All' || r.status === filterStatus;
      return matchSearch && matchResult && matchStatus;
    });
  }, [records, search, filterResult, filterStatus]);

  const stats = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => r.status === 'Completed').length;
    const passed = records.filter(r => r.result === 'Pass').length;
    const passRate = completed > 0 ? Math.round((passed / completed) * 100) : 0;
    const overdue = records.filter(r => r.status === 'Overdue').length;
    return { total, completed, passRate, overdue };
  }, [records]);

  async function handleSave() {
    if (!formData.employee_name || !formData.course_name) return;
    const selectedCourse = courses.find(c => c.course_name === formData.course_name);
    const data = {
      employee_name: formData.employee_name,
      employee_id: formData.employee_id,
      course_name: formData.course_name,
      course_id: selectedCourse?.id || null,
      completion_date: formData.completion_date || null,
      expiry_date: formData.expiry_date || null,
      score: formData.score ? parseInt(formData.score) : null,
      result: formData.result,
      instructor: formData.instructor,
      status: formData.status,
      notes: formData.notes,
    };

    setOpError('');
    const { error } = selectedRecord
      ? await supabase.from('training_records').update(data).eq('id', selectedRecord.id)
      : await supabase.from('training_records').insert([data]);
    if (error) { setOpError(error.message); return; }
    addToast('Record saved');
    setShowAddModal(false);
    setFormData(EMPTY_FORM);
    setSelectedRecord(null);
    load();
  }

  function openEdit(record: TrainingRecord) {
    setSelectedRecord(record);
    setFormData({
      employee_name: record.employee_name,
      employee_id: record.employee_id || null,
      course_name: record.course_name,
      completion_date: record.completion_date || '',
      expiry_date: record.expiry_date || '',
      score: record.score?.toString() || '',
      result: record.result,
      instructor: record.instructor,
      status: record.status,
      notes: record.notes,
    });
    setShowAddModal(true);
  }

  function handleDelete(id: string, label: string) {
    setDeleteTarget({ id, label });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setOpError('');
    const { error } = await supabase.from('training_records').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { setOpError(error.message); return; }
    addToast('Record deleted');
    load();
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="flex items-center gap-2"><AlertCircle size={15} />{loadError}</span>
          <button onClick={load} className="text-red-600 hover:text-red-800 font-medium text-xs underline">Retry</button>
        </div>
      )}
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-gray-900" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Training Records</h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee training, assessments, and compliance</p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => downloadCSV(filtered.map(r => ({
              Employee: r.employee_name,
              Course: r.course_name,
              'Completion Date': r.completion_date || '',
              'Expiry Date': r.expiry_date || '',
              Score: r.score ?? '',
              Result: r.result,
              Instructor: r.instructor || '',
              Status: r.status,
            })), 'training-records')}
            className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition-colors shadow-sm"
            title="Export to CSV"
          >
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
          {canEdit && (
            <button
              onClick={() => { setFormData(EMPTY_FORM); setSelectedRecord(null); setShowAddModal(true); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition flex-1 sm:flex-none justify-center"
            >
              <Plus size={18} /> <span className="hidden sm:inline">Add Record</span><span className="sm:hidden">Add</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
        {([
          { id: 'all' as ViewTab, label: 'All Records', icon: ClipboardList },
          { id: 'by-employee' as ViewTab, label: 'By Employee', icon: User },
          { id: 'by-module' as ViewTab, label: 'By Module', icon: BookOpen },
        ]).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={14} /> {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Total Records</p>
          <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Completed</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.completed}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Pass Rate</p>
          <p className="text-3xl font-bold text-emerald-600">{stats.passRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-1">Overdue</p>
          <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
        </div>
      </div>

      {activeTab === 'all' && (
        <>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['All', 'Completed', 'In Progress', 'Due', 'Overdue'] as const).map(tab => {
              const count = tab === 'All' ? records.length : records.filter(r => r.status === tab).length;
              return (
                <button
                  key={tab}
                  onClick={() => setFilterStatus(tab === 'All' ? 'All' : tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    (tab === 'All' && filterStatus === 'All') || filterStatus === tab
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {tab}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                    (tab === 'All' && filterStatus === 'All') || filterStatus === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm space-y-3">
            <input type="text" placeholder="Search by employee, course..." value={search} onChange={e => setSearch(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
            <div className="flex flex-col sm:flex-row gap-3">
              <select value={filterResult} onChange={e => setFilterResult(e.target.value)} className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option>All</option><option>Pass</option><option>Fail</option><option>Incomplete</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    {['Employee', 'Course', 'Completion', 'Expiry', 'Score', 'Result', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-12 text-center">
                      {records.length === 0 ? (
                        <div>
                          <ClipboardList size={28} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm font-medium text-gray-500">No training records yet</p>
                          <button onClick={() => { setFormData(EMPTY_FORM); setSelectedRecord(null); setShowAddModal(true); }} className="mt-3 text-sm text-emerald-600 hover:text-emerald-700 font-medium">+ Add Record</button>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-400">No records match your search or filters.</p>
                          <button onClick={() => { setSearch(''); setFilterResult('All'); setFilterStatus('All'); }} className="mt-2 text-xs text-gray-500 underline">Clear filters</button>
                        </div>
                      )}
                    </td></tr>
                  ) : filtered.map(record => (
                    <tr key={record.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{record.employee_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.course_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.completion_date ? new Date(record.completion_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.expiry_date ? new Date(record.expiry_date).toLocaleDateString() : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.score !== null ? `${record.score}%` : '-'}</td>
                      <td className="px-4 py-3 text-sm"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor(trainingResultColors, record.result)}`}>{record.result}</span></td>
                      <td className="px-4 py-3 text-sm"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor(trainingStatusColors, record.status)}`}>{record.status}</span></td>
                      <td className="px-4 py-3 text-sm flex gap-2">
                        <button onClick={() => { setSelectedRecord(record); setShowViewModal(true); }} className="p-1.5 hover:bg-gray-100 rounded transition"><Eye size={16} className="text-gray-600" /></button>
                        {canEdit && (
                          <>
                            <button onClick={() => openEdit(record)} className="p-1.5 hover:bg-gray-100 rounded transition"><Edit2 size={16} className="text-gray-600" /></button>
                            <button onClick={() => handleDelete(record.id, `${record.employee_name} — ${record.course_name}`)} className="p-1.5 hover:bg-red-50 rounded transition"><Trash2 size={16} className="text-red-600" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {activeTab === 'by-employee' && (
        <ByEmployeeView employees={employees} records={records} assessments={assessments} modules={modules} />
      )}

      {activeTab === 'by-module' && (
        <ByModuleView employees={employees} assessments={assessments} modules={modules} />
      )}

      {showAddModal && (
        <RecordFormModal
          selectedRecord={selectedRecord}
          formData={formData}
          courses={courses}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => { setShowAddModal(false); setFormData(EMPTY_FORM); setSelectedRecord(null); }}
        />
      )}

      {showViewModal && selectedRecord && (
        <RecordViewModal record={selectedRecord} onClose={() => setShowViewModal(false)} />
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
