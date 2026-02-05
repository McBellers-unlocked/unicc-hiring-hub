-- Create HR Appointments table for tracking onboarding workflow
CREATE TABLE public.hr_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Person identification (may not be in users table yet)
  email TEXT,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  
  -- Operation tracking
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'Appointment', 'Appointment (CB)', 'Direct Appointment'
  )),
  status TEXT DEFAULT 'In progress' CHECK (status IN (
    'In progress', 'Completed', 'On hold', 'Cancelled'
  )),
  
  -- Dates
  tentative_date DATE,
  effective_date DATE,
  
  -- Position details
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  section_unit TEXT,
  supervisor TEXT,
  old_po TEXT,
  new_po TEXT,
  vacancy_reference TEXT,
  
  -- HR tracking
  main_hr_focal_point TEXT,
  recruitment_type TEXT DEFAULT 'Newcomer',
  is_international BOOLEAN DEFAULT FALSE,
  notice_days_required INTEGER DEFAULT 30,
  
  -- Notes & comments
  comments TEXT,
  onboarding_comments TEXT,
  actions_in_hr_plan TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.hr_appointments ENABLE ROW LEVEL SECURITY;

-- Policy for HR access (Admin, HR Assistant, Chief of HR can manage all appointments)
CREATE POLICY "HR users can manage appointments" ON public.hr_appointments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Admin', 'HR Assistant', 'Chief of HR')
    )
  );

-- Index for email lookups
CREATE INDEX idx_hr_appointments_email ON public.hr_appointments(email);

-- Index for status filtering
CREATE INDEX idx_hr_appointments_status ON public.hr_appointments(status);

-- Index for tentative date sorting
CREATE INDEX idx_hr_appointments_tentative_date ON public.hr_appointments(tentative_date);

-- Trigger for updated_at
CREATE TRIGGER update_hr_appointments_updated_at
  BEFORE UPDATE ON public.hr_appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();