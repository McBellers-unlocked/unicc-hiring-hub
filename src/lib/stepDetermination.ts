// Step Determination Calculator based on UN Staff Rule 420.4
// External candidates entering service at step 1, with up to 5 additional steps
// for qualifications and experience exceeding the essential minimum requirements

import { getEducationLevel, type EducationLevel } from './educationUtils';

export interface StepCalculationInput {
  // Job requirements
  essentialEducationLevel: EducationLevel;
  essentialExperienceYears: number;
  essentialExperienceText?: string;
  
  // Candidate qualifications
  candidateEducation: Array<{
    degree_type: string;
    field_of_study?: string;
    institution?: string;
    is_completed: boolean;
    whed_verified?: boolean;
  }>;
  candidateExperience: Array<{
    job_title?: string;
    employer?: string;
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
    description?: string;
  }>;
}

export interface StepCalculationResult {
  baseStep: number;
  educationStep: number;
  educationStepJustification: string;
  experienceSteps: number;
  experienceStepsJustification: string;
  additionalYearsCounted: number;
  calculatedStep: number;
  breakdown: string[];
  warnings: string[];
}

// Education level hierarchy for comparison
const EDUCATION_HIERARCHY: Record<EducationLevel, number> = {
  'Other': 0,
  'Secondary': 1,
  'Professional': 2,
  'First Level University': 3,
  'Advanced University': 4
};

/**
 * Parse experience years from text like "At least five (5) years..." or "3-5 years"
 * Returns the minimum required years (uses high end for ranges as baseline)
 */
export function parseExperienceYears(text: string): number {
  if (!text) return 0;
  
  const lowerText = text.toLowerCase();
  
  // Match patterns like "five (5)", "5", "five", "3-5"
  const patterns = [
    /(\d+)\s*[-–]\s*(\d+)\s*years?/i,  // "3-5 years" - use higher number
    /at\s+least\s+(\w+)\s*\((\d+)\)/i,  // "at least five (5)"
    /minimum\s+of?\s*(\d+)\s*years?/i,  // "minimum of 5 years"
    /(\d+)\+?\s*years?/i,               // "5 years" or "5+ years"
  ];
  
  // Word to number mapping
  const wordToNum: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20
  };
  
  // Try range pattern first (use higher number as baseline)
  const rangeMatch = lowerText.match(patterns[0]);
  if (rangeMatch) {
    return parseInt(rangeMatch[2], 10);
  }
  
  // Try "at least X (N)" pattern
  const atLeastMatch = lowerText.match(patterns[1]);
  if (atLeastMatch) {
    return parseInt(atLeastMatch[2], 10);
  }
  
  // Try minimum pattern
  const minMatch = lowerText.match(patterns[2]);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  
  // Try simple number pattern
  const simpleMatch = lowerText.match(patterns[3]);
  if (simpleMatch) {
    return parseInt(simpleMatch[1], 10);
  }
  
  // Try word patterns
  for (const [word, num] of Object.entries(wordToNum)) {
    if (lowerText.includes(word)) {
      return num;
    }
  }
  
  return 0;
}

/**
 * Calculate total years of experience from work history
 */
export function calculateTotalExperienceYears(
  experience: Array<{
    start_date?: string;
    end_date?: string;
    is_current?: boolean;
  }>
): number {
  let totalMonths = 0;
  
  for (const exp of experience) {
    if (!exp.start_date) continue;
    
    const startDate = new Date(exp.start_date);
    const endDate = exp.is_current || !exp.end_date 
      ? new Date() 
      : new Date(exp.end_date);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) continue;
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
      + (endDate.getMonth() - startDate.getMonth());
    totalMonths += Math.max(0, months);
  }
  
  return Math.round(totalMonths / 12 * 10) / 10; // Round to 1 decimal
}

/**
 * Check if candidate has a higher degree than essential requirement
 * Only counts if WHED verified (for now, we check a flag)
 */
export function hasHigherDegree(
  candidateEducation: Array<{
    degree_type: string;
    is_completed: boolean;
    whed_verified?: boolean;
  }>,
  essentialLevel: EducationLevel,
  requireWhedVerification: boolean = true
): { hasHigher: boolean; highestDegree: string; highestLevel: EducationLevel } {
  let highestLevel: EducationLevel = 'Other';
  let highestDegree = '';
  
  for (const edu of candidateEducation) {
    if (!edu.is_completed) continue;
    if (requireWhedVerification && !edu.whed_verified) continue;
    
    const level = getEducationLevel(edu.degree_type);
    if (EDUCATION_HIERARCHY[level] > EDUCATION_HIERARCHY[highestLevel]) {
      highestLevel = level;
      highestDegree = edu.degree_type;
    }
  }
  
  const hasHigher = EDUCATION_HIERARCHY[highestLevel] > EDUCATION_HIERARCHY[essentialLevel];
  
  return { hasHigher, highestDegree, highestLevel };
}

/**
 * Main step calculation function implementing UN Staff Rule 420.4
 * 
 * Rules:
 * - Base step = 1
 * - +1 for degree above essential requirement (max 1, WHED verified only)
 * - +1 for each 3 years of additional relevant experience
 * - Cap total at step 6 (5 additional steps maximum)
 */
export function calculateStep(input: StepCalculationInput): StepCalculationResult {
  const breakdown: string[] = [];
  const warnings: string[] = [];
  
  // Base step is always 1
  const baseStep = 1;
  breakdown.push('Base step: 1 (starting point for external candidates)');
  
  // Calculate education step (0 or 1)
  let educationStep = 0;
  let educationStepJustification = '';
  
  const { hasHigher, highestDegree, highestLevel } = hasHigherDegree(
    input.candidateEducation,
    input.essentialEducationLevel,
    true // Require WHED verification
  );
  
  if (hasHigher) {
    educationStep = 1;
    educationStepJustification = `Candidate holds ${highestDegree} (${highestLevel}) which exceeds the essential requirement of ${input.essentialEducationLevel}. WHED verified.`;
    breakdown.push(`Education step: +1 (${highestDegree} exceeds ${input.essentialEducationLevel} requirement)`);
  } else {
    // Check without WHED to give warning
    const withoutWhed = hasHigherDegree(input.candidateEducation, input.essentialEducationLevel, false);
    if (withoutWhed.hasHigher) {
      educationStepJustification = `Candidate has ${withoutWhed.highestDegree} but it is not WHED verified. No education step awarded.`;
      warnings.push(`Higher degree (${withoutWhed.highestDegree}) found but not WHED verified. Verify in WHED to award education step.`);
      breakdown.push('Education step: 0 (higher degree not WHED verified)');
    } else {
      educationStepJustification = `Candidate's highest completed education (${withoutWhed.highestLevel}) does not exceed the essential requirement (${input.essentialEducationLevel}).`;
      breakdown.push(`Education step: 0 (no degree above ${input.essentialEducationLevel})`);
    }
  }
  
  // Calculate experience steps
  const totalExperience = calculateTotalExperienceYears(input.candidateExperience);
  const additionalYears = Math.max(0, totalExperience - input.essentialExperienceYears);
  
  // +1 step for each 3 additional years
  const experienceSteps = Math.floor(additionalYears / 3);
  const additionalYearsCounted = experienceSteps * 3;
  
  let experienceStepsJustification = '';
  if (additionalYears > 0) {
    experienceStepsJustification = `Candidate has ${totalExperience.toFixed(1)} years of experience, which is ${additionalYears.toFixed(1)} years above the essential requirement of ${input.essentialExperienceYears} years. This awards ${experienceSteps} additional step(s) (1 per 3 years).`;
    breakdown.push(`Experience steps: +${experienceSteps} (${additionalYears.toFixed(1)} additional years ÷ 3 = ${experienceSteps})`);
  } else {
    experienceStepsJustification = `Candidate has ${totalExperience.toFixed(1)} years of experience, meeting but not exceeding the essential requirement of ${input.essentialExperienceYears} years.`;
    breakdown.push(`Experience steps: 0 (no additional years above ${input.essentialExperienceYears} year requirement)`);
  }
  
  // Calculate total with cap at 6
  const rawTotal = baseStep + educationStep + experienceSteps;
  const calculatedStep = Math.min(6, rawTotal);
  
  if (rawTotal > 6) {
    warnings.push(`Calculated step (${rawTotal}) exceeds maximum of 6. Capped at step 6.`);
    breakdown.push(`Total: ${baseStep} + ${educationStep} + ${experienceSteps} = ${rawTotal} → Capped at 6`);
  } else {
    breakdown.push(`Total: ${baseStep} + ${educationStep} + ${experienceSteps} = ${calculatedStep}`);
  }
  
  return {
    baseStep,
    educationStep,
    educationStepJustification,
    experienceSteps,
    experienceStepsJustification,
    additionalYearsCounted,
    calculatedStep,
    breakdown,
    warnings
  };
}

/**
 * Get display text for education level
 */
export function getEducationLevelDisplay(level: EducationLevel): string {
  switch (level) {
    case 'Secondary': return 'Secondary School';
    case 'First Level University': return 'Bachelor\'s Degree';
    case 'Advanced University': return 'Master\'s/PhD';
    case 'Professional': return 'Professional Certificate';
    default: return 'Other';
  }
}
