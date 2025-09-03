-- Enable RLS on video_question_sets
ALTER TABLE public.video_question_sets ENABLE ROW LEVEL SECURITY;

-- Enable RLS on video_answers  
ALTER TABLE public.video_answers ENABLE ROW LEVEL SECURITY;

-- Enable RLS for remaining tables that need policies
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_form_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.killer_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.screening_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for email_threads
CREATE POLICY "Staff can view email threads" 
ON public.email_threads 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Admin and HR can manage email threads" 
ON public.email_threads 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- Create policies for feedback_form_responses
CREATE POLICY "Staff can view feedback responses" 
ON public.feedback_form_responses 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Staff can create feedback responses" 
ON public.feedback_form_responses 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Evaluators can update their own feedback" 
ON public.feedback_form_responses 
FOR UPDATE 
USING (evaluator_id = auth.uid());

-- Create policies for feedback_form_templates
CREATE POLICY "Staff can view feedback templates" 
ON public.feedback_form_templates 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Admin and HR can manage feedback templates" 
ON public.feedback_form_templates 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- Create policies for killer_questions
CREATE POLICY "Staff can view killer questions" 
ON public.killer_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Admin and HR can manage killer questions" 
ON public.killer_questions 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- Create policies for screening_scores
CREATE POLICY "Staff can view screening scores" 
ON public.screening_scores 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "System can create screening scores" 
ON public.screening_scores 
FOR INSERT 
WITH CHECK (true);

-- Create policies for stage_events
CREATE POLICY "Staff can view stage events" 
ON public.stage_events 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

CREATE POLICY "Staff can create stage events" 
ON public.stage_events 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));

-- Create policies for system_settings
CREATE POLICY "Admin can manage system settings" 
ON public.system_settings 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role));

CREATE POLICY "Staff can view system settings" 
ON public.system_settings 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) 
  OR has_role(auth.uid(), 'HR Assistant'::user_role) 
  OR has_role(auth.uid(), 'Hiring Manager'::user_role) 
  OR has_role(auth.uid(), 'Panel Member'::user_role));