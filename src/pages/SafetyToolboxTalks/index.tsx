import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Eye, Trash2, Search, Calendar, AlertCircle,
  ClipboardList, Library,
} from 'lucide-react';
import { Spinner } from '../../components/Spinner';
import { supabase, SafetyToolboxTalk, ToolboxTalkTopic } from '../../lib/supabase';
import Modal from '../../components/Modal';
import AttendanceRegister from '../../components/AttendanceRegister';
import EmployeeSelect from '../../components/EmployeeSelect';
import EmployeeMultiSelect from '../../components/EmployeeMultiSelect';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import { PRESENTER_POSITIONS, EMPTY_FORM, type FormData, type Tab } from './constants';
import TopicLibraryView from './TopicLibraryView';
import TopicLibraryPicker from './TopicLibraryPicker';

export default function SafetyToolboxTalks() {
  const [talks, setTalks] = useState<SafetyToolboxTalk[]>([]);
  const [filteredTalks, setFilteredTalks] = useState<SafetyToolboxTalk[]>([]);
  const [topics, setTopics] = useState<ToolboxTalkTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [selectedTalk, setSelectedTalk] = useState<SafetyToolboxTalk | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('register');
  const [sortConfig, setSortConfig] = useState<{ key: string; ascending: boolean }>({ key: 'talk_date', ascending: false });
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSubcategory, setSelectedSubcategory] = useState('');
  const [librarySearch, setLibrarySearch] = useState('');
  const [formData, setFormData] = useState<FormData>({ ...EMPTY_FORM, talk_date: new Date().toISOString().split('T')[0] });
  const [opError, setOpError] = useState('');

  useEffect(() => { loadData(); }, []);
  useEffect(() => { filterTalks(); }, [talks, searchTerm, monthFilter, sortConfig]);

  async function loadData() {
    setLoading(true);
    const [talkRes, topicRes] = await Promise.all([
      supabase.from('safety_toolbox_talks').select('*').order('talk_date', { ascending: false }),
      supabase.from('toolbox_talk_topics').select('*').order('category').order('subcategory').order('title'),
    ]);
    setTalks(talkRes.data || []);
    setTopics(topicRes.data || []);
    setLoading(false);
  }

  function filterTalks() {
    let filtered = talks.filter(talk => {
      const matchesSearch = !searchTerm ||
        talk.topic?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        talk.presented_by?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        talk.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesMonth = !monthFilter || talk.talk_date?.startsWith(monthFilter);
      return matchesSearch && matchesMonth;
    });
    filtered.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof SafetyToolboxTalk];
      const bVal = b[sortConfig.key as keyof SafetyToolboxTalk];
      if (aVal < bVal) return sortConfig.ascending ? -1 : 1;
      if (aVal > bVal) return sortConfig.ascending ? 1 : -1;
      return 0;
    });
    setFilteredTalks(filtered);
  }

  function handleSort(key: string) {
    setSortConfig({ key, ascending: sortConfig.key === key ? !sortConfig.ascending : false });
  }

  async function handleSave() {
    const talk_number = await generateSequentialNumber('safety_toolbox_talks', 'talk_number', 'TBT');
    let attendeeNames = '';
    if (formData.selected_attendee_ids.length > 0) {
      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, surname')
        .in('id', formData.selected_attendee_ids);
      if (empData) {
        attendeeNames = empData.map(e => `${e.first_name} ${e.surname}`).join(', ');
      }
    }
    const { selected_attendee_ids, ...rest } = formData;
    const { data: insertedTalk, error } = await supabase
      .from('safety_toolbox_talks')
      .insert([{
        ...rest,
        talk_number,
        attendee_count: selected_attendee_ids.length,
        attendees: attendeeNames,
      }])
      .select('id')
      .single();
    if (error || !insertedTalk) return;

    if (formData.selected_attendee_ids.length > 0) {
      const { data: empData } = await supabase
        .from('employees')
        .select('id, first_name, surname')
        .in('id', formData.selected_attendee_ids);
      const empMap = new Map((empData || []).map(e => [e.id, `${e.first_name} ${e.surname}`]));
      const attendanceRecords = formData.selected_attendee_ids.map(empId => ({
        reference_type: 'toolbox_talk' as const,
        reference_id: insertedTalk.id,
        employee_id: empId,
        employee_name: empMap.get(empId) || '',
        status: 'Present',
      }));
      const junctionRecords = formData.selected_attendee_ids.map(empId => ({
        toolbox_id: insertedTalk.id,
        employee_id: empId,
      }));
      const results = await Promise.all([
        supabase.from('training_attendance').insert(attendanceRecords),
        supabase.from('toolbox_attendees').insert(junctionRecords),
      ]);
      const attendanceErr = results[0].error;
      const junctionErr = results[1].error;
      if (attendanceErr || junctionErr) {
        setOpError((attendanceErr ?? junctionErr)!.message);
        return;
      }
    }

    setShowAddModal(false);
    loadData();
    resetForm();
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this talk record?')) return;
    setOpError('');
    const { error } = await supabase.from('safety_toolbox_talks').delete().eq('id', id);
    if (error) { setOpError(error.message); return; }
    loadData();
  }

  function resetForm() {
    setFormData({ ...EMPTY_FORM, talk_date: new Date().toISOString().split('T')[0] });
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  function selectTopicFromLibrary(topic: ToolboxTalkTopic) {
    setFormData(prev => ({
      ...prev,
      topic: topic.title,
      description: `${topic.talking_points}\n\nKey Discussion Questions:\n${topic.key_questions}`,
    }));
    setShowLibraryModal(false);
    setShowAddModal(true);
  }

  const categories = useMemo(() => {
    const cats = new Map<string, Set<string>>();
    topics.forEach(t => {
      if (!cats.has(t.category)) cats.set(t.category, new Set());
      cats.get(t.category)!.add(t.subcategory);
    });
    return cats;
  }, [topics]);

  const filteredTopics = useMemo(() => {
    return topics.filter(t => {
      const matchCat = !selectedCategory || t.category === selectedCategory;
      const matchSub = !selectedSubcategory || t.subcategory === selectedSubcategory;
      const matchSearch = !librarySearch ||
        t.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
        t.talking_points.toLowerCase().includes(librarySearch.toLowerCase());
      return matchCat && matchSub && matchSearch;
    });
  }, [topics, selectedCategory, selectedSubcategory, librarySearch]);

  const currentYear = new Date().getFullYear();
  const yearTalks = talks.filter(t => t.talk_date?.startsWith(currentYear.toString()));
  const totalAttendees = yearTalks.reduce((sum, t) => sum + t.attendee_count, 0);
  const avgDuration = yearTalks.length > 0
    ? Math.round(yearTalks.reduce((sum, t) => sum + t.duration_minutes, 0) / yearTalks.length) : 0;
  const followUpsRequired = yearTalks.filter(t => t.follow_up_required && (!t.follow_up_notes || t.follow_up_notes.trim() === '')).length;

  const statCards = [
    { label: 'Total This Year', count: yearTalks.length },
    { label: 'Total Attendees', count: totalAttendees },
    { label: 'Avg Duration', count: `${avgDuration} min` },
    { label: 'Follow-ups Required', count: followUpsRequired },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5 mb-4">{opError}</div>}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0 mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <Users className="w-8 h-8 text-gray-700 flex-shrink-0" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Toolbox Talks</h1>
              <p className="text-gray-600 mt-1">Manage safety toolbox talks with attendance register and topic library</p>
            </div>
          </div>
          <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
            <button
              onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setLibrarySearch(''); setShowLibraryModal(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
            >
              <Library className="w-4 h-4" /> <span className="hidden sm:inline">Topic Library</span>
            </button>
            <button onClick={openAddModal} className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
              <Plus className="w-5 h-5" /> <span className="hidden sm:inline">Record Talk</span><span className="sm:hidden">Add</span>
            </button>
          </div>
        </div>

        <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 mb-6 w-fit">
          <button onClick={() => setActiveTab('register')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <ClipboardList size={14} className="inline mr-1.5" /> Talk Register
          </button>
          <button onClick={() => setActiveTab('library')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Library size={14} className="inline mr-1.5" /> Topic Library
          </button>
        </div>

        {activeTab === 'register' && (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input type="text" placeholder="Search by topic, presenter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
                <div className="relative flex-1 sm:flex-none">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
              {statCards.map(stat => (
                <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                  <p className="text-gray-600 text-sm">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{stat.count}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center flex justify-center"><Spinner color="gray" /></div>
              ) : filteredTalks.length === 0 ? (
                <div className="p-12 text-center">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No talks found</p>
                </div>
              ) : (
                <>
                  <div className="hidden md:block">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          {[
                            { key: 'talk_number', label: 'Talk #' },
                            { key: 'talk_date', label: 'Date' },
                            { key: 'topic', label: 'Topic' },
                            { key: 'presented_by', label: 'Presented By' },
                            { key: 'duration_minutes', label: 'Duration' },
                            { key: 'attendee_count', label: 'Attendees' },
                            { key: 'location', label: 'Location' },
                            { key: 'follow_up', label: 'Follow-up' },
                            { key: 'actions', label: 'Actions' },
                          ].map(col => (
                            <th key={col.key} onClick={() => col.key !== 'actions' && col.key !== 'follow_up' && handleSort(col.key)} className="px-4 py-3 text-left text-sm font-semibold text-gray-700 cursor-pointer hover:bg-gray-100">
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTalks.map(talk => (
                          <tr key={talk.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{talk.talk_number}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{new Date(talk.talk_date).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900 max-w-[200px] truncate">{talk.topic}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{talk.presented_by}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{talk.duration_minutes} min</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{talk.attendee_count}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{talk.location}</td>
                            <td className="px-4 py-3 text-sm">
                              {talk.follow_up_required ? (
                                <div className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-orange-600" /><span className="text-orange-600">Required</span></div>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-3 text-sm flex gap-2">
                              <button onClick={() => { setSelectedTalk(talk); setShowViewModal(true); }} className="text-gray-600 hover:text-gray-900 transition"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => { setSelectedTalk(talk); setShowAttendanceModal(true); }} className="text-sky-600 hover:text-sky-800 transition" title="Attendance Register"><ClipboardList className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(talk.id)} className="text-red-600 hover:text-red-700 transition"><Trash2 className="w-4 h-4" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredTalks.map(talk => (
                      <div key={talk.id} className="p-4 space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{talk.topic}</p>
                            <p className="text-xs text-gray-500 mt-1">{new Date(talk.talk_date).toLocaleDateString()}</p>
                          </div>
                          {talk.follow_up_required && <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />}
                        </div>
                        <div className="space-y-2 text-sm">
                          <p><span className="text-gray-600">Presenter:</span> {talk.presented_by}</p>
                          <p><span className="text-gray-600">Duration:</span> {talk.duration_minutes} min</p>
                          <p><span className="text-gray-600">Attendees:</span> {talk.attendee_count}</p>
                          <p><span className="text-gray-600">Location:</span> {talk.location}</p>
                        </div>
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                          <button onClick={() => { setSelectedTalk(talk); setShowViewModal(true); }} className="p-2 text-gray-600 hover:bg-gray-50 rounded"><Eye className="w-4 h-4" /></button>
                          <button onClick={() => { setSelectedTalk(talk); setShowAttendanceModal(true); }} className="p-2 text-sky-600 hover:bg-sky-50 rounded" title="Attendance Register"><ClipboardList className="w-4 h-4" /></button>
                          <button onClick={() => handleDelete(talk.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === 'library' && (
          <TopicLibraryView topics={topics} categories={categories} onSelect={selectTopicFromLibrary} />
        )}
      </div>

      {showAddModal && (
        <Modal title="Record Toolbox Talk" onClose={() => setShowAddModal(false)} size="lg" accent="green" footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium">Save</button>
          </>
        }>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talk Date *</label>
              <input type="date" value={formData.talk_date} onChange={e => setFormData({ ...formData, talk_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium text-gray-700">Topic *</label>
                <button onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setLibrarySearch(''); setShowLibraryModal(true); }} className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                  <Library size={12} /> Pick from Library
                </button>
              </div>
              <input type="text" value={formData.topic} onChange={e => setFormData({ ...formData, topic: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / Talking Points</label>
              <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} rows={5} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div>
              <EmployeeSelect
                label="Presented By"
                value={formData.presented_by_id}
                displayValue={formData.presented_by}
                onChange={(id, name) => setFormData({ ...formData, presented_by_id: id, presented_by: name })}
                positionFilter={PRESENTER_POSITIONS}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
              <input type="number" min="1" value={formData.duration_minutes} onChange={e => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>

            <div className="col-span-2">
              <EmployeeMultiSelect
                label="Attendees"
                value={formData.selected_attendee_ids}
                onChange={(ids) => setFormData(prev => ({ ...prev, selected_attendee_ids: ids }))}
                placeholder="Select attendees..."
              />
            </div>

            <div className="col-span-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={formData.follow_up_required} onChange={e => setFormData({ ...formData, follow_up_required: e.target.checked })} className="rounded border-gray-300" />
                <span className="text-sm font-medium text-gray-700">Follow-up Required</span>
              </label>
            </div>
            {formData.follow_up_required && (
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Follow-up Notes</label>
                <textarea value={formData.follow_up_notes} onChange={e => setFormData({ ...formData, follow_up_notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
              </div>
            )}
          </div>
        </Modal>
      )}

      {selectedTalk && showViewModal && (
        <Modal title="Toolbox Talk Details" onClose={() => setShowViewModal(false)} size="lg">
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[
              ['Talk #', selectedTalk.talk_number],
              ['Date', new Date(selectedTalk.talk_date).toLocaleDateString()],
              ['Topic', selectedTalk.topic],
              ['Presented By', selectedTalk.presented_by],
              ['Duration', `${selectedTalk.duration_minutes} minutes`],
              ['Location', selectedTalk.location],
              ['Attendee Count', selectedTalk.attendee_count.toString()],
              ['Follow-up Required', selectedTalk.follow_up_required ? 'Yes' : 'No'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs font-semibold text-gray-600 uppercase">{label}</p>
                <p className="text-sm text-gray-900 mt-1">{value}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Description / Talking Points</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTalk.description || 'N/A'}</p>
          </div>
          {selectedTalk.follow_up_required && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Follow-up Notes</p>
              <p className="text-sm text-gray-700">{selectedTalk.follow_up_notes || 'No notes'}</p>
            </div>
          )}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <button onClick={() => { setShowViewModal(false); setShowAttendanceModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm">
              <ClipboardList size={16} /> View / Manage Attendance Register
            </button>
          </div>
        </Modal>
      )}

      {selectedTalk && showAttendanceModal && (
        <Modal title={`Attendance: ${selectedTalk.topic}`} onClose={() => setShowAttendanceModal(false)} size="xl">
          <div className="mb-3">
            <p className="text-xs text-gray-500">{selectedTalk.talk_number} -- {new Date(selectedTalk.talk_date).toLocaleDateString()} -- {selectedTalk.presented_by}</p>
          </div>
          <AttendanceRegister referenceType="toolbox_talk" referenceId={selectedTalk.id} />
        </Modal>
      )}

      {showLibraryModal && (
        <Modal title="Topic Library" onClose={() => setShowLibraryModal(false)} size="xl">
          <TopicLibraryPicker
            topics={topics} categories={categories}
            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
            selectedSubcategory={selectedSubcategory} setSelectedSubcategory={setSelectedSubcategory}
            searchTerm={librarySearch} setSearchTerm={setLibrarySearch}
            filteredTopics={filteredTopics} onSelect={selectTopicFromLibrary}
          />
        </Modal>
      )}
    </div>
  );
}
