import { useState, useEffect, useMemo } from 'react';
import { Award, Plus, Eye, CreditCard as Edit2, Trash2, Search } from 'lucide-react';
import { supabase, TrainingCertificate } from '../../lib/supabase';
import { generateSequentialNumber } from '../../lib/numberGenerator';
import CertFormModal, { CertFormData } from './CertFormModal';
import CertViewModal from './CertViewModal';

const today = new Date();

function daysRemaining(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  return Math.ceil((new Date(expiryDate).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpiringSoon(cert: TrainingCertificate): boolean {
  const days = daysRemaining(cert.expiry_date);
  return cert.status === 'Valid' && days !== null && days >= 0 && days <= 30;
}

function expiryRowBg(cert: TrainingCertificate): string {
  if (cert.status === 'Expired') return 'bg-red-50';
  const days = daysRemaining(cert.expiry_date);
  if (days === null) return '';
  if (days < 0) return 'bg-red-50';
  if (days <= 30) return 'bg-amber-50';
  return '';
}

function daysColor(days: number | null): string {
  if (days === null) return 'text-gray-600';
  if (days < 0) return 'text-red-600 font-semibold';
  if (days <= 30) return 'text-amber-600 font-semibold';
  return 'text-emerald-600';
}

function expiryBadgeBg(cert: TrainingCertificate): string {
  const days = daysRemaining(cert.expiry_date);
  if (days === null) return 'bg-gray-100';
  if (days > 60) return 'bg-emerald-100';
  if (days > 30) return 'bg-amber-100';
  return 'bg-red-100';
}

const EMPTY_FORM: CertFormData = {
  employee_name: '',
  employee_id: null,
  course_name: '',
  certificate_number: '',
  issue_date: '',
  expiry_date: '',
  issuing_body: '',
  document_reference: '',
  status: 'Valid',
  notes: '',
};

export default function TrainingCertificates() {
  const [certificates, setCertificates] = useState<TrainingCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showView, setShowView] = useState(false);
  const [selectedCert, setSelectedCert] = useState<TrainingCertificate | null>(null);
  const [formData, setFormData] = useState<CertFormData>(EMPTY_FORM);
  const [opError, setOpError] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('training_certificates')
      .select('*')
      .order('created_at', { ascending: false });
    setCertificates(data || []);
    setLoading(false);
  }

  async function handleAddClick() {
    const certNum = await generateSequentialNumber('training_certificates', 'certificate_number', 'CERT');
    setFormData({ ...EMPTY_FORM, certificate_number: certNum });
    setSelectedCert(null);
    setShowAdd(true);
  }

  function handleEditClick(cert: TrainingCertificate) {
    setSelectedCert(cert);
    setFormData({
      employee_name: cert.employee_name,
      employee_id: cert.employee_id || null,
      course_name: cert.course_name,
      certificate_number: cert.certificate_number,
      issue_date: cert.issue_date,
      expiry_date: cert.expiry_date || '',
      issuing_body: cert.issuing_body,
      document_reference: cert.document_reference,
      status: cert.status as CertFormData['status'],
      notes: cert.notes,
    });
    setShowEdit(true);
  }

  async function handleSave() {
    setOpError('');
    const { error } = selectedCert
      ? await supabase.from('training_certificates').update(formData).eq('id', selectedCert.id)
      : await supabase.from('training_certificates').insert([formData]);
    if (error) { setOpError(error.message); return; }
    if (selectedCert) setShowEdit(false); else setShowAdd(false);
    setSelectedCert(null);
    load();
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this certificate?')) return;
    setOpError('');
    const { error } = await supabase.from('training_certificates').delete().eq('id', id);
    if (error) { setOpError(error.message); return; }
    load();
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return certificates.filter(cert => {
      const matchSearch = !q ||
        cert.employee_name.toLowerCase().includes(q) ||
        cert.course_name.toLowerCase().includes(q) ||
        cert.certificate_number.toLowerCase().includes(q) ||
        cert.issuing_body.toLowerCase().includes(q);
      if (statusFilter === 'All') return matchSearch;
      if (statusFilter === 'Expiring Soon') return matchSearch && isExpiringSoon(cert);
      return matchSearch && cert.status === statusFilter;
    });
  }, [certificates, search, statusFilter]);

  const stats = useMemo(() => ({
    total: certificates.length,
    valid: certificates.filter(c => c.status === 'Valid').length,
    expiringSoon: certificates.filter(isExpiringSoon).length,
    expired: certificates.filter(c => c.status === 'Expired').length,
  }), [certificates]);

  return (
    <div className="space-y-5">
      {opError && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2.5">{opError}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Award className="w-7 h-7 text-gray-700" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
            <p className="text-sm text-gray-500 mt-0.5">{filtered.length} certificate{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition text-sm font-medium shadow-sm w-full sm:w-auto justify-center"
        >
          <Plus size={16} />
          <span className="hidden sm:inline">Add Certificate</span>
          <span className="sm:hidden">Add</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Valid', value: stats.valid, color: 'text-emerald-700' },
          { label: 'Expiring Soon', value: stats.expiringSoon, color: 'text-amber-700' },
          { label: 'Expired', value: stats.expired, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color || 'text-gray-900'}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {(['All', 'Valid', 'Expiring Soon', 'Expired', 'Revoked'] as const).map(tab => {
          const count = tab === 'All' ? certificates.length
            : tab === 'Expiring Soon' ? certificates.filter(isExpiringSoon).length
            : certificates.filter(c => c.status === tab).length;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === tab
                  ? tab === 'Expired' ? 'bg-red-600 text-white shadow-sm'
                    : tab === 'Expiring Soon' ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                statusFilter === tab ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3.5 shadow-sm">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, course, number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800 text-white">
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Cert #</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Employee</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Course</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Issue Date</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider w-32">Expiry Date</th>
              <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-28">Days Left</th>
              <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wider">Issuing Body</th>
              <th className="text-center px-4 py-3 font-medium text-xs uppercase tracking-wider w-24">Status</th>
              <th className="w-24 px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={9} className="py-12 text-center"><div className="flex justify-center"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600" /></div></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={9} className="py-12 text-center text-sm text-gray-400">No certificates found</td></tr>
            ) : filtered.map((cert, idx) => {
              const days = daysRemaining(cert.expiry_date);
              return (
                <tr key={cert.id} className={`hover:bg-emerald-50/30 transition-colors ${expiryRowBg(cert) || (idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}`}>
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-700 font-medium">{cert.certificate_number}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{cert.employee_name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{cert.course_name}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{new Date(cert.issue_date).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-xs">
                    {cert.expiry_date ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${expiryBadgeBg(cert)}`}>
                        {new Date(cert.expiry_date).toLocaleDateString()}
                      </span>
                    ) : (
                      <span className="text-gray-400">N/A</span>
                    )}
                  </td>
                  <td className={`px-4 py-2.5 text-xs text-center ${daysColor(days)}`}>
                    {days === null ? 'N/A' : `${days} days`}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-gray-600">{cert.issuing_body}</td>
                  <td className="px-4 py-2.5 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                      cert.status === 'Valid' ? 'bg-emerald-100 text-emerald-700'
                      : cert.status === 'Expired' ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                    }`}>{cert.status}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedCert(cert); setShowView(true); }} className="p-1.5 hover:bg-gray-100 rounded transition">
                        <Eye size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => handleEditClick(cert)} className="p-1.5 hover:bg-gray-100 rounded transition">
                        <Edit2 size={14} className="text-gray-500" />
                      </button>
                      <button onClick={() => handleDelete(cert.id)} className="p-1.5 hover:bg-red-50 rounded transition">
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAdd && (
        <CertFormModal
          title="Add Certificate"
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => setShowAdd(false)}
        />
      )}

      {showEdit && (
        <CertFormModal
          title="Edit Certificate"
          formData={formData}
          onChange={setFormData}
          onSave={handleSave}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showView && selectedCert && (
        <CertViewModal cert={selectedCert} onClose={() => setShowView(false)} />
      )}
    </div>
  );
}
