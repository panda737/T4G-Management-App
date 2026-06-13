import { useEffect, useState } from 'react';
import { Download, Pencil, AlertTriangle, Loader, Clock } from 'lucide-react';
import { supabase, AppDocument, DocumentCategory, DocumentVersion } from '../../lib/supabase';
import Modal from '../../components/Modal';

const CAT_BADGE: Record<DocumentCategory, string> = {
  SOP:               'bg-blue-100 text-blue-700',
  Policy:            'bg-teal-100 text-teal-700',
  'Risk Assessment': 'bg-orange-100 text-orange-700',
  'Licence & Permit':'bg-purple-100 text-purple-700',
  Template:          'bg-emerald-100 text-emerald-700',
  Company:           'bg-rose-100 text-rose-700',
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(d: string | null | undefined) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

function expiryStatus(expiry: string | null | undefined): 'expired' | 'soon' | 'ok' | 'none' {
  if (!expiry) return 'none';
  const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

interface Props {
  doc: AppDocument;
  uploaderName: string | null;
  canEdit: boolean;
  onClose: () => void;
  onDownload: (doc: AppDocument) => void;
  downloading: string | null;
  onEdit: (doc: AppDocument) => void;
}

export default function DocumentDetailModal({ doc, uploaderName, canEdit, onClose, onDownload, downloading, onEdit }: Props) {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [versionUploaders, setVersionUploaders] = useState<Map<string, string>>(new Map());
  const [loadingVersions, setLoadingVersions] = useState(true);
  const [downloadingVersion, setDownloadingVersion] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoadingVersions(true);
      const { data } = await supabase
        .from('document_versions')
        .select('*')
        .eq('document_id', doc.id)
        .order('version_number', { ascending: false });
      const v = (data ?? []) as DocumentVersion[];
      setVersions(v);

      const uploaderIds = [...new Set(v.map(x => x.replaced_by).filter(Boolean) as string[])];
      if (uploaderIds.length > 0) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('auth_user_id, display_name')
          .in('auth_user_id', uploaderIds);
        const map = new Map<string, string>();
        for (const p of (profiles ?? [])) map.set(p.auth_user_id, p.display_name);
        setVersionUploaders(map);
      }
      setLoadingVersions(false);
    }
    load();
  }, [doc.id]);

  async function handleDownloadVersion(v: DocumentVersion) {
    setDownloadingVersion(v.id);
    const { data } = await supabase.storage.from('documents').createSignedUrl(v.file_path, 3600);
    setDownloadingVersion(null);
    if (data?.signedUrl) window.open(data.signedUrl, '_blank');
  }

  const es = expiryStatus(doc.expiry_date);
  const rs = expiryStatus(doc.review_date);

  function DateRow({ label, value, status }: { label: string; value: string | null | undefined; status: 'expired' | 'soon' | 'ok' | 'none' }) {
    if (!value) return <span className="text-gray-400 text-sm">—</span>;
    return (
      <div>
        <span className={`text-sm font-medium ${status === 'expired' ? 'text-red-600' : status === 'soon' ? 'text-amber-600' : 'text-gray-700'}`}>
          {status === 'expired' && <AlertTriangle size={12} className="inline mr-1" />}
          {formatDate(value)}
        </span>
        {status === 'expired' && <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-medium">Expired</span>}
        {status === 'soon' && <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Due soon</span>}
      </div>
    );
  }

  return (
    <Modal title={doc.title} onClose={onClose} size="lg" accent="gray">
      <div className="space-y-6">
        {/* Category + actions */}
        <div className="flex items-start justify-between gap-4">
          <span className={`px-2.5 py-1 rounded text-xs font-semibold ${CAT_BADGE[doc.category as DocumentCategory] ?? 'bg-gray-100 text-gray-600'}`}>
            {doc.category}
          </span>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canEdit && doc.is_active && (
              <button
                onClick={() => onEdit(doc)}
                className="flex items-center gap-1.5 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-2.5 py-1.5 rounded-lg transition"
              >
                <Pencil size={12} /> Edit
              </button>
            )}
            <button
              onClick={() => onDownload(doc)}
              disabled={downloading === doc.id}
              className="flex items-center gap-1.5 text-xs bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 rounded-lg transition disabled:opacity-50"
            >
              {downloading === doc.id ? <Loader size={12} className="animate-spin" /> : <Download size={12} />}
              Download
            </button>
          </div>
        </div>

        {/* Description */}
        {doc.description && (
          <p className="text-sm text-gray-600 leading-relaxed">{doc.description}</p>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 border-t border-gray-100 pt-4">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Expiry Date</p>
            <DateRow label="Expiry Date" value={doc.expiry_date} status={es} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Next Review Date</p>
            <DateRow label="Next Review Date" value={doc.review_date} status={rs} />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Uploaded By</p>
            <p className="text-sm text-gray-700">{uploaderName ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date Uploaded</p>
            <p className="text-sm text-gray-700">{formatDate(doc.created_at)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">File</p>
            <p className="text-sm text-gray-700">{doc.file_name}</p>
            <p className="text-xs text-gray-400">{formatBytes(doc.file_size_bytes)}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Last Modified</p>
            <p className="text-sm text-gray-700">{formatDate(doc.updated_at)}</p>
          </div>
        </div>

        {/* Version history */}
        <div className="border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={14} className="text-gray-400" />
            <p className="text-sm font-semibold text-gray-700">Version History</p>
          </div>
          {loadingVersions ? (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Loader size={14} className="animate-spin" /> Loading...
            </div>
          ) : versions.length === 0 ? (
            <p className="text-sm text-gray-400">No previous versions — this is the original file.</p>
          ) : (
            <div className="space-y-2">
              {versions.map(v => (
                <div key={v.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-700 font-medium truncate">v{v.version_number} — {v.file_name}</p>
                    <p className="text-xs text-gray-400">
                      {formatBytes(v.file_size_bytes)}
                      {v.replaced_by && (
                        <> · Replaced by {versionUploaders.get(v.replaced_by) ?? 'Unknown'}</>
                      )}
                      {' · '}{formatDate(v.replaced_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadVersion(v)}
                    disabled={downloadingVersion === v.id}
                    className="flex items-center gap-1 text-xs text-violet-600 hover:bg-violet-50 border border-violet-200 px-2 py-1 rounded-lg transition disabled:opacity-50 flex-shrink-0"
                  >
                    {downloadingVersion === v.id ? <Loader size={11} className="animate-spin" /> : <Download size={11} />}
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
