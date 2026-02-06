-- Create hr_stdas table for tracking Short-Term Duty Assignments
CREATE TABLE public.hr_stdas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Staff identification (linked to users table)
  user_id UUID REFERENCES public.users(id),
  staff_number TEXT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT,
  
  -- STDA details
  operation_type TEXT NOT NULL DEFAULT 'STDA', -- STDA, OIC, Reassignment
  status TEXT DEFAULT 'Not started',
  
  -- Position details (new role)
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  section_unit TEXT,
  supervisor TEXT,
  supervisor_staff_number TEXT,
  
  -- Position references
  old_pd TEXT,
  new_pd TEXT,
  vacancy_reference TEXT,
  
  -- Dates
  start_date DATE,
  end_date DATE,
  
  -- HR Management
  main_hr_focal_point TEXT,
  comments TEXT,
  actions_in_hr_plan TEXT,
  
  -- Original position backup (to restore after STDA ends)
  original_job_title TEXT,
  original_grade TEXT,
  original_unit TEXT,
  
  -- Linking to selection system
  source_requisition_id UUID REFERENCES public.job_requisitions(id),
  source_application_id UUID REFERENCES public.applications(id),
  
  -- Metadata
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add STDA tracking columns to users table
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS current_stda_id UUID REFERENCES public.hr_stdas(id),
  ADD COLUMN IF NOT EXISTS stda_job_title TEXT,
  ADD COLUMN IF NOT EXISTS stda_grade TEXT;

-- Create hr_stda_comments table for threaded comments
CREATE TABLE public.hr_stda_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stda_id UUID NOT NULL REFERENCES public.hr_stdas(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_hr_stdas_user_id ON public.hr_stdas(user_id);
CREATE INDEX idx_hr_stdas_status ON public.hr_stdas(status);
CREATE INDEX idx_hr_stdas_end_date ON public.hr_stdas(end_date);
CREATE INDEX idx_hr_stdas_operation_type ON public.hr_stdas(operation_type);
CREATE INDEX idx_hr_stda_comments_stda_id ON public.hr_stda_comments(stda_id);

-- Enable RLS
ALTER TABLE public.hr_stdas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_stda_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for hr_stdas
CREATE POLICY "Users with HR roles can view all STDAs" 
  ON public.hr_stdas 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Director', 'Hiring Manager', 'Chief of HR')
    )
  );

CREATE POLICY "Users with HR roles can insert STDAs" 
  ON public.hr_stdas 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

CREATE POLICY "Users with HR roles can update STDAs" 
  ON public.hr_stdas 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

CREATE POLICY "Users with HR roles can delete STDAs" 
  ON public.hr_stdas 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

-- RLS policies for hr_stda_comments
CREATE POLICY "Users with HR roles can view all STDA comments" 
  ON public.hr_stda_comments 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Director', 'Hiring Manager', 'Chief of HR')
    )
  );

CREATE POLICY "Users with HR roles can insert STDA comments" 
  ON public.hr_stda_comments 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Director', 'Hiring Manager')
    )
  );

-- Updated_at trigger for hr_stdas
CREATE TRIGGER update_hr_stdas_updated_at
  BEFORE UPDATE ON public.hr_stdas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();