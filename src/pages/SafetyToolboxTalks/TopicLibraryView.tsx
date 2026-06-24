import { useState, useMemo } from 'react';
import { Search, ChevronRight, Lightbulb, Pencil, Trash2 } from 'lucide-react';
import type { ToolboxTalkTopic } from '../../lib/supabase';

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function TopicLibraryView({ topics, lastUsedByTopic, onSelect, canManage, onSuggest, onEdit, onDelete, progress }: {
  topics: ToolboxTalkTopic[];
  lastUsedByTopic: Map<string, string>;
  onSelect: (topic: ToolboxTalkTopic) => void;
  canManage: boolean;
  onSuggest: (topic: ToolboxTalkTopic) => void;
  onEdit: (topic: ToolboxTalkTopic) => void;
  onDelete: (topic: ToolboxTalkTopic) => void;
  progress?: Map<string, { done: number; required: number }> | null;
}) {
  const [search, setSearch] = useState('');
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const base = topics.filter(t =>
      !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.talking_points.toLowerCase().includes(search.toLowerCase())
    );
    return base.sort((a, b) => {
      if (a.is_suggested !== b.is_suggested) return a.is_suggested ? -1 : 1;
      const aDate = lastUsedByTopic.get(a.title) ?? null;
      const bDate = lastUsedByTopic.get(b.title) ?? null;
      if (!aDate && !bDate) return 0;
      if (!aDate) return -1;
      if (!bDate) return 1;
      return aDate.localeCompare(bDate);
    });
  }, [topics, search, lastUsedByTopic]);

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search topics..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500" />
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-2">{filtered.length} topics — never used first, most recently used last</p>

      <div className="space-y-3">
        {filtered.map(topic => {
          const lastUsed = lastUsedByTopic.get(topic.title);
          const p = progress?.get(topic.id);
          return (
            <div key={topic.id} className={`rounded-xl shadow-sm border overflow-hidden ${topic.is_suggested ? 'border-emerald-300 ring-1 ring-emerald-200 bg-emerald-50/40' : 'bg-white border-gray-200'}`}>
              <button onClick={() => setExpandedTopic(expandedTopic === topic.id ? null : topic.id)} className="w-full flex flex-wrap items-center gap-x-3 gap-y-2 px-3 sm:px-5 py-3 sm:py-4 text-left hover:bg-gray-50 transition">
                <ChevronRight className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${expandedTopic === topic.id ? 'rotate-90' : ''}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
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
                  <div className="flex flex-wrap gap-2 mt-1">
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-sky-100 text-sky-700">{topic.category}</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-600">{topic.subcategory}</span>
                    {topic.is_custom && <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-amber-100 text-amber-700">Custom</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0 w-full sm:w-auto justify-end" onClick={e => e.stopPropagation()}>
                  {canManage && (
                    <button
                      onClick={() => onSuggest(topic)}
                      title={topic.is_suggested ? 'Remove suggestion' : 'Suggest to operators'}
                      className={`p-1.5 rounded-lg transition ${topic.is_suggested ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                    >
                      <Lightbulb size={15} />
                    </button>
                  )}
                  {canManage && topic.is_custom && (
                    <button onClick={() => onEdit(topic)} title="Edit topic" className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"><Pencil size={15} /></button>
                  )}
                  {canManage && topic.is_custom && (
                    <button onClick={() => onDelete(topic)} title="Delete topic" className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"><Trash2 size={15} /></button>
                  )}
                  <button onClick={e => { e.stopPropagation(); onSelect(topic); }} className="px-3 py-1.5 text-xs font-medium text-white bg-gray-800 rounded-lg hover:bg-gray-900 transition">Use Topic</button>
                </div>
              </button>
              {expandedTopic === topic.id && (
                <div className="px-3 sm:px-12 pb-5 space-y-3">
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
