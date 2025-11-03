-- Add foreign key constraint from job_requisitions.created_by to users.id
ALTER TABLE public.job_requisitions 
ADD CONSTRAINT job_requisitions_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES public.users(id) 
ON DELETE SET NULL;