-- Create job requisitions table
CREATE TABLE public.job_requisitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reference_number TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Position Information
  position_title TEXT,
  grade TEXT,
  unit_section_division TEXT,
  duty_station TEXT,
  nature_of_position TEXT,
  start_date DATE,
  positions_available INTEGER DEFAULT 1,
  
  -- Position Description
  purpose_of_position TEXT,
  objectives_of_programme TEXT,
  main_duties_responsibilities TEXT,
  
  -- Profile & Competencies
  global_competencies JSONB DEFAULT '[]'::jsonb,
  core_competencies JSONB DEFAULT '[]'::jsonb,
  management_competencies JSONB DEFAULT '[]'::jsonb,
  leadership_competencies JSONB DEFAULT '[]'::jsonb,
  
  -- Requirements
  essential_experience TEXT,
  desirable_experience TEXT,
  essential_education TEXT,
  desirable_education TEXT,
  language_requirements JSONB DEFAULT '{"english": "Expert knowledge is required"}'::jsonb,
  
  -- Approval workflow
  finance_controller_approval BOOLEAN DEFAULT false,
  finance_controller_approved_by UUID,
  finance_controller_approved_at TIMESTAMP WITH TIME ZONE,
  
  chief_of_division_approval BOOLEAN DEFAULT false,
  chief_of_division_approved_by UUID,
  chief_of_division_approved_at TIMESTAMP WITH TIME ZONE,
  
  deputy_director_approval BOOLEAN DEFAULT false,
  deputy_director_approved_by UUID,
  deputy_director_approved_at TIMESTAMP WITH TIME ZONE,
  
  director_approval BOOLEAN DEFAULT false,
  director_approved_by UUID,
  director_approved_at TIMESTAMP WITH TIME ZONE,
  
  -- Generated outputs
  pdf_url TEXT,
  converted_to_job_id UUID,
  
  -- Comments and feedback
  comments JSONB DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Staff can view requisitions" 
ON public.job_requisitions 
FOR SELECT 
USING (has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role) OR has_role(auth.uid(), 'Hiring Manager'::user_role));

CREATE POLICY "Hiring managers can create requisitions" 
ON public.job_requisitions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'Hiring Manager'::user_role) OR has_role(auth.uid(), 'Admin'::user_role));

CREATE POLICY "Creators and approvers can update" 
ON public.job_requisitions 
FOR UPDATE 
USING (created_by = auth.uid() OR has_role(auth.uid(), 'Admin'::user_role) OR has_role(auth.uid(), 'HR Assistant'::user_role));

-- Create trigger for updated_at
CREATE TRIGGER update_job_requisitions_updated_at
BEFORE UPDATE ON public.job_requisitions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create reference number generation function
CREATE OR REPLACE FUNCTION public.generate_requisition_reference()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  year_month TEXT;
  sequence_num INTEGER;
  reference TEXT;
BEGIN
  year_month := to_char(now(), 'YYMM');
  
  -- Get next sequence number for this year/month
  SELECT COALESCE(MAX(CAST(split_part(reference_number, '-', 2) AS INTEGER)), 0) + 1
  INTO sequence_num
  FROM public.job_requisitions
  WHERE reference_number LIKE 'REQ-' || year_month || '-%';
  
  reference := 'REQ-' || year_month || '-' || LPAD(sequence_num::TEXT, 3, '0');
  
  RETURN reference;
END;
$$;