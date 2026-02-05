-- Create hr_separations table
CREATE TABLE public.hr_separations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  email TEXT,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  operation_type TEXT NOT NULL DEFAULT 'Separation',
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'Not started',
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  pd_number TEXT,
  supervisor TEXT,
  section_unit TEXT,
  supervisor_staff_number TEXT,
  separation_type TEXT,
  event_type TEXT,
  tentative_date DATE,
  effective_date DATE,
  is_international BOOLEAN DEFAULT false,
  notice_days_required INTEGER DEFAULT 30,
  staff_number TEXT,
  main_hr_focal_point TEXT,
  comments TEXT,
  actions_in_hr_plan TEXT,
  clearance_status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create hr_separation_comments table
CREATE TABLE public.hr_separation_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  separation_id UUID NOT NULL REFERENCES public.hr_separations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES public.users(id),
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.hr_separations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hr_separation_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for hr_separations
CREATE POLICY "HR staff can view all separations"
  ON public.hr_separations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR staff can insert separations"
  ON public.hr_separations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

CREATE POLICY "HR staff can update separations"
  ON public.hr_separations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

CREATE POLICY "HR staff can delete separations"
  ON public.hr_separations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

-- Create RLS policies for hr_separation_comments
CREATE POLICY "HR staff can view all separation comments"
  ON public.hr_separation_comments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR staff can insert separation comments"
  ON public.hr_separation_comments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager', 'Director')
    )
  );

CREATE POLICY "HR staff can update their own separation comments"
  ON public.hr_separation_comments
  FOR UPDATE
  USING (author_id = auth.uid());

CREATE POLICY "HR staff can delete their own separation comments"
  ON public.hr_separation_comments
  FOR DELETE
  USING (author_id = auth.uid());

-- Create updated_at trigger for hr_separations
CREATE TRIGGER update_hr_separations_updated_at
  BEFORE UPDATE ON public.hr_separations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for hr_separation_comments
CREATE TRIGGER update_hr_separation_comments_updated_at
  BEFORE UPDATE ON public.hr_separation_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_hr_separations_status ON public.hr_separations(status);
CREATE INDEX idx_hr_separations_tentative_date ON public.hr_separations(tentative_date);
CREATE INDEX idx_hr_separations_operation_type ON public.hr_separations(operation_type);
CREATE INDEX idx_hr_separation_comments_separation_id ON public.hr_separation_comments(separation_id);