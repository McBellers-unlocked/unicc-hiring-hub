-- Import MSHT Team Skills Data from AG5 PDF
-- This inserts skill assessments for 10 existing MSHT team members

-- First, ensure all required skills exist in skill_definitions
INSERT INTO skill_definitions (name, category, description)
VALUES 
  ('Career Management', 'HR Common', 'Ability to guide and support career development'),
  ('Coaching and Mentoring', 'HR Common', 'Skills in coaching and mentoring others'),
  ('Collaboration', 'HR Common', 'Working effectively with others'),
  ('Communication', 'HR Common', 'Effective verbal and written communication'),
  ('Continuous Improvement', 'HR Common', 'Drive for ongoing improvement'),
  ('Customer Service', 'HR Common', 'Delivering excellent service to stakeholders'),
  ('Digital Skills', 'HR Common', 'Proficiency with digital tools and platforms'),
  ('Diversity and Inclusion', 'HR Common', 'Promoting diverse and inclusive environments'),
  ('Emotional Intelligence', 'HR Common', 'Understanding and managing emotions'),
  ('Flexibility and Adaptability', 'HR Common', 'Adapting to changing circumstances'),
  ('Information Gathering and Analysis', 'HR Common', 'Collecting and analyzing information'),
  ('Initiative', 'HR Common', 'Taking proactive action'),
  ('Innovating and Embracing Change', 'HR Common', 'Driving innovation and change'),
  ('Integrity', 'HR Common', 'Acting with honesty and ethical standards'),
  ('Managing Resources', 'HR Common', 'Effective resource management'),
  ('Organizational Awareness', 'HR Common', 'Understanding organizational dynamics'),
  ('Organizational Skills', 'HR Common', 'Planning and organizing work effectively'),
  ('Planning and Execution', 'HR Common', 'Strategic planning and implementation'),
  ('Problem Solving', 'HR Common', 'Analytical problem-solving abilities'),
  ('Professionalism', 'HR Common', 'Professional conduct and demeanor'),
  ('Relationship Building', 'HR Common', 'Building and maintaining relationships'),
  ('Self-Awareness', 'HR Common', 'Understanding own strengths and weaknesses'),
  ('Staff Wellbeing', 'MSHT Specific', 'Supporting staff health and wellbeing'),
  ('Stakeholder Management', 'MSHT Specific', 'Managing stakeholder relationships'),
  ('Strategic Thinking', 'MSHT Specific', 'Long-term strategic planning'),
  ('Teamwork', 'HR Common', 'Working effectively in teams')
ON CONFLICT (name) DO UPDATE SET 
  category = EXCLUDED.category,
  description = EXCLUDED.description;

-- Insert skill assessments for all 10 MSHT team members
-- Data extracted from AG5_skills.pdf visual analysis
WITH user_mapping AS (
  SELECT id, email, name FROM users WHERE email IN (
    'aristavinaixa@unicc.org',
    'ferraro@unicc.org', 
    'guardeno@unicc.org',
    'herrero@unicc.org',
    'jacquier@unicc.org',
    'negyesi@unicc.org',
    'rodenas@unicc.org',
    'romano@unicc.org',
    'stein@unicc.org',
    'valente@unicc.org'
  )
),
skill_mapping AS (
  SELECT id, name FROM skill_definitions
),
skill_data AS (
  -- Diego ARISTA VINAIXA (aristavinaixa@unicc.org)
  SELECT 'aristavinaixa@unicc.org' as email, 'Career Management' as skill, 3 as required, 3 as achieved
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Coaching and Mentoring', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Communication', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Continuous Improvement', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Digital Skills', 4, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Emotional Intelligence', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Flexibility and Adaptability', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Information Gathering and Analysis', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Innovating and Embracing Change', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Managing Resources', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Organizational Awareness', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Planning and Execution', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Problem Solving', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Relationship Building', 4, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Staff Wellbeing', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Stakeholder Management', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Strategic Thinking', 3, 2
  UNION ALL SELECT 'aristavinaixa@unicc.org', 'Teamwork', 4, 4
  
  -- Anna Grazia FERRARO (ferraro@unicc.org)
  UNION ALL SELECT 'ferraro@unicc.org', 'Career Management', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Coaching and Mentoring', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Communication', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Continuous Improvement', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Diversity and Inclusion', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Emotional Intelligence', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Initiative', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Innovating and Embracing Change', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Managing Resources', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Organizational Awareness', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Planning and Execution', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Relationship Building', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Self-Awareness', 4, 4
  UNION ALL SELECT 'ferraro@unicc.org', 'Staff Wellbeing', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Stakeholder Management', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Strategic Thinking', 4, 3
  UNION ALL SELECT 'ferraro@unicc.org', 'Teamwork', 4, 4
  
  -- Maria Isabel GUARDENO EXPOSITO (guardeno@unicc.org)
  UNION ALL SELECT 'guardeno@unicc.org', 'Career Management', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Coaching and Mentoring', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'guardeno@unicc.org', 'Communication', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Continuous Improvement', 3, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'guardeno@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Emotional Intelligence', 3, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Flexibility and Adaptability', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Information Gathering and Analysis', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Innovating and Embracing Change', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'guardeno@unicc.org', 'Managing Resources', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Organizational Awareness', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'guardeno@unicc.org', 'Planning and Execution', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Problem Solving', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'guardeno@unicc.org', 'Relationship Building', 4, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'guardeno@unicc.org', 'Staff Wellbeing', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Stakeholder Management', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Strategic Thinking', 3, 2
  UNION ALL SELECT 'guardeno@unicc.org', 'Teamwork', 4, 4
  
  -- Esther HERRERO CANTERO (herrero@unicc.org)
  UNION ALL SELECT 'herrero@unicc.org', 'Career Management', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Coaching and Mentoring', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Communication', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Continuous Improvement', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Emotional Intelligence', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Innovating and Embracing Change', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Managing Resources', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Organizational Awareness', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Planning and Execution', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Relationship Building', 4, 4
  UNION ALL SELECT 'herrero@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Staff Wellbeing', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Stakeholder Management', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Strategic Thinking', 3, 3
  UNION ALL SELECT 'herrero@unicc.org', 'Teamwork', 4, 4
  
  -- Benedicte Solange JACQUIER (jacquier@unicc.org)
  UNION ALL SELECT 'jacquier@unicc.org', 'Career Management', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Coaching and Mentoring', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Communication', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Continuous Improvement', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Diversity and Inclusion', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Emotional Intelligence', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Initiative', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Innovating and Embracing Change', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Managing Resources', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Organizational Awareness', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Planning and Execution', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Relationship Building', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Self-Awareness', 4, 4
  UNION ALL SELECT 'jacquier@unicc.org', 'Staff Wellbeing', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Stakeholder Management', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Strategic Thinking', 4, 3
  UNION ALL SELECT 'jacquier@unicc.org', 'Teamwork', 4, 4
  
  -- Anna NEGYESI-MOUYSSET (negyesi@unicc.org)
  UNION ALL SELECT 'negyesi@unicc.org', 'Career Management', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Coaching and Mentoring', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Collaboration', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Communication', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Continuous Improvement', 5, 4
  UNION ALL SELECT 'negyesi@unicc.org', 'Customer Service', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Digital Skills', 5, 4
  UNION ALL SELECT 'negyesi@unicc.org', 'Diversity and Inclusion', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Emotional Intelligence', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Flexibility and Adaptability', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Information Gathering and Analysis', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Initiative', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Innovating and Embracing Change', 5, 4
  UNION ALL SELECT 'negyesi@unicc.org', 'Integrity', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Managing Resources', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Organizational Awareness', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Organizational Skills', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Planning and Execution', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Problem Solving', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Professionalism', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Relationship Building', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Self-Awareness', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Staff Wellbeing', 5, 4
  UNION ALL SELECT 'negyesi@unicc.org', 'Stakeholder Management', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Strategic Thinking', 5, 5
  UNION ALL SELECT 'negyesi@unicc.org', 'Teamwork', 5, 5
  
  -- Lucia del Pilar RODENAS ZULETA (rodenas@unicc.org)
  UNION ALL SELECT 'rodenas@unicc.org', 'Career Management', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Coaching and Mentoring', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Communication', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Continuous Improvement', 3, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Emotional Intelligence', 3, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Information Gathering and Analysis', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Innovating and Embracing Change', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Managing Resources', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Organizational Awareness', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Planning and Execution', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Problem Solving', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'rodenas@unicc.org', 'Relationship Building', 4, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'rodenas@unicc.org', 'Staff Wellbeing', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Stakeholder Management', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Strategic Thinking', 3, 2
  UNION ALL SELECT 'rodenas@unicc.org', 'Teamwork', 4, 4
  
  -- Maria Francesca ROMANO (romano@unicc.org)
  UNION ALL SELECT 'romano@unicc.org', 'Career Management', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Coaching and Mentoring', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Communication', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Continuous Improvement', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'romano@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Emotional Intelligence', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Innovating and Embracing Change', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Managing Resources', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Organizational Awareness', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Planning and Execution', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Relationship Building', 4, 4
  UNION ALL SELECT 'romano@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Staff Wellbeing', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Stakeholder Management', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Strategic Thinking', 3, 3
  UNION ALL SELECT 'romano@unicc.org', 'Teamwork', 4, 4
  
  -- Amalia STEIN (stein@unicc.org)
  UNION ALL SELECT 'stein@unicc.org', 'Career Management', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Coaching and Mentoring', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Communication', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Continuous Improvement', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Digital Skills', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Diversity and Inclusion', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Emotional Intelligence', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Flexibility and Adaptability', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Initiative', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Innovating and Embracing Change', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Managing Resources', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Organizational Awareness', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Planning and Execution', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Relationship Building', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Self-Awareness', 4, 4
  UNION ALL SELECT 'stein@unicc.org', 'Staff Wellbeing', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Stakeholder Management', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Strategic Thinking', 4, 3
  UNION ALL SELECT 'stein@unicc.org', 'Teamwork', 4, 4
  
  -- Matthew VALENTE (valente@unicc.org)
  UNION ALL SELECT 'valente@unicc.org', 'Career Management', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Coaching and Mentoring', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Collaboration', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Communication', 4, 3
  UNION ALL SELECT 'valente@unicc.org', 'Continuous Improvement', 3, 3
  UNION ALL SELECT 'valente@unicc.org', 'Customer Service', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Digital Skills', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Diversity and Inclusion', 3, 3
  UNION ALL SELECT 'valente@unicc.org', 'Emotional Intelligence', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Flexibility and Adaptability', 4, 3
  UNION ALL SELECT 'valente@unicc.org', 'Information Gathering and Analysis', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Initiative', 3, 3
  UNION ALL SELECT 'valente@unicc.org', 'Innovating and Embracing Change', 3, 3
  UNION ALL SELECT 'valente@unicc.org', 'Integrity', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Managing Resources', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Organizational Awareness', 4, 3
  UNION ALL SELECT 'valente@unicc.org', 'Organizational Skills', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Planning and Execution', 4, 3
  UNION ALL SELECT 'valente@unicc.org', 'Problem Solving', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Professionalism', 4, 4
  UNION ALL SELECT 'valente@unicc.org', 'Relationship Building', 4, 3
  UNION ALL SELECT 'valente@unicc.org', 'Self-Awareness', 3, 3
  UNION ALL SELECT 'valente@unicc.org', 'Staff Wellbeing', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Stakeholder Management', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Strategic Thinking', 3, 2
  UNION ALL SELECT 'valente@unicc.org', 'Teamwork', 4, 4
)
INSERT INTO skill_assessments (user_id, skill_id, self_assessment, required_level, manager_assessment, status, updated_at)
SELECT 
  u.id as user_id,
  s.id as skill_id,
  sd.achieved as self_assessment,
  sd.required as required_level,
  sd.achieved as manager_assessment,
  'approved' as status,
  now() as updated_at
FROM skill_data sd
JOIN user_mapping u ON u.email = sd.email
JOIN skill_mapping s ON s.name = sd.skill
ON CONFLICT (user_id, skill_id) 
DO UPDATE SET 
  self_assessment = EXCLUDED.self_assessment,
  required_level = EXCLUDED.required_level,
  manager_assessment = EXCLUDED.manager_assessment,
  status = EXCLUDED.status,
  updated_at = now();