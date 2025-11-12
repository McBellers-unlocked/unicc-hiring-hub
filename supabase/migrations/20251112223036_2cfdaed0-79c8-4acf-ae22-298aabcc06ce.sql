-- Phase 1: Rename essential_criteria to job_requirements and add category
ALTER TABLE essential_criteria RENAME TO job_requirements;

-- Add category field to distinguish requirement types
ALTER TABLE job_requirements 
ADD COLUMN category text NOT NULL DEFAULT 'Essential Criteria' 
CHECK (category IN ('Essential Criteria', 'Desirable Criteria', 'Essential Education', 'Desirable Education'));

-- Add description field for more detail
ALTER TABLE job_requirements 
ADD COLUMN description text;

-- Add order_index for manual sorting
ALTER TABLE job_requirements 
ADD COLUMN order_index integer DEFAULT 0;

-- Rename 'label' to 'title' for clarity
ALTER TABLE job_requirements RENAME COLUMN label TO title;

-- Create job_competencies table
CREATE TABLE job_competencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  competency_type text NOT NULL CHECK (competency_type IN ('Core', 'Management', 'Leadership')),
  competency_name text NOT NULL,
  description text,
  weight integer DEFAULT 1,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_job_competencies_job ON job_competencies(job_id);

-- Enable RLS on job_competencies
ALTER TABLE job_competencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and HR can manage job competencies"
ON job_competencies FOR ALL
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

CREATE POLICY "Staff can view job competencies"
ON job_competencies FOR SELECT
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Create job_language_requirements table
CREATE TABLE job_language_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid REFERENCES jobs(id) ON DELETE CASCADE NOT NULL,
  language text NOT NULL,
  level text NOT NULL CHECK (level IN ('Basic', 'Working', 'Expert')),
  is_essential boolean DEFAULT false,
  order_index integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_job_languages_job ON job_language_requirements(job_id);

-- Enable RLS on job_language_requirements
ALTER TABLE job_language_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin and HR can manage job language requirements"
ON job_language_requirements FOR ALL
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role));

CREATE POLICY "Staff can view job language requirements"
ON job_language_requirements FOR SELECT
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Chief of HR'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Update job_interview_questions table
ALTER TABLE job_interview_questions 
DROP COLUMN IF EXISTS question_category,
DROP COLUMN IF EXISTS competency;

-- Add foreign keys to link to requirements/competencies
ALTER TABLE job_interview_questions 
ADD COLUMN requirement_id uuid REFERENCES job_requirements(id) ON DELETE SET NULL,
ADD COLUMN competency_id uuid REFERENCES job_competencies(id) ON DELETE SET NULL,
ADD COLUMN language_requirement_id uuid REFERENCES job_language_requirements(id) ON DELETE SET NULL;

CREATE INDEX idx_interview_questions_requirement ON job_interview_questions(requirement_id);
CREATE INDEX idx_interview_questions_competency ON job_interview_questions(competency_id);
CREATE INDEX idx_interview_questions_language ON job_interview_questions(language_requirement_id);