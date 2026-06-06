import { useEffect, useState, useMemo } from 'react';
import { ClipboardList, Plus, Eye, CreditCard as Edit2, Trash2, User, BookOpen } from 'lucide-react';
import { supabase, TrainingRecord, TrainingCourse, TrainingModule, TrainingAssessment, Employee } from '../../lib/supabase';
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

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [recordsRes, coursesRes, modulesRes, assessmentsRes, empRes] = await Promise.all([
      supabase.from('training_records').select('*').order('created_at', { ascending: false }),
      supabase.from('training_courses').select('*'),
      supabase.from('training_modules').select('*').eq('status', 'Active').order('category'),
      supabase.from('training_assessments').select('*').order('taken_at', { ascending: false }),
      supabase.from('employees').select('*').eq('status', 'active').order('first_name'),
    ]);
    setRecords(recordsRes.data || []);
    setCourses(coursesRes.data || []);
    setModules(modulesRes.data || []);
    setAssessments(assessmentsRes.data || []);
    setEmployees(empRes.data || []);
    setLoading(false);
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

    if (selectedRecord) {
      await supabase.from('training_records').update(data).eq('id', selectedRecord.id);
    } else {
      await supabase.from('training_records').insert([data]);
    }
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

  async function handleDelete(id: string) {
    if (confirm('Delete this training record?')) {
      await supabase.from('training_records').delete().eq('id', id);
      load();
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;
  }

  return (
    <div className="space-y-6 bg-gray-50 min-h-screen p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ClipboardList size={28} className="text-gray-900" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Staff Training Records</h1>
            <p className="text-sm text-gray-500 mt-1">Manage employee training, assessments, and compliance</p>
          </div>
        </div>
        <button
          onClick={() => { setFormData(EMPTY_FORM); setSelectedRecord(null); setShowAddModal(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition w-full sm:w-auto justify-center"
        >
          <Plus size={18} /> <span className="hidden sm:inline">Add Record</span><span className="sm:hidden">Add</span>
        </button>
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
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No training records found</td></tr>
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
                        <button onClick={() => openEdit(record)} className="p-1.5 hover:bg-gray-100 rounded transition"><Edit2 size={16} className="text-gray-600" /></button>
                        <button onClick={() => handleDelete(record.id)} className="p-1.5 hover:bg-red-50 rounded transition"><Trash2 size={16} className="text-red-600" /></button>
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
    </div>
  );
}
