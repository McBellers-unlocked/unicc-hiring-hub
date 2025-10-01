-- Add missing foreign key constraints to video_assignments table
ALTER TABLE public.video_assignments
  ADD CONSTRAINT fk_video_assignments_application 
    FOREIGN KEY (application_id) REFERENCES public.applications(id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_video_assignments_question_set 
    FOREIGN KEY (question_set_id) REFERENCES public.video_question_sets(id) ON DELETE RESTRICT,
  ADD CONSTRAINT fk_video_assignments_created_by 
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_video_assignments_extended_by 
    FOREIGN KEY (extended_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Improve the trigger to handle missing question sets
CREATE OR REPLACE FUNCTION public.create_video_assignment_on_stage_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_question_set_id UUID;
  v_job_id UUID;
BEGIN
  IF NEW.to_stage = 'Pre-Recorded Video' THEN
    -- Check if video assignment already exists
    IF NOT EXISTS (
      SELECT 1 FROM public.video_assignments 
      WHERE application_id = NEW.application_id
    ) THEN
      -- Get the job_id for this application
      SELECT job_id INTO v_job_id
      FROM public.applications
      WHERE id = NEW.application_id;
      
      -- Check if a question set exists for this job
      SELECT id INTO v_question_set_id
      FROM public.video_question_sets
      WHERE job_id = v_job_id
      LIMIT 1;
      
      IF v_question_set_id IS NULL THEN
        -- Log the error to audit_logs
        INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
        VALUES (
          NEW.by_user,
          'VIDEO_ASSIGNMENT_FAILED',
          'applications',
          NEW.application_id,
          jsonb_build_object(
            'reason', 'No video question set configured for this job',
            'job_id', v_job_id,
            'application_id', NEW.application_id
          )
        );
        
        -- Don't create the assignment
        RETURN NEW;
      END IF;
      
      -- Create the video assignment
      INSERT INTO public.video_assignments (
        application_id,
        question_set_id,
        created_by
      ) VALUES (
        NEW.application_id,
        v_question_set_id,
        NEW.by_user
      );
      
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
$function$;