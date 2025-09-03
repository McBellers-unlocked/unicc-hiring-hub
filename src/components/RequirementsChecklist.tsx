import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, AlertTriangle, GraduationCap, Briefcase, Clock, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
        .select('requirements_md, essential_criteria(*)')
        .eq('id', jobId)
        .single();

      if (error) throw error;
      
      setJobRequirements(job.requirements_md || '');
    } catch (error) {
      console.error('Error fetching job requirements:', error);
    }
  };

  const analyzeRequirements = () => {
    const reqs: Requirement[] = [];

    // Education Analysis
    const educationReqs = extractEducationRequirements(jobRequirements);
    const candidateEducation = phfData?.education || [];
    
    educationReqs.forEach(req => {
      const met = checkEducationRequirement(req, candidateEducation);
      reqs.push({
        id: `edu-${req.level}`,
        category: 'education',
        description: `${req.level} degree required`,
        met,
        evidence: met ? getEducationEvidence(req, candidateEducation) : 'No matching education found',
        severity: req.required ? 'must-have' : 'preferred'
      });
    });

    // Experience Analysis
    const experienceReqs = extractExperienceRequirements(jobRequirements);
    const candidateExperience = phfData?.employment || [];
    
    experienceReqs.forEach(req => {
      const { met, evidence } = checkExperienceRequirement(req, candidateExperience);
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
    if (candidateInfo?.languages) {
      const langReqs = extractLanguageRequirements(jobRequirements);
      langReqs.forEach(req => {
        const met = checkLanguageRequirement(req, candidateInfo.languages);
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
    
    return education.some(edu => {
      const degree = (edu.degree_or_certificate_title || '').toLowerCase();
      const study = (edu.main_course_of_study || '').toLowerCase();
      
      switch (req.level) {
        case 'Masters':
          return degree.includes('master') || degree.includes('msc') || degree.includes('ma ') || degree.includes('mba');
        case 'Bachelors':
          return degree.includes('bachelor') || degree.includes('bsc') || degree.includes('ba ') || 
                 degree.includes('degree') || degree.includes('diploma');
        case 'PhD':
          return degree.includes('phd') || degree.includes('doctorate');
        default:
          return false;
      }
    });
  };

  const getEducationEvidence = (req: any, education: any[]) => {
    const matching = education.find(edu => {
      const degree = (edu.degree_or_certificate_title || '').toLowerCase();
      
      switch (req.level) {
        case 'Masters':
          return degree.includes('master') || degree.includes('msc') || degree.includes('ma ') || degree.includes('mba');
        case 'Bachelors':
          return degree.includes('bachelor') || degree.includes('bsc') || degree.includes('ba ') || 
                 degree.includes('degree') || degree.includes('diploma');
        case 'PhD':
          return degree.includes('phd') || degree.includes('doctorate');
        default:
          return false;
      }
    });

    return matching ? `${matching.degree_or_certificate_title} from ${matching.institution_name}` : '';
  };

  const checkExperienceRequirement = (req: any, employment: any[]) => {
    if (!employment || employment.length === 0) {
      return { met: false, evidence: 'No employment history provided' };
    }

    // Calculate total years of relevant experience
    let totalYears = 0;
    const relevantJobs = [];

    employment.forEach(job => {
      const duties = (job.duties_responsibilities || '').toLowerCase();
      const jobTitle = (job.job_title || '').toLowerCase();
      
      // Simple keyword matching for relevant experience
      if (duties.includes(req.type.toLowerCase()) || jobTitle.includes(req.type.toLowerCase())) {
        const years = calculateYearsOfService(job.from_year, job.from_month, job.to_year, job.to_month);
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

  const checkLanguageRequirement = (req: any, languages: any) => {
    if (!languages || typeof languages !== 'object') return false;
    
    return Object.keys(languages).some(lang => 
      lang.toLowerCase().includes(req.language.toLowerCase())
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