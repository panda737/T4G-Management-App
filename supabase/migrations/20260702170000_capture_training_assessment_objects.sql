/*
  # Capture + harden the training-assessment DB objects

  ## Why
  TrainingAssessment.tsx depends on three DB objects that exist in production but
  were applied out-of-band and never committed to this migrations folder:
    - view  training_questions_safe   (question rows WITHOUT correct_answer/explanation)
    - view  employee_directory_safe   (active-employee picker fields)
    - fn    score_training_assessment (SECURITY DEFINER server-side scorer)
  A fresh environment built from the repo alone would break the assessment page.
  This migration captures them verbatim (CREATE OR REPLACE — a no-op re-apply on
  prod) so the ledger is complete.

  ## Hardening (does change prod)
  Both views were created with DEFAULT grants: full SELECT/INSERT/UPDATE/DELETE for
  anon AND authenticated. As owner-rights views they bypass base-table RLS/grants,
  so anon could read the employee directory unauthenticated, and authenticated
  users could write to employees/training_module_questions THROUGH the
  auto-updatable views. Grants are stripped to SELECT-only for authenticated.
*/

CREATE OR REPLACE VIEW public.training_questions_safe AS
  SELECT id,
    module_id,
    question_text,
    option_a,
    option_b,
    option_c,
    option_d,
    sort_order,
    created_at
  FROM public.training_module_questions;

CREATE OR REPLACE VIEW public.employee_directory_safe AS
  SELECT id,
    employee_number,
    first_name,
    surname,
    "position",
    department,
    hs_role,
    is_truck_handler,
    status
  FROM public.employees;

-- Strip default grants: read-only, signed-in users only.
REVOKE ALL ON public.training_questions_safe FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.employee_directory_safe FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.training_questions_safe TO authenticated;
GRANT SELECT ON public.employee_directory_safe TO authenticated;

CREATE OR REPLACE FUNCTION public.score_training_assessment(p_module_id uuid, p_employee_id uuid, p_answers jsonb, p_time_taken_seconds integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_module            record;
  v_q                 record;
  v_correct_count     integer := 0;
  v_total             integer := 0;
  v_score_pct         integer;
  v_result            text;
  v_employee_name     text;
  v_review            jsonb := '[]'::jsonb;
  v_user_answer       text;
  v_is_correct        boolean;
  v_user_opt_text     text;
  v_correct_opt_text  text;
BEGIN
  -- Load module
  SELECT id, title, category, subcategory, pass_mark
  INTO v_module
  FROM public.training_modules
  WHERE id = p_module_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Module not found');
  END IF;

  -- Load employee name
  SELECT first_name || ' ' || surname
  INTO v_employee_name
  FROM public.employees
  WHERE id = p_employee_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Employee not found');
  END IF;

  -- Score each question
  FOR v_q IN
    SELECT id, question_text, option_a, option_b, option_c, option_d,
           correct_answer, explanation, sort_order
    FROM public.training_module_questions
    WHERE module_id = p_module_id
    ORDER BY sort_order
  LOOP
    v_total       := v_total + 1;
    v_user_answer := p_answers ->> v_q.id::text;
    v_is_correct  := (v_user_answer IS NOT NULL AND v_user_answer = v_q.correct_answer);

    IF v_is_correct THEN
      v_correct_count := v_correct_count + 1;
    END IF;

    v_user_opt_text := CASE v_user_answer
      WHEN 'A' THEN v_q.option_a  WHEN 'B' THEN v_q.option_b
      WHEN 'C' THEN v_q.option_c  WHEN 'D' THEN v_q.option_d
      ELSE '' END;

    v_correct_opt_text := CASE v_q.correct_answer
      WHEN 'A' THEN v_q.option_a  WHEN 'B' THEN v_q.option_b
      WHEN 'C' THEN v_q.option_c  WHEN 'D' THEN v_q.option_d
      ELSE '' END;

    v_review := v_review || jsonb_build_array(
      jsonb_build_object(
        'question_id',         v_q.id,
        'question_text',       v_q.question_text,
        'your_answer',         COALESCE(v_user_answer, ''),
        'your_answer_text',    v_user_opt_text,
        'correct_answer',      v_q.correct_answer,
        'correct_answer_text', v_correct_opt_text,
        'is_correct',          v_is_correct,
        'explanation',         COALESCE(v_q.explanation, '')
      )
    );
  END LOOP;

  IF v_total = 0 THEN
    RETURN jsonb_build_object('error', 'No questions found for this module');
  END IF;

  v_score_pct := ROUND((v_correct_count::numeric / v_total) * 100);
  v_result    := CASE WHEN v_score_pct >= v_module.pass_mark THEN 'Pass' ELSE 'Fail' END;

  -- Record assessment
  INSERT INTO public.training_assessments (
    employee_id, employee_name, module_id, module_title,
    answers, score, result, time_taken_seconds
  ) VALUES (
    p_employee_id, v_employee_name, p_module_id, v_module.title,
    p_answers, v_score_pct, v_result, p_time_taken_seconds
  );

  -- Record training completion
  INSERT INTO public.training_records (
    employee_id, employee_name, course_name, completion_date,
    score, result, instructor, notes, status
  ) VALUES (
    p_employee_id, v_employee_name, v_module.title, CURRENT_DATE,
    v_score_pct, v_result, 'Self-Assessment',
    'Module: ' || v_module.category ||
      CASE WHEN v_module.subcategory IS NOT NULL AND v_module.subcategory <> ''
           THEN ' - ' || v_module.subcategory ELSE '' END ||
    '. Time: ' || (p_time_taken_seconds / 60)::text || 'm ' ||
                  (p_time_taken_seconds % 60)::text || 's',
    'Completed'
  );

  RETURN jsonb_build_object(
    'score',           v_score_pct,
    'result',          v_result,
    'correct_count',   v_correct_count,
    'total_questions', v_total,
    'pass_mark',       v_module.pass_mark,
    'review',          v_review
  );
END;
$function$;

-- SECURITY DEFINER scorer writes training records — signed-in users only.
REVOKE EXECUTE ON FUNCTION public.score_training_assessment(uuid, uuid, jsonb, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.score_training_assessment(uuid, uuid, jsonb, integer) TO authenticated;

NOTIFY pgrst, 'reload schema';
