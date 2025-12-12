-- Create enum for assessment status
CREATE TYPE assessment_status AS ENUM ('draft', 'active', 'archived');

-- Create enum for email urgency
CREATE TYPE email_urgency AS ENUM ('low', 'normal', 'high', 'urgent');

-- Create enum for slot status
CREATE TYPE assessment_slot_status AS ENUM ('scheduled', 'in_progress', 'completed', 'expired', 'cancelled');

-- Create enum for curveball trigger type
CREATE TYPE curveball_trigger_type AS ENUM ('time', 'progress');

-- Create written_assessments table - Assessment templates
CREATE TABLE public.written_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INTEGER NOT NULL DEFAULT 90,
  curveball_trigger_type curveball_trigger_type DEFAULT 'time',
  curveball_trigger_value INTEGER DEFAULT 36,
  instructions TEXT,
  status assessment_status NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_emails table - The inbox emails
CREATE TABLE public.assessment_emails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.written_assessments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  sender_name TEXT NOT NULL,
  sender_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  urgency email_urgency NOT NULL DEFAULT 'normal',
  is_curveball BOOLEAN NOT NULL DEFAULT false,
  expected_response_guidance TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_slots table - Time slots for candidates
CREATE TABLE public.assessment_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.written_assessments(id) ON DELETE CASCADE,
  candidate_email TEXT NOT NULL,
  candidate_name TEXT NOT NULL,
  scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
  access_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status assessment_slot_status NOT NULL DEFAULT 'scheduled',
  started_at TIMESTAMP WITH TIME ZONE,
  submitted_at TIMESTAMP WITH TIME ZONE,
  curveball_shown_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_responses table - Candidate answers
CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.assessment_slots(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.assessment_emails(id) ON DELETE CASCADE,
  response_text TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  last_saved_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  time_spent_seconds INTEGER DEFAULT 0,
  order_addressed INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slot_id, email_id)
);

-- Create assessment_scores table - Hiring manager evaluations
CREATE TABLE public.assessment_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.assessment_slots(id) ON DELETE CASCADE,
  email_id UUID NOT NULL REFERENCES public.assessment_emails(id) ON DELETE CASCADE,
  scored_by UUID NOT NULL REFERENCES public.users(id),
  legal_accuracy INTEGER CHECK (legal_accuracy >= 1 AND legal_accuracy <= 4),
  communication INTEGER CHECK (communication >= 1 AND communication <= 4),
  prioritization INTEGER CHECK (prioritization >= 1 AND prioritization <= 4),
  risk_awareness INTEGER CHECK (risk_awareness >= 1 AND risk_awareness <= 4),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slot_id, email_id, scored_by)
);

-- Enable RLS on all tables
ALTER TABLE public.written_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies for written_assessments
CREATE POLICY "Staff can view assessments"
  ON public.written_assessments FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Admin and HR can manage assessments"
  ON public.written_assessments FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for assessment_emails
CREATE POLICY "Staff can view assessment emails"
  ON public.assessment_emails FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Admin and HR can manage assessment emails"
  ON public.assessment_emails FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for assessment_slots
CREATE POLICY "Staff can view assessment slots"
  ON public.assessment_slots FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Admin and HR can manage assessment slots"
  ON public.assessment_slots FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- RLS Policies for assessment_responses
CREATE POLICY "Staff can view assessment responses"
  ON public.assessment_responses FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Admin and HR can manage assessment responses"
  ON public.assessment_responses FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role)
  );

-- Allow anonymous insert/update for candidates taking the assessment
CREATE POLICY "Candidates can submit responses via token"
  ON public.assessment_responses FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Candidates can update their responses"
  ON public.assessment_responses FOR UPDATE
  USING (true);

-- RLS Policies for assessment_scores
CREATE POLICY "Staff can view assessment scores"
  ON public.assessment_scores FOR SELECT
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

CREATE POLICY "Staff can manage assessment scores"
  ON public.assessment_scores FOR ALL
  USING (
    has_role(auth.uid(), 'Admin'::user_role) OR
    has_role(auth.uid(), 'HR Assistant'::user_role) OR
    has_role(auth.uid(), 'Chief of HR'::user_role) OR
    has_role(auth.uid(), 'Hiring Manager'::user_role)
  );

-- Create updated_at trigger for written_assessments
CREATE TRIGGER update_written_assessments_updated_at
  BEFORE UPDATE ON public.written_assessments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for assessment_scores
CREATE TRIGGER update_assessment_scores_updated_at
  BEFORE UPDATE ON public.assessment_scores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to validate assessment token and get assessment data
CREATE OR REPLACE FUNCTION public.validate_assessment_token(p_token TEXT)
RETURNS TABLE (
  slot_id UUID,
  assessment_id UUID,
  candidate_name TEXT,
  candidate_email TEXT,
  status assessment_slot_status,
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  time_limit_minutes INTEGER,
  curveball_trigger_type curveball_trigger_type,
  curveball_trigger_value INTEGER,
  instructions TEXT,
  title TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as slot_id,
    s.assessment_id,
    s.candidate_name,
    s.candidate_email,
    s.status,
    s.scheduled_start,
    s.scheduled_end,
    s.started_at,
    a.time_limit_minutes,
    a.curveball_trigger_type,
    a.curveball_trigger_value,
    a.instructions,
    a.title
  FROM public.assessment_slots s
  JOIN public.written_assessments a ON a.id = s.assessment_id
  WHERE s.access_token = p_token
    AND s.status IN ('scheduled', 'in_progress')
    AND a.status = 'active';
END;
$$;

-- Create function to start an assessment
CREATE OR REPLACE FUNCTION public.start_assessment(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  UPDATE public.assessment_slots
  SET status = 'in_progress', started_at = now()
  WHERE access_token = p_token
    AND status = 'scheduled'
  RETURNING id INTO v_slot_id;
  
  RETURN v_slot_id IS NOT NULL;
END;
$$;

-- Create function to submit an assessment
CREATE OR REPLACE FUNCTION public.submit_assessment(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  UPDATE public.assessment_slots
  SET status = 'completed', submitted_at = now()
  WHERE access_token = p_token
    AND status = 'in_progress'
  RETURNING id INTO v_slot_id;
  
  RETURN v_slot_id IS NOT NULL;
END;
$$;

-- Create function to mark curveball as shown
CREATE OR REPLACE FUNCTION public.mark_curveball_shown(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_slot_id UUID;
BEGIN
  UPDATE public.assessment_slots
  SET curveball_shown_at = now()
  WHERE access_token = p_token
    AND status = 'in_progress'
    AND curveball_shown_at IS NULL
  RETURNING id INTO v_slot_id;
  
  RETURN v_slot_id IS NOT NULL;
END;
$$;

-- Create indexes for performance
CREATE INDEX idx_assessment_emails_assessment_id ON public.assessment_emails(assessment_id);
CREATE INDEX idx_assessment_slots_assessment_id ON public.assessment_slots(assessment_id);
CREATE INDEX idx_assessment_slots_access_token ON public.assessment_slots(access_token);
CREATE INDEX idx_assessment_responses_slot_id ON public.assessment_responses(slot_id);
CREATE INDEX idx_assessment_scores_slot_id ON public.assessment_scores(slot_id);