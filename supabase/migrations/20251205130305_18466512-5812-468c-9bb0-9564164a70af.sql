
-- Step 1: Delete ALL existing skill_assessments for the 8 MSHT users
DELETE FROM skill_assessments 
WHERE user_id IN (
  '59b58e40-7121-4ab0-ab10-b2ea91050354', -- Amalia STEIN
  'da6f4a98-9a57-4138-beb8-7cdb5117db6e', -- Anna NEGYESI-MOUYSSET
  'e3af727b-4495-4e5e-92f4-acee43552716', -- Benedicte Solange JACQUIER
  '0020c65e-a2e0-4dac-a464-62a33f0477e0', -- Diego ARISTA VINAIXA
  '33e5f870-1c15-4e89-9916-03600f7d9a91', -- Esther HERRERO CANTERO
  'b4edd35e-76e6-4881-8b02-3de7fa285891', -- Lucia del Pilar RODENAS ZULETA
  'f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', -- Maria Isabel GUARDENO EXPOSITO
  'e2eb8ef6-af42-4979-b48f-02035afce184'  -- Matthew VALENTE
);

-- Step 2: Delete incorrect skill definitions
DELETE FROM skill_definitions WHERE name = 'Coaching and Mentoring';
DELETE FROM skill_definitions WHERE name = 'Digital Skills';

-- Step 3: Re-import the 26 AG5 skills data for all 8 MSHT team members
-- Data extracted from AG5 PDF: achieved (self_assessment) and required (required_level)

-- Amalia STEIN (59b58e40-7121-4ab0-ab10-b2ea91050354)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('59b58e40-7121-4ab0-ab10-b2ea91050354', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 3, 'approved'), -- Career Management
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'e4fca444-8b45-4733-a9de-032e25e61823', 3, 3, 'approved'), -- Coaching
('59b58e40-7121-4ab0-ab10-b2ea91050354', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('59b58e40-7121-4ab0-ab10-b2ea91050354', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 4, 'approved'), -- Communication
('59b58e40-7121-4ab0-ab10-b2ea91050354', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 3, 3, 'approved'), -- Continuous Improvement
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 3, 3, 'approved'), -- Creating An Empowering...
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('59b58e40-7121-4ab0-ab10-b2ea91050354', '888a26a6-b096-4c0c-8794-1e64b865a670', 3, 4, 'approved'), -- Customer Service
('59b58e40-7121-4ab0-ab10-b2ea91050354', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 3, 3, 'approved'), -- Developing Others
('59b58e40-7121-4ab0-ab10-b2ea91050354', '203adad2-fe03-483f-9bca-963ab408456a', 2, 3, 'approved'), -- Digital and analytical
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('59b58e40-7121-4ab0-ab10-b2ea91050354', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('59b58e40-7121-4ab0-ab10-b2ea91050354', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 2, 2, 'approved'), -- Hr Analytics
('59b58e40-7121-4ab0-ab10-b2ea91050354', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 3, 'approved'), -- Hr Project Management
('59b58e40-7121-4ab0-ab10-b2ea91050354', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 3, 'approved'), -- Hr Transformation
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('59b58e40-7121-4ab0-ab10-b2ea91050354', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('59b58e40-7121-4ab0-ab10-b2ea91050354', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('59b58e40-7121-4ab0-ab10-b2ea91050354', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 2, 'approved'), -- Power Bi
('59b58e40-7121-4ab0-ab10-b2ea91050354', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('59b58e40-7121-4ab0-ab10-b2ea91050354', '2b566f17-8f46-4da7-8370-b183a4ab7241', 3, 4, 'approved'), -- Recruitment
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 3, 'approved'), -- Strategic Workforce Planning
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'e30099e8-70d1-4577-90a6-a4764e084433', 3, 3, 'approved'), -- Talent Management
('59b58e40-7121-4ab0-ab10-b2ea91050354', '38043601-2715-432d-b897-ed1d5ec16e2d', 3, 3, 'approved'), -- Talent Outreach
('59b58e40-7121-4ab0-ab10-b2ea91050354', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Anna NEGYESI-MOUYSSET (da6f4a98-9a57-4138-beb8-7cdb5117db6e)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 4, 4, 'approved'), -- Career Management
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'e4fca444-8b45-4733-a9de-032e25e61823', 4, 4, 'approved'), -- Coaching
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '3c559300-a97d-473b-a730-efee731f316c', 4, 4, 'approved'), -- Collaboration
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '1c6d988d-9742-4a98-ae75-816461a20fac', 4, 5, 'approved'), -- Communication
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 4, 4, 'approved'), -- Continuous Improvement
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 4, 4, 'approved'), -- Creating An Empowering...
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 4, 4, 'approved'), -- Critical Thinking
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '888a26a6-b096-4c0c-8794-1e64b865a670', 4, 4, 'approved'), -- Customer Service
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 4, 4, 'approved'), -- Developing Others
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '203adad2-fe03-483f-9bca-963ab408456a', 3, 4, 'approved'), -- Digital and analytical
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'abbc92b2-becc-470b-802d-a8974f15daff', 4, 4, 'approved'), -- Diversity and Inclusion
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 4, 4, 'approved'), -- Emotional Intelligence
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 3, 3, 'approved'), -- Hr Analytics
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '34ec9686-916b-491e-86da-ee582ed51aff', 4, 4, 'approved'), -- Hr Project Management
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 4, 4, 'approved'), -- Hr Transformation
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 4, 4, 'approved'), -- Inclusivity
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 4, 4, 'approved'), -- Learning And Development
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 4, 4, 'approved'), -- Moving Forward...
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 4, 5, 'approved'), -- Organizational Awareness
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 3, 'approved'), -- Power Bi
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 4, 4, 'approved'), -- Problem Solving
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '2b566f17-8f46-4da7-8370-b183a4ab7241', 4, 4, 'approved'), -- Recruitment
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 4, 4, 'approved'), -- Strategic Workforce Planning
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'e30099e8-70d1-4577-90a6-a4764e084433', 4, 4, 'approved'), -- Talent Management
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', '38043601-2715-432d-b897-ed1d5ec16e2d', 4, 4, 'approved'), -- Talent Outreach
('da6f4a98-9a57-4138-beb8-7cdb5117db6e', 'baff9306-ec0f-4d25-b693-16430326c75f', 4, 4, 'approved'); -- Teamwork

-- Benedicte Solange JACQUIER (e3af727b-4495-4e5e-92f4-acee43552716)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('e3af727b-4495-4e5e-92f4-acee43552716', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 2, 'approved'), -- Career Management
('e3af727b-4495-4e5e-92f4-acee43552716', 'e4fca444-8b45-4733-a9de-032e25e61823', 2, 2, 'approved'), -- Coaching
('e3af727b-4495-4e5e-92f4-acee43552716', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('e3af727b-4495-4e5e-92f4-acee43552716', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 3, 'approved'), -- Communication
('e3af727b-4495-4e5e-92f4-acee43552716', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 2, 3, 'approved'), -- Continuous Improvement
('e3af727b-4495-4e5e-92f4-acee43552716', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 2, 2, 'approved'), -- Creating An Empowering...
('e3af727b-4495-4e5e-92f4-acee43552716', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('e3af727b-4495-4e5e-92f4-acee43552716', '888a26a6-b096-4c0c-8794-1e64b865a670', 3, 3, 'approved'), -- Customer Service
('e3af727b-4495-4e5e-92f4-acee43552716', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 2, 2, 'approved'), -- Developing Others
('e3af727b-4495-4e5e-92f4-acee43552716', '203adad2-fe03-483f-9bca-963ab408456a', 2, 3, 'approved'), -- Digital and analytical
('e3af727b-4495-4e5e-92f4-acee43552716', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('e3af727b-4495-4e5e-92f4-acee43552716', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('e3af727b-4495-4e5e-92f4-acee43552716', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 1, 2, 'approved'), -- Hr Analytics
('e3af727b-4495-4e5e-92f4-acee43552716', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 2, 'approved'), -- Hr Project Management
('e3af727b-4495-4e5e-92f4-acee43552716', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 2, 'approved'), -- Hr Transformation
('e3af727b-4495-4e5e-92f4-acee43552716', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('e3af727b-4495-4e5e-92f4-acee43552716', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('e3af727b-4495-4e5e-92f4-acee43552716', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('e3af727b-4495-4e5e-92f4-acee43552716', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('e3af727b-4495-4e5e-92f4-acee43552716', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 2, 'approved'), -- Power Bi
('e3af727b-4495-4e5e-92f4-acee43552716', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('e3af727b-4495-4e5e-92f4-acee43552716', '2b566f17-8f46-4da7-8370-b183a4ab7241', 3, 3, 'approved'), -- Recruitment
('e3af727b-4495-4e5e-92f4-acee43552716', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 2, 'approved'), -- Strategic Workforce Planning
('e3af727b-4495-4e5e-92f4-acee43552716', 'e30099e8-70d1-4577-90a6-a4764e084433', 2, 2, 'approved'), -- Talent Management
('e3af727b-4495-4e5e-92f4-acee43552716', '38043601-2715-432d-b897-ed1d5ec16e2d', 2, 3, 'approved'), -- Talent Outreach
('e3af727b-4495-4e5e-92f4-acee43552716', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Diego ARISTA VINAIXA (0020c65e-a2e0-4dac-a464-62a33f0477e0)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 2, 'approved'), -- Career Management
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'e4fca444-8b45-4733-a9de-032e25e61823', 2, 2, 'approved'), -- Coaching
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 3, 'approved'), -- Communication
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 2, 3, 'approved'), -- Continuous Improvement
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 2, 2, 'approved'), -- Creating An Empowering...
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '888a26a6-b096-4c0c-8794-1e64b865a670', 3, 4, 'approved'), -- Customer Service
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 2, 2, 'approved'), -- Developing Others
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '203adad2-fe03-483f-9bca-963ab408456a', 3, 3, 'approved'), -- Digital and analytical
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 2, 2, 'approved'), -- Hr Analytics
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 2, 'approved'), -- Hr Project Management
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 2, 'approved'), -- Hr Transformation
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 3, 3, 'approved'), -- Power Bi
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '2b566f17-8f46-4da7-8370-b183a4ab7241', 4, 4, 'approved'), -- Recruitment
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 2, 'approved'), -- Strategic Workforce Planning
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'e30099e8-70d1-4577-90a6-a4764e084433', 2, 2, 'approved'), -- Talent Management
('0020c65e-a2e0-4dac-a464-62a33f0477e0', '38043601-2715-432d-b897-ed1d5ec16e2d', 3, 3, 'approved'), -- Talent Outreach
('0020c65e-a2e0-4dac-a464-62a33f0477e0', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Esther HERRERO CANTERO (33e5f870-1c15-4e89-9916-03600f7d9a91)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('33e5f870-1c15-4e89-9916-03600f7d9a91', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 2, 'approved'), -- Career Management
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'e4fca444-8b45-4733-a9de-032e25e61823', 2, 2, 'approved'), -- Coaching
('33e5f870-1c15-4e89-9916-03600f7d9a91', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('33e5f870-1c15-4e89-9916-03600f7d9a91', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 3, 'approved'), -- Communication
('33e5f870-1c15-4e89-9916-03600f7d9a91', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 3, 3, 'approved'), -- Continuous Improvement
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 2, 2, 'approved'), -- Creating An Empowering...
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('33e5f870-1c15-4e89-9916-03600f7d9a91', '888a26a6-b096-4c0c-8794-1e64b865a670', 4, 4, 'approved'), -- Customer Service
('33e5f870-1c15-4e89-9916-03600f7d9a91', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 2, 2, 'approved'), -- Developing Others
('33e5f870-1c15-4e89-9916-03600f7d9a91', '203adad2-fe03-483f-9bca-963ab408456a', 3, 3, 'approved'), -- Digital and analytical
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('33e5f870-1c15-4e89-9916-03600f7d9a91', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('33e5f870-1c15-4e89-9916-03600f7d9a91', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 2, 2, 'approved'), -- Hr Analytics
('33e5f870-1c15-4e89-9916-03600f7d9a91', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 2, 'approved'), -- Hr Project Management
('33e5f870-1c15-4e89-9916-03600f7d9a91', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 2, 'approved'), -- Hr Transformation
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('33e5f870-1c15-4e89-9916-03600f7d9a91', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('33e5f870-1c15-4e89-9916-03600f7d9a91', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('33e5f870-1c15-4e89-9916-03600f7d9a91', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 3, 3, 'approved'), -- Power Bi
('33e5f870-1c15-4e89-9916-03600f7d9a91', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('33e5f870-1c15-4e89-9916-03600f7d9a91', '2b566f17-8f46-4da7-8370-b183a4ab7241', 4, 4, 'approved'), -- Recruitment
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 2, 'approved'), -- Strategic Workforce Planning
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'e30099e8-70d1-4577-90a6-a4764e084433', 2, 2, 'approved'), -- Talent Management
('33e5f870-1c15-4e89-9916-03600f7d9a91', '38043601-2715-432d-b897-ed1d5ec16e2d', 3, 3, 'approved'), -- Talent Outreach
('33e5f870-1c15-4e89-9916-03600f7d9a91', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Lucia del Pilar RODENAS ZULETA (b4edd35e-76e6-4881-8b02-3de7fa285891)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('b4edd35e-76e6-4881-8b02-3de7fa285891', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 3, 3, 'approved'), -- Career Management
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'e4fca444-8b45-4733-a9de-032e25e61823', 3, 3, 'approved'), -- Coaching
('b4edd35e-76e6-4881-8b02-3de7fa285891', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('b4edd35e-76e6-4881-8b02-3de7fa285891', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 4, 'approved'), -- Communication
('b4edd35e-76e6-4881-8b02-3de7fa285891', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 3, 3, 'approved'), -- Continuous Improvement
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 3, 3, 'approved'), -- Creating An Empowering...
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('b4edd35e-76e6-4881-8b02-3de7fa285891', '888a26a6-b096-4c0c-8794-1e64b865a670', 3, 4, 'approved'), -- Customer Service
('b4edd35e-76e6-4881-8b02-3de7fa285891', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 3, 3, 'approved'), -- Developing Others
('b4edd35e-76e6-4881-8b02-3de7fa285891', '203adad2-fe03-483f-9bca-963ab408456a', 3, 3, 'approved'), -- Digital and analytical
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('b4edd35e-76e6-4881-8b02-3de7fa285891', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('b4edd35e-76e6-4881-8b02-3de7fa285891', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 2, 2, 'approved'), -- Hr Analytics
('b4edd35e-76e6-4881-8b02-3de7fa285891', '34ec9686-916b-491e-86da-ee582ed51aff', 3, 3, 'approved'), -- Hr Project Management
('b4edd35e-76e6-4881-8b02-3de7fa285891', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 3, 3, 'approved'), -- Hr Transformation
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('b4edd35e-76e6-4881-8b02-3de7fa285891', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('b4edd35e-76e6-4881-8b02-3de7fa285891', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 4, 'approved'), -- Organizational Awareness
('b4edd35e-76e6-4881-8b02-3de7fa285891', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 2, 'approved'), -- Power Bi
('b4edd35e-76e6-4881-8b02-3de7fa285891', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('b4edd35e-76e6-4881-8b02-3de7fa285891', '2b566f17-8f46-4da7-8370-b183a4ab7241', 4, 4, 'approved'), -- Recruitment
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 3, 3, 'approved'), -- Strategic Workforce Planning
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'e30099e8-70d1-4577-90a6-a4764e084433', 3, 3, 'approved'), -- Talent Management
('b4edd35e-76e6-4881-8b02-3de7fa285891', '38043601-2715-432d-b897-ed1d5ec16e2d', 3, 4, 'approved'), -- Talent Outreach
('b4edd35e-76e6-4881-8b02-3de7fa285891', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Maria Isabel GUARDENO EXPOSITO (f63849d5-97ad-4931-8d0f-aaf6e68e6ba6)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 3, 'approved'), -- Career Management
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'e4fca444-8b45-4733-a9de-032e25e61823', 3, 3, 'approved'), -- Coaching
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 4, 'approved'), -- Communication
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 3, 3, 'approved'), -- Continuous Improvement
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 3, 3, 'approved'), -- Creating An Empowering...
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '888a26a6-b096-4c0c-8794-1e64b865a670', 4, 4, 'approved'), -- Customer Service
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 3, 3, 'approved'), -- Developing Others
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '203adad2-fe03-483f-9bca-963ab408456a', 2, 3, 'approved'), -- Digital and analytical
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 2, 2, 'approved'), -- Hr Analytics
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 3, 'approved'), -- Hr Project Management
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 3, 'approved'), -- Hr Transformation
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 3, 3, 'approved'), -- Learning And Development
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 2, 'approved'), -- Power Bi
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '2b566f17-8f46-4da7-8370-b183a4ab7241', 4, 4, 'approved'), -- Recruitment
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 3, 'approved'), -- Strategic Workforce Planning
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'e30099e8-70d1-4577-90a6-a4764e084433', 3, 3, 'approved'), -- Talent Management
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', '38043601-2715-432d-b897-ed1d5ec16e2d', 3, 3, 'approved'), -- Talent Outreach
('f63849d5-97ad-4931-8d0f-aaf6e68e6ba6', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork

-- Matthew VALENTE (e2eb8ef6-af42-4979-b48f-02035afce184)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, status) VALUES
('e2eb8ef6-af42-4979-b48f-02035afce184', '0c825ecb-75c1-41ca-a055-f3b7efe4de2b', 2, 3, 'approved'), -- Career Management
('e2eb8ef6-af42-4979-b48f-02035afce184', 'e4fca444-8b45-4733-a9de-032e25e61823', 2, 3, 'approved'), -- Coaching
('e2eb8ef6-af42-4979-b48f-02035afce184', '3c559300-a97d-473b-a730-efee731f316c', 3, 3, 'approved'), -- Collaboration
('e2eb8ef6-af42-4979-b48f-02035afce184', '1c6d988d-9742-4a98-ae75-816461a20fac', 3, 4, 'approved'), -- Communication
('e2eb8ef6-af42-4979-b48f-02035afce184', '2add4c79-5cba-4b5f-a63d-8a134cec7bf1', 2, 3, 'approved'), -- Continuous Improvement
('e2eb8ef6-af42-4979-b48f-02035afce184', 'b0581992-cfd9-42af-bde8-2c062a5200b3', 2, 3, 'approved'), -- Creating An Empowering...
('e2eb8ef6-af42-4979-b48f-02035afce184', 'f2f81093-6dc7-4b92-b075-bec9dac5642f', 3, 3, 'approved'), -- Critical Thinking
('e2eb8ef6-af42-4979-b48f-02035afce184', '888a26a6-b096-4c0c-8794-1e64b865a670', 3, 4, 'approved'), -- Customer Service
('e2eb8ef6-af42-4979-b48f-02035afce184', '13194c49-0161-4bf1-a20d-7f917b64c8c4', 2, 3, 'approved'), -- Developing Others
('e2eb8ef6-af42-4979-b48f-02035afce184', '203adad2-fe03-483f-9bca-963ab408456a', 2, 3, 'approved'), -- Digital and analytical
('e2eb8ef6-af42-4979-b48f-02035afce184', 'abbc92b2-becc-470b-802d-a8974f15daff', 3, 3, 'approved'), -- Diversity and Inclusion
('e2eb8ef6-af42-4979-b48f-02035afce184', '71ed3340-8ca9-4d7f-ab8a-2e1df3a85bdf', 3, 3, 'approved'), -- Emotional Intelligence
('e2eb8ef6-af42-4979-b48f-02035afce184', '4cc542dd-90d5-4b11-89ba-236dd6cbad27', 1, 2, 'approved'), -- Hr Analytics
('e2eb8ef6-af42-4979-b48f-02035afce184', '34ec9686-916b-491e-86da-ee582ed51aff', 2, 3, 'approved'), -- Hr Project Management
('e2eb8ef6-af42-4979-b48f-02035afce184', '6e95b17a-b6a1-4fb9-8931-a9cd8c75f40b', 2, 3, 'approved'), -- Hr Transformation
('e2eb8ef6-af42-4979-b48f-02035afce184', 'eaede218-64ed-48b4-bfa0-54aef45b99d2', 3, 3, 'approved'), -- Inclusivity
('e2eb8ef6-af42-4979-b48f-02035afce184', 'b1ec51c3-0a47-4472-9141-29bda0d76b1a', 2, 3, 'approved'), -- Learning And Development
('e2eb8ef6-af42-4979-b48f-02035afce184', '0c259f28-cc0b-44a5-b80f-e36ace4b2e93', 3, 3, 'approved'), -- Moving Forward...
('e2eb8ef6-af42-4979-b48f-02035afce184', '62cb9e2a-6bf0-4da5-8d27-e3c41f45f3b5', 3, 3, 'approved'), -- Organizational Awareness
('e2eb8ef6-af42-4979-b48f-02035afce184', '95c6f4ae-2f4b-429b-97cb-a7acacc0f10a', 2, 2, 'approved'), -- Power Bi
('e2eb8ef6-af42-4979-b48f-02035afce184', '95c4bf36-67e4-4772-ab36-c32694a0a97a', 3, 3, 'approved'), -- Problem Solving
('e2eb8ef6-af42-4979-b48f-02035afce184', '2b566f17-8f46-4da7-8370-b183a4ab7241', 3, 4, 'approved'), -- Recruitment
('e2eb8ef6-af42-4979-b48f-02035afce184', 'b70e4a2a-cd13-4f20-a02c-6db12c76e351', 2, 3, 'approved'), -- Strategic Workforce Planning
('e2eb8ef6-af42-4979-b48f-02035afce184', 'e30099e8-70d1-4577-90a6-a4764e084433', 2, 3, 'approved'), -- Talent Management
('e2eb8ef6-af42-4979-b48f-02035afce184', '38043601-2715-432d-b897-ed1d5ec16e2d', 2, 3, 'approved'), -- Talent Outreach
('e2eb8ef6-af42-4979-b48f-02035afce184', 'baff9306-ec0f-4d25-b693-16430326c75f', 3, 3, 'approved'); -- Teamwork
