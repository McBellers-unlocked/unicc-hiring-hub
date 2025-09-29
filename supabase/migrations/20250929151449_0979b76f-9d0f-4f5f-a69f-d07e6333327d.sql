-- Clean up Pablo Jose Rubio Balibrea's audit trail
-- Keep only the initial application submission, remove subsequent audit entries

-- Delete stage events for this application (all the back-and-forth movements)
DELETE FROM public.stage_events 
WHERE application_id = '745a82e9-af92-408c-92c4-6d32daa054d6';

-- Delete audit logs except the initial INSERT (application submission)
DELETE FROM public.audit_logs 
WHERE entity_id = '745a82e9-af92-408c-92c4-6d32daa054d6' 
  AND action != 'INSERT';

-- Ensure application is in Longlist status
UPDATE public.applications 
SET status = 'Longlist', 
    suggested_for_longlist = true,
    updated_at = now()
WHERE id = '745a82e9-af92-408c-92c4-6d32daa054d6';

-- Add a clean stage event: Application -> Longlist
INSERT INTO public.stage_events (application_id, from_stage, to_stage, reason, by_user)
VALUES ('745a82e9-af92-408c-92c4-6d32daa054d6', 'Application', 'Longlist', 'Moved to longlist', auth.uid());