
-- Create hr_transfers table
CREATE TABLE public.hr_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  last_name TEXT NOT NULL,
  first_name TEXT NOT NULL,
  email TEXT,
  staff_number TEXT,
  operation_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Not started',
  start_date DATE,
  end_date DATE,
  job_title TEXT,
  grade TEXT,
  contract_type TEXT,
  duty_station TEXT,
  section_unit TEXT,
  supervisor TEXT,
  main_hr_focal_point TEXT,
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfers" ON public.hr_transfers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert transfers" ON public.hr_transfers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update transfers" ON public.hr_transfers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete transfers" ON public.hr_transfers FOR DELETE USING (auth.role() = 'authenticated');

CREATE TRIGGER update_hr_transfers_updated_at
  BEFORE UPDATE ON public.hr_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create hr_transfer_comments table
CREATE TABLE public.hr_transfer_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transfer_id UUID NOT NULL REFERENCES public.hr_transfers(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  author_id UUID REFERENCES public.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_transfer_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view transfer comments" ON public.hr_transfer_comments FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert transfer comments" ON public.hr_transfer_comments FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update transfer comments" ON public.hr_transfer_comments FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can delete transfer comments" ON public.hr_transfer_comments FOR DELETE USING (auth.role() = 'authenticated');
