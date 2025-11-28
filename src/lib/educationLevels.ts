// Shared education level types for consistent use across PHF and Profile forms
// Note: "Level of Education" is used instead of "Degree Type" to accommodate 
// G-level positions that may only require secondary education

export const EDUCATION_LEVELS = [
  { value: 'High School Diploma', label: 'High School Diploma' },
  { value: 'Secondary Education Certificate', label: 'Secondary Education Certificate' },
  { value: 'A-Levels', label: 'A-Levels' },
  { value: 'International Baccalaureate', label: 'International Baccalaureate' },
  { value: 'Bachelor\'s Degree', label: 'Bachelor\'s Degree' },
  { value: 'Bachelor\'s Degree (Honors)', label: 'Bachelor\'s Degree (Honors)' },
  { value: 'Master\'s Degree', label: 'Master\'s Degree' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Post-Doctoral', label: 'Post-Doctoral' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
  { value: 'Technical Diploma', label: 'Technical Diploma' },
  { value: 'Professional License', label: 'Professional License' },
  { value: 'Other', label: 'Other' },
] as const;

export type EducationLevelValue = typeof EDUCATION_LEVELS[number]['value'];

// Legacy value mapping for backward compatibility
export const LEGACY_EDUCATION_MAPPING: Record<string, string> = {
  'Bachelor\'s': 'Bachelor\'s Degree',
  'Master\'s': 'Master\'s Degree',
  'Associate': 'Technical Diploma',
  'Certificate': 'Professional Certificate',
  'Diploma': 'Technical Diploma',
  'JD': 'Master\'s Degree',
  'LLB': 'Bachelor\'s Degree',
  'LLM': 'Master\'s Degree',
};

export function normalizeEducationLevel(value: string): string {
  return LEGACY_EDUCATION_MAPPING[value] || value;
}
