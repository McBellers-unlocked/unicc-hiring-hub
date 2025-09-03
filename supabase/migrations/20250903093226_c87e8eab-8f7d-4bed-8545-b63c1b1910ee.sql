-- Create Candidate A (meets all requirements)
INSERT INTO public.candidates (
  name, email, phone, location, linkedin_url, work_auth, languages
) VALUES (
  'Sarah Johnson',
  'sarah.johnson@email.com',
  '+1-212-555-0123',
  'New York, NY, USA',
  'https://linkedin.com/in/sarahjohnson',
  'US Citizen',
  '{"English": {"reading": "Expert", "writing": "Expert", "speaking": "Expert"}}'::jsonb
);

-- Create Candidate B (fails local eligibility)
INSERT INTO public.candidates (
  name, email, phone, location, linkedin_url, work_auth, languages
) VALUES (
  'Marco Rodriguez',
  'marco.rodriguez@email.com',
  '+34-91-555-0456',
  'Madrid, Spain',
  'https://linkedin.com/in/marcorodriguez',
  'Spanish Citizen',
  '{"English": {"reading": "Advanced", "writing": "Advanced", "speaking": "Advanced"}, "Spanish": {"reading": "Native", "writing": "Native", "speaking": "Native"}}'::jsonb
);

-- Get the job and candidate IDs for creating applications
DO $$
DECLARE
  job_uuid UUID;
  candidate_a_uuid UUID;
  candidate_b_uuid UUID;
  application_a_uuid UUID;
  application_b_uuid UUID;
BEGIN
  -- Get job ID
  SELECT id INTO job_uuid FROM public.jobs WHERE notice_no = 'ICC/25/NY/1';
  
  -- Get candidate IDs
  SELECT id INTO candidate_a_uuid FROM public.candidates WHERE email = 'sarah.johnson@email.com';
  SELECT id INTO candidate_b_uuid FROM public.candidates WHERE email = 'marco.rodriguez@email.com';
  
  -- Create Application A (strong candidate)
  INSERT INTO public.applications (
    job_id, candidate_id, status, submitted_at, suggested_for_longlist,
    answers, files, phf_completed
  ) VALUES (
    job_uuid,
    candidate_a_uuid,
    'Application',
    NOW(),
    true,
    '{"motivation_letter": "Strong candidate with 5+ years experience", "experience_years": "5", "senior_mgmt_support": "yes", "correspondence_experience": "yes", "ms_office_proficient": "yes", "organizational_skills": "excellent", "database_experience": "yes", "english_level": "expert", "local_eligibility": "yes", "finance_understanding": "basic"}'::jsonb,
    '{"cv": "https://example.com/cv-sarah-johnson.pdf", "motivation_letter": "https://example.com/motivation-sarah-johnson.pdf"}'::jsonb,
    true
  ) RETURNING id INTO application_a_uuid;
  
  -- Create Application B (fails eligibility)
  INSERT INTO public.applications (
    job_id, candidate_id, status, submitted_at, suggested_for_longlist,
    answers, files, phf_completed
  ) VALUES (
    job_uuid,
    candidate_b_uuid,
    'Application',
    NOW(),
    false,
    '{"motivation_letter": "Interested candidate but fails eligibility", "experience_years": "4", "senior_mgmt_support": "yes", "correspondence_experience": "yes", "ms_office_proficient": "yes", "organizational_skills": "good", "database_experience": "limited", "english_level": "advanced", "local_eligibility": "no", "finance_understanding": "none"}'::jsonb,
    '{"cv": "https://example.com/cv-marco-rodriguez.pdf", "motivation_letter": "https://example.com/motivation-marco-rodriguez.pdf"}'::jsonb,
    true
  ) RETURNING id INTO application_b_uuid;
  
  -- Create AI screening scores
  INSERT INTO public.screening_scores (application_id, ai_score, rubric_breakdown, version) VALUES
    (application_a_uuid, 88, '{"experience": {"score": 90, "reasoning": "5+ years experience with senior management support"}, "skills": {"score": 85, "reasoning": "Strong MS Office and correspondence skills"}, "eligibility": {"score": 100, "reasoning": "Meets all local eligibility requirements"}, "language": {"score": 95, "reasoning": "Expert English proficiency demonstrated"}, "overall": {"score": 88, "reasoning": "Excellent candidate meeting all must-have criteria"}}'::jsonb, 'v1.0'),
    (application_b_uuid, 45, '{"experience": {"score": 75, "reasoning": "4 years experience, meets requirement"}, "skills": {"score": 70, "reasoning": "Good MS Office skills, limited database experience"}, "eligibility": {"score": 0, "reasoning": "FAILS: Not eligible for local recruitment in New York"}, "language": {"score": 80, "reasoning": "Advanced English but not expert level"}, "overall": {"score": 45, "reasoning": "Fails critical eligibility requirement"}}'::jsonb, 'v1.0');
  
  -- Create video question set for the job
  INSERT INTO public.video_question_sets (
    job_id, name, read_secs, prep_secs, answer_secs, allow_retakes, max_retakes, questions
  ) VALUES (
    job_uuid,
    'Administrative Assistant Video Interview',
    15,
    30,
    90,
    true,
    1,
    '[{"id": "q1", "question": "Describe a time when you had to support a senior executive under tight deadlines. How did you prioritize tasks and ensure everything was completed on time?", "type": "behavioral"}, {"id": "q2", "question": "How would you handle a situation where you need to draft official correspondence on a technical cybersecurity topic that you are not familiar with?", "type": "situational"}, {"id": "q3", "question": "Explain your approach to maintaining confidentiality when handling sensitive documents and communications in a high-security environment.", "type": "competency"}]'::jsonb
  );
  
  RAISE NOTICE 'Created test data successfully';
  
END $$;