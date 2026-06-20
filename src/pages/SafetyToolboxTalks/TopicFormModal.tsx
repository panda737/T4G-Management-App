import { useState } from 'react';
import { supabase, type ToolboxTalkTopic } from '../../lib/supabase';
import { useToast } from '../../lib/toast';
import Modal from '../../components/Modal';

interface Props {
  /** null = create a new library topic; otherwise edit. */
  topic: ToolboxTalkTopic | null;
  /** Existing category names, for the datalist suggestions. */
  categories: string[];
  onClose: () => void;
  onSaved: () => void;
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';

export default function TopicFormModal({ topic, categories, onClose, onSaved }: Props) {
  const { addToast } = useToast();
  const [form, setForm] = useState({
    title: topic?.title ?? '',
    category: topic?.category ?? '',
    subcategory: topic?.subcategory ?? '',
    talking_points: topic?.talking_points ?? '',
    key_questions: topic?.key_questions ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k: keyof typeof form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function handleSave() {
    if (!form.title.trim()) { setError('Title is required.'); return; }
    if (!form.category.trim()) { setError('Category is required.'); return; }
    setSaving(true);
    setError('');
    const payload = {
      title: form.title.trim(),
      category: form.category.trim(),
      subcategory: form.subcategory.trim(),
      talking_points: form.talking_points,
      key_questions: form.key_questions,
    };
    const { error: err } = topic
      ? await supabase.from('toolbox_talk_topics').update(payload).eq('id', topic.id)
      : await supabase.from('toolbox_talk_topics').insert([{ ...payload, is_custom: true }]);
    setSaving(false);
    if (err) { setError(err.message); return; }
    addToast(topic ? 'Topic updated' : 'Topic added to library');
    onSaved();
  }

  return (
    <Modal
      title={topic ? 'Edit Topic' : 'Add Toolbox Talk Topic'}
      onClose={onClose}
      size="lg"
      accent="amber"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition">Cancel</button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 font-medium shadow-sm transition"
          >
            {saving ? 'Saving…' : topic ? 'Save Changes' : 'Add to Library'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} className={inputCls} placeholder="e.g. Safe Handling of Sharps" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
          <input list="tbt-categories" value={form.category} onChange={e => set('category', e.target.value)} className={inputCls} placeholder="Pick or type a category" />
          <datalist id="tbt-categories">
            {categories.map(c => <option key={c} value={c} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subcategory</label>
          <input value={form.subcategory} onChange={e => set('subcategory', e.target.value)} className={inputCls} placeholder="e.g. Sharps Safety" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Talking Points</label>
          <textarea value={form.talking_points} onChange={e => set('talking_points', e.target.value)} rows={5} className={inputCls} placeholder="What should be covered in the talk…" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Discussion Questions</label>
          <textarea value={form.key_questions} onChange={e => set('key_questions', e.target.value)} rows={3} className={inputCls} placeholder="Questions to ask the team…" />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
    </Modal>
  );
}
