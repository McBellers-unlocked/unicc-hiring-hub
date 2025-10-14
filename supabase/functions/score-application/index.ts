import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
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

interface JobRequirements {
  technical_skills: string[];
  experience_areas: string[];
  education_requirements: string[];
  language_requirements: string[];
  soft_skills: string[];
  years_experience: number;
}

interface CandidateAnalysis {
  technical_match: number;
  experience_match: number;
  education_match: number;
  language_match: number;
  motivation_alignment: number;
  overall_fit: number;
  strengths: string[];
  gaps: string[];
  evidence: string[];
}

interface CriterionScore {
  score: number;
  evidence: string;
  confidence: number;
  weight: number;
  mustHave: boolean;
}

interface ScoringBreakdown {
  criteria: Record<string, CriterionScore>;
  overallScore: number;
  passedMustHaves: boolean;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

const extractTextFromFiles = async (files: Record<string, string>): Promise<string> => {
  // In a real implementation, you would extract text from PDF/DOC files
  // For now, we'll simulate this by returning a placeholder
  const fileContents = Object.entries(files).map(([type, path]) => {
    return `[${type.toUpperCase()} FILE: ${path}]`;
  }).join('\n');
  
  return fileContents;
};

const extractJobRequirements = async (
  jobTitle: string,
  jobDescription: string,
  essentialCriteria: any[]
): Promise<JobRequirements> => {
  const prompt = `
Analyze this job posting and extract structured requirements:

JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}

ESSENTIAL CRITERIA:
${JSON.stringify(essentialCriteria, null, 2)}

Extract and return ONLY a JSON object with this structure:
{
  "technical_skills": ["list of specific technical skills and software required"],
  "experience_areas": ["list of relevant work experience areas"],
  "education_requirements": ["education level and field requirements"],
  "language_requirements": ["language skills needed"],
  "soft_skills": ["communication, leadership, analytical skills etc"],
  "years_experience": <minimum years of experience as number>
}

Focus on concrete, specific requirements mentioned in the job posting.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert at analyzing job requirements and extracting structured data.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as JobRequirements;

  } catch (error) {
    console.error('Error extracting job requirements:', error);
    return {
      technical_skills: [],
      experience_areas: [],
      education_requirements: [],
      language_requirements: [],
      soft_skills: [],
      years_experience: 0
    };
  }
};

const analyzeApplicationWithAI = async (
  jobRequirements: JobRequirements,
  candidateData: any,
  motivationLetter: string,
  workExperience: any[],
  education: any[],
  skills: string[]
): Promise<CandidateAnalysis> => {
  const prompt = `
Compare this candidate against the job requirements and provide a detailed match analysis.

JOB REQUIREMENTS:
${JSON.stringify(jobRequirements, null, 2)}

CANDIDATE PROFILE:
Name: ${candidateData.name}
Professional Summary: ${candidateData.professional_summary || 'Not provided'}
Current Position: ${candidateData.current_position || 'Not provided'}
Years of Experience: ${candidateData.years_of_experience || 0}

WORK EXPERIENCE (${workExperience.length} positions):
${JSON.stringify(workExperience, null, 2)}

EDUCATION (${education.length} degrees):
${JSON.stringify(education, null, 2)}

SKILLS:
${JSON.stringify(skills, null, 2)}

MOTIVATION LETTER:
${motivationLetter || 'Not provided'}

LANGUAGES:
${JSON.stringify(candidateData.languages, null, 2)}

SCORING GUIDELINES:
- Education Match (0-100):
  * 100: Exact match in field (e.g., Cybersecurity degree for Cybersecurity role)
  * 90-95: Closely related field (e.g., Computer Science, Information Technology, Information Security for Cybersecurity role)
  * 80-85: Related technical field (e.g., Engineering, Mathematics for technical roles)
  * 70-75: Degree level matches but field is different
  * Below 70: Missing required education level or field
  
- Experience Match (0-100):
  * 100: Years of experience significantly exceeds requirement AND all experience is directly relevant
  * 90-95: Meets years requirement with highly relevant experience in the specific area
  * 80-85: Meets years requirement with related experience
  * 70-75: Close to meeting years requirement or has relevant experience but fewer years
  * Below 70: Does not meet minimum years or lacks relevant experience

- For Cybersecurity roles specifically:
  * Penetration Testing, Security Testing, Offensive Security, Ethical Hacking, SOC, Cloud Security = 100% relevant
  * General cybersecurity, Information Security, Security Analyst = 95% relevant
  * IT Security, Network Security = 90% relevant

Analyze the candidate thoroughly and return ONLY a JSON object with this structure:
{
  "technical_match": <score 0-100 for technical skills alignment>,
  "experience_match": <score 0-100 based on years AND relevance of experience>,
  "education_match": <score 0-100 considering related fields as high scores>,
  "language_match": <score 0-100 for language requirements match>,
  "motivation_alignment": <score 0-100 for motivation and cultural fit>,
  "overall_fit": <score 0-100 for overall candidate fit>,
  "strengths": ["list of 3-5 key candidate strengths with specific evidence"],
  "gaps": ["list of 2-4 areas where candidate may not fully meet requirements, or write 'None identified' if candidate is strong"],
  "evidence": ["list of 4-6 specific pieces of evidence supporting the scores, including degree names, job titles, and years of experience"]
}

Be objective but fair. If a candidate has Computer Science or Information Technology degree for a Cybersecurity role, score education 90-95, not 50.
`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR analyst with deep experience in matching candidates to job requirements. Provide thorough, evidence-based analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    return JSON.parse(content) as CandidateAnalysis;

  } catch (error) {
    console.error('Error analyzing candidate:', error);
    return {
      technical_match: 50,
      experience_match: 50,
      education_match: 50,
      language_match: 50,
      motivation_alignment: 50,
      overall_fit: 50,
      strengths: ['Assessment unavailable'],
      gaps: ['Unable to analyze'],
      evidence: ['Analysis failed']
    };
  }
};

const mapAnalysisToScores = (
  analysis: CandidateAnalysis,
  essentialCriteria: any[]
): Record<string, CriterionScore> => {
  const scores: Record<string, CriterionScore> = {};

  // Create scores for each essential criterion based on the analysis
  essentialCriteria.forEach(criterion => {
    let score = 50; // Default score
    let evidence = 'Analysis pending';
    
    // Map criterion to relevant analysis dimension
    const label = criterion.label.toLowerCase();
    
    if (label.includes('technical') || label.includes('software') || label.includes('tool')) {
      score = analysis.technical_match;
      evidence = `Technical skills match: ${score}/100. Key strengths: ${analysis.strengths.filter(s => s.toLowerCase().includes('technical') || s.toLowerCase().includes('software')).join(', ') || 'General technical competency'}`;
    } else if (label.includes('experience') || label.includes('years')) {
      score = analysis.experience_match;
      evidence = `Experience match: ${score}/100. Relevant background in: ${analysis.strengths.filter(s => s.toLowerCase().includes('experience')).join(', ') || 'Professional experience areas'}`;
    } else if (label.includes('education') || label.includes('degree') || label.includes('qualification')) {
      score = analysis.education_match;
      evidence = `Education match: ${score}/100. ${analysis.evidence.filter(e => e.toLowerCase().includes('education') || e.toLowerCase().includes('degree')).join('. ') || 'Educational background assessed'}`;
    } else if (label.includes('language') || label.includes('english') || label.includes('communication')) {
      score = analysis.language_match;
      evidence = `Language skills match: ${score}/100. ${analysis.evidence.filter(e => e.toLowerCase().includes('language') || e.toLowerCase().includes('english')).join('. ') || 'Communication skills evaluated'}`;
    } else {
      // For other criteria, use overall fit
      score = analysis.overall_fit;
      evidence = `Overall fit assessment: ${score}/100. ${analysis.evidence[0] || 'General competency evaluation'}`;
    }
    
    scores[criterion.id] = {
      score: Math.round(score),
      evidence: evidence,
      confidence: score > 70 ? 0.9 : score > 50 ? 0.7 : 0.5,
      weight: criterion.weight || 1,
      mustHave: criterion.must_have || false
    };
  });

  // If no essential criteria, create default scores based on analysis
  if (essentialCriteria.length === 0) {
    scores['technical_skills'] = {
      score: Math.round(analysis.technical_match),
      evidence: `Technical competency: ${analysis.technical_match}/100`,
      confidence: 0.8,
      weight: 2,
      mustHave: false
    };
    
    scores['relevant_experience'] = {
      score: Math.round(analysis.experience_match),
      evidence: `Relevant experience: ${analysis.experience_match}/100`,
      confidence: 0.8,
      weight: 3,
      mustHave: true
    };
    
    scores['education_background'] = {
      score: Math.round(analysis.education_match),
      evidence: `Educational background: ${analysis.education_match}/100`,
      confidence: 0.7,
      weight: 1,
      mustHave: false
    };
    
    scores['communication_skills'] = {
      score: Math.round(analysis.language_match),
      evidence: `Communication skills: ${analysis.language_match}/100`,
      confidence: 0.8,
      weight: 2,
      mustHave: true
    };
    
    scores['cultural_fit'] = {
      score: Math.round(analysis.motivation_alignment),
      evidence: `Cultural fit and motivation: ${analysis.motivation_alignment}/100`,
      confidence: 0.7,
      weight: 1,
      mustHave: false
    };
  }

  return scores;
};

const calculateOverallScore = (scores: Record<string, CriterionScore>): number => {
  let totalWeightedScore = 0;
  let totalWeight = 0;

  Object.values(scores).forEach(criterionScore => {
    totalWeightedScore += criterionScore.score * criterionScore.weight;
    totalWeight += criterionScore.weight;
  });

  return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;
};

const checkMustHaveRequirements = (scores: Record<string, CriterionScore>): boolean => {
  return Object.values(scores).every(criterionScore => {
    if (criterionScore.mustHave) {
      return criterionScore.score >= 70;
    }
    return true;
  });
};

serve(async (req) => {
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

    console.log(`Starting scoring for application: ${applicationId}`);

    // Fetch application with related data including job description
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
          essential_criteria(*)
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

    // Extract job requirements from job description and essential criteria
    console.log('Extracting job requirements...');
    const jobDescription = `${application.jobs.description_md || ''}\n\n${application.jobs.requirements_md || ''}`;
    const jobRequirements = await extractJobRequirements(
      application.jobs.title,
      jobDescription,
      application.jobs.essential_criteria || []
    );

    console.log('Job requirements extracted:', jobRequirements);

    // Prepare candidate data for comprehensive analysis
    const candidateData = application.candidates;
    const workExperience = candidateData.work_experience || candidateData.phf_work_experience || [];
    const education = candidateData.education || candidateData.phf_education || [];
    const skills = candidateData.skills || [];
    
    // Log what we're sending to AI for debugging
    console.log('Candidate data being analyzed:', {
      name: candidateData.name,
      yearsOfExperience: candidateData.years_of_experience,
      educationCount: education.length,
      workExperienceCount: workExperience.length,
      education: education.map((e: any) => `${e.degree} in ${e.field} from ${e.institution}`),
      workExperience: workExperience.map((w: any) => `${w.position} at ${w.company} (${w.description?.substring(0, 100)}...)`)
    });
    
    // Extract motivation letter from various possible sources
    const motivationLetter = 
      candidateData.motivation_letter || 
      application.answers?.motivation_letter || 
      application.answers?.cover_letter || 
      application.phf_data?.motivation_letter || 
      '';

    // Analyze candidate comprehensively
    console.log('Analyzing candidate with enhanced AI...');
    const candidateAnalysis = await analyzeApplicationWithAI(
      jobRequirements,
      candidateData,
      motivationLetter,
      workExperience,
      education,
      skills
    );

    console.log('AI analysis completed:', candidateAnalysis);

    // Map analysis to criterion scores
    const criteriaScores = mapAnalysisToScores(
      candidateAnalysis,
      application.jobs.essential_criteria || []
    );

    console.log('Mapped criteria scores:', criteriaScores);

    // Calculate overall score and check requirements
    const overallScore = calculateOverallScore(criteriaScores);
    const passedMustHaves = checkMustHaveRequirements(criteriaScores);
    const recommendForLonglist = overallScore >= 70 && passedMustHaves;

    console.log(`Overall score: ${overallScore}, Passed must-haves: ${passedMustHaves}, Recommend: ${recommendForLonglist}`);
    console.log('Score calculation details:', {
      totalCriteria: Object.keys(criteriaScores).length,
      criteriaScores: Object.entries(criteriaScores).map(([key, value]) => ({
        criterion: key,
        score: value.score,
        weight: value.weight,
        mustHave: value.mustHave
      }))
    });

    const breakdown = {
      criteria: criteriaScores,
      overallScore,
      passedMustHaves,
      recommendForLonglist,
      analysisVersion: '2.0',
      jobRequirements,
      candidateAnalysis: {
        strengths: candidateAnalysis.strengths,
        gaps: candidateAnalysis.gaps,
        evidence: candidateAnalysis.evidence,
        detailedScores: {
          technical_match: candidateAnalysis.technical_match,
          experience_match: candidateAnalysis.experience_match,
          education_match: candidateAnalysis.education_match,
          language_match: candidateAnalysis.language_match,
          motivation_alignment: candidateAnalysis.motivation_alignment,
          overall_fit: candidateAnalysis.overall_fit
        }
      }
    };

    console.log('Saving screening score with breakdown:', {
      application_id: applicationId,
      ai_score: overallScore,
      version: '2.0',
      breakdown_keys: Object.keys(breakdown)
    });

    // Create screening score record
    const { data: scoreData, error: scoreError } = await supabase
      .from('screening_scores')
      .insert({
        application_id: applicationId,
        ai_score: overallScore,
        rubric_breakdown: breakdown,
        version: '2.0'
      })
      .select();

    if (scoreError) {
      console.error('Error creating screening score:', scoreError);
      return new Response(
        JSON.stringify({ error: 'Failed to save screening score', details: scoreError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Screening score saved successfully:', scoreData);

    // Update application with longlist recommendation
    console.log('Updating application with longlist recommendation:', recommendForLonglist);
    const { data: updateData, error: updateError } = await supabase
      .from('applications')
      .update({
        suggested_for_longlist: recommendForLonglist
      })
      .eq('id', applicationId)
      .select();

    if (updateError) {
      console.error('Error updating application:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return new Response(
        JSON.stringify({ error: 'Failed to update application', details: updateError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Application updated successfully:', updateData);

    console.log(`Application scoring completed successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        applicationId,
        aiScore: overallScore,
        recommendForLonglist,
        breakdown
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in score-application function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});