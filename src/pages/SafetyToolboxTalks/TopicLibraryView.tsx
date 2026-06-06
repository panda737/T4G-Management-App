import { useState, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import type { ToolboxTalkTopic } from '../../lib/supabase';

export default function TopicLibraryView({ topics, categories, onSelect }: {
  topics: ToolboxTalkTopic[];
  categories: Map<string, Set<string>>;
  onSelect: (topic: ToolboxTalkTopic) => void;
}) {
  const [selCat, setSelCat] = useState('');
  const [selSub, setSelSub] = useState('');
  const [search, setSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return topics.filter(t => {
      const matchCat = !selCat || t.category === selCat;
      const matchSub = !selSub || t.subcategory === selSub;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.talking_points.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSub && matchSearch;
    });
  }, [topics, selCat, selSub, search]);

  const subcategories = selCat ? Array.from(categories.get(selCat) || []) : [];

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search topics..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
          </div>
          <select value={selCat} onChange={e => { setSelCat(e.target.value); setSelSub(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Categories</option>
            {Array.from(categories.keys()).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {subcategories.length > 0 && (
            <select value={selSub} onChange={e => setSelSub(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="">All Subcategories</option>
              {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">{filtered.length} topics available</p>

      <div className="space-y-3">
        {filtered.map(topic => (
          <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <button onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition">
              <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expandedTopic === topic.id ? 'rotate-90' : ''}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{topic.title}</p>
                <div className="flex gap-2 mt-1">
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-700">{topic.category}</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">{topic.subcategory}</span>
                </div>
              </div>
              <button onClick={e => { e.stopPropagation(); onSelect(topic); }} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition flex-shrink-0">Use Topic</button>
            </button>
            {expandedTopic === topic.id && (
              <div className="px-12 pb-5 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Talking Points</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{topic.talking_points}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Questions</p>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">{topic.key_questions}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
