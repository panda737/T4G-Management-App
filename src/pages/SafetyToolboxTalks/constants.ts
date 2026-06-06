export const PRESENTER_POSITIONS = ['Supervisor', 'Senior Operator', 'Logistics Manager', 'Health & Safety Officer'];

export interface AttendeeOption {
  id: string;
  name: string;
  position: string;
  employee_number: string;
}

export interface FormData {
  talk_date: string;
  topic: string;
  description: string;
  presented_by: string;
  presented_by_id: string | null;
  duration_minutes: number;
  attendee_count: number;
  attendees: string;
  location: string;
  follow_up_required: boolean;
  follow_up_notes: string;
  selected_attendee_ids: string[];
}

export const EMPTY_FORM: FormData = {
  talk_date: new Date().toISOString().split('T')[0],
  topic: '',
  description: '',
  presented_by: '',
  presented_by_id: null,
  duration_minutes: 15,
  attendee_count: 0,
  attendees: '',
  location: '',
  follow_up_required: false,
  follow_up_notes: '',
  selected_attendee_ids: [],
};

export type Tab = 'register' | 'library';
