import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, FileText, Download, Pencil, Trash2, AlertTriangle, Archive, RotateCcw, Loader } from 'lucide-react';
import { supabase, AppDocument, DocumentCategory } from '../../lib/supabase';
import { useUser } from '../../lib/UserContext';
import { useToast } from '../../lib/toast';
import DeleteConfirmModal from '../../components/DeleteConfirmModal';
import DocumentFormModal from './DocumentFormModal';

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

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function expiryStatus(expiry: string | null): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiry) return 'none';
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

export default function DocumentLibrary() {
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editDoc, setEditDoc] = useState<AppDocument | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppDocument | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [archiving, setArchiving] = useState<string | null>(null);
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .order('category')
      .order('title');
    setDocs((data ?? []) as AppDocument[]);
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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter(d => {
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
  }, [docs, search, activeCategory, isArchiveView]);

  const expiringSoon = useMemo(() => docs.filter(d => {
    if (!d.is_active) return false;
    const s = expiryStatus(d.expiry_date);
    return s === 'expired' || s === 'soon';
  }).length, [docs]);

  const pageTitle = activeFilter ? CATEGORY_LABELS[activeFilter] : 'Document Library';

  function renderActions(doc: AppDocument) {
    if (isArchiveView) {
      return (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => handleDownload(doc)}
            disabled={downloading === doc.id}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200 rounded-lg transition disabled:opacity-50"
          >
            {downloading === doc.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
            Download
          </button>
          {canEdit && (
            <>
              <button
                onClick={() => handleRestore(doc)}
                disabled={restoring === doc.id}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition disabled:opacity-50"
              >
                {restoring === doc.id ? <Loader size={12} className="animate-spin" /> : <RotateCcw size={12} />}
                Restore
              </button>
              <button onClick={() => setDeleteTarget(doc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
          onClick={() => handleDownload(doc)}
          disabled={downloading === doc.id}
          className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200 rounded-lg transition disabled:opacity-50"
        >
          {downloading === doc.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
          Download
        </button>
        {canEdit && (
          <>
            <button onClick={() => { setEditDoc(doc); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
              <Pencil size={14} />
            </button>
            <button
              onClick={() => handleArchive(doc)}
              disabled={archiving === doc.id}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50"
              title="Archive document"
            >
              {archiving === doc.id ? <Loader size={14} className="animate-spin" /> : <Archive size={14} />}
            </button>
            <button onClick={() => setDeleteTarget(doc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
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
          <button onClick={() => handleDownload(doc)} disabled={downloading === doc.id} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-50">
            {downloading === doc.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
          </button>
          {canEdit && (
            <>
              <button onClick={() => handleRestore(doc)} disabled={restoring === doc.id} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition disabled:opacity-50">
                {restoring === doc.id ? <Loader size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              </button>
              <button onClick={() => setDeleteTarget(doc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={() => handleDownload(doc)} disabled={downloading === doc.id} className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition disabled:opacity-50">
          {downloading === doc.id ? <Loader size={14} className="animate-spin" /> : <Download size={14} />}
        </button>
        {canEdit && (
          <>
            <button onClick={() => { setEditDoc(doc); setShowForm(true); }} className="p-1.5 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition">
              <Pencil size={14} />
            </button>
            <button onClick={() => handleArchive(doc)} disabled={archiving === doc.id} className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition disabled:opacity-50">
              {archiving === doc.id ? <Loader size={14} className="animate-spin" /> : <Archive size={14} />}
            </button>
            <button onClick={() => setDeleteTarget(doc)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
              <Trash2 size={14} />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{pageTitle}</h1>
          <p className="text-sm text-gray-500 mt-1">SOPs, licences, permits, policies and templates</p>
        </div>
        {canEdit && !isArchiveView && (
          <button
            onClick={() => { setEditDoc(null); setShowForm(true); }}
            className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg font-medium transition shadow-sm whitespace-nowrap"
          >
            <Plus size={16} /> Upload Document
          </button>
        )}
      </div>

      {expiringSoon > 0 && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg px-4 py-2.5">
          <AlertTriangle size={15} className="flex-shrink-0" />
          <span><strong>{expiringSoon}</strong> document{expiringSoon !== 1 ? 's' : ''} expired or expiring within 30 days</span>
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
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Title</th>
                    {isArchiveView && (
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Category</th>
                    )}
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">Expiry Date</th>
                    <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider whitespace-nowrap">File</th>
                    <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map(doc => {
                    const es = expiryStatus(doc.expiry_date);
                    return (
                      <tr key={doc.id} className={`hover:bg-gray-50 transition ${es === 'expired' ? 'bg-red-50/40' : es === 'soon' ? 'bg-amber-50/40' : ''}`}>
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
                            <span className={`text-sm font-medium ${es === 'expired' ? 'text-red-600' : es === 'soon' ? 'text-amber-600' : 'text-gray-600'}`}>
                              {es === 'expired' && <AlertTriangle size={12} className="inline mr-1" />}
                              {new Date(doc.expiry_date).toLocaleDateString('en-ZA')}
                            </span>
                          ) : (
                            <span className="text-gray-300 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-500 truncate max-w-[160px] block">{doc.file_name}</span>
                          <span className="text-[10px] text-gray-400">{formatBytes(doc.file_size_bytes)}</span>
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
                const es = expiryStatus(doc.expiry_date);
                return (
                  <div key={doc.id} className={`px-4 py-3 ${es === 'expired' ? 'bg-red-50/40' : es === 'soon' ? 'bg-amber-50/40' : ''}`}>
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
                              · Exp {new Date(doc.expiry_date).toLocaleDateString('en-ZA')}
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
