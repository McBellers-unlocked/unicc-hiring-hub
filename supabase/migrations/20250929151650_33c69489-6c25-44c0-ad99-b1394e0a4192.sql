-- Move Pablo Jose Rubio Balibrea back to Application status
UPDATE public.applications 
SET status = 'Application', 
    suggested_for_longlist = false,
    updated_at = now()
WHERE id = '745a82e9-af92-408c-92c4-6d32daa054d6';

-- Add stage event: Longlist -> Application
INSERT INTO public.stage_events (application_id, from_stage, to_stage, reason, by_user)
VALUES ('745a82e9-af92-408c-92c4-6d32daa054d6', 'Longlist', 'Application', 'Moved back to application', auth.uid());