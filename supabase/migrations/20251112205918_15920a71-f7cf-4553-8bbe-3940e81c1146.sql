-- Phase 3: Interview Questions Collaboration System

-- Job-specific interview question banks
CREATE TABLE IF NOT EXISTS public.job_interview_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  question_category TEXT, -- e.g., "Technical", "Behavioral", "Leadership"
  competency TEXT, -- e.g., "Problem Solving", "Communication"
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tracking who contributed to questions
CREATE TABLE IF NOT EXISTS public.job_interview_question_contributors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES public.job_interview_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id),
  contribution_type TEXT, -- "created", "edited", "approved"
  contributed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link questions to feedback templates
ALTER TABLE public.feedback_form_templates 
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES public.jobs(id),
ADD COLUMN IF NOT EXISTS auto_generated BOOLEAN DEFAULT FALSE;

-- Enable RLS
ALTER TABLE public.job_interview_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_interview_question_contributors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_interview_questions
CREATE POLICY "Staff can view interview questions"
ON public.job_interview_questions FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role)
);

CREATE POLICY "HR and Hiring Managers can manage interview questions"
ON public.job_interview_questions FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

-- RLS Policies for job_interview_question_contributors
CREATE POLICY "Staff can view contributors"
ON public.job_interview_question_contributors FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role) OR 
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role)
);

CREATE POLICY "System can create contributors"
ON public.job_interview_question_contributors FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_interview_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_interview_questions_updated_at
BEFORE UPDATE ON public.job_interview_questions
FOR EACH ROW
EXECUTE FUNCTION update_interview_questions_updated_at();