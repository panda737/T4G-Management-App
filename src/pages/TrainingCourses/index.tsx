import { useState, useEffect, useMemo } from 'react';
import { BookOpen, Plus, Eye, CreditCard as Edit2, Trash2, Search } from 'lucide-react';
import { supabase, TrainingCourse } from '../../lib/supabase';
import CourseFormModal, { CourseFormData } from './CourseFormModal';
import CourseViewModal from './CourseViewModal';

const CATEGORIES = ['Safety', 'Operational', 'Regulatory', 'Soft Skills'];

const CATEGORY_COLORS: Record<string, string> = {
  Safety: 'amber',
  Operational: 'sky',
  Regulatory: 'teal',
  'Soft Skills': 'rose',
};

const CATEGORY_PREFIXES: Record<string, string> = {
  Safety: 'SAF',
  Operational: 'OPE',
  Regulatory: 'REG',
  'Soft Skills': 'SOF',
};

const EMPTY_FORM: CourseFormData = {
  course_code: '',
  course_name: '',
  category: '',
  description: '',
  duration_hours: 0,
  validity_months: 0,
  provider: '',
  is_mandatory: false,
  status: 'Active',
};

export default function TrainingCourses() {
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mandatoryFilter, setMandatoryFilter] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<TrainingCourse | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [formData, setFormData] = useState<CourseFormData>(EMPTY_FORM);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('training_courses').select('*').order('created_at', { ascending: false });
    setCourses(data || []);
    setLoading(false);
  }

  async function generateCourseCode(category: string): Promise<string> {
    const prefix = CATEGORY_PREFIXES[category] || 'COU';
    const { data } = await supabase
      .from('training_courses')
      .select('course_code')
      .like('course_code', `${prefix}-%`)
      .order('course_code', { ascending: false })
      .limit(1);
    const lastNum = data?.[0]?.course_code ? parseInt(data[0].course_code.split('-')[1]) : 0;
    return `${prefix}-${String(lastNum + 1).padStart(3, '0')}`;
  }

  async function handleSave() {
    let courseCode = formData.course_code;
    if (!courseCode && formData.category) {
      courseCode = await generateCourseCode(formData.category);
    }
    const payload = { ...formData, course_code: courseCode };
    if (selectedCourse) {
      await supabase.from('training_courses').update(payload).eq('id', selectedCourse.id);
      setShowEdit(false);
    } else {
      await supabase.from('training_courses').insert([payload]);
      setShowAdd(false);
    }
    setSelectedCourse(null);
    load();
  }

  async function handleDelete(courseId: string) {
    if (!confirm('Are you sure?')) return;
    await supabase.from('training_courses').delete().eq('id', courseId);
    load();
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return courses.filter(c => {
      const matchSearch = !q ||
        c.course_code?.toLowerCase().includes(q) ||
        c.course_name?.toLowerCase().includes(q) ||
        c.provider?.toLowerCase().includes(q);
      const matchCat = !categoryFilter || c.category === categoryFilter;
      const matchStatus = !statusFilter || c.status === statusFilter;
      const matchMandatory = !mandatoryFilter || c.is_mandatory;
      return matchSearch && matchCat && matchStatus && matchMandatory;
    });
  }, [courses, search, categoryFilter, statusFilter, mandatoryFilter]);

  const stats = useMemo(() => ({
    total: courses.length,
    active: courses.filter(c => c.status === 'Active').length,
    mandatory: courses.filter(c => c.is_mandatory).length,
    categories: new Set(courses.map(c => c.category)).size,
  }), [courses]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <BookOpen className="w-7 h-7 text-sky-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Course Register</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} course{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setFormData(EMPTY_FORM); setSelectedCourse(null); setShowAdd(true); }}
          className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition text-sm font-medium shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Course</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Courses', value: stats.total },
          { label: 'Active', value: stats.active, color: 'text-emerald-700' },
          { label: 'Mandatory', value: stats.mandatory, color: 'text-sky-700' },
          { label: 'Categories', value: stats.categories },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color || 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {([['', 'All'], ['Active', 'Active'], ['Inactive', 'Inactive']] as const).map(([val, label]) => {
          const count = val === '' ? courses.length : courses.filter(c => c.status === val).length;
          return (
            <button
              key={label}
              onClick={() => setStatusFilter(val)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === val
                  ? val === 'Inactive' ? 'bg-gray-600 text-white shadow-sm' : 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${statusFilter === val ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white w-full sm:w-auto">
          <option value="">All Categories</option>
          {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </select>
        <label className="flex items-center gap-2 cursor-pointer px-1">
          <input type="checkbox" checked={mandatoryFilter} onChange={e => setMandatoryFilter(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-gray-700 whitespace-nowrap">Mandatory Only</span>
        </label>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              {['Code', 'Name', 'Category', 'Duration', 'Validity', 'Provider', 'Mandatory', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-sky-600" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No courses found</td></tr>
            ) : filtered.map((course, idx) => (
              <tr key={course.id} className={`hover:bg-sky-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-2.5 font-mono text-xs text-gray-700">{course.course_code}</td>
                <td className="px-4 py-2.5 text-xs text-gray-900 font-medium">{course.course_name}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full bg-${CATEGORY_COLORS[course.category] || 'gray'}-400`} />
                    {course.category}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{course.duration_hours} hrs</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{course.validity_months} mo</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{course.provider}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${course.is_mandatory ? 'bg-sky-100 text-sky-700' : 'bg-gray-100 text-gray-600'}`}>
                    {course.is_mandatory ? 'Yes' : 'No'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${course.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {course.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelectedCourse(course); setShowView(true); }} className="p-1.5 hover:bg-gray-100 rounded transition">
                      <Eye size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => {
                      setSelectedCourse(course);
                      setFormData({
                        course_code: course.course_code || '',
                        course_name: course.course_name || '',
                        category: course.category || '',
                        description: course.description || '',
                        duration_hours: course.duration_hours || 0,
                        validity_months: course.validity_months || 0,
                        provider: course.provider || '',
                        is_mandatory: course.is_mandatory || false,
                        status: course.status || 'Active',
                      });
                      setShowEdit(true);
                    }} className="p-1.5 hover:bg-gray-100 rounded transition">
                      <Edit2 size={14} className="text-gray-500" />
                    </button>
                    <button onClick={() => handleDelete(course.id!)} className="p-1.5 hover:bg-red-50 rounded transition">
                      <Trash2 size={14} className="text-red-500" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <CourseFormModal title="Add Course" formData={formData} onChange={setFormData} onSave={handleSave} onClose={() => setShowAdd(false)} />
      )}
      {showEdit && (
        <CourseFormModal title="Edit Course" formData={formData} onChange={setFormData} onSave={handleSave} onClose={() => setShowEdit(false)} />
      )}
      {showView && selectedCourse && (
        <CourseViewModal course={selectedCourse} onClose={() => setShowView(false)} />
      )}
    </div>
  );
}
