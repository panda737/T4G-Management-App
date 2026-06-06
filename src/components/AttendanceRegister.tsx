import { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, PenTool, Loader } from 'lucide-react';
import { supabase, Employee, TrainingAttendance } from '../lib/supabase';
import Modal from './Modal';
import SignaturePad from './SignaturePad';

interface AttendanceRegisterProps {
  referenceType: 'toolbox_talk' | 'training_session';
  referenceId: string;
  onUpdate?: () => void;
}

type AttendanceStatus = 'Present' | 'Absent' | 'Late';

interface AttendeeRow {
  employee: Employee;
  status: AttendanceStatus;
  signature_data: string | null;
  signed_at: string | null;
  saved: boolean;
  attendanceId: string | null;
}

export default function AttendanceRegister({ referenceType, referenceId, onUpdate }: AttendanceRegisterProps) {
  const [attendees, setAttendees] = useState<AttendeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingFor, setSigningFor] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [referenceId]);

  async function loadData() {
    setLoading(true);
    const [empRes, attRes] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'active').order('first_name'),
      supabase.from('training_attendance').select('*').eq('reference_type', referenceType).eq('reference_id', referenceId),
    ]);

    const emps: Employee[] = empRes.data || [];
    const existingAtt: TrainingAttendance[] = attRes.data || [];

    const rows: AttendeeRow[] = emps.map(emp => {
      const existing = existingAtt.find(a => a.employee_id === emp.id);
      return {
        employee: emp,
        status: (existing?.status as AttendanceStatus) || 'Absent',
        signature_data: existing?.signature_data || null,
        signed_at: existing?.signed_at || null,
        saved: !!existing,
        attendanceId: existing?.id || null,
      };
    });
    setAttendees(rows);
    setLoading(false);
  }

  function toggleStatus(empId: string) {
    setAttendees(prev =>
      prev.map(a => {
        if (a.employee.id !== empId) return a;
        const cycle: AttendanceStatus[] = ['Present', 'Absent', 'Late'];
        const nextIdx = (cycle.indexOf(a.status) + 1) % cycle.length;
        return { ...a, status: cycle[nextIdx], saved: false };
      })
    );
  }

  function handleSignature(empId: string, dataUrl: string) {
    setAttendees(prev =>
      prev.map(a => {
        if (a.employee.id !== empId) return a;
        return {
          ...a,
          signature_data: dataUrl,
          signed_at: new Date().toISOString(),
          status: a.status === 'Absent' ? 'Present' : a.status,
          saved: false,
        };
      })
    );
    setSigningFor(null);
  }

  async function saveAttendance() {
    setSaving(true);
    const markedAttendees = attendees.filter(a => a.status !== 'Absent' || a.saved);

    for (const att of markedAttendees) {
      const record = {
        reference_type: referenceType,
        reference_id: referenceId,
        employee_id: att.employee.id,
        employee_name: `${att.employee.first_name} ${att.employee.surname}`,
        status: att.status,
        signature_data: att.signature_data,
        signed_at: att.signed_at,
      };

      if (att.attendanceId) {
        await supabase.from('training_attendance').update(record).eq('id', att.attendanceId);
      } else if (att.status !== 'Absent') {
        await supabase.from('training_attendance').insert([record]);
      }
    }

    const absentToRemove = attendees.filter(a => a.status === 'Absent' && a.attendanceId);
    for (const att of absentToRemove) {
      await supabase.from('training_attendance').delete().eq('id', att.attendanceId!);
    }

    await loadData();
    setSaving(false);
    onUpdate?.();
  }

  const presentCount = attendees.filter(a => a.status === 'Present').length;
  const lateCount = attendees.filter(a => a.status === 'Late').length;
  const absentCount = attendees.filter(a => a.status === 'Absent').length;
  const signedCount = attendees.filter(a => a.signature_data).length;

  const filtered = searchTerm
    ? attendees.filter(a =>
        `${a.employee.first_name} ${a.employee.surname}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.employee.position?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : attendees;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-emerald-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-emerald-700">{presentCount}</p>
          <p className="text-xs text-emerald-600">Present</p>
        </div>
        <div className="bg-amber-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{lateCount}</p>
          <p className="text-xs text-amber-600">Late</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{absentCount}</p>
          <p className="text-xs text-red-600">Absent</p>
        </div>
        <div className="bg-sky-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-sky-700">{signedCount}</p>
          <p className="text-xs text-sky-600">Signed</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Search employees..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
      />

      <div className="border border-gray-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
            <tr>
              <th className="px-2 sm:px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Employee</th>
              <th className="hidden sm:table-cell px-4 py-2.5 text-left text-xs font-semibold text-gray-700">Position</th>
              <th className="px-2 sm:px-4 py-2.5 text-center text-xs font-semibold text-gray-700">Status</th>
              <th className="px-2 sm:px-4 py-2.5 text-center text-xs font-semibold text-gray-700">Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(att => (
              <tr key={att.employee.id} className="hover:bg-gray-50">
                <td className="px-2 sm:px-4 py-2.5">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    {att.employee.first_name} {att.employee.surname}
                  </p>
                  <p className="sm:hidden text-xs text-gray-400 mt-0.5">{att.employee.position}</p>
                </td>
                <td className="hidden sm:table-cell px-4 py-2.5 text-sm text-gray-500">{att.employee.position}</td>
                <td className="px-2 sm:px-4 py-2.5 text-center">
                  <button
                    onClick={() => toggleStatus(att.employee.id)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold transition ${
                      att.status === 'Present'
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : att.status === 'Late'
                        ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {att.status === 'Present' && <CheckCircle size={12} />}
                    {att.status === 'Late' && <Clock size={12} />}
                    {att.status === 'Absent' && <XCircle size={12} />}
                    {att.status}
                  </button>
                </td>
                <td className="px-2 sm:px-4 py-2.5 text-center">
                  {att.signature_data ? (
                    <button
                      onClick={() => setSigningFor(att.employee.id)}
                      className="inline-block"
                      title="Click to re-sign"
                    >
                      <img
                        src={att.signature_data}
                        alt="Signature"
                        className="h-7 w-16 object-contain border border-emerald-300 rounded bg-white"
                      />
                    </button>
                  ) : (
                    <button
                      onClick={() => setSigningFor(att.employee.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-500 border border-gray-200 rounded hover:bg-gray-50 transition"
                    >
                      <PenTool size={12} /> Sign
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-gray-400">
          {presentCount + lateCount} of {attendees.length} employees marked present/late
        </p>
        <button
          onClick={saveAttendance}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
        >
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Users size={16} />}
          {saving ? 'Saving...' : 'Save Attendance'}
        </button>
      </div>

      {signingFor && (
        <Modal
          title={`Signature - ${attendees.find(a => a.employee.id === signingFor)?.employee.first_name} ${attendees.find(a => a.employee.id === signingFor)?.employee.surname}`}
          onClose={() => setSigningFor(null)}
          size="md"
        >
          <SignaturePad
            onSave={dataUrl => handleSignature(signingFor, dataUrl)}
            onCancel={() => setSigningFor(null)}
            existingSignature={attendees.find(a => a.employee.id === signingFor)?.signature_data}
          />
        </Modal>
      )}
    </div>
  );
}
