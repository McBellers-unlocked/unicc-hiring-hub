-- Add sent_at timestamps for each approval stage
ALTER TABLE public.job_requisitions 
ADD COLUMN hr_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN hiring_manager_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN chief_of_division_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN deputy_director_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN director_sent_at TIMESTAMP WITH TIME ZONE;