// Criterion-based scoring utilities for AI application assessment
// Parses essential criteria bullets, categorizes them, and provides scoring functions

import { parseExperienceYears, calculateTotalExperienceYears } from './stepDetermination';
import { checkEducationEligibility, type EducationLevel } from './educationUtils';

// Criterion types based on common patterns in UN job requirements
export type CriterionType = 
  | 'years_experience'    // "X years of experience in Y"
  | 'specific_experience' // "Proven experience in...", "Experience managing..."
  | 'output_experience'   // "Experience preparing...", "Experience in development..."
  | 'knowledge'           // "Knowledge of...", "Strong knowledge..."
  | 'skill'               // "Excellent X skills", "Strong planning skills"
  | 'ability'             // "Ability to..."
  | 'attribute'           // "High level of integrity...", "Diplomatic skills"
  | 'education';          // Education-related criteria

export interface ParsedCriterion {
  id: string;
  requirementId: string;
  bulletIndex: number;
  text: string;
  type: CriterionType;
  // For years_experience type
  requiredYears?: number;
  experienceField?: string;
  // For education type
  requiredEducationLevel?: EducationLevel;
}

export interface CriterionScore {
  criterionId: string;
  criterionText: string;
  type: CriterionType;
  score: number;           // 0-100
  passed: boolean;         // Clear pass/fail
  evidence: string;        // Quote or explanation from PHF data
  confidence: number;      // 0-1
  details?: {
    required?: string;
    candidateHas?: string;
  };
}

export interface ScoringResult {
  criteria: CriterionScore[];
  educationScore: CriterionScore | null;
  overallScore: number;
  passedCount: number;
  totalCount: number;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

/**
 * Categorize a criterion bullet by pattern matching
 */
// Categorisation precedence (highest wins). When a bullet matches multiple
// patterns (e.g. "5 years' experience drafting frameworks" matches both
// years_experience and output_experience), the first match below is used:
//   years_experience > education > output_experience > specific_experience
//   > knowledge > skill > ability > attribute
// Order is documented so multi-pattern bullets are categorised consistently.
export function categorizeCriterion(text: string): CriterionType {
  const lowerText = text.toLowerCase();

  // 1) years_experience — most specific first
  if (/(\d+)\s*[\(\)]*\s*years?\s*(of\s+)?(experience|work)/i.test(text) ||
      /at\s+least\s+\w+\s*\(\d+\)\s*years/i.test(text) ||
      /minimum\s+(of\s+)?\d+\s*years/i.test(text)) {
    return 'years_experience';
  }

  // 2) education
  if (lowerText.includes('degree') ||
      lowerText.includes('education') ||
      lowerText.includes('university') ||
      lowerText.includes("bachelor") ||
      lowerText.includes("master") ||
      lowerText.includes('phd') ||
      lowerText.includes('diploma') ||
      lowerText.includes('secondary school')) {
    return 'education';
  }

  // 3) output_experience — checked BEFORE specific_experience because
  //    "experience drafting/preparing/developing X" would otherwise be
  //    swallowed by the broader "experience in/with" specific pattern.
  if (lowerText.includes('experience preparing') ||
      lowerText.includes('experience developing') ||
      lowerText.includes('experience drafting') ||
      lowerText.includes('experience in the preparation') ||
      lowerText.includes('experience in the development')) {
    return 'output_experience';
  }

  // 4) specific_experience
  if (lowerText.startsWith('proven experience') ||
      lowerText.startsWith('demonstrated experience') ||
      lowerText.includes('experience managing') ||
      lowerText.includes('experience in ') ||
      lowerText.includes('experience with ')) {
    return 'specific_experience';
  }

  // 5) knowledge
  if (lowerText.startsWith('knowledge of') ||
      lowerText.startsWith('strong knowledge') ||
      lowerText.includes('understanding of') ||
      lowerText.includes('familiarity with')) {
    return 'knowledge';
  }

  // 6) skill
  if (lowerText.includes('skills') ||
      lowerText.startsWith('excellent') ||
      (lowerText.startsWith('strong') && !lowerText.includes('knowledge'))) {
    return 'skill';
  }

  // 7) ability
  if (lowerText.startsWith('ability to') ||
      lowerText.startsWith('capable of') ||
      lowerText.includes('able to')) {
    return 'ability';
  }

  // 8) attribute (default: integrity, diplomatic, etc.)
  return 'attribute';
}

/**
 * Extract the experience field/domain from a years_experience criterion
 * e.g., "5 years in governance, programme management" → "governance, programme management"
 */
export function extractExperienceField(text: string): string {
  // Remove the years part
  let field = text
    .replace(/at\s+least\s+\w+\s*\(\d+\)\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/minimum\s+(of\s+)?\d+\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/\d+\+?\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/^(in|within|of)\s+/i, '')
    .trim();
  
  // Clean up any leading prepositions
  field = field.replace(/^(in|within|of|working|related to)\s+/i, '').trim();
  
  return field || 'relevant field';
}

/**
 * Parse education level from criterion text
 */
export function parseEducationLevel(text: string): EducationLevel {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('advanced') || 
      lowerText.includes("master") ||
      lowerText.includes('phd') ||
      lowerText.includes('doctorate') ||
      lowerText.includes('post-graduate')) {
    return 'Advanced University';
  }
  
  if (lowerText.includes('first level') ||
      lowerText.includes('university degree') ||
      lowerText.includes("bachelor") ||
      lowerText.includes('undergraduate')) {
    return 'First Level University';
  }
  
  if (lowerText.includes('secondary') ||
      lowerText.includes('high school') ||
      lowerText.includes('completion of secondary')) {
    return 'Secondary';
  }
  
  return 'First Level University'; // Default assumption
}

/**
 * Parse bullet points from description text (same as generate-feedback-template)
 */
export function parseBulletPoints(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('• ') || line.match(/^\d+\.\s/))
    .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
}

/**
 * Parse essential criteria from job_requirements into individual criteria
 */
export function parseEssentialCriteria(requirements: any[]): ParsedCriterion[] {
  const parsedCriteria: ParsedCriterion[] = [];
  
  // Filter to essential criteria only
  const essentialReqs = requirements.filter(r => 
    r.category === 'Essential Criteria' || 
    r.category === 'essential' ||
    r.must_have === true
  );
  
  essentialReqs.forEach(req => {
    const bullets = parseBulletPoints(req.description || '');
    
    if (bullets.length > 0) {
      // Parse each bullet as separate criterion
      bullets.forEach((bullet, index) => {
        const type = categorizeCriterion(bullet);
        const criterion: ParsedCriterion = {
          id: `${req.id}-${index}`,
          requirementId: req.id,
          bulletIndex: index,
          text: bullet,
          type
        };
        
        // Add type-specific fields
        if (type === 'years_experience') {
          criterion.requiredYears = parseExperienceYears(bullet);
          criterion.experienceField = extractExperienceField(bullet);
        } else if (type === 'education') {
          criterion.requiredEducationLevel = parseEducationLevel(bullet);
        }
        
        parsedCriteria.push(criterion);
      });
    } else if (req.title) {
      // Fallback: use title/description as single criterion
      const type = categorizeCriterion(req.title);
      parsedCriteria.push({
        id: req.id,
        requirementId: req.id,
        bulletIndex: 0,
        text: req.title,
        type,
        requiredYears: type === 'years_experience' ? parseExperienceYears(req.title) : undefined,
        experienceField: type === 'years_experience' ? extractExperienceField(req.title) : undefined,
        requiredEducationLevel: type === 'education' ? parseEducationLevel(req.title) : undefined
      });
    }
  });
  
  return parsedCriteria;
}

/**
 * Score a years_experience criterion deterministically with optional AI relevance check
 */
export function scoreYearsExperience(
  criterion: ParsedCriterion,
  candidateExperience: any[],
  relevanceResult?: { relevant: boolean; evidence: string }
): CriterionScore {
  const totalYears = calculateTotalExperienceYears(candidateExperience);
  const requiredYears = criterion.requiredYears || 0;
  
  // Years check (deterministic)
  const meetsYearsRequirement = totalYears >= requiredYears;
  
  // Base score from years
  let score = 0;
  if (meetsYearsRequirement) {
    // Additional years boost score
    const excessYears = totalYears - requiredYears;
    score = Math.min(100, 70 + (excessYears * 5)); // 70 base + 5 per extra year, max 100
  } else {
    // Below requirement
    const ratio = totalYears / Math.max(1, requiredYears);
    score = Math.round(ratio * 60); // Max 60 if under requirement
  }
  
  // Adjust based on relevance if provided
  if (relevanceResult) {
    if (!relevanceResult.relevant && score > 50) {
      score = Math.round(score * 0.7); // Penalize if years present but not relevant
    } else if (relevanceResult.relevant) {
      score = Math.min(100, score + 10); // Boost if confirmed relevant
    }
  }
  
  const passed = meetsYearsRequirement && (!relevanceResult || relevanceResult.relevant);
  
  return {
    criterionId: criterion.id,
    criterionText: criterion.text,
    type: 'years_experience',
    score,
    passed,
    evidence: relevanceResult?.evidence || 
      `Candidate has ${totalYears.toFixed(1)} years of experience (required: ${requiredYears} years)`,
    confidence: relevanceResult ? 0.9 : 0.7,
    details: {
      required: `${requiredYears} years in ${criterion.experienceField}`,
      candidateHas: `${totalYears.toFixed(1)} years total experience`
    }
  };
}

/**
 * Score education criterion deterministically
 */
export function scoreEducation(
  criterion: ParsedCriterion,
  candidateEducation: any[]
): CriterionScore {
  const requiredLevel = criterion.requiredEducationLevel || 'First Level University';
  
  // Normalize education data
  const normalizedEducation = candidateEducation.map(edu => ({
    degree_type: edu.degree_type || edu.degree || '',
    is_completed: edu.is_completed ?? edu.isCompleted ?? true
  }));
  
  const result = checkEducationEligibility(normalizedEducation, requiredLevel);
  
  // Score: 100 if meets/exceeds, partial if below
  let score = result.eligible ? 100 : 40;
  
  return {
    criterionId: criterion.id,
    criterionText: criterion.text,
    type: 'education',
    score,
    passed: result.eligible,
    evidence: result.details,
    confidence: 0.95, // High confidence for deterministic check
    details: {
      required: requiredLevel,
      candidateHas: result.candidateLevel
    }
  };
}

/**
 * Combine duties from work experience for AI analysis
 */
export function extractCandidateDuties(workExperience: any[]): string {
  return workExperience
    .map(exp => {
      const title = exp.job_title || exp.position || '';
      const employer = exp.employer || exp.company || exp.organisation || '';
      const duties = exp.duties_and_responsibilities || exp.description || '';
      return `${title} at ${employer}:\n${duties}`;
    })
    .filter(text => text.trim().length > 0)
    .join('\n\n');
}

/**
 * Calculate overall scoring result from individual criterion scores
 */
export function calculateScoringResult(
  criteriaScores: CriterionScore[],
  educationScore: CriterionScore | null
): ScoringResult {
  const allScores = educationScore 
    ? [...criteriaScores, educationScore]
    : criteriaScores;
  
  const passedCount = allScores.filter(s => s.passed).length;
  const totalCount = allScores.length;
  
  // Calculate weighted average (years_experience and education weighted higher)
  let totalWeight = 0;
  let weightedSum = 0;
  
  allScores.forEach(score => {
    const weight = score.type === 'years_experience' || score.type === 'education' ? 2 : 1;
    weightedSum += score.score * weight;
    totalWeight += weight;
  });
  
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
  // Recommend if majority pass and core criteria (experience/education) pass
  const corePass = allScores
    .filter(s => s.type === 'years_experience' || s.type === 'education')
    .every(s => s.passed);
  
  const passRatio = passedCount / Math.max(1, totalCount);
  const recommendForLonglist = corePass && passRatio >= 0.6 && overallScore >= 60;
  
  return {
    criteria: criteriaScores,
    educationScore,
    overallScore,
    passedCount,
    totalCount,
    recommendForLonglist,
    analysisVersion: '3.0-criterion-based'
  };
}
