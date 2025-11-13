-- Add foreign key from panel_interview_participants to panel_interviews
ALTER TABLE public.panel_interview_participants 
ADD CONSTRAINT panel_interview_participants_panel_interview_id_fkey 
FOREIGN KEY (panel_interview_id) 
REFERENCES public.panel_interviews(id) 
ON DELETE CASCADE;

-- Add foreign key from panel_interview_participants to users (only if panelist_id is not null)
-- First, we need to check if this constraint already exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'panel_interview_participants_panelist_id_fkey'
        AND table_name = 'panel_interview_participants'
    ) THEN
        ALTER TABLE public.panel_interview_participants 
        ADD CONSTRAINT panel_interview_participants_panelist_id_fkey 
        FOREIGN KEY (panelist_id) 
        REFERENCES public.users(id) 
        ON DELETE CASCADE;
    END IF;
END $$;