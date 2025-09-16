-- Fix security warning: Set search_path for functions
CREATE OR REPLACE FUNCTION public.generate_requisition_reference()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- Fix the other function security warning
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;