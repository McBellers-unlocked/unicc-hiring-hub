import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  GraduationCap, 
  Briefcase, 
  Languages, 
  Eye, 
  Edit, 
  Trash2, 
  Plus, 
  Check,
  Clock,
  CheckCircle,
  X,
  Video,
  FileText,
  RotateCcw,
  Star,
  Award,
  Wrench,
  Users
} from 'lucide-react';
import { getCountryFlagUrl } from '@/lib/countryFlags';

interface CandidateApplicationCardProps {
  application: any;
  userRoles: string[];
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
  onDelete: (applicationId: string, candidateId: string, e: React.MouseEvent) => void;
  onAddToLonglist: (applicationId: string) => void;
  onDirectShortlist?: (applicationId: string) => void;
  onReject?: (applicationId: string) => void;
  onAddToShortlist?: (applicationId: string) => void;
  onAddToVideoInterview?: (applicationId: string) => void;
  onVideoAssignment?: (applicationId: string) => void;
  onReviewVideos?: (applicationId: string) => void;
  onMoveToPanelInterview?: (applicationId: string) => void;
  onMoveToApplications?: (applicationId: string) => void;
  onMoveToRecommended?: (applicationId: string) => void;
  onMoveToRoster?: (applicationId: string) => void;
  interviewScore?: number | null;
  interviewRank?: number | null;
  getFlagEmoji: (location: string | null) => string | null;
  getEducationSummary: (education: any) => any[];
  getWorkExperienceSummary: (workExp: any) => any[];
  getTotalExperience: (workExp: any, yearsExp: number | null) => string;
  getTotalUNExperience: (application: any) => string;
  getLanguageSummary: (languages: any) => string;
}

export const CandidateApplicationCard: React.FC<CandidateApplicationCardProps> = ({
  application,
  userRoles,
  isSelected,
  onToggleSelection,
  onDelete,
  onAddToLonglist,
  onDirectShortlist,
  onVideoAssignment,
  onReviewVideos,
  onMoveToPanelInterview,
  onMoveToApplications,
  onMoveToRecommended,
  onMoveToRoster,
  interviewScore,
  interviewRank,
  onReject,
  onAddToShortlist,
  onAddToVideoInterview,
  getFlagEmoji,
  getEducationSummary,
  getWorkExperienceSummary,
  getTotalExperience,
  getTotalUNExperience,
  getLanguageSummary
}) => {
  const navigate = useNavigate();
  
  // Extract AI scoring data (screening_scores is now a single object after transformation)
  const screeningScore = application.screening_scores;
  const aiScore = screeningScore?.ai_score;
  const rubricBreakdown = screeningScore?.rubric_breakdown;

  // Get color-coded border based on AI score
  const getCardBorderClass = () => {
    if (!aiScore) return '';
    if (aiScore >= 80) return 'border-l-4 border-l-green-500';
    if (aiScore >= 70) return 'border-l-4 border-l-yellow-500';
    return 'border-l-4 border-l-red-400';
  };

  const allEducation = getEducationSummary(application.candidate.education);
  
  // For manually entered applications, prioritize phf_data over candidates table
  const workExperienceData = application.source === 'manual_entry' && 
                             application.phf_data?.work_experience && 
                             Array.isArray(application.phf_data.work_experience)
    ? application.phf_data.work_experience.map((work: any) => ({
        title: work.jobTitle || work.title,
        company: work.organization || work.company,
        startDate: work.startDate,
        endDate: work.isCurrent ? null : work.endDate,
        isCurrent: work.isCurrent
      }))
    : application.candidate.work_experience;

  const recentJobs = getWorkExperienceSummary(workExperienceData);
  const country = getFlagEmoji(application.candidate.location);
  const flagUrl = country ? getCountryFlagUrl(country) : '';

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'Application': { color: 'bg-blue-100 text-blue-700', label: 'Application' },
      'Screening': { color: 'bg-yellow-100 text-yellow-700', label: 'Screening' },
      'Longlist': { color: 'bg-purple-100 text-purple-700', label: 'Longlist' },
      'Shortlist': { color: 'bg-green-100 text-green-700', label: 'Shortlist' },
      'Pre-Recorded Video': { color: 'bg-indigo-100 text-indigo-700', label: 'Video' },
      'Panel Interview': { color: 'bg-orange-100 text-orange-700', label: 'Interview' },
      'Recommended': { color: 'bg-emerald-100 text-emerald-700', label: 'Recommended' },
      'Offer': { color: 'bg-green-200 text-green-800', label: 'Offer' },
      'Roster': { color: 'bg-teal-100 text-teal-700', label: 'Roster' },
      'Rejected': { color: 'bg-red-100 text-red-700', label: 'Rejected' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig['Application'];
    return (
      <Badge className={`${config.color} text-xs px-2 py-1`}>
        {config.label}
      </Badge>
    );
  };

  const getScoreBadge = (app: any) => {
    if (!application.screening_scores?.ai_score) {
      return <Badge variant="outline" className="text-xs">No Score</Badge>;
    }

    const score = application.screening_scores.ai_score;
    let colorClass = 'bg-gray-100 text-gray-700';
    
    if (score >= 80) colorClass = 'bg-green-100 text-green-700';
    else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-700';
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-700';
    else colorClass = 'bg-red-100 text-red-700';

    return (
      <Badge className={`${colorClass} text-xs px-2 py-1`}>
        Match: {score}%
      </Badge>
    );
  };

  // Helper functions for candidate type
  const getCandidateTypeLabel = (candidate: any) => {
    const type = candidate.candidate_type || 'External';
    if (type === 'Affiliate' && candidate.affiliate_subtype) {
      return `Affiliate (${candidate.affiliate_subtype})`;
    }
    if (type === 'Internal') {
      return 'Internal (Staff)';
    }
    return type;
  };

  const getCandidateTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Internal':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-100';
      case 'Affiliate':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-100';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-100';
    }
  };

  // Extract skills from multiple sources - handle string or array format
  const additionalSkillsRaw = application.phf_data?.additionalInformation?.additional_skills;
  const additionalSkillsParsed = Array.isArray(additionalSkillsRaw) 
    ? additionalSkillsRaw 
    : typeof additionalSkillsRaw === 'string' 
      ? additionalSkillsRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
      : [];

  const allSkills = [
    ...(application.candidate.skills || []),
    ...additionalSkillsParsed
  ].filter((skill, index, self) => 
    skill && self.indexOf(skill) === index
  );

  // Extract certifications - handle various formats
  const candidateCerts = application.candidate.certifications || [];
  const phfCerts = application.phf_data?.certifications || [];
  const allCertifications = [...candidateCerts, ...phfCerts].filter((cert, index, self) => {
    if (!cert) return false;
    const certName = typeof cert === 'string' ? cert : (cert.name || cert.title);
    return certName && self.findIndex(c => {
      const cName = typeof c === 'string' ? c : (c.name || c.title);
      return cName === certName;
    }) === index;
  });

  return (
    <Card className="mb-4 hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-6">
        {/* Header with candidate name and selection */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1 min-w-0">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelection(application.id)}
              className="mt-1"
            />
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <User className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 
                    className="font-semibold text-lg cursor-pointer hover:text-primary truncate"
                    onClick={() => navigate(`/admin/applications/${application.id}`)}
                    title={application.candidate.name}
                  >
                    {application.candidate.name}
                  </h3>
                  <Badge className={getCandidateTypeBadgeClass(application.candidate.candidate_type || 'External')}>
                    {getCandidateTypeLabel(application.candidate)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground truncate" title={application.candidate.email}>
                  {application.candidate.email}
                </div>
                {/* Present Location */}
                {(application.candidate.present_city || application.candidate.present_country || application.candidate.location) && (
                  <div className="text-sm mt-1">
                    <span className="font-semibold">Present location: </span>
                    <span className="text-muted-foreground">
                      {application.candidate.present_city && application.candidate.present_country
                        ? `${application.candidate.present_city}, ${application.candidate.present_country}`
                        : application.candidate.location || [application.candidate.present_city, application.candidate.present_country].filter(Boolean).join(', ')
                      }
                    </span>
                  </div>
                )}
                {/* Other/Permanent Location */}
                {(application.candidate.permanent_city || application.candidate.permanent_country) && (
                  <div className="text-sm mt-1">
                    <span className="font-semibold">Other location: </span>
                    <span className="text-muted-foreground">
                      {[application.candidate.permanent_city, application.candidate.permanent_country].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-4">
          {/* Education - Show ALL entries */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Education ({allEducation.length})</h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allEducation.length > 0 ? allEducation.map((edu, index) => (
                <div key={index} className="text-sm border-l-2 border-muted pl-3 py-1">
                  <div className="font-medium" title={edu.degree}>
                    {edu.degree}
                  </div>
                  {edu.fieldOfStudy && (
                    <div className="text-xs text-muted-foreground" title={edu.fieldOfStudy}>
                      {edu.fieldOfStudy}
                    </div>
                  )}
                  {edu.institution && (
                    <div className="text-xs text-muted-foreground truncate" title={edu.institution}>
                      {edu.institution}
                    </div>
                  )}
                  {(edu.dateRange || edu.year) && (
                    <div className="text-xs text-muted-foreground font-medium">
                      {edu.dateRange || edu.year}
                    </div>
                  )}
                </div>
              )) : (
                <div className="text-sm text-muted-foreground">No education specified</div>
              )}
            </div>
          </div>

          {/* Work Experience - Show ALL entries */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4 text-muted-foreground" />
              <h4 className="font-medium text-sm">Work Experience ({recentJobs.length})</h4>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentJobs.map((job, index) => {
                // Find matching employment record in phf_data to check UN status
                const phfEmployment = application.phf_data?.employment || [];
                const matchingJob = phfEmployment.find((emp: any) => 
                  (emp.exact_title_of_post === job.title || emp.position_title === job.title) &&
                  (emp.employer_name === job.organization)
                );
                const isUNJob = matchingJob?.is_un_system_post === true;
                
                return (
                  <div key={index} className="text-sm border-l-2 border-muted pl-3 py-1">
                    <div className="font-medium" title={job.title}>
                      {job.title}
                      {index === 0 && (
                        <span className="ml-2 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    {job.organization && (
                      <div className="text-xs text-muted-foreground truncate" title={job.organization}>
                        {job.organization}
                      </div>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      {(job.startDate || job.endDate) && (
                        <span className="text-xs text-muted-foreground">
                          {job.startDate}{job.endDate ? ` - ${job.endDate}` : ''}
                        </span>
                      )}
                      {job.length && (
                        <span className="text-xs text-muted-foreground font-medium">
                          ({job.length})
                        </span>
                      )}
                      {isUNJob && (
                        <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                          UN Experience
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Secondary info row - Compact horizontal layout */}
        <div className="border-t border-b border-border/50 py-3 my-4 space-y-2">
          {/* Languages */}
          <div className="flex items-start gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground w-24 flex-shrink-0">
              <Languages className="w-3.5 h-3.5" />
              <span className="font-medium">Languages</span>
            </div>
            <div className="text-foreground" title={getLanguageSummary(application.candidate.languages)}>
              {getLanguageSummary(application.candidate.languages) || <span className="text-muted-foreground italic">Not specified</span>}
            </div>
          </div>

          {/* Skills */}
          {allSkills.length > 0 && (
            <div className="flex items-start gap-3 text-sm">
              <div className="flex items-center gap-1.5 text-muted-foreground w-24 flex-shrink-0">
                <Wrench className="w-3.5 h-3.5" />
                <span className="font-medium">Skills</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {allSkills.slice(0, 8).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs font-normal px-2 py-0.5 bg-secondary/50">
                    {skill}
                  </Badge>
                ))}
                {allSkills.length > 8 && (
                  <span className="text-xs text-muted-foreground self-center">+{allSkills.length - 8} more</span>
                )}
              </div>
            </div>
          )}

          {/* Certifications - always show */}
          <div className="flex items-start gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground w-24 flex-shrink-0">
              <Award className="w-3.5 h-3.5" />
              <span className="font-medium">Certs</span>
            </div>
            {allCertifications.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {allCertifications.slice(0, 5).map((cert, index) => {
                  const certName = typeof cert === 'string' ? cert : (cert.name || cert.title);
                  return (
                    <Badge key={index} variant="outline" className="text-xs font-normal px-2 py-0.5 border-amber-200 bg-amber-50 text-amber-700">
                      {certName}
                    </Badge>
                  );
                })}
                {allCertifications.length > 5 && (
                  <span className="text-xs text-muted-foreground self-center">+{allCertifications.length - 5} more</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground italic text-xs">None listed</span>
            )}
          </div>
        </div>

        {/* Experience - Prominent metric cards */}
        <div className="p-3 bg-muted/30 rounded-lg my-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm text-muted-foreground">Experience</span>
          </div>
          <div className="flex gap-3">
            {/* Overall Experience Card */}
            <div className="flex-1 bg-background rounded-md p-3 border border-border">
              <div className="text-2xl font-bold text-foreground">
                {getTotalExperience(workExperienceData, application.candidate.years_of_experience)}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">Overall Experience</div>
            </div>
            
            {/* UN Experience Card - Blue highlight */}
            <div className="flex-1 bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 border border-blue-200 dark:border-blue-800">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {getTotalUNExperience(application)}
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">UN System Experience</div>
            </div>
          </div>
        </div>

        {/* Action row - This replaces the table columns that were causing horizontal scroll */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
          {/* Left side - Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {getStatusBadge(application.status)}
            </div>
          </div>

          {/* Center - Match info with AI Screening badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Video Score Badge for Pre-Recorded Video status */}
            {application.status === 'Pre-Recorded Video' && (
              <Badge 
                variant={application.videoScore ? 'default' : 'outline'}
                className="whitespace-nowrap font-semibold gap-1"
              >
                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                {application.videoScore 
                  ? `${application.videoScore.toFixed(1)}/5.0`
                  : 'Not Rated'}
              </Badge>
            )}

            {/* Main Match Score Badge */}
            {aiScore !== null && aiScore !== undefined ? (
              <Badge 
                variant={aiScore >= 80 ? 'default' : aiScore >= 70 ? 'secondary' : 'destructive'}
                className="whitespace-nowrap font-semibold"
              >
                Match: {aiScore}%
              </Badge>
            ) : (
              getScoreBadge(application)
            )}
            
            {/* Brief feedback indicators */}
            {rubricBreakdown?.candidateAnalysis?.detailedScores && (
              <>
                {/* Education Match */}
                <Badge variant="outline" className="whitespace-nowrap text-xs">
                  {rubricBreakdown.candidateAnalysis.detailedScores.education_match >= 70 ? '✓' : '✗'} Education
                </Badge>
                
                {/* Experience Match */}
                <Badge variant="outline" className="whitespace-nowrap text-xs">
                  {rubricBreakdown.candidateAnalysis.detailedScores.experience_match >= 70 ? '✓' : '✗'} Experience
                </Badge>
                
                {/* Must-haves */}
                {rubricBreakdown.passedMustHaves !== undefined && (
                  <Badge 
                    variant={rubricBreakdown.passedMustHaves ? 'default' : 'destructive'}
                    className="whitespace-nowrap text-xs"
                  >
                    {rubricBreakdown.passedMustHaves ? '✓' : '✗'} Must-haves
                  </Badge>
                )}
              </>
            )}
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            {/* Conditional rendering based on status */}
            {application.status === 'Longlist' ? (
              <>
                {/* Move back to Applications */}
                {onMoveToApplications && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMoveToApplications(application.id)}
                    className="whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Move to Applications
                  </Button>
                )}

                {/* View button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/applications/${application.id}`)}
                  className="whitespace-nowrap"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {/* Add to Shortlist button */}
                {onAddToShortlist && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAddToShortlist(application.id)}
                    className="whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Add to Shortlist
                  </Button>
                )}

                {/* Add to Video Interview button */}
                {onAddToVideoInterview && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAddToVideoInterview(application.id)}
                    className="whitespace-nowrap bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Add to Video
                  </Button>
                )}

                {/* Reject button for Longlist */}
                {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Hiring Manager')) && 
                 onReject && 
                 application.status !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(application.id)}
                    className="whitespace-nowrap"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            ) : application.status === 'Pre-Recorded Video' ? (
              <>
                {/* Move back to Applications */}
                {onMoveToApplications && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMoveToApplications(application.id)}
                    className="whitespace-nowrap"
                  >
                    <RotateCcw className="w-3 h-3 mr-1" />
                    Move to Applications
                  </Button>
                )}

                {/* Pre-Recorded Video Status Actions */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/applications/${application.id}`)}
                  className="whitespace-nowrap"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {/* HR Admin specific actions */}
                {(userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && onVideoAssignment && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onVideoAssignment(application.id)}
                    className="whitespace-nowrap"
                  >
                    <Video className="w-3 h-3 mr-1" />
                    Video Assignment
                  </Button>
                )}

                {/* Hiring Manager specific actions */}
                {userRoles.includes('Hiring Manager') && onReviewVideos && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onReviewVideos(application.id)}
                    className="whitespace-nowrap"
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Review Videos
                  </Button>
                )}

                {userRoles.includes('Hiring Manager') && onMoveToPanelInterview && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMoveToPanelInterview(application.id)}
                    className="whitespace-nowrap"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Move to Panel Interview
                  </Button>
                )}

                {/* Reject button for all staff */}
                {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Hiring Manager')) && 
                 onReject && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(application.id)}
                    className="whitespace-nowrap"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            ) : application.status === 'Panel Interview' ? (
              <>
                {/* View button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/applications/${application.id}`)}
                  className="whitespace-nowrap"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {/* Show interview score if available */}
                {interviewScore !== null && interviewScore !== undefined && (
                  <span className={`text-xs font-medium px-2 py-1 rounded ${
                    interviewScore >= 80 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    Interview: {Math.round(interviewScore)}%
                    {interviewRank && ` (#${interviewRank})`}
                  </span>
                )}

                {/* Move to Recommended - only for top scorer with ≥80% */}
                {onMoveToRecommended && 
                 interviewScore !== null && 
                 interviewScore !== undefined && 
                 interviewScore >= 80 && 
                 interviewRank === 1 &&
                 (userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR')) && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onMoveToRecommended(application.id)}
                    className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Award className="w-3 h-3 mr-1" />
                    Recommend
                  </Button>
                )}

                {/* Move to Roster - for alternates with ≥80% but not top rank */}
                {onMoveToRoster && 
                 interviewScore !== null && 
                 interviewScore !== undefined && 
                 interviewScore >= 80 && 
                 interviewRank !== 1 &&
                 (userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR')) && (
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onMoveToRoster(application.id)}
                    className="whitespace-nowrap"
                  >
                    <Users className="w-3 h-3 mr-1" />
                    Add to Roster
                  </Button>
                )}

                {/* Reject button - for those below 80% or HR decision */}
                {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR')) && 
                 onReject && 
                 application.status !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(application.id)}
                    className="whitespace-nowrap"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Not Recommended
                  </Button>
                )}
              </>
            ) : (
              <>
                {/* View button */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/admin/applications/${application.id}`)}
                  className="whitespace-nowrap"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {/* Add to Longlist button - only show if not already on longlist */}
                {!application.suggested_for_longlist && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => onAddToLonglist(application.id)}
                    className="whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add to Longlist
                  </Button>
                )}

                {/* Reject button - available for all jobs */}
                {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Hiring Manager')) && 
                 onReject && 
                 application.status !== 'Rejected' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(application.id)}
                    className="whitespace-nowrap"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                )}
              </>
            )}

            {/* Admin actions */}
            {(userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
              <>
                {/* Edit button for manually added candidates */}
                {application.source === 'manual_entry' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(`/admin/applications/edit-manual/${application.id}`);
                    }}
                    className="px-2"
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                )}
                
                {/* Delete button */}
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={(e) => onDelete(application.id, application.candidate.id, e)}
                  className="px-2"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};