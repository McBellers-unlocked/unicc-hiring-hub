-- Complete database reset for fresh PHF import
-- Delete all data in correct order to respect foreign key constraints

-- 1. Delete video ratings (references video_answers)
DELETE FROM public.video_ratings;

-- 2. Delete video events (references video_assignments)
DELETE FROM public.video_events;

-- 3. Delete video answers (references applications)
DELETE FROM public.video_answers;

-- 4. Delete video assignments (references applications)
DELETE FROM public.video_assignments;

-- 5. Delete screening scores (references applications)
DELETE FROM public.screening_scores;

-- 6. Delete feedback form responses (references applications)
DELETE FROM public.feedback_form_responses;

-- 7. Delete panel interview participants (references panel_interviews)
DELETE FROM public.panel_interview_participants;

-- 8. Delete panel interviews (references applications)
DELETE FROM public.panel_interviews;

-- 9. Delete evaluations (references applications)
DELETE FROM public.evaluations;

-- 10. Delete stage events (references applications)
DELETE FROM public.stage_events;

-- 11. Delete applications (references candidates)
DELETE FROM public.applications;

-- 12. Delete candidates
DELETE FROM public.candidates;

-- Clear application-files storage bucket contents
DELETE FROM storage.objects WHERE bucket_id = 'application-files';

-- Verify clean state - these should all return 0
-- SELECT COUNT(*) as video_ratings_count FROM public.video_ratings;
-- SELECT COUNT(*) as video_events_count FROM public.video_events;
-- SELECT COUNT(*) as video_answers_count FROM public.video_answers;
-- SELECT COUNT(*) as video_assignments_count FROM public.video_assignments;
-- SELECT COUNT(*) as screening_scores_count FROM public.screening_scores;
-- SELECT COUNT(*) as feedback_responses_count FROM public.feedback_form_responses;
-- SELECT COUNT(*) as panel_participants_count FROM public.panel_interview_participants;
-- SELECT COUNT(*) as panel_interviews_count FROM public.panel_interviews;
-- SELECT COUNT(*) as evaluations_count FROM public.evaluations;
-- SELECT COUNT(*) as stage_events_count FROM public.stage_events;
-- SELECT COUNT(*) as applications_count FROM public.applications;
-- SELECT COUNT(*) as candidates_count FROM public.candidates;
-- SELECT COUNT(*) as storage_objects_count FROM storage.objects WHERE bucket_id = 'application-files';