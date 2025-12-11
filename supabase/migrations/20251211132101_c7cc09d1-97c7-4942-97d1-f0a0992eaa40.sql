-- Create offer_determinations table for step calculation tracking
CREATE TABLE public.offer_determinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES public.jobs(id),
  
  -- Job requirements snapshot
  job_grade TEXT,
  essential_education_level TEXT,
  essential_experience_years INTEGER,
  essential_experience_text TEXT,
  
  -- Candidate qualifications snapshot
  candidate_highest_education TEXT,
  candidate_education_level TEXT,
  candidate_total_experience_years NUMERIC(4,1),
  candidate_relevant_experience_years NUMERIC(4,1),
  
  -- Step calculation breakdown
  base_step INTEGER DEFAULT 1,
  education_step INTEGER DEFAULT 0,
  education_step_justification TEXT,
  experience_steps INTEGER DEFAULT 0,
  experience_steps_justification TEXT,
  additional_years_counted NUMERIC(4,1) DEFAULT 0,
  
  -- Final determination
  calculated_step INTEGER NOT NULL,
  final_step INTEGER,
  override_justification TEXT,
  whed_verified BOOLEAN DEFAULT false,
  whed_verification_notes TEXT,
  
  -- Workflow
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected')),
  calculated_by UUID REFERENCES public.users(id),
  calculated_at TIMESTAMPTZ DEFAULT now(),
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(application_id)
);

-- Enable RLS
ALTER TABLE public.offer_determinations ENABLE ROW LEVEL SECURITY;

-- HR staff can view all offer determinations
CREATE POLICY "HR staff can view offer determinations"
ON public.offer_determinations FOR SELECT
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- HR staff can create offer determinations
CREATE POLICY "HR staff can create offer determinations"
ON public.offer_determinations FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- HR staff can update offer determinations
CREATE POLICY "HR staff can update offer determinations"
ON public.offer_determinations FOR UPDATE
USING (
  has_role(auth.uid(), 'Admin'::user_role) OR 
  has_role(auth.uid(), 'HR Assistant'::user_role) OR 
  has_role(auth.uid(), 'Chief of HR'::user_role)
);

-- Create index for faster lookups
CREATE INDEX idx_offer_determinations_application ON public.offer_determinations(application_id);
CREATE INDEX idx_offer_determinations_status ON public.offer_determinations(status);

-- Add trigger for updated_at
CREATE TRIGGER update_offer_determinations_updated_at
  BEFORE UPDATE ON public.offer_determinations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();