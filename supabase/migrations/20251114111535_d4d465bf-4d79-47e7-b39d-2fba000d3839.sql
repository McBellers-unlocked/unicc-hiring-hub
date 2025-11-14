-- Create junction table for question-requirement associations
CREATE TABLE IF NOT EXISTS public.job_interview_question_requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.job_interview_questions(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES public.job_requirements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, requirement_id)
);

-- Create junction table for question-competency associations
CREATE TABLE IF NOT EXISTS public.job_interview_question_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.job_interview_questions(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES public.job_competencies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(question_id, competency_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_question_requirements_question ON public.job_interview_question_requirements(question_id);
CREATE INDEX IF NOT EXISTS idx_question_requirements_requirement ON public.job_interview_question_requirements(requirement_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_question ON public.job_interview_question_competencies(question_id);
CREATE INDEX IF NOT EXISTS idx_question_competencies_competency ON public.job_interview_question_competencies(competency_id);

-- Migrate existing single-linked requirements
INSERT INTO public.job_interview_question_requirements (question_id, requirement_id)
SELECT id, requirement_id 
FROM public.job_interview_questions 
WHERE requirement_id IS NOT NULL
ON CONFLICT (question_id, requirement_id) DO NOTHING;

-- Migrate existing single-linked competencies
INSERT INTO public.job_interview_question_competencies (question_id, competency_id)
SELECT id, competency_id 
FROM public.job_interview_questions 
WHERE competency_id IS NOT NULL
ON CONFLICT (question_id, competency_id) DO NOTHING;

-- Enable RLS on new tables
ALTER TABLE public.job_interview_question_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_interview_question_competencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question_requirements
CREATE POLICY "HR and Hiring Managers can manage question requirements"
ON public.job_interview_question_requirements
FOR ALL
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

CREATE POLICY "Staff can view question requirements"
ON public.job_interview_question_requirements
FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role)
);

-- RLS Policies for question_competencies
CREATE POLICY "HR and Hiring Managers can manage question competencies"
ON public.job_interview_question_competencies
FOR ALL
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role)
);

CREATE POLICY "Staff can view question competencies"
ON public.job_interview_question_competencies
FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR
  has_role(auth.uid(), 'HR Assistant'::user_role) OR
  has_role(auth.uid(), 'Chief of HR'::user_role) OR
  has_role(auth.uid(), 'Hiring Manager'::user_role) OR
  has_role(auth.uid(), 'Panel Member'::user_role)
);