import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, GraduationCap, Briefcase, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { checkEducationEligibility, type EducationLevel } from '@/lib/educationUtils';

interface RequirementsChecklistProps {
  applicationId: string;
  jobId: string;
  phfData?: any;
  candidateInfo?: any;
}

interface Requirement {
  id: string;
  category: 'education' | 'experience' | 'skills' | 'other';
  description: string;
  met: boolean;
  evidence?: string;
  severity: 'must-have' | 'preferred';
}

export function RequirementsChecklist({ applicationId, jobId, phfData, candidateInfo }: RequirementsChecklistProps) {
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobRequirements, setJobRequirements] = useState<string>('');
  const [essentialEducationLevel, setEssentialEducationLevel] = useState<EducationLevel | null>(null);

  useEffect(() => {
    fetchJobRequirements();
  }, [jobId]);

  useEffect(() => {
    if (jobRequirements && phfData) {
      analyzeRequirements();
    }
  }, [jobRequirements, phfData]);

  const fetchJobRequirements = async () => {
    try {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('requirements_md, essential_education_level, essential_criteria(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      setJobRequirements(job.requirements_md || '');
      setEssentialEducationLevel(job.essential_education_level as EducationLevel || null);
    } catch (error) {
      console.error('Error fetching job requirements:', error);
    }
  };

  const analyzeRequirements = () => {
    const reqs: Requirement[] = [];

    // Education Analysis - prioritize structured field
    const phfEducation = phfData?.education || [];
    const candidateEducation = candidateInfo?.education || [];
    
    // Combine both education sources
    const allEducation = [...phfEducation, ...candidateEducation];
    
    if (essentialEducationLevel) {
      // Use structured education level for accurate checking
      const eligibilityResult = checkEducationEligibility(
        allEducation.map(edu => ({
          degree_type: edu.degree_or_certificate_title || edu.degree_type || edu.degreeType || '',
          is_completed: edu.is_completed !== false // Assume completed if not specified
        })),
        essentialEducationLevel
      );
      
      reqs.push({
        id: 'edu-essential',
        category: 'education',
        description: `${essentialEducationLevel} education required`,
        met: eligibilityResult.eligible,
        evidence: eligibilityResult.details,
        severity: 'must-have'
      });
    } else {
      // Fall back to text parsing for backward compatibility
      const educationReqs = extractEducationRequirements(jobRequirements);
      educationReqs.forEach(req => {
        const met = checkEducationRequirement(req, allEducation);
        reqs.push({
          id: `edu-${req.level}`,
          category: 'education',
          description: `${req.level} degree required`,
          met,
          evidence: met ? getEducationEvidence(req, allEducation) : 'No matching education found',
          severity: req.required ? 'must-have' : 'preferred'
        });
      });
    }

    // Experience Analysis - use both PHF and candidate work experience
    const experienceReqs = extractExperienceRequirements(jobRequirements);
    const phfEmployment = phfData?.employment || [];
    const candidateWorkExperience = candidateInfo?.work_experience || [];
    
    experienceReqs.forEach(req => {
      const { met, evidence } = checkExperienceRequirement(req, phfEmployment, candidateWorkExperience);
      reqs.push({
        id: `exp-${req.type}`,
        category: 'experience',
        description: `${req.years}+ years of ${req.type} experience`,
        met,
        evidence,
        severity: req.required ? 'must-have' : 'preferred'
      });
    });

    // Language Requirements
    const candidateLanguages = candidateInfo?.languages || phfData?.languages || [];
    if (candidateLanguages && Object.keys(candidateLanguages).length > 0) {
      const langReqs = extractLanguageRequirements(jobRequirements);
      langReqs.forEach(req => {
        const met = checkLanguageRequirement(req, candidateLanguages);
        reqs.push({
          id: `lang-${req.language}`,
          category: 'skills',
          description: `${req.language} proficiency (${req.level})`,
          met,
          evidence: met ? `Candidate speaks ${req.language}` : `${req.language} not listed`,
          severity: req.required ? 'must-have' : 'preferred'
        });
      });
    }

    setRequirements(reqs);
    setLoading(false);
  };

  const extractEducationRequirements = (requirements: string) => {
    const reqs = [];
    const text = requirements.toLowerCase();
    
    if (text.includes('master') || text.includes('msc') || text.includes('ma ')) {
      reqs.push({ level: 'Masters', required: text.includes('required') || text.includes('must') });
    }
    if (text.includes('bachelor') || text.includes('bsc') || text.includes('ba ') || text.includes('degree')) {
      reqs.push({ level: 'Bachelors', required: true });
    }
    if (text.includes('phd') || text.includes('doctorate')) {
      reqs.push({ level: 'PhD', required: text.includes('required') || text.includes('must') });
    }

    return reqs;
  };

  const extractExperienceRequirements = (requirements: string) => {
    const reqs = [];
    const text = requirements.toLowerCase();
    
    // Look for experience patterns like "5+ years", "minimum 3 years", etc.
    const experienceMatches = text.match(/(\d+)[\+\s]*years?\s+(?:of\s+)?([^.\n]+)/g);
    
    if (experienceMatches) {
      experienceMatches.forEach(match => {
        const years = parseInt(match.match(/\d+/)?.[0] || '0');
        const type = match.replace(/\d+[\+\s]*years?\s+(?:of\s+)?/i, '').trim();
        
        if (years > 0) {
          reqs.push({
            years,
            type: type.charAt(0).toUpperCase() + type.slice(1),
            required: match.includes('required') || match.includes('minimum') || match.includes('must')
          });
        }
      });
    }

    return reqs;
  };

  const extractLanguageRequirements = (requirements: string) => {
    const reqs = [];
    const text = requirements.toLowerCase();
    
    ['english', 'french', 'spanish', 'german', 'italian', 'portuguese', 'arabic', 'chinese', 'russian'].forEach(lang => {
      if (text.includes(lang)) {
        const required = text.includes(`${lang}`) && (text.includes('required') || text.includes('must') || text.includes('fluent'));
        reqs.push({
          language: lang.charAt(0).toUpperCase() + lang.slice(1),
          level: text.includes('fluent') || text.includes('native') ? 'Fluent' : 'Conversational',
          required
        });
      }
    });

    return reqs;
  };

  const checkEducationRequirement = (req: any, education: any[]) => {
    if (!education || education.length === 0) return false;
    
    // Check both PHF format and candidate profile format
    return education.some(edu => {
      const degreeTitle = (edu.degree_or_certificate_title || edu.degree_type || edu.degreeType || '').toLowerCase();
      const study = (edu.main_course_of_study || edu.field_of_study || edu.fieldOfStudy || '').toLowerCase();
      
      // Check for the specific requirement
      let hasRequiredLevel = false;
      
      switch (req.level) {
        case 'Masters':
          hasRequiredLevel = degreeTitle.includes('master') || degreeTitle.includes('msc') || 
                            degreeTitle.includes('ma ') || degreeTitle.includes('mba') ||
                            degreeTitle.includes('llm') || degreeTitle.includes('phd') || 
                            degreeTitle.includes('doctorate');
          break;
        case 'Bachelors':
          // If candidate has Master's, LLM, or PhD, they also satisfy Bachelor's requirement
          hasRequiredLevel = degreeTitle.includes('bachelor') || degreeTitle.includes('bsc') || 
                            degreeTitle.includes('ba ') || degreeTitle.includes('degree') || 
                            degreeTitle.includes('diploma') || degreeTitle.includes('master') ||
                            degreeTitle.includes('msc') || degreeTitle.includes('ma ') || 
                            degreeTitle.includes('mba') || degreeTitle.includes('llm') ||
                            degreeTitle.includes('phd') || degreeTitle.includes('doctorate');
          break;
        case 'PhD':
          hasRequiredLevel = degreeTitle.includes('phd') || degreeTitle.includes('doctorate');
          break;
        default:
          return false;
      }
      
      return hasRequiredLevel;
    });
  };

  const getEducationEvidence = (req: any, education: any[]) => {
    // Find the best matching degree for this requirement
    const matching = education.find(edu => {
      const degreeTitle = (edu.degree_or_certificate_title || edu.degree_type || edu.degreeType || '').toLowerCase();
      
      switch (req.level) {
        case 'Masters':
          // Look for Masters, LLM, or PhD (any of these satisfy Masters requirement)
          return degreeTitle.includes('master') || degreeTitle.includes('msc') || 
                 degreeTitle.includes('ma ') || degreeTitle.includes('mba') ||
                 degreeTitle.includes('llm') || degreeTitle.includes('phd') || 
                 degreeTitle.includes('doctorate');
        case 'Bachelors':
          // Any degree level satisfies Bachelor's requirement
          return degreeTitle.includes('bachelor') || degreeTitle.includes('bsc') || 
                 degreeTitle.includes('ba ') || degreeTitle.includes('degree') || 
                 degreeTitle.includes('diploma') || degreeTitle.includes('master') ||
                 degreeTitle.includes('msc') || degreeTitle.includes('ma ') || 
                 degreeTitle.includes('mba') || degreeTitle.includes('llm') ||
                 degreeTitle.includes('phd') || degreeTitle.includes('doctorate');
        case 'PhD':
          return degreeTitle.includes('phd') || degreeTitle.includes('doctorate');
        default:
          return false;
      }
    });

    if (!matching) return '';
    
    const degreeTitle = matching.degree_or_certificate_title || matching.degree_type || matching.degreeType || '';
    const institution = matching.institution_name || matching.institution || '';
    const fieldOfStudy = matching.main_course_of_study || matching.field_of_study || matching.fieldOfStudy || '';
    
    let evidence = `${degreeTitle}`;
    if (fieldOfStudy) evidence += ` in ${fieldOfStudy}`;
    if (institution) evidence += ` from ${institution}`;
    
    return evidence;
  };

  const checkExperienceRequirement = (req: any, phfEmployment: any[], candidateWorkExperience: any[] = []) => {
    const allEmployment = [...(phfEmployment || []), ...(candidateWorkExperience || [])];
    
    if (allEmployment.length === 0) {
      return { met: false, evidence: 'No employment history provided' };
    }

    // Calculate total years of relevant experience
    let totalYears = 0;
    const relevantJobs = [];

    allEmployment.forEach(job => {
      // Handle both PHF format and candidate profile format
      const duties = (job.duties_and_responsibilities || job.description || '').toLowerCase();
      const jobTitle = (job.exact_title_of_post || job.title || '').toLowerCase();
      const company = (job.name_of_employer || job.company || '').toLowerCase();
      
      // Simple keyword matching for relevant experience
      const searchTerm = req.type.toLowerCase();
      if (duties.includes(searchTerm) || jobTitle.includes(searchTerm) || company.includes(searchTerm)) {
        let years = 0;
        
        // Handle PHF format dates
        if (job.period_from_year) {
          years = calculateYearsOfService(
            parseInt(job.period_from_year), 
            parseInt(job.period_from_month), 
            job.period_to_year ? parseInt(job.period_to_year) : undefined, 
            job.period_to_month ? parseInt(job.period_to_month) : undefined
          );
        }
        // Handle candidate profile format dates
        else if (job.start_date) {
          const startDate = new Date(job.start_date);
          const endDate = job.end_date ? new Date(job.end_date) : new Date();
          const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
          years = diffTime / (1000 * 60 * 60 * 24 * 365.25);
        }
        
        totalYears += years;
        relevantJobs.push(job);
      }
    });

    const met = totalYears >= req.years;
    const evidence = met 
      ? `${totalYears.toFixed(1)} years of relevant experience found`
      : `Only ${totalYears.toFixed(1)} years of relevant experience (need ${req.years})`;

    return { met, evidence };
  };

  const checkLanguageRequirement = (req: any, languages: any[]) => {
    if (!languages || !Array.isArray(languages)) return false;
    
    return languages.some(lang => 
      lang.language && lang.language.toLowerCase().includes(req.language.toLowerCase())
    );
  };

  const calculateYearsOfService = (fromYear: number, fromMonth: number, toYear?: number, toMonth?: number) => {
    const startDate = new Date(fromYear, (fromMonth || 1) - 1);
    const endDate = toYear ? new Date(toYear, (toMonth || 12) - 1) : new Date();
    
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    return diffTime / (1000 * 60 * 60 * 24 * 365.25);
  };

  const getRequirementIcon = (category: string) => {
    switch (category) {
      case 'education':
        return <GraduationCap className="w-4 h-4" />;
      case 'experience':
        return <Briefcase className="w-4 h-4" />;
      case 'skills':
        return <MapPin className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const metRequirements = requirements.filter(r => r.met);
  const mustHaveRequirements = requirements.filter(r => r.severity === 'must-have');
  const metMustHaves = mustHaveRequirements.filter(r => r.met);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            Requirements Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">Loading requirements analysis...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5" />
          Requirements Checklist
        </CardTitle>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{metRequirements.length}/{requirements.length} requirements met</span>
          <span>•</span>
          <span>{metMustHaves.length}/{mustHaveRequirements.length} must-haves met</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Overall Progress</span>
              <span>{Math.round((metRequirements.length / requirements.length) * 100)}%</span>
            </div>
            <Progress value={(metRequirements.length / requirements.length) * 100} />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Must-Have Requirements</span>
              <span>{Math.round((metMustHaves.length / Math.max(mustHaveRequirements.length, 1)) * 100)}%</span>
            </div>
            <Progress 
              value={(metMustHaves.length / Math.max(mustHaveRequirements.length, 1)) * 100}
              className="[&>div]:bg-orange-500"
            />
          </div>
        </div>

        {/* Requirements List */}
        <div className="space-y-3">
          {requirements.map((req) => (
            <div key={req.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {req.met ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {getRequirementIcon(req.category)}
                  <span className="font-medium text-sm">{req.description}</span>
                  <Badge 
                    variant={req.severity === 'must-have' ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {req.severity}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{req.evidence}</p>
              </div>
            </div>
          ))}
        </div>

        {requirements.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No specific requirements could be extracted from the job description.</p>
            <p className="text-xs mt-1">Manual review recommended.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}