-- Add 'multiple_choice' to assessment_type enum
ALTER TYPE assessment_type ADD VALUE IF NOT EXISTS 'multiple_choice';

-- Create assessment_mcq_questions table
CREATE TABLE public.assessment_mcq_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.written_assessments(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_text TEXT NOT NULL,
  question_type TEXT NOT NULL DEFAULT 'single' CHECK (question_type IN ('single', 'multi')),
  points INTEGER NOT NULL DEFAULT 1,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_mcq_options table
CREATE TABLE public.assessment_mcq_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.assessment_mcq_questions(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create assessment_mcq_responses table
CREATE TABLE public.assessment_mcq_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slot_id UUID NOT NULL REFERENCES public.assessment_slots(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.assessment_mcq_questions(id) ON DELETE CASCADE,
  selected_options UUID[] DEFAULT '{}',
  is_correct BOOLEAN,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(slot_id, question_id)
);

-- Add MCQ-specific columns to written_assessments
ALTER TABLE public.written_assessments
  ADD COLUMN IF NOT EXISTS mcq_display_mode TEXT DEFAULT 'sequential' CHECK (mcq_display_mode IN ('sequential', 'all_at_once')),
  ADD COLUMN IF NOT EXISTS mcq_shuffle_questions BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mcq_shuffle_options BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS mcq_show_results BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS mcq_passing_score INTEGER DEFAULT 70;

-- Enable RLS on new tables
ALTER TABLE public.assessment_mcq_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_mcq_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_mcq_responses ENABLE ROW LEVEL SECURITY;

-- RLS policies for assessment_mcq_questions
CREATE POLICY "HR admins can manage MCQ questions" ON public.assessment_mcq_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'Chief of HR')
    )
  );

CREATE POLICY "Candidates can view questions for their slots" ON public.assessment_mcq_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_slots 
      WHERE assessment_slots.assessment_id = assessment_mcq_questions.assessment_id
      AND assessment_slots.candidate_email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- RLS policies for assessment_mcq_options
CREATE POLICY "HR admins can manage MCQ options" ON public.assessment_mcq_options
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'Chief of HR')
    )
  );

CREATE POLICY "Candidates can view options for their slots" ON public.assessment_mcq_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assessment_mcq_questions q
      JOIN assessment_slots s ON s.assessment_id = q.assessment_id
      WHERE q.id = assessment_mcq_options.question_id
      AND s.candidate_email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- RLS policies for assessment_mcq_responses
CREATE POLICY "HR admins can view all MCQ responses" ON public.assessment_mcq_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('Admin', 'Chief of HR')
    )
  );

CREATE POLICY "Candidates can manage their own responses" ON public.assessment_mcq_responses
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM assessment_slots s
      WHERE s.id = assessment_mcq_responses.slot_id
      AND s.candidate_email = (SELECT email FROM users WHERE id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mcq_questions_assessment ON public.assessment_mcq_questions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_mcq_options_question ON public.assessment_mcq_options(question_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_slot ON public.assessment_mcq_responses(slot_id);
CREATE INDEX IF NOT EXISTS idx_mcq_responses_question ON public.assessment_mcq_responses(question_id);