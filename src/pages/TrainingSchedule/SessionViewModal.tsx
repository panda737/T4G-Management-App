import { useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { TrainingSchedule } from '../../lib/supabase';
import Modal from '../../components/Modal';
import AttendanceRegister from '../../components/AttendanceRegister';
import { SESSION_STATUS_COLORS } from './SessionFormModal';

interface Props {
  session: TrainingSchedule;
  onClose: () => void;
}

export default function SessionViewModal({ session, onClose }: Props) {
  const [showAttendance, setShowAttendance] = useState(false);

  return (
    <>
      <Modal title={session.course_name} onClose={onClose} size="lg">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Date</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{new Date(session.scheduled_date).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Time</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{session.scheduled_time || 'Not specified'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Location</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{session.location}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold">Instructor</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{session.instructor}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Enrollment</p>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${(session.enrolled_count / session.capacity) * 100}%` }} />
              </div>
              <p className="text-sm text-gray-700">{session.enrolled_count} of {session.capacity} enrolled</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Status</p>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${SESSION_STATUS_COLORS[session.status]}`}>
              {session.status}
            </span>
          </div>
          {session.description && (
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Description</p>
              <p className="text-sm text-gray-700">{session.description}</p>
            </div>
          )}
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={() => setShowAttendance(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition text-sm font-medium"
            >
              <ClipboardList size={16} /> Attendance Register
            </button>
          </div>
        </div>
      </Modal>

      {showAttendance && (
        <Modal
          title={`Attendance: ${session.course_name}`}
          onClose={() => setShowAttendance(false)}
          size="xl"
        >
          <div className="mb-3">
            <p className="text-xs text-gray-500">
              {new Date(session.scheduled_date).toLocaleDateString()} &middot; {session.instructor}
            </p>
          </div>
          <AttendanceRegister
            referenceType="training_session"
            referenceId={session.id}
          />
        </Modal>
      )}
    </>
  );
}
