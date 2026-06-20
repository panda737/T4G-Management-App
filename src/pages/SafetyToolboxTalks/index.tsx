import { useState, useEffect, useMemo } from 'react';
import {
  Users, Plus, Eye, Trash2, Calendar, AlertCircle,
  ClipboardList, Library, Paperclip, X as XIcon,
} from 'lucide-react';
import { useToast } from '../../lib/toast';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { PageHeader, Button, Toolbar, SearchInput, StatStrip } from '../../components/ui';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
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
import TopicFormModal from './TopicFormModal';

export default function SafetyToolboxTalks() {
  usePageTitle('Safety — Toolbox Talks');
  const { isAdmin, isManagement } = useUser();
  const canDelete = isAdmin || isManagement;
  const canManage = isAdmin || isManagement;
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
  const { addToast } = useToast();
  const [opError, setOpError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; label: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showTopicForm, setShowTopicForm] = useState(false);
  const [editTopic, setEditTopic] = useState<ToolboxTalkTopic | null>(null);

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
      const aVal = a[sortConfig.key as keyof SafetyToolboxTalk] ?? '';
      const bVal = b[sortConfig.key as keyof SafetyToolboxTalk] ?? '';
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
    if (!formData.topic?.trim()) { setOpError('Please choose a topic from the library.'); return; }
    setOpError('');
    const talk_number = await generateSequentialNumber('safety_toolbox_talks', 'talk_number', 'TBT');

    let attachment_path = '';
    const attachment_name = formData.attachment_name;
    if (formData.attachment_file) {
      const ext = formData.attachment_file.name.split('.').pop();
      const filePath = `${new Date().getFullYear()}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('toolbox-talks')
        .upload(filePath, formData.attachment_file, { upsert: false });
      if (upErr) { setOpError(upErr.message); return; }
      attachment_path = filePath;
    }

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { selected_attendee_ids, attachment_file, attachment_path: _ap, attachment_name: _an, ...rest } = formData;
    const { data: insertedTalk, error } = await supabase
      .from('safety_toolbox_talks')
      .insert([{
        ...rest,
        talk_number,
        attendee_count: selected_attendee_ids.length,
        attendees: attendeeNames,
        attachment_path,
        attachment_name,
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

    // If this talk is the currently-suggested topic, advance the 3-shift goal and
    // clear the suggestion once 3 shifts have recorded it.
    const sugg = topics.find(t => t.is_suggested && t.title === formData.topic);
    if (sugg) {
      const { count } = await supabase
        .from('safety_toolbox_talks')
        .select('id', { count: 'exact', head: true })
        .eq('topic', sugg.title)
        .gte('created_at', sugg.suggested_at || '1970-01-01');
      if ((count ?? 0) >= 3) {
        await supabase.from('toolbox_talk_topics').update({ is_suggested: false, suggested_at: null }).eq('id', sugg.id);
      }
    }

    addToast('Toolbox talk saved');
    setShowAddModal(false);
    loadData();
    resetForm();
  }

  function handleDelete(id: string, label: string) {
    setDeleteTarget({ id, label });
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    setOpError('');
    const { error } = await supabase.from('safety_toolbox_talks').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) { setOpError(error.message); return; }
    addToast('Talk deleted');
    loadData();
  }

  function resetForm() {
    setFormData({ ...EMPTY_FORM, talk_date: new Date().toISOString().split('T')[0] });
  }

  async function downloadAttachment(talk: SafetyToolboxTalk) {
    const { data } = await supabase.storage.from('toolbox-talks').createSignedUrl(talk.attachment_path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  function openAddModal() {
    resetForm();
    setShowAddModal(true);
  }

  // Suggest: only one topic may be "suggested" at a time. A suggestion stays
  // active until the topic has been recorded 3 times (once per shift).
  async function toggleSuggest(topic: ToolboxTalkTopic) {
    if (topic.is_suggested) {
      await supabase.from('toolbox_talk_topics').update({ is_suggested: false, suggested_at: null }).eq('id', topic.id);
    } else {
      await supabase.from('toolbox_talk_topics').update({ is_suggested: false, suggested_at: null }).eq('is_suggested', true);
      await supabase.from('toolbox_talk_topics').update({ is_suggested: true, suggested_at: new Date().toISOString() }).eq('id', topic.id);
    }
    addToast(topic.is_suggested ? 'Suggestion removed' : `Suggested "${topic.title}" (needs 3 shifts)`);
    loadData();
  }

  const SHIFTS_REQUIRED = 3;
  // The active suggestion + how many shifts have recorded it since it was suggested.
  const suggestedProgress = useMemo(() => {
    const sugg = topics.find(t => t.is_suggested);
    if (!sugg) return null;
    const since = sugg.suggested_at || '';
    const done = talks.filter(t => t.topic === sugg.title && (!since || t.created_at >= since)).length;
    return { id: sugg.id, done: Math.min(done, SHIFTS_REQUIRED), required: SHIFTS_REQUIRED };
  }, [topics, talks]);

  function openAddTopic() { setEditTopic(null); setShowTopicForm(true); }
  function openEditTopic(topic: ToolboxTalkTopic) { setEditTopic(topic); setShowTopicForm(true); }

  async function deleteTopic(topic: ToolboxTalkTopic) {
    if (!window.confirm(`Delete the topic "${topic.title}" from the library? This cannot be undone.`)) return;
    const { error } = await supabase.from('toolbox_talk_topics').delete().eq('id', topic.id);
    if (error) { setOpError(error.message); return; }
    addToast('Topic deleted');
    loadData();
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

  const lastUsedByTopic = useMemo(() => {
    const map = new Map<string, string>();
    talks.forEach(t => {
      if (!t.topic) return;
      const existing = map.get(t.topic);
      if (!existing || t.talk_date > existing) map.set(t.topic, t.talk_date);
    });
    return map;
  }, [talks]);

  const sortedFilteredTopics = useMemo(() => {
    return [...filteredTopics].sort((a, b) => {
      if (a.is_suggested !== b.is_suggested) return a.is_suggested ? -1 : 1;
      const aDate = lastUsedByTopic.get(a.title) ?? null;
      const bDate = lastUsedByTopic.get(b.title) ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.localeCompare(bDate);
    });
  }, [filteredTopics, lastUsedByTopic]);

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
    <div className="space-y-4">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}

      <PageHeader
        title="Toolbox Talks"
        subtitle="Safety toolbox talks with attendance register and topic library"
        icon={Users}
        accent="amber"
        actions={
          <>
            <Button variant="secondary" accent="amber" icon={Library} onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setLibrarySearch(''); setShowLibraryModal(true); }}>Topic Library</Button>
            {canManage && <Button variant="secondary" accent="amber" icon={Plus} onClick={openAddTopic}>Add Talk</Button>}
            <Button variant="primary" accent="amber" icon={Plus} onClick={openAddModal}>Record Talk</Button>
          </>
        }
      />

      <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5 w-fit">
          <button onClick={() => setActiveTab('register')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <ClipboardList size={14} className="inline mr-1.5" /> Talk Register
          </button>
          <button onClick={() => setActiveTab('library')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'library' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Library size={14} className="inline mr-1.5" /> Topic Library
          </button>
        </div>

        {activeTab === 'register' && (
          <>
            <Toolbar>
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search by topic, presenter…" />
              <div className="relative">
                <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className={`pl-10 pr-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 ${monthFilter ? 'border-amber-300 text-amber-700' : 'border-gray-200 text-gray-600'}`} />
              </div>
            </Toolbar>

            <StatStrip accent="amber" stats={statCards.map(s => ({ label: s.label, value: s.count }))} />

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {loading ? (
                <div className="p-8 text-center flex justify-center"><Spinner color="gray" /></div>
              ) : filteredTalks.length === 0 ? (
                <div className="py-14 text-center">
                  <Users className="w-8 h-8 text-gray-300 mx-auto mb-3" />
                  {talks.length === 0 ? (
                    <>
                      <p className="text-sm font-medium text-gray-500">No toolbox talks recorded yet</p>
                      <p className="text-xs text-gray-400 mt-1">Record your first safety toolbox talk.</p>
                      <button onClick={() => setShowAddModal(true)} className="mt-4 text-sm text-green-700 hover:text-green-800 font-medium">+ Record Talk</button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-400">No talks match your filters.</p>
                    </>
                  )}
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
                          <tr key={talk.id} onClick={() => { setSelectedTalk(talk); setShowViewModal(true); }} className="border-b border-gray-200 hover:bg-gray-50 transition cursor-pointer">
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900 whitespace-nowrap">{talk.talk_number}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{new Date(talk.talk_date).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5 text-sm font-medium text-gray-900 max-w-[200px] truncate">{talk.topic}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{talk.presented_by}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{talk.duration_minutes} min</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600 whitespace-nowrap">{talk.attendee_count}</td>
                            <td className="px-4 py-2.5 text-sm text-gray-600">{talk.location}</td>
                            <td className="px-4 py-3 text-sm">
                              {talk.follow_up_required ? (
                                <div className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-orange-600" /><span className="text-orange-600">Required</span></div>
                              ) : <span className="text-gray-400">-</span>}
                            </td>
                            <td className="px-4 py-3 text-sm flex gap-2" onClick={e => e.stopPropagation()}>
                              <button onClick={() => { setSelectedTalk(talk); setShowViewModal(true); }} className="text-gray-600 hover:text-gray-900 transition"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => { setSelectedTalk(talk); setShowAttendanceModal(true); }} className="text-sky-600 hover:text-sky-800 transition" title="Attendance Register"><ClipboardList className="w-4 h-4" /></button>
                              {canDelete && <button onClick={() => handleDelete(talk.id, talk.talk_number || 'this talk')} className="text-red-600 hover:text-red-700 transition"><Trash2 className="w-4 h-4" /></button>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="md:hidden divide-y divide-gray-100">
                    {filteredTalks.map(talk => (
                      <div key={talk.id} onClick={() => { setSelectedTalk(talk); setShowViewModal(true); }} className="px-4 py-3 flex items-start gap-2 cursor-pointer hover:bg-gray-50 transition">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900 truncate">{talk.topic}</p>
                            {talk.follow_up_required && <AlertCircle size={12} className="text-orange-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {new Date(talk.talk_date).toLocaleDateString()} · {talk.presented_by} · {talk.duration_minutes} min · {talk.attendee_count} attendees{talk.location ? ` · ${talk.location}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setSelectedTalk(talk); setShowAttendanceModal(true); }} className="p-2 text-sky-600 hover:bg-sky-50 rounded"><ClipboardList size={15} /></button>
                          {canDelete && <button onClick={() => handleDelete(talk.id, talk.talk_number || 'this talk')} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash2 size={15} /></button>}
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
          <TopicLibraryView
            topics={topics}
            categories={categories}
            lastUsedByTopic={lastUsedByTopic}
            onSelect={selectTopicFromLibrary}
            canManage={canManage}
            onSuggest={toggleSuggest}
            onEdit={openEditTopic}
            onDelete={deleteTopic}
            suggestedProgress={suggestedProgress}
          />
        )}

      {showAddModal && (
        <Modal title="Record Toolbox Talk" onClose={() => setShowAddModal(false)} size="lg" accent="green" footer={
          <>
            <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSave} className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition font-medium">Save</button>
          </>
        }>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Talk Date *</label>
              <input type="date" value={formData.talk_date} onChange={e => setFormData({ ...formData, talk_date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Topic * <span className="text-gray-400 font-normal text-xs">(choose from the library)</span>
              </label>
              {formData.topic ? (
                <div className="flex items-center justify-between gap-2 px-3 py-2.5 border border-gray-300 rounded-lg bg-gray-50">
                  <span className="text-sm font-medium text-gray-900 truncate">{formData.topic}</span>
                  <button type="button" onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setLibrarySearch(''); setShowLibraryModal(true); }} className="text-xs text-sky-600 hover:underline flex-shrink-0">Change</button>
                </div>
              ) : (
                <button type="button" onClick={() => { setSelectedCategory(''); setSelectedSubcategory(''); setLibrarySearch(''); setShowLibraryModal(true); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-amber-400 hover:text-amber-600 transition">
                  <Library size={14} /> Choose a topic from the library
                </button>
              )}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Attach Document <span className="text-gray-400 font-normal text-xs">(optional — PDF, Word, or image)</span>
              </label>
              {formData.attachment_file ? (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-lg text-sm">
                  <Paperclip className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="truncate text-green-800 flex-1">{formData.attachment_file.name}</span>
                  <button type="button" onClick={() => setFormData(p => ({ ...p, attachment_file: null, attachment_name: '', attachment_path: '' }))} className="text-green-600 hover:text-green-800 flex-shrink-0"><XIcon size={14} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition text-sm text-gray-500">
                  <Paperclip className="w-4 h-4 flex-shrink-0" />
                  <span>Tap to attach a file</span>
                  <input type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) setFormData(p => ({ ...p, attachment_file: f, attachment_name: f.name }));
                  }} />
                </label>
              )}
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
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Attendees ({selectedTalk.attendee_count})</p>
            {selectedTalk.attendees?.trim() ? (
              <div className="flex flex-wrap gap-1.5">
                {selectedTalk.attendees.split(',').map(n => n.trim()).filter(Boolean).map((name, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 rounded-full px-2 py-0.5">{name}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No attendees recorded.</p>
            )}
          </div>
          {selectedTalk.attachment_path && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Attached Document</p>
              <button onClick={() => downloadAttachment(selectedTalk)} className="flex items-center gap-2 text-sm text-sky-600 hover:underline">
                <Paperclip size={14} /> {selectedTalk.attachment_name || 'Download attachment'}
              </button>
            </div>
          )}
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
            categories={categories}
            selectedCategory={selectedCategory} setSelectedCategory={setSelectedCategory}
            selectedSubcategory={selectedSubcategory} setSelectedSubcategory={setSelectedSubcategory}
            searchTerm={librarySearch} setSearchTerm={setLibrarySearch}
            filteredTopics={sortedFilteredTopics}
            lastUsedByTopic={lastUsedByTopic}
            onSelect={selectTopicFromLibrary}
            suggestedProgress={suggestedProgress}
          />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.label}
          onConfirm={handleDeleteConfirm}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {showTopicForm && (
        <TopicFormModal
          topic={editTopic}
          categories={Array.from(categories.keys())}
          onClose={() => { setShowTopicForm(false); setEditTopic(null); }}
          onSaved={() => { setShowTopicForm(false); setEditTopic(null); loadData(); }}
        />
      )}
    </div>
  );
}
