// Education level mapping utilities for eligibility checking

export type EducationLevel = 'Secondary' | 'First Level University' | 'Advanced University' | 'Professional' | 'Other';

export const DEGREE_TYPE_LEVELS: Record<string, EducationLevel> = {
  // Secondary education
  'High School Diploma': 'Secondary',
  'Secondary Education Certificate': 'Secondary', 
  'A-Levels': 'Secondary',
  'International Baccalaureate': 'Secondary',
  
  // First Level University (Bachelor's)
  'Bachelor\'s Degree': 'First Level University',
  'Bachelor\'s Degree (Honors)': 'First Level University',
  'Bachelor\'s': 'First Level University',
  'Bachelor of Science': 'First Level University',
  'Bachelor of Arts': 'First Level University',
  'Bachelor of Engineering': 'First Level University',
  'Bachelor of Business Administration': 'First Level University',
  'Bachelor of Commerce': 'First Level University',
  'BBA': 'First Level University',
  'BCom': 'First Level University',
  'BSc': 'First Level University',
  'BA': 'First Level University',
  'BEng': 'First Level University',
  'LLB': 'First Level University',
  
  // Advanced University (Master's and Doctorate)
  'Master\'s Degree': 'Advanced University',
  'Master\'s': 'Advanced University',
  'Master of Science': 'Advanced University',
  'Master of Arts': 'Advanced University',
  'Master of Engineering': 'Advanced University',
  'Master of Business Administration': 'Advanced University',
  'Executive MBA': 'Advanced University',
  'EMBA': 'Advanced University',
  'MSc': 'Advanced University',
  'MA': 'Advanced University',
  'MEng': 'Advanced University',
  'MBA': 'Advanced University',
  'LLM': 'Advanced University',
  'PhD': 'Advanced University',
  'Ph.D.': 'Advanced University',
  'Doctorate': 'Advanced University',
  'Doctor of Philosophy': 'Advanced University',
  'DPhil': 'Advanced University',
  'EdD': 'Advanced University',
  'MD': 'Advanced University',
  'Post-Doctoral': 'Advanced University',
  'JD': 'Advanced University',
  
  // Professional
  'Professional Certificate': 'Professional',
  'Technical Diploma': 'Professional',
  'Professional License': 'Professional',
  'Associate': 'Professional',
  'Associate Degree': 'Professional',
  'Certificate': 'Professional',
  'Diploma': 'Professional',
  
  // Other
  'Other': 'Other',
};

export function getEducationLevel(degreeType: string): EducationLevel {
  return DEGREE_TYPE_LEVELS[degreeType] || 'Other';
}

export function getHighestEducationLevel(educationEntries: Array<{ degree_type: string }>): EducationLevel {
  if (!educationEntries.length) return 'Other';
  
  const levels = educationEntries.map(entry => getEducationLevel(entry.degree_type));
  
  // Priority order: Advanced University > First Level University > Professional > Secondary > Other
  if (levels.includes('Advanced University')) return 'Advanced University';
  if (levels.includes('First Level University')) return 'First Level University';
  if (levels.includes('Professional')) return 'Professional';
  if (levels.includes('Secondary')) return 'Secondary';
  return 'Other';
}

export function checkEducationEligibility(
  candidateEducation: Array<{ degree_type: string, is_completed: boolean }>,
  requiredLevel: EducationLevel
): { eligible: boolean, candidateLevel: EducationLevel, details: string } {
  const completedEducation = candidateEducation.filter(edu => edu.is_completed);
  const candidateLevel = getHighestEducationLevel(completedEducation);
  
  const levelHierarchy: Record<EducationLevel, number> = {
    'Other': 0,
    'Secondary': 1,
    'Professional': 2,
    'First Level University': 3,
    'Advanced University': 4
  };
  
  const eligible = levelHierarchy[candidateLevel] >= levelHierarchy[requiredLevel];
  
  let details = '';
  if (eligible) {
    details = `Candidate has ${candidateLevel} education, meeting the requirement for ${requiredLevel}`;
  } else {
    details = `Candidate has ${candidateLevel} education, which does not meet the requirement for ${requiredLevel}`;
  }
  
  return { eligible, candidateLevel, details };
}