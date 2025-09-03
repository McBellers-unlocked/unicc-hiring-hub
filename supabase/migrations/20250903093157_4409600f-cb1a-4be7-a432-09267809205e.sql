-- Get the job ID we just created
DO $$
DECLARE
  job_uuid UUID;
  candidate_a_uuid UUID;
  candidate_b_uuid UUID;
  application_a_uuid UUID;
  application_b_uuid UUID;
BEGIN
  -- Get the job ID
  SELECT id INTO job_uuid FROM public.jobs WHERE notice_no = 'ICC/25/NY/1';
  
  -- Create Candidate A (meets all requirements)
  INSERT INTO public.candidates (
    id, name, email, phone, location, linkedin_url, work_auth, languages
  ) VALUES (
    gen_random_uuid(),
    'Sarah Johnson',
    'sarah.johnson@email.com',
    '+1-212-555-0123',
    'New York, NY, USA',
    'https://linkedin.com/in/sarahjohnson',
    'US Citizen',
    '{"English": {"reading": "Expert", "writing": "Expert", "speaking": "Expert"}}'::jsonb
  ) RETURNING id INTO candidate_a_uuid;
  
  -- Create Candidate B (fails local eligibility)
  INSERT INTO public.candidates (
    id, name, email, phone, location, linkedin_url, work_auth, languages
  ) VALUES (
    gen_random_uuid(),
    'Marco Rodriguez',
    'marco.rodriguez@email.com',
    '+34-91-555-0456',
    'Madrid, Spain',
    'https://linkedin.com/in/marcorodriguez',
    'Spanish Citizen',
    '{"English": {"reading": "Advanced", "writing": "Advanced", "speaking": "Advanced"}, "Spanish": {"reading": "Native", "writing": "Native", "speaking": "Native"}}'::jsonb
  ) RETURNING id INTO candidate_b_uuid;
  
  -- Create Application A (strong candidate)
  INSERT INTO public.applications (
    id, job_id, candidate_id, status, submitted_at, 
    answers, files, phf_completed, phf_data, suggested_for_longlist
  ) VALUES (
    gen_random_uuid(),
    job_uuid,
    candidate_a_uuid,
    'Application',
    NOW(),
    '{
      "motivation_letter": "I am writing to express my strong interest in the Administrative Assistant position within the Cybersecurity Division at UNICC. With over 5 years of administrative support experience, including 3 years directly supporting C-level executives in multinational organizations, I am confident in my ability to contribute effectively to your team.\n\nMy experience includes drafting official correspondence, managing complex calendars, coordinating international meetings, and maintaining confidential records. I am proficient in all Microsoft Office applications, including advanced Excel functions and Visio for process mapping. My organizational skills have been tested in high-pressure environments, consistently delivering results while managing multiple priorities.\n\nI have experience with indicator tracking and database reporting from my current role supporting the IT Director at a Fortune 500 company. My English proficiency is at expert level, having completed my education in English and worked in English-speaking environments throughout my career.\n\nAs a US citizen and New York resident, I meet all local eligibility requirements. I have a basic understanding of finance and budgeting processes from my involvement in departmental budget planning.\n\nI am excited about the opportunity to support UNICC's critical cybersecurity mission and contribute to the organization's success.",
      "experience_years": "5",
      "senior_mgmt_support": "yes",
      "correspondence_experience": "yes",
      "ms_office_proficient": "yes",
      "organizational_skills": "excellent",
      "database_experience": "yes",
      "english_level": "expert",
      "local_eligibility": "yes",
      "finance_understanding": "basic"
    }'::jsonb,
    '{
      "cv": "https://example.com/cv-sarah-johnson.pdf",
      "motivation_letter": "https://example.com/motivation-sarah-johnson.pdf"
    }'::jsonb,
    true,
    '{
      "personal": {
        "fullName": "Sarah Elizabeth Johnson",
        "dateOfBirth": "1990-03-15",
        "placeOfBirth": "New York, NY, USA",
        "nationality": "United States",
        "gender": "Female"
      },
      "employment": [
        {
          "organization": "TechCorp International",
          "position": "Executive Administrative Assistant",
          "startDate": "2019-01-15",
          "endDate": "Present",
          "supervisor": "Dr. Amanda Chen, CTO",
          "duties": "Provide comprehensive administrative support to C-level executives, manage international correspondence, coordinate board meetings, maintain confidential records"
        }
      ],
      "education": [
        {
          "institution": "Columbia University",
          "degree": "Bachelor of Arts",
          "fieldOfStudy": "Business Administration",
          "year": "2012"
        }
      ],
      "languages": [
        {
          "language": "English",
          "reading": "Expert",
          "writing": "Expert",
          "speaking": "Expert"
        }
      ],
      "consent": {
        "backgroundCheck": true,
        "referenceContact": true
      },
      "signature": {
        "electronicSignature": "Sarah E. Johnson",
        "signatureDate": "2025-08-20",
        "signaturePlace": "New York, NY"
      }
    }'::jsonb,
    true
  ) RETURNING id INTO application_a_uuid;
  
  -- Create Application B (fails eligibility)
  INSERT INTO public.applications (
    id, job_id, candidate_id, status, submitted_at,
    answers, files, phf_completed, phf_data, suggested_for_longlist
  ) VALUES (
    gen_random_uuid(),
    job_uuid,
    candidate_b_uuid,
    'Application',
    NOW(),
    '{
      "motivation_letter": "I am very interested in the Administrative Assistant position at UNICC. I have 4 years of administrative experience and strong English skills. I am currently based in Madrid but willing to relocate to New York for this opportunity.",
      "experience_years": "4",
      "senior_mgmt_support": "yes",
      "correspondence_experience": "yes", 
      "ms_office_proficient": "yes",
      "organizational_skills": "good",
      "database_experience": "limited",
      "english_level": "advanced",
      "local_eligibility": "no",
      "finance_understanding": "none"
    }'::jsonb,
    '{
      "cv": "https://example.com/cv-marco-rodriguez.pdf",
      "motivation_letter": "https://example.com/motivation-marco-rodriguez.pdf"
    }'::jsonb,
    true,
    '{
      "personal": {
        "fullName": "Marco Antonio Rodriguez",
        "dateOfBirth": "1988-07-22",
        "placeOfBirth": "Madrid, Spain",
        "nationality": "Spain",
        "gender": "Male"
      },
      "consent": {
        "backgroundCheck": true,
        "referenceContact": true
      },
      "signature": {
        "electronicSignature": "Marco A. Rodriguez",
        "signatureDate": "2025-08-20",
        "signaturePlace": "Madrid, Spain"
      }
    }'::jsonb,
    false
  ) RETURNING id INTO application_b_uuid;
  
  -- Create AI screening scores for both applications
  INSERT INTO public.screening_scores (application_id, ai_score, rubric_breakdown, version) VALUES
    (application_a_uuid, 88, '{
      "experience": {"score": 90, "reasoning": "5+ years experience with senior management support"},
      "skills": {"score": 85, "reasoning": "Strong MS Office and correspondence skills"},
      "eligibility": {"score": 100, "reasoning": "Meets all local eligibility requirements"},
      "language": {"score": 95, "reasoning": "Expert English proficiency demonstrated"},
      "overall": {"score": 88, "reasoning": "Excellent candidate meeting all must-have criteria"}
    }'::jsonb, 'v1.0'),
    (application_b_uuid, 45, '{
      "experience": {"score": 75, "reasoning": "4 years experience, meets requirement"},
      "skills": {"score": 70, "reasoning": "Good MS Office skills, limited database experience"},
      "eligibility": {"score": 0, "reasoning": "FAILS: Not eligible for local recruitment in New York"},
      "language": {"score": 80, "reasoning": "Advanced English but not expert level"},
      "overall": {"score": 45, "reasoning": "Fails critical eligibility requirement"}
    }'::jsonb, 'v1.0');
  
  -- Create video question set for the job
  INSERT INTO public.video_question_sets (
    job_id, name, read_secs, prep_secs, answer_secs, allow_retakes, max_retakes,
    questions
  ) VALUES (
    job_uuid,
    'Administrative Assistant Video Interview',
    15,
    30,
    90,
    true,
    1,
    '[
      {
        "id": "q1",
        "question": "Describe a time when you had to support a senior executive under tight deadlines. How did you prioritize tasks and ensure everything was completed on time?",
        "type": "behavioral"
      },
      {
        "id": "q2", 
        "question": "How would you handle a situation where you need to draft official correspondence on a technical cybersecurity topic that you are not familiar with?",
        "type": "situational"
      },
      {
        "id": "q3",
        "question": "Explain your approach to maintaining confidentiality when handling sensitive documents and communications in a high-security environment.",
        "type": "competency"
      }
    ]'::jsonb
  );
  
  RAISE NOTICE 'Created candidates and applications successfully';
  RAISE NOTICE 'Candidate A ID: %', candidate_a_uuid;
  RAISE NOTICE 'Candidate B ID: %', candidate_b_uuid;
  RAISE NOTICE 'Application A ID: %', application_a_uuid;
  RAISE NOTICE 'Application B ID: %', application_b_uuid;
  
END $$;