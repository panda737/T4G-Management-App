import { useEffect, useState, useMemo } from 'react';
import { CalendarDays, Plus, Search, Eye, CreditCard as Edit2, Trash2 } from 'lucide-react';
import { supabase, TrainingSchedule, TrainingCourse } from '../../lib/supabase';
import SessionFormModal, { SessionFormData, SESSION_STATUS_COLORS } from './SessionFormModal';
import SessionViewModal from './SessionViewModal';

const EMPTY_FORM: SessionFormData = {
  course_name: '',
  scheduled_date: '',
  scheduled_time: '',
  location: '',
  instructor: '',
  instructor_id: null,
  capacity: 0,
  enrolled_count: 0,
  description: '',
  status: 'Scheduled',
  selected_attendee_ids: [],
};

export default function TrainingSchedulePage() {
  const [sessions, setSessions] = useState<TrainingSchedule[]>([]);
  const [courses, setCourses] = useState<TrainingCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState('All');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [showForm, setShowForm] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedSession, setSelectedSession] = useState<TrainingSchedule | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<SessionFormData>(EMPTY_FORM);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [sessionsRes, coursesRes] = await Promise.all([
      supabase.from('training_schedule').select('*').order('scheduled_date', { ascending: true }),
      supabase.from('training_courses').select('*'),
    ]);
    setSessions(sessionsRes.data || []);
    setCourses(coursesRes.data || []);
    setLoading(false);
  }

  async function handleSave() {
    if (!formData.course_name || !formData.scheduled_date || !formData.instructor || !formData.location) {
      alert('Please fill in required fields');
      return;
    }
    const course = courses.find(c => c.course_name === formData.course_name);
    const enrolledCount = formData.selected_attendee_ids.length > 0
      ? formData.selected_attendee_ids.length
      : formData.enrolled_count;
    const data = {
      course_id: course?.id || null,
      course_name: formData.course_name,
      scheduled_date: formData.scheduled_date,
      scheduled_time: formData.scheduled_time || null,
      location: formData.location,
      instructor: formData.instructor,
      instructor_id: formData.instructor_id || null,
      capacity: formData.capacity,
      enrolled_count: enrolledCount,
      description: formData.description,
      status: formData.status,
    };

    let sessionId = editingId;
    if (editingId) {
      await supabase.from('training_schedule').update(data).eq('id', editingId);
      // Replace attendees: delete old, insert new
      if (formData.selected_attendee_ids.length > 0) {
        await supabase.from('training_session_attendees').delete().eq('session_id', editingId);
        await supabase.from('training_session_attendees').insert(
          formData.selected_attendee_ids.map(empId => ({ session_id: editingId, employee_id: empId }))
        );
      }
    } else {
      const { data: inserted } = await supabase.from('training_schedule').insert([data]).select('id').single();
      sessionId = inserted?.id ?? null;
      if (sessionId && formData.selected_attendee_ids.length > 0) {
        await supabase.from('training_session_attendees').insert(
          formData.selected_attendee_ids.map(empId => ({ session_id: sessionId, employee_id: empId }))
        );
      }
    }

    setShowForm(false);
    setEditingId(null);
    setFormData(EMPTY_FORM);
    load();
  }

  async function handleDelete(id: string) {
    if (confirm('Delete this session?')) {
      await supabase.from('training_schedule').delete().eq('id', id);
      load();
    }
  }

  async function openEdit(session: TrainingSchedule) {
    const { data: attendees } = await supabase
      .from('training_session_attendees')
      .select('employee_id')
      .eq('session_id', session.id);
    setFormData({
      course_name: session.course_name,
      scheduled_date: session.scheduled_date,
      scheduled_time: session.scheduled_time || '',
      location: session.location,
      instructor: session.instructor,
      instructor_id: session.instructor_id ?? null,
      capacity: session.capacity,
      enrolled_count: session.enrolled_count,
      description: session.description || '',
      status: session.status,
      selected_attendee_ids: (attendees || []).map(a => a.employee_id),
    });
    setEditingId(session.id);
    setShowForm(true);
  }

  const today = new Date().toISOString().split('T')[0];

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sessions.filter(s => {
      const matchSearch = !q ||
        s.course_name.toLowerCase().includes(q) ||
        s.instructor.toLowerCase().includes(q) ||
        s.location.toLowerCase().includes(q);
      const matchTab = statusTab === 'All' || s.status === statusTab;
      const matchMonth = s.scheduled_date.slice(0, 7) === monthFilter;
      return matchSearch && matchTab && matchMonth;
    });
  }, [sessions, search, statusTab, monthFilter]);

  const stats = [
    { label: 'Total Sessions', value: sessions.length },
    { label: 'Upcoming', value: sessions.filter(s => s.status === 'Scheduled' && s.scheduled_date >= today).length },
    { label: 'Completed', value: sessions.filter(s => s.status === 'Completed').length },
    { label: 'Total Enrolled', value: sessions.reduce((sum, s) => sum + s.enrolled_count, 0) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <CalendarDays size={28} className="text-emerald-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Schedule</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} session{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingId(null); setFormData(EMPTY_FORM); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition text-sm font-medium shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Schedule Session</span><span className="sm:hidden">Schedule</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['All', 'Scheduled', 'In Progress', 'Completed', 'Cancelled'] as const).map(tab => {
          const count = tab === 'All' ? sessions.length : sessions.filter(s => s.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusTab(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusTab === tab ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${statusTab === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search course, instructor, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <input
          type="month"
          value={monthFilter}
          onChange={e => setMonthFilter(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white text-left text-xs font-medium uppercase tracking-wider">
              <th className="px-4 py-3">Course</th>
              <th className="px-4 py-3">Date & Time</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Instructor</th>
              <th className="px-4 py-3 w-36">Enrollment</th>
              <th className="px-4 py-3 w-28">Status</th>
              <th className="px-4 py-3 w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={7} className="py-12 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="py-12 text-center text-sm text-gray-400">No sessions found</td></tr>
            ) : filtered.map((session, idx) => (
              <tr key={session.id} className={`hover:bg-emerald-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                <td className="px-4 py-2.5 text-xs font-medium text-gray-900">{session.course_name}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                  {new Date(session.scheduled_date).toLocaleDateString()}
                  {session.scheduled_time && ` · ${session.scheduled_time}`}
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{session.location}</td>
                <td className="px-4 py-2.5 text-xs text-gray-600">{session.instructor}</td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${(session.enrolled_count / session.capacity) * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-600 whitespace-nowrap">{session.enrolled_count}/{session.capacity}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${SESSION_STATUS_COLORS[session.status]}`}>
                    {session.status}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-1">
                    <button onClick={() => { setSelectedSession(session); setShowView(true); }} className="p-1.5 text-gray-400 hover:text-gray-600 transition">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEdit(session)} className="p-1.5 text-gray-400 hover:text-emerald-600 transition">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(session.id)} className="p-1.5 text-gray-400 hover:text-red-600 transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <SessionFormModal
          title={editingId ? 'Edit Training Session' : 'Schedule New Session'}
          formData={formData}
          courses={courses}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditingId(null); }}
        />
      )}
      {showView && selectedSession && (
        <SessionViewModal session={selectedSession} onClose={() => setShowView(false)} />
      )}
    </div>
  );
}
