import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, FileText, Download, Pencil, Trash2, AlertTriangle, Archive, RotateCcw, Loader, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import { supabase, AppDocument, DocumentCategory } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import { downloadCSV } from '../../lib/csvExport';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import DocumentFormModal from './DocumentFormModal';
import DocumentDetailModal from './DocumentDetailModal';

const SLUG_TO_CATEGORY: Record<string, DocumentCategory | 'Archived'> = {
  'sops':              'SOP',
  'policies':          'Policy',
  'risk-assessments':  'Risk Assessment',
  'licences-permits':  'Licence & Permit',
  'templates':         'Template',
  'archived':          'Archived',
};

const CATEGORY_LABELS: Record<DocumentCategory | 'Archived', string> = {
  SOP:               'SOPs',
  Policy:            'Policies',
  'Risk Assessment': 'Risk Assessments',
  'Licence & Permit':'Licences & Permits',
  Template:          'Templates',
  Archived:          'Archived Documents',
};

const CAT_BADGE: Record<DocumentCategory, string> = {
  SOP:               'bg-blue-100 text-blue-700',
  Policy:            'bg-teal-100 text-teal-700',
  'Risk Assessment': 'bg-orange-100 text-orange-700',
  'Licence & Permit':'bg-purple-100 text-purple-700',
  Template:          'bg-emerald-100 text-emerald-700',
};

type SortKey = 'title' | 'expiry_date' | 'created_at';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-ZA');
}

function expiryStatus(expiry: string | null | undefined): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiry) return 'none';
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

function documentAlertStatus(doc: AppDocument): 'expired' | 'soon' | 'ok' | 'none' {
  const es = expiryStatus(doc.expiry_date);
  const rs = expiryStatus(doc.review_date);
  if (es === 'expired' || rs === 'expired') return 'expired';
  if (es === 'soon' || rs === 'soon') return 'soon';
  if (es === 'ok' || rs === 'ok') return 'ok';
  return 'none';
}

export default function DocumentLibrary() {
  usePageTitle('Document Library');
  const { category: categorySlug } = useParams<{ category?: string }>();
  const { isAdmin, isManagement } = useUser();
  const { addToast } = useToast();
  const canEdit = isAdmin || isManagement;

  const activeFilter: DocumentCategory | 'Archived' | null = categorySlug
    ? (SLUG_TO_CATEGORY[categorySlug] ?? null)
    : null;
  const isArchiveView = activeFilter === 'Archived';
  const activeCategory = isArchiveView ? undefined : (activeFilter as DocumentCategory | undefined);

  const [docs, setDocs] = useState<AppDocument[]>([]);
  const [uploaderMap, setUploaderMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('title');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [showForm, setShowForm] = useState(false);
  const [editDoc, setEditDoc] = useState<AppDocument | null>(null);
  const [viewDoc, setViewDoc] = useState<AppDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    const [{ data: docsData }, { data: profilesData }] = await Promise.all([
      supabase.from('documents').select('*').order('category').order('title'),
      supabase.from('user_profiles').select('auth_user_id, display_name'),
    ]);
    setDocs((docsData ?? []) as AppDocument[]);
    const map = new Map<string, string>();
    for (const p of (profilesData ?? [])) {
      map.set(p.auth_user_id, p.display_name);
    }
    setUploaderMap(map);
    setLoading(false);
  }

  async function handleDownload(doc: AppDocument) {
    setDownloading(doc.id);
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(doc.file_path, 3600);
    setDownloading(null);
    if (error || !data) { addToast('Download failed — ' + (error?.message ?? 'unknown error'), 'error'); return; }
    window.open(data.signedUrl, '_blank');
  }

  async function handleArchive(doc: AppDocument) {
    setArchiving(doc.id);
    await supabase.from('documents').update({ is_active: false, updated_at: new Date().toISOString() }).eq('id', doc.id);
    setArchiving(null);
    addToast('Document archived');
    loadDocs();
  }

  async function handleRestore(doc: AppDocument) {
    setRestoring(doc.id);
    await supabase.from('documents').update({ is_active: true, updated_at: new Date().toISOString() }).eq('id', doc.id);
    setRestoring(null);
    addToast('Document restored');
    loadDocs();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.storage.from('documents').remove([deleteTarget.file_path]);
    await supabase.from('documents').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    addToast('Document deleted');
    loadDocs();
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    let result = docs.filter(d => {
      if (isArchiveView) {
        if (d.is_active) return false;
      } else if (activeCategory) {
        if (!d.is_active || d.category !== activeCategory) return false;
      } else {
        if (!d.is_active) return false;
      }
      if (q) return d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q);
      return true;
    });

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortKey === 'expiry_date') {
        const aVal = a.expiry_date ?? '9999-12-31';
        const bVal = b.expiry_date ?? '9999-12-31';
        cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else if (sortKey === 'created_at') {
        cmp = a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [docs, search, activeCategory, isArchiveView, sortKey, sortDir]);

  const expiringSoon = useMemo(() => docs.filter(d => {
    if (!d.is_active) return false;
    const s = documentAlertStatus(d);
    return s === 'expired' || s === 'soon';
  }).length, [docs]);

  const pageTitle = activeFilter ? CATEGORY_LABELS[activeFilter] : 'Document Library';

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="inline-block w-3 ml-1 opacity-30"><ChevronUp size={10} /></span>;
    return sortDir === 'asc'
      ? <ChevronUp size={10} className="inline ml-1" />
      : <ChevronDownIcon size={10} className="inline ml-1" />;
  }

  function SortableTh({ label, k }: { label: string; k: SortKey }) {
    return (
      <th
        onClick={() => handleSort(k)}
        className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-violet-300 transition-colors"
      >
        {label}<SortIcon k={k} />
      </th>
    );
  }

  function renderActions(doc: AppDocument) {
    if (isArchiveView) {
      return (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={e => { e.stopPropagation(); handleDownload(doc); }}
            disabled={downloading === doc.id}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200 rounded-lg transition disabled:opacity-50"
          >
            {downloading === doc.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
            Download
          </button>
          {canEdit && (
            <>
              <button
                onClick={e => { e.stopPropagation(); handleRestore(doc); }}
                disabled={restoring === doc.id}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition disabled:opacity-50"
              >
                {restoring === doc.id ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Restore
              </button>
              <button onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button
          onClick={e => { e.stopPropagation(); handleDownload(doc); }}
          disabled={downloading === doc.id}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200 rounded-lg transition disabled:opacity-50"
        >
          {downloading === doc.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
          Download
        </button>
        {canEdit && (
          <>
            <button onClick={e => { e.stopPropagation(); setEditDoc(doc); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
              <Pencil size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); handleArchive(doc); }}
              disabled={archiving === doc.id}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
              title="Archive document"
            >
              {archiving === doc.id ? <Loader size={14} className="animate-spin" /> : <Archive size={14} />}
            </button>
            <button onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  function renderMobileActions(doc: AppDocument) {
    if (isArchiveView) {
      return (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={e => { e.stopPropagation(); handleDownload(doc); }} disabled={downloading === doc.id} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-50">
            {downloading === doc.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
          {canEdit && (
            <>
              <button onClick={e => { e.stopPropagation(); handleRestore(doc); }} disabled={restoring === doc.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50">
                {restoring === doc.id ? <Loader size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              </button>
              <button onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={e => { e.stopPropagation(); handleDownload(doc); }} disabled={downloading === doc.id} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-50">
          {downloading === doc.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
        {canEdit && (
          <>
            <button onClick={e => { e.stopPropagation(); setEditDoc(doc); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
              <Pencil size={14} />
            </button>
            <button onClick={e => { e.stopPropagation(); handleArchive(doc); }} disabled={archiving === doc.id} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50">
              {archiving === doc.id ? <Loader size={14} className="animate-spin" /> : <Archive size={14} />}
            </button>
            <button onClick={e => { e.stopPropagation(); setDeleteTarget(doc); }} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  function handleExportCSV() {
    const rows = filtered.map(d => ({
      'Title': d.title,
      'Category': d.category,
      'Description': d.description,
      'File Name': d.file_name,
      'File Size': formatBytes(d.file_size_bytes),
      'Expiry Date': formatDate(d.expiry_date) ?? '',
      'Next Review Date': formatDate(d.review_date) ?? '',
      'Uploaded By': uploaderMap.get(d.uploaded_by ?? '') ?? '',
      'Date Uploaded': formatDate(d.created_at) ?? '',
      'Last Modified': formatDate(d.updated_at) ?? '',
    }));
    downloadCSV(rows, `documents-${pageTitle.toLowerCase().replace(/\s+/g, '-')}`);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">SOPs, licences, permits, policies and templates</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {filtered.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition shadow-sm"
              title="Export to CSV"
            >
              <Download size={14} /> <span className="hidden sm:inline">Export</span>
            </button>
          )}
          {canEdit && !isArchiveView && (
            <button
              onClick={() => { setEditDoc(null); setShowForm(true); }}
              className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap"
            >
              <Plus size={16} /> Upload Document
            </button>
          )}
        </div>
      </div>

      {expiringSoon > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span><strong>{expiringSoon}</strong> document{expiringSoon !== 1 ? 's' : ''} expired or due for review within 30 days</span>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by title or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            <FileText size={32} className="mx-auto mb-2 text-gray-300" />
            {search ? 'No documents match your search' : `No ${pageTitle.toLowerCase()} yet`}
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-800 text-white">
                    <SortableTh label="Title" k="title" />
                    {isArchiveView && (
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Category</th>
                    )}
                    <SortableTh label="Expiry / Review" k="expiry_date" />
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">File</th>
                    <SortableTh label="Uploaded" k="created_at" />
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(doc => {
                    const as_ = documentAlertStatus(doc);
                    const es = expiryStatus(doc.expiry_date);
                    const rs = expiryStatus(doc.review_date);
                    const uploaderName = uploaderMap.get(doc.uploaded_by ?? '') ?? null;
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setViewDoc(doc)}
                        className={`hover:bg-gray-50 transition cursor-pointer ${as_ === 'expired' ? 'bg-red-50/40' : as_ === 'soon' ? 'bg-amber-50/40' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-900">{doc.title}</p>
                          {doc.description && <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[300px]">{doc.description}</p>}
                        </td>
                        {isArchiveView && (
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${CAT_BADGE[doc.category as DocumentCategory] ?? 'bg-gray-100 text-gray-600'}`}>{doc.category}</span>
                          </td>
                        )}
                        <td className="px-4 py-3 whitespace-nowrap">
                          {doc.expiry_date ? (
                            <div>
                              <span className={`text-sm font-medium ${es === 'expired' ? 'text-red-600' : es === 'soon' ? 'text-amber-600' : 'text-gray-600'}`}>
                                {es === 'expired' && <AlertTriangle size={12} className="inline mr-1" />}
                                {formatDate(doc.expiry_date)}
                              </span>
                              <p className="text-[10px] text-gray-400">Expiry</p>
                            </div>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                          {doc.review_date && (
                            <div className="mt-1">
                              <span className={`text-xs font-medium ${rs === 'expired' ? 'text-red-600' : rs === 'soon' ? 'text-amber-600' : 'text-gray-500'}`}>
                                {rs === 'expired' && <AlertTriangle size={10} className="inline mr-1" />}
                                {formatDate(doc.review_date)}
                              </span>
                              <p className="text-[10px] text-gray-400">Review</p>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-500 truncate max-w-[160px] block">{doc.file_name}</span>
                          <span className="text-[10px] text-gray-400">{formatBytes(doc.file_size_bytes)}</span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {uploaderName && <p className="text-xs text-gray-600">{uploaderName}</p>}
                          <p className="text-[10px] text-gray-400">{formatDate(doc.created_at)}</p>
                        </td>
                        <td className="px-4 py-3">
                          {renderActions(doc)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {filtered.map(doc => {
                const as_ = documentAlertStatus(doc);
                const es = expiryStatus(doc.expiry_date);
                return (
                  <div
                    key={doc.id}
                    onClick={() => setViewDoc(doc)}
                    className={`px-4 py-3 cursor-pointer ${as_ === 'expired' ? 'bg-red-50/40' : as_ === 'soon' ? 'bg-amber-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900 truncate">{doc.title}</span>
                          {isArchiveView && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${CAT_BADGE[doc.category as DocumentCategory] ?? 'bg-gray-100 text-gray-600'}`}>{doc.category}</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {doc.file_name} · {formatBytes(doc.file_size_bytes)}
                          {doc.expiry_date && (
                            <span className={`ml-1 ${es === 'expired' ? 'text-red-600 font-medium' : es === 'soon' ? 'text-amber-600 font-medium' : ''}`}>
                              · Exp {formatDate(doc.expiry_date)}
                            </span>
                          )}
                        </p>
                      </div>
                      {renderMobileActions(doc)}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {viewDoc && (
        <DocumentDetailModal
          doc={viewDoc}
          uploaderName={uploaderMap.get(viewDoc.uploaded_by ?? '') ?? null}
          canEdit={canEdit}
          onClose={() => setViewDoc(null)}
          onDownload={handleDownload}
          downloading={downloading}
          onEdit={doc => { setViewDoc(null); setEditDoc(doc); setShowForm(true); }}
        />
      )}

      {showForm && (
        <DocumentFormModal
          doc={editDoc}
          defaultCategory={activeCategory}
          onClose={() => { setShowForm(false); setEditDoc(null); }}
          onSave={() => { setShowForm(false); setEditDoc(null); addToast(editDoc ? 'Document updated' : 'Document uploaded'); loadDocs(); }}
        />
      )}
      {deleteTarget && (
        <DeleteConfirmModal
          label={deleteTarget.title}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
