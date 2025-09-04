-- Make application-files bucket public so videos can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'application-files';

-- Create RLS policies for video access
CREATE POLICY "Public can view videos" ON storage.objects
FOR SELECT 
USING (bucket_id = 'application-files' AND (storage.foldername(name))[1] = 'videos');

CREATE POLICY "Authenticated users can upload videos" ON storage.objects
FOR INSERT 
WITH CHECK (bucket_id = 'application-files' AND (storage.foldername(name))[1] = 'videos');

-- Clean up the existing temp video records so users can record fresh ones
DELETE FROM video_answers WHERE url LIKE 'temp://%';