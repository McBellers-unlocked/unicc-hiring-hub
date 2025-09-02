-- Drop existing tables and recreate with new schema
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.application_history CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TYPE IF EXISTS public.application_stage CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;

-- Create updated enums
CREATE TYPE public.user_role AS ENUM ('Admin', 'HR Assistant', 'Hiring Manager', 'Panel Member', 'Candidate');
CREATE TYPE public.application_status AS ENUM ('Application', 'Longlist', 'Shortlist', 'Pre-Recorded Video', 'Panel Interview', 'Offer', 'Roster', 'Rejected');
CREATE TYPE public.input_type AS ENUM ('boolean', 'single', 'multi', 'text');
CREATE TYPE public.killer_question_rule AS ENUM ('yes_required', 'no_required', 'custom');
CREATE TYPE public.recommendation AS ENUM ('Yes', 'No', 'Reserve', 'Roster');

-- User table (updated from profiles)
CREATE TABLE public.users (
  id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role user_role NOT NULL DEFAULT 'Candidate',
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);

-- Job table (enhanced)
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT,
  notice_no TEXT,
  type TEXT,
  positions INTEGER DEFAULT 1,
  grade TEXT,
  salary_estimate TEXT,
  location TEXT,
  org_unit TEXT,
  issue_date DATE,
  closing_date TIMESTAMP WITH TIME ZONE,
  timezone TEXT DEFAULT 'Europe/Zurich',
  description_md TEXT,
  requirements_md TEXT,
  eligibility_note TEXT,
  privacy_notice_url TEXT DEFAULT 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
  attachments_required JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  slug TEXT UNIQUE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- EssentialCriterion table
CREATE TABLE public.essential_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  must_have BOOLEAN DEFAULT false,
  validator TEXT,
  params JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- KillerQuestion table
CREATE TABLE public.killer_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  input_type input_type NOT NULL,
  options JSONB DEFAULT '{}',
  rule killer_question_rule NOT NULL,
  custom_logic JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Candidate table (separate from User)
CREATE TABLE public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  location TEXT,
  work_auth TEXT,
  languages JSONB DEFAULT '{}',
  linkedin_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Application table (enhanced)
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE NOT NULL,
  status application_status DEFAULT 'Application',
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  source TEXT,
  files JSONB DEFAULT '{}', -- cv, motivation_letter, phf, other
  answers JSONB DEFAULT '{}',
  consents JSONB DEFAULT '{}',
  suggested_for_longlist BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);

-- ScreeningScore table
CREATE TABLE public.screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  rubric_breakdown JSONB DEFAULT '{}',
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- StageEvent table (replaces application_history)
CREATE TABLE public.stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  from_stage application_status,
  to_stage application_status NOT NULL,
  by_user UUID REFERENCES public.users(id),
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- VideoQuestionSet table
CREATE TABLE public.video_question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  questions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- VideoAnswer table
CREATE TABLE public.video_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  url TEXT NOT NULL,
  duration INTEGER, -- seconds
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Evaluation table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES public.users(id) NOT NULL,
  section_scores JSONB DEFAULT '{}',
  total INTEGER CHECK (total >= 0 AND total <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FeedbackFormTemplate table
CREATE TABLE public.feedback_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sections JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- FeedbackFormResponse table
CREATE TABLE public.feedback_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES public.users(id) NOT NULL,
  responses JSONB DEFAULT '{}',
  overall INTEGER CHECK (overall >= 0 AND overall <= 100),
  recommendation recommendation,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- EmailThread table
CREATE TABLE public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  thread_key TEXT NOT NULL,
  participants JSONB DEFAULT '[]',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AuditLog table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  before JSONB,
  after JSONB
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.essential_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.killer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Update security functions for new role structure
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.users 
  WHERE id = _user_id
$$;

-- RLS Policies for users
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admin and HR can view all users" ON public.users
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant')
  );

CREATE POLICY "Admin can manage all users" ON public.users
  FOR ALL USING (public.has_role(auth.uid(), 'Admin'));

-- RLS Policies for jobs
CREATE POLICY "Everyone can view active jobs" ON public.jobs
  FOR SELECT USING (status = 'active');

CREATE POLICY "Staff can view all jobs" ON public.jobs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager') OR
    public.has_role(auth.uid(), 'Panel Member')
  );

CREATE POLICY "Admin and HR can manage jobs" ON public.jobs
  FOR ALL USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant')
  );

-- RLS Policies for candidates
CREATE POLICY "Staff can view all candidates" ON public.candidates
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager') OR
    public.has_role(auth.uid(), 'Panel Member')
  );

CREATE POLICY "Admin and HR can manage candidates" ON public.candidates
  FOR ALL USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant')
  );

-- RLS Policies for applications
CREATE POLICY "Staff can view all applications" ON public.applications
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager') OR
    public.has_role(auth.uid(), 'Panel Member')
  );

CREATE POLICY "Staff can manage applications" ON public.applications
  FOR ALL USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager')
  );

-- RLS Policies for essential criteria
CREATE POLICY "Staff can view essential criteria" ON public.essential_criteria
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager') OR
    public.has_role(auth.uid(), 'Panel Member')
  );

CREATE POLICY "Admin and HR can manage essential criteria" ON public.essential_criteria
  FOR ALL USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant')
  );

-- RLS Policies for evaluations
CREATE POLICY "Evaluators can view their own evaluations" ON public.evaluations
  FOR SELECT USING (evaluator_id = auth.uid());

CREATE POLICY "Staff can create evaluations" ON public.evaluations
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant') OR
    public.has_role(auth.uid(), 'Hiring Manager') OR
    public.has_role(auth.uid(), 'Panel Member')
  );

CREATE POLICY "Evaluators can update their own evaluations" ON public.evaluations
  FOR UPDATE USING (evaluator_id = auth.uid());

CREATE POLICY "Admin and HR can view all evaluations" ON public.evaluations
  FOR SELECT USING (
    public.has_role(auth.uid(), 'Admin') OR 
    public.has_role(auth.uid(), 'HR Assistant')
  );

-- RLS Policies for audit logs
CREATE POLICY "Admin can view all audit logs" ON public.audit_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'Admin'));

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_candidates_updated_at
  BEFORE UPDATE ON public.candidates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluations_updated_at
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_form_templates_updated_at
  BEFORE UPDATE ON public.feedback_form_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_form_responses_updated_at
  BEFORE UPDATE ON public.feedback_form_responses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update user registration function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, role)
  VALUES (
    NEW.id, 
    COALESCE(
      CONCAT(NEW.raw_user_meta_data ->> 'first_name', ' ', NEW.raw_user_meta_data ->> 'last_name'),
      NEW.email
    ),
    NEW.email,
    'Candidate'
  );
  
  RETURN NEW;
END;
$$;

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, after)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before, after)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (actor_id, action, entity, entity_id, before)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Add audit triggers to key tables
CREATE TRIGGER audit_applications
  AFTER INSERT OR UPDATE OR DELETE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_stage_events
  AFTER INSERT ON public.stage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.log_audit_event();

-- Create indexes for performance
CREATE INDEX idx_applications_job_id ON public.applications(job_id);
CREATE INDEX idx_applications_candidate_id ON public.applications(candidate_id);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_stage_events_application_id ON public.stage_events(application_id);
CREATE INDEX idx_evaluations_application_id ON public.evaluations(application_id);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_jobs_closing_date ON public.jobs(closing_date);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity, entity_id);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs(actor_id);