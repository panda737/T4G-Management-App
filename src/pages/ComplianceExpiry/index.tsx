import { useEffect, useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { AlertTriangle, Download, Search, ShieldCheck, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { usePageTitle } from '../../lib/usePageTitle';
import { useUser } from '../../lib/UserContext';
import { downloadCSV } from '../../lib/csvExport';
import DashboardError from '../../components/DashboardError';

type ExpiryStatus = 'expired' | 'soon' | 'ok';

interface ExpiryItem {
  source: string;        // Document, Legal Appointment, Training Certificate, Medical
  name: string;          // what it is
  owner: string;         // person / category
  kind: string;          // Expiry / Review
  date: string;          // YYYY-MM-DD
  status: ExpiryStatus;
}

function statusOf(date: string): ExpiryStatus {
  const days = (new Date(date).getTime() - Date.now()) / 86400000;
  if (days < 0) return 'expired';
  if (days <= 30) return 'soon';
  return 'ok';
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ComplianceExpiry() {
  usePageTitle('Compliance — Expiry Dashboard');
  const { isAdmin } = useUser();
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'attention'>('attention');

  useEffect(() => {
    if (isAdmin) load();
  }, [isAdmin]);

  async function load() {
    setLoading(true);
    setError('');
    try {
    const [docsRes, apptRes, certRes, medRes, empRes, vehRes, drvRes] = await Promise.all([
      supabase.from('documents').select('title, category, expiry_date, review_date, is_active'),
      supabase.from('legal_appointments').select('appointment_type, expiry_date, employee_id'),
      supabase.from('training_certificates').select('course_name, employee_name, expiry_date'),
      supabase.from('employee_medical_records').select('record_type, name, expiry_date, employee_id'),
      supabase.from('employees').select('id, first_name, surname'),
      supabase.from('logistics_vehicles').select('registration, licence_disc_expiry, roadworthy_expiry, transport_permit_expiry, insurance_expiry'),
      supabase.from('logistics_driver_compliance').select('employee_id, licence_expiry, prdp_expiry, medical_expiry, dg_training_expiry'),
    ]);

    const firstErr = [docsRes, apptRes, certRes, medRes, empRes, vehRes, drvRes].find(r => r.error)?.error;
    if (firstErr) throw new Error(firstErr.message);

    const empName = new Map<string, string>();
    for (const e of empRes.data ?? []) empName.set(e.id, `${e.first_name} ${e.surname}`.trim());

    const collected: ExpiryItem[] = [];

    for (const d of docsRes.data ?? []) {
      if (!d.is_active) continue;
      if (d.expiry_date) collected.push({ source: 'Document', name: d.title, owner: d.category, kind: 'Expiry', date: d.expiry_date, status: statusOf(d.expiry_date) });
      if (d.review_date) collected.push({ source: 'Document', name: d.title, owner: d.category, kind: 'Review', date: d.review_date, status: statusOf(d.review_date) });
    }
    for (const a of apptRes.data ?? []) {
      if (a.expiry_date) collected.push({ source: 'Legal Appointment', name: a.appointment_type, owner: empName.get(a.employee_id) ?? '—', kind: 'Expiry', date: a.expiry_date, status: statusOf(a.expiry_date) });
    }
    for (const c of certRes.data ?? []) {
      if (c.expiry_date) collected.push({ source: 'Training Certificate', name: c.course_name, owner: c.employee_name || '—', kind: 'Expiry', date: c.expiry_date, status: statusOf(c.expiry_date) });
    }
    for (const m of medRes.data ?? []) {
      if (m.expiry_date) collected.push({ source: 'Medical', name: m.name || m.record_type, owner: empName.get(m.employee_id) ?? '—', kind: 'Expiry', date: m.expiry_date, status: statusOf(m.expiry_date) });
    }
    for (const v of vehRes.data ?? []) {
      const push = (label: string, date: string | null) => {
        if (date) collected.push({ source: 'Vehicle', name: label, owner: v.registration, kind: 'Expiry', date, status: statusOf(date) });
      };
      push('Licence disc', v.licence_disc_expiry);
      push('Roadworthy / COF', v.roadworthy_expiry);
      push('Transport / waste permit', v.transport_permit_expiry);
      push('Insurance', v.insurance_expiry);
    }
    for (const d of drvRes.data ?? []) {
      const owner = empName.get(d.employee_id) ?? '—';
      const push = (label: string, date: string | null) => {
        if (date) collected.push({ source: 'Driver', name: label, owner, kind: 'Expiry', date, status: statusOf(date) });
      };
      push("Driver's licence", d.licence_expiry);
      push('PrDP', d.prdp_expiry);
      push('Medical certificate', d.medical_expiry);
      push('Dangerous-goods training', d.dg_training_expiry);
    }

    collected.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    setItems(collected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter(i => {
      if (statusFilter === 'attention' && i.status === 'ok') return false;
      if (q && !(i.name.toLowerCase().includes(q) || i.owner.toLowerCase().includes(q) || i.source.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [items, search, statusFilter]);

  const expiredCount = items.filter(i => i.status === 'expired').length;
  const soonCount = items.filter(i => i.status === 'soon').length;

  if (!isAdmin) return <Navigate to="/" replace />;
  if (error) return <DashboardError title="Compliance Expiry Dashboard" message={error} onRetry={load} />;

  function handleExport() {
    downloadCSV(filtered.map(i => ({
      Source: i.source, Item: i.name, 'Owner / Category': i.owner, Type: i.kind, Date: fmt(i.date),
      Status: i.status === 'expired' ? 'Expired' : i.status === 'soon' ? 'Due soon' : 'OK',
    })), 'compliance-expiry');
  }

  const statusBadge = (s: ExpiryStatus) =>
    s === 'expired' ? 'bg-red-100 text-red-700' : s === 'soon' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700';

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance Expiry Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Expiring documents, appointments, certificates and medical records</p>
        </div>
        {filtered.length > 0 && (
          <button onClick={handleExport} className="flex items-center gap-1.5 text-sm border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 px-3 py-2 rounded-lg font-medium transition shadow-sm">
            <Download size={14} /> <span className="hidden sm:inline">Export</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-red-200 p-4">
          <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Expired</p>
        </div>
        <div className="bg-white rounded-xl border border-amber-200 p-4">
          <p className="text-2xl font-bold text-amber-600">{soonCount}</p>
          <p className="text-xs text-gray-500 mt-0.5">Due within 30 days</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-2xl font-bold text-gray-900">{items.length}</p>
          <p className="text-xs text-gray-500 mt-0.5">Tracked items</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search item, owner or source..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as 'all' | 'attention')}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-violet-500">
          <option value="attention">Needs attention</option>
          <option value="all">All items</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader size={22} className="animate-spin text-violet-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-sm text-gray-400">
            <ShieldCheck size={32} className="mx-auto mb-2 text-emerald-300" />
            Nothing requires attention.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Source</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Item</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Owner / Category</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((i, idx) => (
                  <tr key={idx} className={i.status === 'expired' ? 'bg-red-50/40' : i.status === 'soon' ? 'bg-amber-50/40' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">{i.source}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                    <td className="px-4 py-3 text-gray-600">{i.owner}</td>
                    <td className="px-4 py-3 text-gray-500">{i.kind}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-700">
                      {i.status === 'expired' && <AlertTriangle size={12} className="inline mr-1 text-red-500" />}
                      {fmt(i.date)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge(i.status)}`}>
                        {i.status === 'expired' ? 'Expired' : i.status === 'soon' ? 'Due soon' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
