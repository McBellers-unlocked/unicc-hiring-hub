-- Drop existing tables and recreate with new schema
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.application_history CASCADE;
DROP TABLE IF EXISTS public.applications CASCADE;
DROP TABLE IF EXISTS public.jobs CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.user_roles CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop existing types if they exist
DROP TYPE IF EXISTS public.application_stage CASCADE;
DROP TYPE IF EXISTS public.app_role CASCADE;
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.application_status CASCADE;
DROP TYPE IF EXISTS public.input_type CASCADE;
DROP TYPE IF EXISTS public.killer_question_rule CASCADE;
DROP TYPE IF EXISTS public.recommendation CASCADE;

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
  files JSONB DEFAULT '{}',
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
  duration INTEGER,
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

-- Enable Row Level Security on all tables
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