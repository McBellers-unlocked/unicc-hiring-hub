-- Create video assignment status enum
CREATE TYPE video_assignment_status AS ENUM (
  'NotStarted',
  'LinkOpened', 
  'InProgress',
  'Completed',
  'Expired',
  'Failed'
);

-- Create video event type enum  
CREATE TYPE video_event_type AS ENUM (
  'InviteSent',
  'LinkOpened',
  'Started', 
  'AnswerUploaded',
  'Completed',
  'Expired',
  'ReminderSent',
  'Failed'
);

-- Create video assignments table
CREATE TABLE public.video_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  question_set_id UUID NOT NULL,
  status video_assignment_status NOT NULL DEFAULT 'NotStarted',
  deadline_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '5 days'),
  opened_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  last_activity_at TIMESTAMP WITH TIME ZONE,
  retakes_used_by_question JSONB DEFAULT '{}',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  extended_by UUID,
  extension_reason TEXT
);

-- Create video events table
CREATE TABLE public.video_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES public.video_assignments(id) ON DELETE CASCADE,
  type video_event_type NOT NULL,
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  meta JSONB DEFAULT '{}'
);

-- Enable RLS on both tables
ALTER TABLE public.video_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_events ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_assignments
CREATE POLICY "Staff can manage video assignments" 
ON public.video_assignments 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));

CREATE POLICY "Anyone can view assignments by token" 
ON public.video_assignments 
FOR SELECT 
USING (true);

-- RLS policies for video_events  
CREATE POLICY "Staff can view video events" 
ON public.video_events 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "System can create video events" 
ON public.video_events 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_video_assignments_application_id ON public.video_assignments(application_id);
CREATE INDEX idx_video_assignments_status ON public.video_assignments(status);
CREATE INDEX idx_video_assignments_deadline_at ON public.video_assignments(deadline_at);
CREATE INDEX idx_video_assignments_token ON public.video_assignments(token);
CREATE INDEX idx_video_events_assignment_id ON public.video_events(assignment_id);
CREATE INDEX idx_video_events_type ON public.video_events(type);

-- Create trigger for updated_at on video_assignments
CREATE TRIGGER update_video_assignments_updated_at
  BEFORE UPDATE ON public.video_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create video assignment when application moves to Pre-Recorded Video stage
CREATE OR REPLACE FUNCTION public.create_video_assignment_on_stage_change()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on stage_events table
CREATE TRIGGER trigger_create_video_assignment
  AFTER INSERT ON public.stage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.create_video_assignment_on_stage_change();

-- Function to handle video assignment token validation and status updates
CREATE OR REPLACE FUNCTION public.validate_video_assignment_token(assignment_token TEXT)
RETURNS TABLE (
  assignment_id UUID,
  application_id UUID,
  question_set_id UUID,
  status video_assignment_status,
  deadline_at TIMESTAMP WITH TIME ZONE,
  questions JSONB,
  retakes_used_by_question JSONB
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update video assignment status
CREATE OR REPLACE FUNCTION public.update_video_assignment_status(
  assignment_token TEXT,
  new_status video_assignment_status,
  event_meta JSONB DEFAULT '{}'
)
RETURNS BOOLEAN AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;