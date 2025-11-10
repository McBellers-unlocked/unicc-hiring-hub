
-- Clean up all foreign key references for negyesi@unicc.org before deletion
-- User ID: a82a2516-e702-485b-a91d-005b6eed999f

-- Nullify stage_events references
UPDATE public.stage_events 
SET by_user = NULL 
WHERE by_user = 'a82a2516-e702-485b-a91d-005b6eed999f';

-- Nullify audit_logs references (preserve audit trail)
UPDATE public.audit_logs 
SET actor_id = NULL 
WHERE actor_id = 'a82a2516-e702-485b-a91d-005b6eed999f';

-- Delete from users table
DELETE FROM public.users 
WHERE email = 'negyesi@unicc.org';
