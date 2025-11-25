-- Fix the existing video assignment that's stuck in InProgress
UPDATE video_assignments 
SET status = 'Completed', completed_at = NOW()
WHERE id = '025bbee5-1413-45ce-a26e-4f1f04383df2';