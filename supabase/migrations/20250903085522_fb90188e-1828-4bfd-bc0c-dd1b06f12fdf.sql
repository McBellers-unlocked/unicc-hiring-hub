-- Create panel interviews table
CREATE TABLE public.panel_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID NOT NULL,
  title TEXT NOT NULL,
  scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  location TEXT,
  meeting_link TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  feedback_template_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create panel interview participants table
CREATE TABLE public.panel_interview_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  panel_interview_id UUID NOT NULL,
  panelist_id UUID NOT NULL,
  role TEXT DEFAULT 'Panelist',
  confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(panel_interview_id, panelist_id)
);

-- Enable RLS
ALTER TABLE public.panel_interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.panel_interview_participants ENABLE ROW LEVEL SECURITY;

-- Create policies for panel interviews
CREATE POLICY "Staff can manage panel interviews" 
ON public.panel_interviews 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));

CREATE POLICY "Panelists can view their interviews" 
ON public.panel_interviews 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.panel_interview_participants 
  WHERE panel_interview_id = id AND panelist_id = auth.uid()
));

-- Create policies for participants
CREATE POLICY "Staff can manage interview participants" 
ON public.panel_interview_participants 
FOR ALL 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));

CREATE POLICY "Panelists can view interview participants" 
ON public.panel_interview_participants 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.panel_interview_participants pip 
  WHERE pip.panel_interview_id = panel_interview_id AND pip.panelist_id = auth.uid()
));

-- Create trigger for timestamps
CREATE TRIGGER update_panel_interviews_updated_at
BEFORE UPDATE ON public.panel_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Link feedback responses to panel interviews
ALTER TABLE public.feedback_form_responses 
ADD COLUMN panel_interview_id UUID;