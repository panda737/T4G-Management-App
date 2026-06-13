import { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle, Clock, Pencil, Download, Upload, ShieldCheck, Info } from 'lucide-react';
import {
  supabase, type EsgFactor, type EsgFactorCategory,
  ESG_FACTOR_CATEGORY_LABELS,
} from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { PageSpinner } from '../../components/Spinner';
import Modal from '../../components/Modal';
import SectionTabs from '../../components/SectionTabs';
import { ESG_TABS } from './commercialTabs';
import { parseDelimited } from './importReceivedWaste';

const CATEGORY_ORDER: EsgFactorCategory[] = [
  'emission_factor', 'treatment_factor', 'transport_assumption',
  'plant_benchmark', 'water_factor', 'container_capacity', 'baseline', 'allocation', 'carbon_credit',
];

const TEXT_CATEGORIES: EsgFactorCategory[] = ['baseline', 'allocation'];

const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';

export default function EsgFactors() {
  usePageTitle('Commercial — ESG Factors');
  const { isAdmin } = useUser();
  const { addToast } = useToast();

  const [factors, setFactors] = useState<EsgFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EsgFactor | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from('esg_factors').select('*')
      .eq('active', true)
      .order('factor_key', { ascending: true })
      .order('version', { ascending: false });
    setFactors((data ?? []) as EsgFactor[]);
    setLoading(false);
  }

  // latest version per factor_key
  const latest = useMemo(() => {
    const seen = new Set<string>();
    const out: EsgFactor[] = [];
    for (const f of factors) { if (!seen.has(f.factor_key)) { seen.add(f.factor_key); out.push(f); } }
    return out;
  }, [factors]);

  const grouped = useMemo(() => {
    const m = new Map<EsgFactorCategory, EsgFactor[]>();
    for (const f of latest) {
      const arr = m.get(f.category) ?? [];
      arr.push(f); m.set(f.category, arr);
    }
    return m;
  }, [latest]);

  const draftCount = latest.filter(f => !f.approved).length;
  const approvedCount = latest.filter(f => f.approved).length;

  async function approveAll() {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase.from('esg_factors').update({ approved: true }).eq('approved', false).eq('active', true);
    setBusy(false);
    if (error) { addToast('Approve failed: ' + error.message, 'error'); return; }
    addToast('All draft factors approved');
    load();
  }

  async function toggleApprove(f: EsgFactor) {
    if (!isAdmin) { addToast('Only admins can approve factors', 'error'); return; }
    const { error } = await supabase.from('esg_factors').update({ approved: !f.approved }).eq('id', f.id);
    if (error) { addToast('Update failed: ' + error.message, 'error'); return; }
    addToast(f.approved ? 'Factor moved back to draft' : 'Factor approved');
    load();
  }

  function downloadTemplate() {
    const headers = ['factor_key', 'factor_name', 'category', 'ghg_scope', 'unit', 'value', 'text_value', 'source', 'effective_date', 'notes'];
    const sample = latest.slice(0, 50).map(f =>
      [f.factor_key, f.factor_name, f.category, f.ghg_scope ?? '', f.unit, f.value, f.text_value, f.source, f.effective_date, (f.notes || '').replace(/[\r\n]+/g, ' ')]
        .map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [headers.join(','), ...sample].join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'esg_factors_template.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  async function onImportFile(file: File) {
    setBusy(true);
    try {
      const text = await file.text();
      const grid = parseDelimited(text, ',');
      if (grid.length < 2) throw new Error('No data rows found');
      const headers = grid[0].map(h => h.trim().toLowerCase());
      const idx = (name: string) => headers.indexOf(name);
      const need = ['factor_key', 'factor_name', 'category', 'value'];
      const miss = need.filter(n => idx(n) < 0);
      if (miss.length) throw new Error('Missing columns: ' + miss.join(', '));

      // next version per key
      const maxVer = new Map<string, number>();
      factors.forEach(f => { maxVer.set(f.factor_key, Math.max(maxVer.get(f.factor_key) ?? 0, f.version)); });

      const rows: Record<string, unknown>[] = [];
      for (let r = 1; r < grid.length; r++) {
        const c = grid[r];
        if (c.every(x => x.trim() === '')) continue;
        const key = (c[idx('factor_key')] ?? '').trim();
        if (!key) continue;
        const cat = (c[idx('category')] ?? '').trim();
        const scope = idx('ghg_scope') >= 0 ? (c[idx('ghg_scope')] ?? '').trim() : '';
        rows.push({
          factor_key: key,
          factor_name: (c[idx('factor_name')] ?? '').trim() || key,
          category: cat,
          ghg_scope: scope || null,
          unit: idx('unit') >= 0 ? (c[idx('unit')] ?? '').trim() : '',
          value: Number((c[idx('value')] ?? '0').replace(',', '.')) || 0,
          text_value: idx('text_value') >= 0 ? (c[idx('text_value')] ?? '').trim() : '',
          source: idx('source') >= 0 ? (c[idx('source')] ?? '').trim() : '',
          effective_date: idx('effective_date') >= 0 && c[idx('effective_date')]?.trim() ? c[idx('effective_date')].trim() : '2025-01-01',
          version: (maxVer.get(key) ?? 0) + 1,
          approved: false,
          notes: idx('notes') >= 0 ? (c[idx('notes')] ?? '').trim() : '',
        });
        maxVer.set(key, (maxVer.get(key) ?? 0) + 1);
      }
      if (!rows.length) throw new Error('No valid rows');
      const { error } = await supabase.from('esg_factors').insert(rows);
      if (error) throw new Error(error.message);
      addToast(`Imported ${rows.length} factor version(s) as drafts`);
      load();
    } catch (e) {
      addToast('Import failed: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  if (loading) return <PageSpinner layout="h64" />;

  return (
    <div className="space-y-5">
      <SectionTabs tabs={ESG_TABS} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ESG Factors &amp; Assumptions</h1>
          <p className="text-sm text-gray-500 mt-1">Standard library, pre-loaded as drafts. Review the value &amp; source, then approve. Nothing reaches customers until approved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={downloadTemplate} className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition">
            <Download size={14} /> CSV template
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg transition disabled:opacity-50">
            <Upload size={14} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onImportFile(f); }} />
          {isAdmin && draftCount > 0 && (
            <button onClick={approveAll} disabled={busy} className="flex items-center gap-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 rounded-lg transition disabled:opacity-50">
              <ShieldCheck size={14} /> Approve all {draftCount} drafts
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat label="Approved" value={approvedCount} tone="emerald" />
        <Stat label="Draft (need review)" value={draftCount} tone="amber" />
      </div>

      {!isAdmin && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800">
          <Info size={15} /> You can edit factors, but only an administrator can approve them.
        </div>
      )}

      {CATEGORY_ORDER.filter(c => grouped.has(c)).map(cat => (
        <div key={cat} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 bg-gray-800 text-white text-xs font-semibold uppercase tracking-wider">{ESG_FACTOR_CATEGORY_LABELS[cat]}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] text-gray-500 uppercase tracking-wider border-b border-gray-100">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Source</th>
                  <th className="px-4 py-2 font-medium">Effective</th>
                  <th className="px-4 py-2 font-medium">Ver</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {grouped.get(cat)!.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50/60">
                    <td className="px-4 py-2.5">
                      <div className="font-medium text-gray-800">{f.factor_name}</div>
                      <div className="text-[11px] text-gray-400 font-mono">{f.factor_key}</div>
                    </td>
                    <td className="px-4 py-2.5 whitespace-nowrap font-semibold text-gray-900">
                      {TEXT_CATEGORIES.includes(f.category) ? (f.text_value || '—') : `${f.value} `}
                      <span className="text-xs font-normal text-gray-400">{!TEXT_CATEGORIES.includes(f.category) ? f.unit : ''}</span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[220px] truncate" title={f.source}>{f.source || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{f.effective_date}</td>
                    <td className="px-4 py-2.5 text-gray-500">v{f.version}</td>
                    <td className="px-4 py-2.5">
                      {f.approved
                        ? <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-xs font-semibold"><CheckCircle size={11} /> Approved</span>
                        : <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full text-xs font-semibold"><Clock size={11} /> Draft</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setEditing(f)} className="text-gray-500 hover:text-indigo-600 p-1.5 rounded hover:bg-indigo-50" title="Edit"><Pencil size={14} /></button>
                        {isAdmin && (
                          <button onClick={() => toggleApprove(f)}
                            className={`text-xs px-2 py-1 rounded font-medium ${f.approved ? 'text-amber-700 hover:bg-amber-50' : 'text-emerald-700 hover:bg-emerald-50'}`}>
                            {f.approved ? 'Unapprove' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {editing && (
        <EditFactorModal factor={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'amber' }) {
  const c = tone === 'emerald' ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-amber-700 bg-amber-50 border-amber-200';
  return (
    <div className={`px-4 py-2.5 rounded-lg border ${c}`}>
      <span className="text-xl font-bold">{value}</span>
      <span className="text-xs font-medium ml-2">{label}</span>
    </div>
  );
}

function EditFactorModal({ factor, onClose, onSaved }: { factor: EsgFactor; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useToast();
  const isText = TEXT_CATEGORIES.includes(factor.category);
  const [form, setForm] = useState({
    factor_name: factor.factor_name,
    value: String(factor.value),
    text_value: factor.text_value,
    unit: factor.unit,
    source: factor.source,
    effective_date: factor.effective_date,
    notes: factor.notes,
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const patch = {
      factor_name: form.factor_name,
      value: Number(form.value) || 0,
      text_value: form.text_value,
      unit: form.unit,
      source: form.source,
      effective_date: form.effective_date,
      notes: form.notes,
    };
    // editing an APPROVED factor creates a new draft version (preserves the live one)
    let error;
    if (factor.approved) {
      ({ error } = await supabase.from('esg_factors').insert({
        factor_key: factor.factor_key,
        category: factor.category,
        ghg_scope: factor.ghg_scope,
        version: factor.version + 1,
        approved: false,
        active: true,
        ...patch,
      }));
    } else {
      ({ error } = await supabase.from('esg_factors').update(patch).eq('id', factor.id));
    }
    setSaving(false);
    if (error) { addToast('Save failed: ' + error.message, 'error'); return; }
    addToast(factor.approved ? 'Saved as new draft version (v' + (factor.version + 1) + ')' : 'Factor updated');
    onSaved();
  }

  return (
    <Modal title={`Edit — ${factor.factor_name}`} onClose={onClose} size="md" accent="indigo"
      footer={
        <>
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={save} disabled={saving} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {factor.approved ? 'Save as new draft' : 'Save'}
          </button>
        </>
      }>
      <div className="space-y-4">
        <p className="text-xs text-gray-500 font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">{factor.factor_key} · {ESG_FACTOR_CATEGORY_LABELS[factor.category]}{factor.ghg_scope ? ` · ${factor.ghg_scope}` : ''}</p>
        {factor.approved && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">This factor is approved (live). Saving creates a new <b>draft</b> version; the live value stays until an admin approves the new one.</p>
        )}
        <Field label="Name"><input className={inp} value={form.factor_name} onChange={e => setForm({ ...form, factor_name: e.target.value })} /></Field>
        {isText ? (
          <Field label="Value (text)"><input className={inp} value={form.text_value} onChange={e => setForm({ ...form, text_value: e.target.value })} /></Field>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Value"><input type="number" step="any" className={inp} value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} /></Field>
            <Field label="Unit"><input className={inp} value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} /></Field>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source"><input className={inp} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} /></Field>
          <Field label="Effective date"><input type="date" className={inp} value={form.effective_date} onChange={e => setForm({ ...form, effective_date: e.target.value })} /></Field>
        </div>
        <Field label="Notes / assumptions"><textarea className={inp} rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
