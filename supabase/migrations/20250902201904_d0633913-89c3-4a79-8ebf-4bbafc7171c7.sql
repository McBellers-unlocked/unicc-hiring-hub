-- Create new types that don't exist yet
CREATE TYPE public.application_status AS ENUM ('Application', 'Longlist', 'Shortlist', 'Pre-Recorded Video', 'Panel Interview', 'Offer', 'Roster', 'Rejected');
CREATE TYPE public.input_type AS ENUM ('boolean', 'single', 'multi', 'text');
CREATE TYPE public.killer_question_rule AS ENUM ('yes_required', 'no_required', 'custom');
CREATE TYPE public.recommendation AS ENUM ('Yes', 'No', 'Reserve', 'Roster');

-- Rename existing tables to new structure
ALTER TABLE public.profiles RENAME TO users;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.users ALTER COLUMN email SET NOT NULL;
ALTER TABLE public.users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Drop the user_roles table and move role to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'Candidate';

-- Update existing users to have candidate role
UPDATE public.users SET role = 'Candidate' WHERE role IS NULL;

-- Drop user_roles table if it exists
DROP TABLE IF EXISTS public.user_roles CASCADE;

-- Update jobs table with new fields
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS notice_no TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS positions INTEGER DEFAULT 1;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS grade TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS salary_estimate TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS org_unit TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'Europe/Zurich';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS description_md TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS requirements_md TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS eligibility_note TEXT;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS privacy_notice_url TEXT DEFAULT 'https://www.unicc.org/unicc-privacy-notice-for-applicants/';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS attachments_required JSONB DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS branding JSONB DEFAULT '{}';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_slug_unique UNIQUE (slug);

-- Drop organization references if they exist
ALTER TABLE public.jobs DROP COLUMN IF EXISTS organization_id;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS hiring_manager_id;

-- Rename description to description_md if it exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'description' AND table_schema = 'public') THEN
        UPDATE public.jobs SET description_md = description WHERE description_md IS NULL;
    END IF;
END $$;

ALTER TABLE public.jobs DROP COLUMN IF EXISTS description;
ALTER TABLE public.jobs DROP COLUMN IF EXISTS requirements;

-- Create new tables that don't exist
CREATE TABLE IF NOT EXISTS public.essential_criteria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1,
  must_have BOOLEAN DEFAULT false,
  validator TEXT,
  params JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.killer_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  input_type input_type NOT NULL,
  options JSONB DEFAULT '{}',
  rule killer_question_rule NOT NULL,
  custom_logic JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.candidates (
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

-- Update applications table
ALTER TABLE public.applications DROP COLUMN IF EXISTS candidate_id;
ALTER TABLE public.applications ADD COLUMN candidate_id UUID REFERENCES public.candidates(id) ON DELETE CASCADE;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '{}';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS answers JSONB DEFAULT '{}';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS consents JSONB DEFAULT '{}';
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS suggested_for_longlist BOOLEAN DEFAULT false;
ALTER TABLE public.applications ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Drop and recreate applications status column with new enum
ALTER TABLE public.applications DROP COLUMN IF EXISTS stage;
ALTER TABLE public.applications ADD COLUMN status application_status DEFAULT 'Application';

-- Create new tables
CREATE TABLE IF NOT EXISTS public.screening_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  ai_score INTEGER CHECK (ai_score >= 0 AND ai_score <= 100),
  rubric_breakdown JSONB DEFAULT '{}',
  version TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.stage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  from_stage application_status,
  to_stage application_status NOT NULL,
  by_user UUID REFERENCES public.users(id),
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_question_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES public.jobs(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES public.users(id),
  name TEXT NOT NULL,
  questions JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.video_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  question_id TEXT NOT NULL,
  url TEXT NOT NULL,
  duration INTEGER,
  taken_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES public.users(id) NOT NULL,
  section_scores JSONB DEFAULT '{}',
  total INTEGER CHECK (total >= 0 AND total <= 100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sections JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.feedback_form_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  evaluator_id UUID REFERENCES public.users(id) NOT NULL,
  responses JSONB DEFAULT '{}',
  overall INTEGER CHECK (overall >= 0 AND overall <= 100),
  recommendation recommendation,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES public.applications(id) ON DELETE CASCADE NOT NULL,
  thread_key TEXT NOT NULL,
  participants JSONB DEFAULT '[]',
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.users(id),
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id UUID NOT NULL,
  at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  before JSONB,
  after JSONB
);

-- Drop old tables
DROP TABLE IF EXISTS public.organizations CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.application_history CASCADE;