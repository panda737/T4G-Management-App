import { TrainingCourse } from '../../lib/supabase';
import Modal from '../../components/Modal';

interface Props {
  course: TrainingCourse;
  onClose: () => void;
}

export default function CourseViewModal({ course, onClose }: Props) {
  return (
    <Modal title="Course Details" onClose={onClose} size="lg">
      <div className="space-y-4">
        {[
          { label: 'Course Code', value: course.course_code },
          { label: 'Course Name', value: course.course_name },
          { label: 'Category', value: course.category },
          { label: 'Description', value: course.description },
          { label: 'Duration', value: `${course.duration_hours} hours` },
          { label: 'Validity', value: `${course.validity_months} months` },
          { label: 'Provider', value: course.provider },
          { label: 'Mandatory', value: course.is_mandatory ? 'Yes' : 'No' },
          { label: 'Status', value: course.status },
        ].map(item => (
          <div key={item.label} className="flex justify-between border-b border-gray-100 pb-2 last:border-0">
            <span className="text-sm text-gray-500">{item.label}:</span>
            <span className="text-sm font-semibold text-gray-900">{item.value}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}
