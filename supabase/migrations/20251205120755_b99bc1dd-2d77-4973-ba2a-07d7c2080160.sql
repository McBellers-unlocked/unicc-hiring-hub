-- Bulk allocate MSHT skills to all MSHT unit members
INSERT INTO skill_assessments (user_id, skill_id, status, required_level)
SELECT 
  u.id as user_id,
  s.id as skill_id,
  'draft' as status,
  3 as required_level
FROM users u
CROSS JOIN skill_definitions s
WHERE u.unit = 'MSHT'
  AND s.name IN (
    'Career Management',
    'Coaching',
    'Collaboration',
    'Communication',
    'Continuous improvement',
    'Creating An Empowering And Motivating Environment',
    'Critical Thinking',
    'Customer Service',
    'Developing Others',
    'Digital and analytical skills',
    'Diversity And Inclusion',
    'Emotional Intelligence',
    'Hr Analytics',
    'Hr Project Management',
    'Hr Transformation',
    'Inclusivity',
    'Learning And Development',
    'Moving Forward In A Changing Environment',
    'Organizational Awareness',
    'Power Bi',
    'Problem Solving',
    'Recruitment',
    'Strategic Workforce Planning',
    'Talent Management',
    'Talent Outreach',
    'Teamwork'
  )
ON CONFLICT (user_id, skill_id) DO NOTHING;