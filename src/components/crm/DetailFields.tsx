import { useState } from 'react';
import { Pencil, Loader2 } from 'lucide-react';

export interface DetailField {
  key: string;
  label: string;
  value: string | number | boolean | null;
  type?: 'text' | 'email' | 'tel' | 'url' | 'number' | 'textarea' | 'select' | 'checkbox';
  options?: { value: string; label: string }[];
  editable?: boolean;
  /** Custom read-mode rendering (e.g. a link or badge). */
  display?: React.ReactNode;
  full?: boolean;
}

interface DetailFieldsProps {
  title?: string;
  fields: DetailField[];
  columns?: 1 | 2 | 3;
  canEdit?: boolean;
  onSave?: (changes: Record<string, string | boolean>) => Promise<void> | void;
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white';

/** Salesforce-style detail panel with a section-level Edit / Save / Cancel toggle. */
export default function DetailFields({ title, fields, columns = 2, canEdit, onSave }: DetailFieldsProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string | boolean>>({});
  const [saving, setSaving] = useState(false);

  const editable = canEdit && !!onSave;
  const colCls = columns === 3 ? 'sm:grid-cols-3' : columns === 1 ? 'grid-cols-1' : 'sm:grid-cols-2';

  function startEdit() {
    const d: Record<string, string | boolean> = {};
    fields.forEach(f => {
      d[f.key] = f.type === 'checkbox' ? Boolean(f.value) : (f.value === null || f.value === undefined ? '' : String(f.value));
    });
    setDraft(d);
    setEditing(true);
  }

  async function save() {
    if (!onSave) return;
    // only changed keys
    const changes: Record<string, string | boolean> = {};
    fields.forEach(f => {
      const orig = f.type === 'checkbox' ? Boolean(f.value) : (f.value === null || f.value === undefined ? '' : String(f.value));
      if (draft[f.key] !== orig) changes[f.key] = draft[f.key];
    });
    setSaving(true);
    try {
      await onSave(changes);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-900">{title ?? 'Details'}</h3>
        {editable && !editing && (
          <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800">
            <Pencil size={14} /> Edit
          </button>
        )}
        {editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => setEditing(false)} disabled={saving}
              className="text-sm text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50">Cancel</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-1.5 disabled:opacity-50">
              {saving && <Loader2 size={14} className="animate-spin" />} Save
            </button>
          </div>
        )}
      </div>

      <div className={`grid ${colCls} gap-x-6 gap-y-4`}>
        {fields.map(f => (
          <div key={f.key} className={f.full ? 'sm:col-span-full' : ''}>
            <div className="text-[11px] uppercase tracking-wider text-gray-400 mb-1">{f.label}</div>
            {editing && (f.editable ?? true) ? (
              f.type === 'textarea' ? (
                <textarea value={String(draft[f.key] ?? '')} rows={2}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} className={`${inputCls} resize-none`} />
              ) : f.type === 'select' ? (
                <select value={String(draft[f.key] ?? '')}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} className={inputCls}>
                  {(f.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : f.type === 'checkbox' ? (
                <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={Boolean(draft[f.key])}
                    onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.checked }))}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                  Yes
                </label>
              ) : (
                <input type={f.type === 'number' ? 'number' : f.type ?? 'text'} value={String(draft[f.key] ?? '')}
                  onChange={e => setDraft(d => ({ ...d, [f.key]: e.target.value }))} className={inputCls} />
              )
            ) : (
              <div className="text-sm text-gray-800 break-words">
                {f.display ?? (
                  f.type === 'checkbox'
                    ? (f.value ? 'Yes' : 'No')
                    : (f.value === null || f.value === undefined || f.value === '' ? <span className="text-gray-300">—</span> : String(f.value))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
