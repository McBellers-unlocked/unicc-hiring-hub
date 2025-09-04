-- Fix security warnings by setting search_path for functions

-- Update create_video_assignment_on_stage_change function
CREATE OR REPLACE FUNCTION public.create_video_assignment_on_stage_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if moving to Pre-Recorded Video stage
  IF NEW.to_stage = 'Pre-Recorded Video' THEN
    -- Check if video assignment already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.video_assignments 
      WHERE application_id = NEW.application_id
    ) THEN
      -- Get the question set for this job
      INSERT INTO public.video_assignments (
        application_id,
        question_set_id,
        created_by
      )
      SELECT 
        NEW.application_id,
        vqs.id,
        NEW.by_user
      FROM public.applications a
      JOIN public.video_question_sets vqs ON vqs.job_id = a.job_id
      WHERE a.id = NEW.application_id
      LIMIT 1;
      
      -- Log the invite sent event
      INSERT INTO public.video_events (assignment_id, type, meta)
      SELECT 
        va.id,
        'InviteSent'::video_event_type,
        jsonb_build_object('created_by', NEW.by_user)
      FROM public.video_assignments va
      WHERE va.application_id = NEW.application_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update validate_video_assignment_token function  
CREATE OR REPLACE FUNCTION public.validate_video_assignment_token(assignment_token TEXT)
RETURNS TABLE (
  assignment_id UUID,
  application_id UUID,
  question_set_id UUID,
  status video_assignment_status,
  deadline_at TIMESTAMP WITH TIME ZONE,
  questions JSONB,
  retakes_used_by_question JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    va.id as assignment_id,
    va.application_id,
    va.question_set_id,
    va.status,
    va.deadline_at,
    vqs.questions,
    va.retakes_used_by_question
  FROM public.video_assignments va
  JOIN public.video_question_sets vqs ON vqs.id = va.question_set_id
  WHERE va.token = assignment_token
    AND va.deadline_at > now()
    AND va.status NOT IN ('Completed', 'Expired', 'Failed');
END;
$$;

-- Update update_video_assignment_status function
CREATE OR REPLACE FUNCTION public.update_video_assignment_status(
  assignment_token TEXT,
  new_status video_assignment_status,
  event_meta JSONB DEFAULT '{}'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_record RECORD;
  status_field TEXT;
BEGIN
  -- Get the assignment
  SELECT * INTO assignment_record
  FROM public.video_assignments
  WHERE token = assignment_token;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Determine which timestamp field to update
  status_field := CASE new_status
    WHEN 'LinkOpened' THEN 'opened_at'
    WHEN 'InProgress' THEN 'started_at'
    WHEN 'Completed' THEN 'completed_at'
    ELSE NULL
  END;
  
  -- Update the assignment
  IF status_field IS NOT NULL THEN
    EXECUTE format('UPDATE public.video_assignments SET status = $1, %I = now(), last_activity_at = now() WHERE token = $2', status_field)
    USING new_status, assignment_token;
  ELSE
    UPDATE public.video_assignments 
    SET status = new_status, last_activity_at = now() 
    WHERE token = assignment_token;
  END IF;
  
  -- Log the event
  INSERT INTO public.video_events (assignment_id, type, meta)
  VALUES (assignment_record.id, new_status::video_event_type, event_meta);
  
  RETURN TRUE;
END;
$$;