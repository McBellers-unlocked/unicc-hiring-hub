import { supabase } from "@/integrations/supabase/client";

interface JobRequirement {
  skills: string[];
  experience_years?: number;
  education_level?: string;
  languages?: string[];
  un_experience?: boolean;
}

interface CandidateProfile {
  skills: string[];
  years_of_experience?: number;
  education: Array<{degree: string}>;
  languages: {
    un_languages: Record<string, string>;
    other_languages: Array<{language: string}>;
  };
  un_experience: boolean;
  work_experience: Array<{isUNExperience: boolean}>;
}

interface JobMatch {
  jobId: string;
  title: string;
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  recommendations: string[];
}

export class JobMatchingService {
  static calculateJobMatch(candidate: CandidateProfile, jobRequirement: JobRequirement): {
    matchPercentage: number;
    matchedSkills: string[];
    missingSkills: string[];
    strengths: string[];
    recommendations: string[];
  } {
    let totalScore = 0;
    let maxScore = 0;
    const matchedSkills: string[] = [];
    const missingSkills: string[] = [];
    const strengths: string[] = [];
    const recommendations: string[] = [];

    // Skills matching (40% weight)
    const skillsWeight = 40;
    if (jobRequirement.skills?.length > 0) {
      const candidateSkills = candidate.skills.map(s => s.toLowerCase());
      const requiredSkills = jobRequirement.skills.map(s => s.toLowerCase());
      
      requiredSkills.forEach(skill => {
        if (candidateSkills.includes(skill)) {
          matchedSkills.push(skill);
          totalScore += skillsWeight / requiredSkills.length;
        } else {
          missingSkills.push(skill);
        }
      });
      
      maxScore += skillsWeight;
    }

    // Experience matching (25% weight)
    const experienceWeight = 25;
    if (jobRequirement.experience_years) {
      const candidateExp = candidate.years_of_experience || 0;
      if (candidateExp >= jobRequirement.experience_years) {
        totalScore += experienceWeight;
        strengths.push(`${candidateExp} years of experience (requires ${jobRequirement.experience_years})`);
      } else {
        const gap = jobRequirement.experience_years - candidateExp;
        recommendations.push(`Gain ${gap} more years of relevant experience`);
      }
      maxScore += experienceWeight;
    }

    // Education matching (15% weight)
    const educationWeight = 15;
    if (jobRequirement.education_level) {
      const educationLevels = ['Associate', 'Bachelor\'s', 'Master\'s', 'PhD'];
      const requiredLevel = educationLevels.indexOf(jobRequirement.education_level);
      const candidateHighestLevel = Math.max(
        ...candidate.education.map(edu => educationLevels.indexOf(edu.degree))
      );
      
      if (candidateHighestLevel >= requiredLevel) {
        totalScore += educationWeight;
        strengths.push(`Education level meets requirements`);
      } else {
        recommendations.push(`Consider pursuing ${jobRequirement.education_level} degree`);
      }
      maxScore += educationWeight;
    }

    // UN Experience matching (10% weight)
    const unExperienceWeight = 10;
    if (jobRequirement.un_experience) {
      const hasUNExp = candidate.un_experience || 
        candidate.work_experience.some(exp => exp.isUNExperience);
      
      if (hasUNExp) {
        totalScore += unExperienceWeight;
        strengths.push('UN system experience');
      } else {
        recommendations.push('Gain experience in UN system or international organizations');
      }
      maxScore += unExperienceWeight;
    }

    // Languages matching (10% weight)
    const languageWeight = 10;
    if (jobRequirement.languages?.length > 0) {
      const candidateLanguages = [
        ...Object.keys(candidate.languages?.un_languages || {}),
        ...(candidate.languages?.other_languages || []).map(l => l.language.toLowerCase())
      ].map(l => l.toLowerCase());
      
      const requiredLanguages = jobRequirement.languages.map(l => l.toLowerCase());
      const matchedLanguages = requiredLanguages.filter(lang => 
        candidateLanguages.includes(lang)
      );
      
      if (matchedLanguages.length === requiredLanguages.length) {
        totalScore += languageWeight;
        strengths.push(`All required languages: ${matchedLanguages.join(', ')}`);
      } else {
        const missingLanguages = requiredLanguages.filter(lang => 
          !candidateLanguages.includes(lang)
        );
        recommendations.push(`Improve proficiency in: ${missingLanguages.join(', ')}`);
      }
      maxScore += languageWeight;
    }

    const matchPercentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    return {
      matchPercentage,
      matchedSkills,
      missingSkills,
      strengths,
      recommendations
    };
  }

  static async getJobRecommendations(candidateProfile: CandidateProfile): Promise<JobMatch[]> {
    try {
      // Fetch active jobs from the database
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('id, title, requirements_md')
        .eq('status', 'active')
        .limit(20);

      if (error) throw error;

      const jobMatches: JobMatch[] = [];

      for (const job of jobs || []) {
        // Extract requirements from job description (simplified)
        const mockRequirement: JobRequirement = {
          skills: this.extractSkillsFromDescription(job.requirements_md || ''),
          experience_years: this.extractExperienceFromDescription(job.requirements_md || ''),
          education_level: this.extractEducationFromDescription(job.requirements_md || ''),
          un_experience: (job.requirements_md || '').toLowerCase().includes('un '),
          languages: this.extractLanguagesFromDescription(job.requirements_md || ''),
        };

        const match = this.calculateJobMatch(candidateProfile, mockRequirement);
        
        if (match.matchPercentage >= 30) { // Only show jobs with 30%+ match
          jobMatches.push({
            jobId: job.id,
            title: job.title,
            matchPercentage: match.matchPercentage,
            matchedSkills: match.matchedSkills,
            missingSkills: match.missingSkills,
            strengths: match.strengths,
            recommendations: match.recommendations,
          });
        }
      }

      // Sort by match percentage
      return jobMatches.sort((a, b) => b.matchPercentage - a.matchPercentage);

    } catch (error) {
      console.error('Error getting job recommendations:', error);
      return [];
    }
  }

  private static extractSkillsFromDescription(description: string): string[] {
    // Simplified skill extraction - in production, use NLP
    const commonSkills = [
      'project management', 'data analysis', 'communication', 'leadership',
      'microsoft office', 'excel', 'powerpoint', 'sql', 'python', 'javascript',
      'strategic planning', 'budget management', 'stakeholder engagement'
    ];
    
    const descLower = description.toLowerCase();
    return commonSkills.filter(skill => descLower.includes(skill));
  }

  private static extractExperienceFromDescription(description: string): number | undefined {
    const expMatch = description.match(/(\d+)\s*years?\s*(of\s*)?experience/i);
    return expMatch ? parseInt(expMatch[1]) : undefined;
  }

  private static extractEducationFromDescription(description: string): string | undefined {
    const descLower = description.toLowerCase();
    if (descLower.includes('phd') || descLower.includes('doctorate')) return 'PhD';
    if (descLower.includes('master')) return 'Master\'s';
    if (descLower.includes('bachelor')) return 'Bachelor\'s';
    return undefined;
  }

  private static extractLanguagesFromDescription(description: string): string[] {
    const languages = ['english', 'french', 'spanish', 'arabic', 'chinese', 'russian'];
    const descLower = description.toLowerCase();
    return languages.filter(lang => descLower.includes(lang));
  }
}