import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

// =============================================================================
// Types
// =============================================================================

type CriterionType = 
  | 'years_experience'
  | 'specific_experience'
  | 'output_experience'
  | 'knowledge'
  | 'skill'
  | 'ability'
  | 'attribute'
  | 'education';

type EducationLevel = 'Secondary' | 'First Level University' | 'Advanced University' | 'Professional' | 'Other';

interface ParsedCriterion {
  id: string;
  requirementId: string;
  bulletIndex: number;
  text: string;
  type: CriterionType;
  requiredYears?: number;
  experienceField?: string;
  requiredEducationLevel?: EducationLevel;
}

interface CriterionScore {
  criterionId: string;
  criterionText: string;
  type: CriterionType;
  score: number;
  passed: boolean;
  evidence: string;
  confidence: number;
  details?: {
    required?: string;
    candidateHas?: string;
  };
}

interface ScoringResult {
  criteria: CriterionScore[];
  educationScore: CriterionScore | null;
  overallScore: number;
  passedCount: number;
  totalCount: number;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

// =============================================================================
// Criterion Parsing (mirrors src/lib/criterionScoring.ts)
// =============================================================================

function categorizeCriterion(text: string): CriterionType {
  const lowerText = text.toLowerCase();
  
  if (/(\d+)\s*[\(\)]*\s*years?\s*(of\s+)?(experience|work)/i.test(text) ||
      /at\s+least\s+\w+\s*\(\d+\)\s*years/i.test(text) ||
      /minimum\s+(of\s+)?\d+\s*years/i.test(text)) {
    return 'years_experience';
  }
  
  if (lowerText.includes('degree') || 
      lowerText.includes('education') ||
      lowerText.includes('university') ||
      lowerText.includes("bachelor") ||
      lowerText.includes("master") ||
      lowerText.includes('phd')) {
    return 'education';
  }
  
  if (lowerText.startsWith('proven experience') ||
      lowerText.startsWith('demonstrated experience') ||
      lowerText.includes('experience managing') ||
      lowerText.includes('experience in ') ||
      lowerText.includes('experience with ')) {
    return 'specific_experience';
  }
  
  if (lowerText.includes('experience preparing') ||
      lowerText.includes('experience developing') ||
      lowerText.includes('experience drafting') ||
      lowerText.includes('experience in the preparation') ||
      lowerText.includes('experience in the development')) {
    return 'output_experience';
  }
  
  if (lowerText.startsWith('knowledge of') ||
      lowerText.startsWith('strong knowledge') ||
      lowerText.includes('understanding of')) {
    return 'knowledge';
  }
  
  if (lowerText.includes('skills') ||
      lowerText.startsWith('excellent') ||
      (lowerText.startsWith('strong') && !lowerText.includes('knowledge'))) {
    return 'skill';
  }
  
  if (lowerText.startsWith('ability to') ||
      lowerText.includes('able to')) {
    return 'ability';
  }
  
  return 'attribute';
}

function parseExperienceYears(text: string): number {
  if (!text) return 0;
  const lowerText = text.toLowerCase();
  
  const patterns = [
    /(\d+)\s*[-–]\s*(\d+)\s*years?/i,
    /at\s+least\s+(\w+)\s*\((\d+)\)/i,
    /minimum\s+of?\s*(\d+)\s*years?/i,
    /(\d+)\+?\s*years?/i,
  ];
  
  const wordToNum: Record<string, number> = {
    'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'fifteen': 15, 'twenty': 20
  };
  
  const rangeMatch = lowerText.match(patterns[0]);
  if (rangeMatch) return parseInt(rangeMatch[2], 10);
  
  const atLeastMatch = lowerText.match(patterns[1]);
  if (atLeastMatch) return parseInt(atLeastMatch[2], 10);
  
  const minMatch = lowerText.match(patterns[2]);
  if (minMatch) return parseInt(minMatch[1], 10);
  
  const simpleMatch = lowerText.match(patterns[3]);
  if (simpleMatch) return parseInt(simpleMatch[1], 10);
  
  for (const [word, num] of Object.entries(wordToNum)) {
    if (lowerText.includes(word)) return num;
  }
  
  return 0;
}

function extractExperienceField(text: string): string {
  let field = text
    .replace(/at\s+least\s+\w+\s*\(\d+\)\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/minimum\s+(of\s+)?\d+\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/\d+\+?\s*years?\s*(of\s+)?(experience\s+)?/gi, '')
    .replace(/^(in|within|of)\s+/i, '')
    .trim();
  
  field = field.replace(/^(in|within|of|working|related to)\s+/i, '').trim();
  return field || 'relevant field';
}

function parseEducationLevel(text: string): EducationLevel {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('advanced') || 
      lowerText.includes("master") ||
      lowerText.includes('phd') ||
      lowerText.includes('doctorate')) {
    return 'Advanced University';
  }
  
  if (lowerText.includes('first level') ||
      lowerText.includes('university degree') ||
      lowerText.includes("bachelor")) {
    return 'First Level University';
  }
  
  if (lowerText.includes('secondary') ||
      lowerText.includes('high school')) {
    return 'Secondary';
  }
  
  return 'First Level University';
}

function parseBulletPoints(description: string): string[] {
  if (!description) return [];
  return description
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- ') || line.startsWith('• ') || line.match(/^\d+\.\s/))
    .map(line => line.replace(/^[-•]\s*/, '').replace(/^\d+\.\s*/, '').trim())
    .filter(line => line.length > 0);
}

function parseEssentialCriteria(requirements: any[]): ParsedCriterion[] {
  const parsedCriteria: ParsedCriterion[] = [];
  
  const essentialReqs = requirements.filter(r => 
    r.category === 'Essential Criteria' || 
    r.category === 'essential' ||
    r.must_have === true
  );
  
  essentialReqs.forEach(req => {
    const bullets = parseBulletPoints(req.description || '');
    
    if (bullets.length > 0) {
      bullets.forEach((bullet, index) => {
        const type = categorizeCriterion(bullet);
        const criterion: ParsedCriterion = {
          id: `${req.id}-${index}`,
          requirementId: req.id,
          bulletIndex: index,
          text: bullet,
          type
        };
        
        if (type === 'years_experience') {
          criterion.requiredYears = parseExperienceYears(bullet);
          criterion.experienceField = extractExperienceField(bullet);
        } else if (type === 'education') {
          criterion.requiredEducationLevel = parseEducationLevel(bullet);
        }
        
        parsedCriteria.push(criterion);
      });
    } else if (req.title) {
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

// =============================================================================
// Experience Calculation (mirrors src/lib/stepDetermination.ts)
// =============================================================================

function calculateTotalExperienceYears(experience: any[]): number {
  let totalMonths = 0;
  
  for (const exp of experience) {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    
    if (exp.period_from_year) {
      const month = exp.period_from_month ? parseInt(exp.period_from_month) - 1 : 0;
      startDate = new Date(parseInt(exp.period_from_year), month, 1);
      
      if (exp.is_present) {
        endDate = new Date();
      } else if (exp.period_to_year) {
        const toMonth = exp.period_to_month ? parseInt(exp.period_to_month) - 1 : 11;
        endDate = new Date(parseInt(exp.period_to_year), toMonth, 28);
      }
    } else if (exp.startDate) {
      startDate = new Date(exp.startDate);
      endDate = exp.isCurrent || !exp.endDate ? new Date() : new Date(exp.endDate);
    } else if (exp.start_date) {
      startDate = new Date(exp.start_date);
      endDate = exp.is_current || !exp.end_date ? new Date() : new Date(exp.end_date);
    }
    
    if (!startDate || isNaN(startDate.getTime())) continue;
    if (!endDate || isNaN(endDate.getTime())) continue;
    
    const months = (endDate.getFullYear() - startDate.getFullYear()) * 12 
      + (endDate.getMonth() - startDate.getMonth());
    totalMonths += Math.max(0, months);
  }
  
  return Math.round(totalMonths / 12 * 10) / 10;
}

// =============================================================================
// Education Check (mirrors src/lib/educationUtils.ts)
// =============================================================================

const DEGREE_TYPE_LEVELS: Record<string, EducationLevel> = {
  'High School Diploma': 'Secondary',
  'Secondary Education Certificate': 'Secondary',
  'A-Levels': 'Secondary',
  "Bachelor's Degree": 'First Level University',
  "Bachelor's Degree (Honors)": 'First Level University',
  "Master's Degree": 'Advanced University',
  'PhD': 'Advanced University',
  'Post-Doctoral': 'Advanced University',
  'Professional Certificate': 'Professional',
  "Bachelor's": 'First Level University',
  "Master's": 'Advanced University',
  'JD': 'Advanced University',
  'LLB': 'First Level University',
  'LLM': 'Advanced University',
};

function getEducationLevel(degreeType: string): EducationLevel {
  return DEGREE_TYPE_LEVELS[degreeType] || 'Other';
}

function getHighestEducationLevel(educationEntries: Array<{ degree_type: string }>): EducationLevel {
  if (!educationEntries.length) return 'Other';
  
  const levels = educationEntries.map(entry => getEducationLevel(entry.degree_type));
  
  if (levels.includes('Advanced University')) return 'Advanced University';
  if (levels.includes('First Level University')) return 'First Level University';
  if (levels.includes('Professional')) return 'Professional';
  if (levels.includes('Secondary')) return 'Secondary';
  return 'Other';
}

const LEVEL_HIERARCHY: Record<EducationLevel, number> = {
  'Other': 0,
  'Secondary': 1,
  'Professional': 2,
  'First Level University': 3,
  'Advanced University': 4
};

function checkEducationEligibility(
  candidateEducation: Array<{ degree_type: string, is_completed: boolean }>,
  requiredLevel: EducationLevel
): { eligible: boolean; candidateLevel: EducationLevel; details: string } {
  const completedEducation = candidateEducation.filter(edu => edu.is_completed);
  const candidateLevel = getHighestEducationLevel(completedEducation);
  
  const eligible = LEVEL_HIERARCHY[candidateLevel] >= LEVEL_HIERARCHY[requiredLevel];
  
  const details = eligible
    ? `Candidate has ${candidateLevel} education, meeting the requirement for ${requiredLevel}`
    : `Candidate has ${candidateLevel} education, which does not meet the requirement for ${requiredLevel}`;
  
  return { eligible, candidateLevel, details };
}

// =============================================================================
// AI Relevance Check (focused prompt for specific criteria)
// =============================================================================

async function checkCriterionWithAI(
  criterion: ParsedCriterion,
  candidateDuties: string,
  motivationLetter: string
): Promise<{ demonstrated: boolean; evidence: string; confidence: number }> {
  if (!openAIApiKey) {
    return { demonstrated: false, evidence: 'AI analysis unavailable', confidence: 0.3 };
  }

  const prompt = `Determine if this candidate's experience demonstrates the following criterion:

CRITERION: "${criterion.text}"

CANDIDATE'S WORK EXPERIENCE (duties and responsibilities from PHF):
${candidateDuties || 'Not provided'}

MOTIVATION LETTER:
${motivationLetter || 'Not provided'}

Analyze carefully and return ONLY a JSON object:
{
  "demonstrated": true or false,
  "evidence": "Direct quote or specific reference from candidate's text that shows this criterion is met. If not met, explain what's missing.",
  "confidence": 0.0 to 1.0
}

Be strict but fair. The evidence must clearly demonstrate the criterion.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert HR analyst. Evaluate candidates objectively against specific criteria. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 500,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API error:', response.status);
      return { demonstrated: false, evidence: 'AI analysis failed', confidence: 0.3 };
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      return { demonstrated: false, evidence: 'No AI response', confidence: 0.3 };
    }

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    return { demonstrated: false, evidence: 'Could not parse AI response', confidence: 0.3 };
  } catch (error) {
    console.error('AI check error:', error);
    return { demonstrated: false, evidence: 'AI analysis error', confidence: 0.3 };
  }
}

// =============================================================================
// Scoring Functions
// =============================================================================

function scoreYearsExperience(
  criterion: ParsedCriterion,
  candidateExperience: any[],
  relevanceResult?: { demonstrated: boolean; evidence: string; confidence: number }
): CriterionScore {
  const totalYears = calculateTotalExperienceYears(candidateExperience);
  const requiredYears = criterion.requiredYears || 0;
  
  const meetsYearsRequirement = totalYears >= requiredYears;
  
  let score = 0;
  if (meetsYearsRequirement) {
    const excessYears = totalYears - requiredYears;
    score = Math.min(100, 70 + (excessYears * 5));
  } else {
    const ratio = totalYears / Math.max(1, requiredYears);
    score = Math.round(ratio * 60);
  }
  
  // Adjust based on relevance
  if (relevanceResult) {
    if (!relevanceResult.demonstrated && score > 50) {
      score = Math.round(score * 0.7);
    } else if (relevanceResult.demonstrated) {
      score = Math.min(100, score + 10);
    }
  }
  
  const passed = meetsYearsRequirement && (!relevanceResult || relevanceResult.demonstrated);
  
  return {
    criterionId: criterion.id,
    criterionText: criterion.text,
    type: 'years_experience',
    score,
    passed,
    evidence: relevanceResult?.evidence || 
      `Candidate has ${totalYears.toFixed(1)} years of experience (required: ${requiredYears} years)`,
    confidence: relevanceResult?.confidence || 0.7,
    details: {
      required: `${requiredYears} years in ${criterion.experienceField}`,
      candidateHas: `${totalYears.toFixed(1)} years total experience`
    }
  };
}

function scoreEducation(
  criterion: ParsedCriterion,
  candidateEducation: any[]
): CriterionScore {
  const requiredLevel = criterion.requiredEducationLevel || 'First Level University';
  
  const normalizedEducation = candidateEducation.map(edu => ({
    degree_type: edu.degree_type || edu.degree || '',
    is_completed: edu.is_completed ?? edu.isCompleted ?? true
  }));
  
  const result = checkEducationEligibility(normalizedEducation, requiredLevel);
  
  const score = result.eligible ? 100 : 40;
  
  return {
    criterionId: criterion.id,
    criterionText: criterion.text,
    type: 'education',
    score,
    passed: result.eligible,
    evidence: result.details,
    confidence: 0.95,
    details: {
      required: requiredLevel,
      candidateHas: result.candidateLevel
    }
  };
}

async function scoreOtherCriterion(
  criterion: ParsedCriterion,
  candidateDuties: string,
  motivationLetter: string
): Promise<CriterionScore> {
  const aiResult = await checkCriterionWithAI(criterion, candidateDuties, motivationLetter);
  
  let score = aiResult.demonstrated ? 80 : 30;
  if (aiResult.confidence > 0.8 && aiResult.demonstrated) {
    score = 90;
  } else if (aiResult.confidence < 0.5) {
    score = 50; // Uncertain
  }
  
  return {
    criterionId: criterion.id,
    criterionText: criterion.text,
    type: criterion.type,
    score,
    passed: aiResult.demonstrated,
    evidence: aiResult.evidence,
    confidence: aiResult.confidence
  };
}

function extractCandidateDuties(workExperience: any[]): string {
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

function calculateScoringResult(
  criteriaScores: CriterionScore[],
  educationScore: CriterionScore | null
): ScoringResult {
  const allScores = educationScore 
    ? [...criteriaScores, educationScore]
    : criteriaScores;
  
  const passedCount = allScores.filter(s => s.passed).length;
  const totalCount = allScores.length;
  
  let totalWeight = 0;
  let weightedSum = 0;
  
  allScores.forEach(score => {
    const weight = score.type === 'years_experience' || score.type === 'education' ? 2 : 1;
    weightedSum += score.score * weight;
    totalWeight += weight;
  });
  
  const overallScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
  
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

// =============================================================================
// Main Handler
// =============================================================================

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { applicationId } = await req.json();

    if (!applicationId) {
      return new Response(
        JSON.stringify({ error: 'Application ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting criterion-based scoring for application: ${applicationId}`);

    // Fetch application with related data
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select(`
        *,
        candidates(*),
        jobs!inner(
          id,
          title,
          description_md,
          requirements_md,
          essential_education_level,
          job_requirements(*)
        )
      `)
      .eq('id', applicationId)
      .single();

    if (appError || !application) {
      console.error('Error fetching application:', appError);
      return new Response(
        JSON.stringify({ error: 'Application not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found application for job: ${application.jobs.title}`);

    // Parse essential criteria from job_requirements
    const parsedCriteria = parseEssentialCriteria(application.jobs.job_requirements || []);
    console.log(`Parsed ${parsedCriteria.length} essential criteria`);

    // Prepare candidate data
    const candidateData = application.candidates;
    const workExperience = candidateData.phf_work_experience || candidateData.work_experience || [];
    const education = candidateData.phf_education || candidateData.education || [];
    const motivationLetter = candidateData.motivation_letter || 
      application.answers?.motivation_letter || 
      application.phf_data?.motivation_letter || '';
    
    const candidateDuties = extractCandidateDuties(workExperience);

    console.log(`Candidate data: ${workExperience.length} work experiences, ${education.length} education entries`);

    // Score each criterion
    const criteriaScores: CriterionScore[] = [];
    let educationScore: CriterionScore | null = null;

    for (const criterion of parsedCriteria) {
      console.log(`Scoring criterion: ${criterion.type} - "${criterion.text.substring(0, 50)}..."`);
      
      if (criterion.type === 'years_experience') {
        // First do deterministic years check
        const yearsScore = scoreYearsExperience(criterion, workExperience);
        
        // If years pass, do AI relevance check
        if (yearsScore.passed) {
          const relevanceResult = await checkCriterionWithAI(criterion, candidateDuties, motivationLetter);
          const finalScore = scoreYearsExperience(criterion, workExperience, {
            demonstrated: relevanceResult.demonstrated,
            evidence: relevanceResult.evidence,
            confidence: relevanceResult.confidence
          });
          criteriaScores.push(finalScore);
        } else {
          criteriaScores.push(yearsScore);
        }
      } else if (criterion.type === 'education') {
        // Deterministic education check
        educationScore = scoreEducation(criterion, education);
      } else {
        // AI-based check for other criteria
        const score = await scoreOtherCriterion(criterion, candidateDuties, motivationLetter);
        criteriaScores.push(score);
      }
    }

    // If no education criterion found in bullets, check job's essential_education_level
    if (!educationScore && application.jobs.essential_education_level) {
      const eduCriterion: ParsedCriterion = {
        id: 'job-education-level',
        requirementId: 'job-education-level',
        bulletIndex: 0,
        text: `Required education: ${application.jobs.essential_education_level}`,
        type: 'education',
        requiredEducationLevel: application.jobs.essential_education_level as EducationLevel
      };
      educationScore = scoreEducation(eduCriterion, education);
    }

    // Calculate overall result
    const result = calculateScoringResult(criteriaScores, educationScore);

    console.log(`Scoring complete: ${result.passedCount}/${result.totalCount} passed, overall: ${result.overallScore}, recommend: ${result.recommendForLonglist}`);

    // Save to database
    const { error: saveError } = await supabase
      .from('screening_scores')
      .upsert({
        application_id: applicationId,
        rubric_breakdown: result,
        total_score: result.overallScore,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'application_id'
      });

    if (saveError) {
      console.error('Error saving scores:', saveError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        result,
        message: `Scored ${result.totalCount} criteria. ${result.passedCount} passed. ${result.recommendForLonglist ? 'Recommended for longlist.' : 'Not recommended.'}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Scoring error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
