-- Remove all sample/seed data from safety and training modules.
-- Keeps: training_modules, training_module_questions, toolbox_talk_topics, employees, stock, treatment data.

-- Safety: child/junction tables first, then parents
DELETE FROM public.safety_corrective_actions;
DELETE FROM public.safety_incidents;
DELETE FROM public.safety_inspections;
DELETE FROM public.safety_risk_assessments;
DELETE FROM public.safety_emergency_drills;
DELETE FROM public.toolbox_attendees;
DELETE FROM public.safety_toolbox_talks;

-- training_attendance is a shared polymorphic table — clear all rows
DELETE FROM public.training_attendance;

-- Training: session attendees before schedule, then rest
DELETE FROM public.training_session_attendees;
DELETE FROM public.training_schedule;
DELETE FROM public.training_assessments;
DELETE FROM public.training_records;
DELETE FROM public.training_certificates;
DELETE FROM public.training_courses;
