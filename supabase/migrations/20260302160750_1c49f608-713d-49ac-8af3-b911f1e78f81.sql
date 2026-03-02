
-- 1. Update Anna AISENBREY's skills
UPDATE users SET skills = '["Career Management", "Coaching", "Collaboration", "Communication", "Continuous improvement", "Critical Thinking", "Customer Service", "Developing Others", "Diversity And Inclusion", "Emotional Intelligence", "Hr Analytics", "Hr Project Management", "Hr Transformation", "Learning And Development", "Organizational Awareness", "Problem Solving", "Recruitment", "Strategic Workforce Planning", "Talent Management", "Teamwork"]'::jsonb
WHERE id = 'bfa43acb-4d6d-487b-a767-eab2ed2cb7bf';

-- 2. Update Raffaella COPPOLA's skills
UPDATE users SET skills = '["Career Management", "Coaching", "Collaboration", "Communication", "Continuous improvement", "Critical Thinking", "Customer Service", "Developing Others", "Digital and analytical skills", "Diversity And Inclusion", "Emotional Intelligence", "Hr Analytics", "Hr Project Management", "Inclusivity", "Learning And Development", "Moving Forward In A Changing Environment", "Organizational Awareness", "Problem Solving", "Recruitment", "Teamwork"]'::jsonb
WHERE id = 'ece221ec-0566-4666-a798-a33cfa39d1a2';

-- 3. Insert assessments for Anna AISENBREY
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, manager_assessment, required_level, status, scope) VALUES
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 5, 5, 3, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'e4fca444-8b45-4733-a9de-032e25e61823', 5, 5, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '3c559300-a97d-473b-a730-efee731f316c', 5, 5, 3, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '1c6d988d-9742-4a98-ae75-816461a20fac', 4, 5, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 5, 5, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '888a26a6-b096-4c0c-8794-1e64b865a670', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'abbc92b2-becc-470b-802d-a8974f15daff', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 4, 4, 5, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '34ec9686-916b-491e-86da-ee582ed51aff', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 3, 3, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 4, 5, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', '2b566f17-8f46-4da7-8370-b183a4ab7241', 3, 3, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 2, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'e30099e8-70d1-4577-90a6-a4764e084433', 4, 4, 4, 'approved', 'team'),
('bfa43acb-4d6d-487b-a767-eab2ed2cb7bf', 'baff9306-ec0f-4d25-b693-16430326c75f', 5, 5, 4, 'approved', 'team');

-- 4. Insert assessments for Raffaella COPPOLA
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, manager_assessment, required_level, status, scope) VALUES
('ece221ec-0566-4666-a798-a33cfa39d1a2', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 3, 3, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'e4fca444-8b45-4733-a9de-032e25e61823', 4, 5, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '1c6d988d-9742-4a98-ae75-816461a20fac', 4, 4, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 3, 2, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 4, 4, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '888a26a6-b096-4c0c-8794-1e64b865a670', 2, 2, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 3, 3, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '203adad2-fe03-483f-9bca-963ab408456a', 3, 3, 2, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'abbc92b2-becc-470b-802d-a8974f15daff', 4, 4, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 2, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 3, 3, 5, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '34ec9686-916b-491e-86da-ee582ed51aff', 4, 4, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 4, 5, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 4, 4, 2, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 4, 5, 4, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', '2b566f17-8f46-4da7-8370-b183a4ab7241', 5, 5, 3, 'approved', 'team'),
('ece221ec-0566-4666-a798-a33cfa39d1a2', 'baff9306-ec0f-4d25-b693-16430326c75f', 4, 4, 4, 'approved', 'team');

-- 5. Insert additional assessments for Frederic LAVAL (exclude existing: ded0ade5)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, manager_assessment, required_level, status, scope) VALUES
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '3c559300-a97d-473b-a730-efee731f316c', 5, 5, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '1c6d988d-9742-4a98-ae75-816461a20fac', 5, 5, 3, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '24c97a64-acb1-4daf-aba6-38b9c6a83e99', 5, 5, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '5f5450f5-1e8d-4652-86d8-28f95f45ded2', 4, 5, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 5, 5, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'e4fca444-8b45-4733-a9de-032e25e61823', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'abbc92b2-becc-470b-802d-a8974f15daff', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 5, 5, 5, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 3, 3, 5, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'baff9306-ec0f-4d25-b693-16430326c75f', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 3, 3, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '34ec9686-916b-491e-86da-ee582ed51aff', 4, 4, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', '2b566f17-8f46-4da7-8370-b183a4ab7241', 3, 3, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 3, 2, 4, 'approved', 'team'),
('e274ffe9-be04-4b46-9cf4-d4cec50daeb6', 'e30099e8-70d1-4577-90a6-a4764e084433', 4, 4, 4, 'approved', 'team');

-- 6. Insert additional assessments for Olga LEHTINEN (exclude existing: e4fca444, f2f81093, 13194c49, 0c825ecb, b0581992)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, manager_assessment, required_level, status, scope) VALUES
('f3d7df97-0c46-49c8-9a62-47df8816388d', '3c559300-a97d-473b-a730-efee731f316c', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '1c6d988d-9742-4a98-ae75-816461a20fac', 5, 5, 3, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '888a26a6-b096-4c0c-8794-1e64b865a670', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 3, 2, 5, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '34ec9686-916b-491e-86da-ee582ed51aff', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 2, 2, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 4, 4, 4, 'approved', 'team'),
('f3d7df97-0c46-49c8-9a62-47df8816388d', 'baff9306-ec0f-4d25-b693-16430326c75f', 5, 5, 4, 'approved', 'team');

-- 7-16. Add manager_assessment to all existing assessments missing it
-- Anna NEGYESI-MOUYSSET (strong)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'da6f4a98-9a57-4138-beb8-7cdb5117db6e' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 8 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 17 THEN r.required_level
  WHEN r.rn <= 23 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Diego (developing)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = '0020c65e-a2e0-4dac-a464-62a33f0477e0' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 6 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 13 THEN r.required_level
  WHEN r.rn <= 21 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Esther (balanced)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = '33e5f870-1c15-4e89-9916-03600f7d9a91' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 8 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 16 THEN r.required_level
  WHEN r.rn <= 23 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Amalia (strong+)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = '59b58e40-7121-4ab0-ab10-b2ea91050354' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 10 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 20 THEN r.required_level
  WHEN r.rn <= 24 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Lucia (developing)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'b4edd35e-76e6-4881-8b02-3de7fa285891' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 4 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 12 THEN r.required_level
  WHEN r.rn <= 21 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Matthew (mixed)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'e2eb8ef6-af42-4979-b48f-02035afce184' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 8 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 17 THEN r.required_level
  WHEN r.rn <= 24 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Benedicte (strong)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'e3af727b-4495-4e5e-92f4-acee43552716' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 10 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 19 THEN r.required_level
  WHEN r.rn <= 24 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Isabel (developing)
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'f63849d5-97ad-4931-8d0f-aaf6e68e6ba6' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 5 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 12 THEN r.required_level
  WHEN r.rn <= 20 THEN GREATEST(r.required_level - 1, 1)
  ELSE GREATEST(r.required_level - 2, 1)
END FROM ranked r WHERE sa.id = r.id;

-- Frederic's existing assessment
UPDATE skill_assessments SET manager_assessment = 4 
WHERE user_id = 'e274ffe9-be04-4b46-9cf4-d4cec50daeb6' AND scope = 'team' AND manager_assessment IS NULL;

-- Olga's existing 5 assessments
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY skill_id) as rn, required_level
  FROM skill_assessments WHERE user_id = 'f3d7df97-0c46-49c8-9a62-47df8816388d' AND scope = 'team' AND manager_assessment IS NULL
)
UPDATE skill_assessments sa SET manager_assessment = CASE
  WHEN r.rn <= 2 THEN LEAST(r.required_level + 1, 5)
  WHEN r.rn <= 3 THEN r.required_level
  ELSE GREATEST(r.required_level - 1, 1)
END FROM ranked r WHERE sa.id = r.id;
