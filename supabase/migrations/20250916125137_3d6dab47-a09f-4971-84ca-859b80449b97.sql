-- Add status workflow and missing fields for job requisitions approval process
ALTER TABLE public.job_requisitions 
ADD COLUMN IF NOT EXISTS hr_reviewed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hr_reviewed_by uuid,
ADD COLUMN IF NOT EXISTS hr_reviewed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS hr_comments text,
ADD COLUMN IF NOT EXISTS hiring_manager_confirmed_hr_changes boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS hiring_manager_confirmed_at timestamp with time zone;

-- Update status enum to include workflow stages
DO $$ 
BEGIN
    -- Check if the status column is text type (which it should be)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'job_requisitions' 
        AND column_name = 'status' 
        AND data_type = 'text'
    ) THEN
        -- Add check constraint for valid status values
        ALTER TABLE public.job_requisitions 
        DROP CONSTRAINT IF EXISTS job_requisitions_status_check;
        
        ALTER TABLE public.job_requisitions 
        ADD CONSTRAINT job_requisitions_status_check 
        CHECK (status IN (
            'draft', 
            'submitted', 
            'hr_review', 
            'hr_amendments', 
            'hiring_manager_review', 
            'chief_division_review', 
            'director_review', 
            'approved', 
            'rejected'
        ));
    END IF;
END $$;