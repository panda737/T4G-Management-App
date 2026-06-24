import { Search, Lightbulb } from 'lucide-react';
import type { ToolboxTalkTopic } from '../../lib/supabase';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TopicLibraryPicker({
  categories, selectedCategory, setSelectedCategory,
  selectedSubcategory, setSelectedSubcategory,
  searchTerm, setSearchTerm, filteredTopics, lastUsedByTopic, onSelect, progress,
  canManage, onSuggest,
}: {
  categories: Map<string, Set<string>>;
  selectedCategory: string;
  setSelectedCategory: (v: string) => void;
  selectedSubcategory: string;
  setSelectedSubcategory: (v: string) => void;
  searchTerm: string;
  setSearchTerm: (v: string) => void;
  filteredTopics: ToolboxTalkTopic[];
  lastUsedByTopic: Map<string, string>;
  onSelect: (topic: ToolboxTalkTopic) => void;
  progress?: Map<string, { done: number; required: number }> | null;
  canManage?: boolean;
  onSuggest?: (topic: ToolboxTalkTopic) => void;
}) {
  const subcategories = selectedCategory ? Array.from(categories.get(selectedCategory) || []) : [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search topics..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <select value={selectedCategory} onChange={e => { setSelectedCategory(e.target.value); setSelectedSubcategory(''); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">All Categories</option>
          {Array.from(categories.keys()).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {subcategories.length > 0 && (
          <select value={selectedSubcategory} onChange={e => setSelectedSubcategory(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">All Subcategories</option>
            {subcategories.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>
      <p className="text-xs text-gray-400">Topics never used appear first. Most recently used are at the bottom.</p>
      <div className="space-y-2">
        {filteredTopics.map(topic => {
          const lastUsed = lastUsedByTopic.get(topic.title);
          const p = progress?.get(topic.id);
          return (
            <button key={topic.id} onClick={() => onSelect(topic)} className={`w-full text-left px-4 py-3 border rounded-lg transition ${topic.is_suggested ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200 hover:bg-emerald-100' : 'bg-white border-gray-200 hover:bg-sky-50 hover:border-sky-200'}`}>
              <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1.5">
                <p className="text-sm font-semibold text-gray-900 flex-1 min-w-0">
                  {p && (
                    <span className={`mr-1.5 align-middle text-[10px] font-bold rounded px-1.5 py-0.5 ${p.done >= p.required ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                      {p.done}/{p.required}
                    </span>
                  )}
                  {topic.is_suggested && (
                    <span className="mr-1.5 align-middle text-[10px] font-bold text-white bg-emerald-600 rounded px-1.5 py-0.5">
                      SUGGESTED
                    </span>
                  )}
                  {topic.title}
                </p>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {lastUsed ? (
                    <span className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                      Last: {fmtDate(lastUsed)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 whitespace-nowrap">
                      Never used
                    </span>
                  )}
                  {canManage && onSuggest && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={e => { e.stopPropagation(); onSuggest(topic); }}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onSuggest(topic); } }}
                      title={topic.is_suggested ? 'Remove suggestion' : 'Suggest to operators'}
                      className={`inline-flex items-center justify-center p-1 rounded-lg transition cursor-pointer ${topic.is_suggested ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      <Lightbulb size={14} />
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-700">{topic.category}</span>
                <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">{topic.subcategory}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{topic.talking_points}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
