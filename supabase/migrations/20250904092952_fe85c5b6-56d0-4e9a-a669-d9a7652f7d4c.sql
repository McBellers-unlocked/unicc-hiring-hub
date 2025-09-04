-- Create video assignments for existing Pre-Recorded Video applications with proper tokens
INSERT INTO public.video_assignments (application_id, question_set_id, status, token)
VALUES 
  ('a2154d72-11c8-4db2-9172-b3ad8e307d1c', '2d8f4881-8078-4bbc-8c3a-16b35143fa96', 'NotStarted', encode(gen_random_bytes(32), 'hex')),
  ('e9991323-ae4a-4618-af6d-437e47b15cf8', '2d8f4881-8078-4bbc-8c3a-16b35143fa96', 'NotStarted', encode(gen_random_bytes(32), 'hex')),
  ('4f46836f-ea98-448f-b2f4-298b556064b9', '2d8f4881-8078-4bbc-8c3a-16b35143fa96', 'NotStarted', encode(gen_random_bytes(32), 'hex')),
  ('132ea767-dba1-493b-abd3-bfff7112f969', '2d8f4881-8078-4bbc-8c3a-16b35143fa96', 'NotStarted', encode(gen_random_bytes(32), 'hex')),
  ('954b492a-241e-44b7-a066-6c66f154a6d9', '2d8f4881-8078-4bbc-8c3a-16b35143fa96', 'NotStarted', encode(gen_random_bytes(32), 'hex'));