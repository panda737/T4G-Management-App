import { useState, useMemo } from 'react';
import { Search, ChevronRight } from 'lucide-react';
import type { ToolboxTalkTopic } from '../../lib/supabase';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TopicLibraryView({ topics, categories, lastUsedByTopic, onSelect }: {
  topics: ToolboxTalkTopic[];
  categories: Map<string, Set<string>>;
  lastUsedByTopic: Map<string, string>;
  onSelect: (topic: ToolboxTalkTopic) => void;
}) {
  const [selCat, setSelCat] = useState('');
  const [selSub, setSelSub] = useState('');
  const [search, setSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = topics.filter(t => {
      const matchCat = !selCat || t.category === selCat;
      const matchSub = !selSub || t.subcategory === selSub;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.talking_points.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSub && matchSearch;
    });
    return base.sort((a, b) => {
      const aDate = lastUsedByTopic.get(a.title) ?? null;
      const bDate = lastUsedByTopic.get(b.title) ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.localeCompare(bDate);
    });
  }, [topics, selCat, selSub, search, lastUsedByTopic]);

  const subcategories = selCat ? Array.from(categories.get(selCat) || []) : [];

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
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

      <p className="text-sm text-gray-500 mb-2">{filtered.length} topics — never used first, most recently used last</p>

      <div className="space-y-3">
        {filtered.map(topic => {
          const lastUsed = lastUsedByTopic.get(topic.title);
          return (
            <div key={topic.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)} className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-gray-50 transition">
                <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expandedTopic === topic.id ? 'rotate-90' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{topic.title}</p>
                    {lastUsed ? (
                      <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
                        Last: {fmtDate(lastUsed)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 flex-shrink-0 whitespace-nowrap">
                        Never used
                      </span>
                    )}
                  </div>
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
          );
        })}
      </div>
    </div>
  );
}
