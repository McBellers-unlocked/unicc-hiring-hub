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
  CheckCircle
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
  getFlagEmoji: (location: string | null) => string | null;
  getEducationSummary: (education: any) => any[];
  getWorkExperienceSummary: (workExp: any) => any[];
  getTotalExperience: (workExp: any, yearsExp: number | null) => string;
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
  getFlagEmoji,
  getEducationSummary,
  getWorkExperienceSummary,
  getTotalExperience,
  getLanguageSummary
}) => {
  const navigate = useNavigate();

  const allEducation = getEducationSummary(application.candidate.education);
  const recentJobs = getWorkExperienceSummary(application.candidate.work_experience);
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

  const getScoreBadge = (application: any) => {
    if (!application.screening_scores || !application.screening_scores[0]?.ai_score) {
      return <Badge variant="outline" className="text-xs">No Score</Badge>;
    }

    const score = application.screening_scores[0].ai_score;
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
                <div className="flex items-center gap-2 mb-1">
                  <h3 
                    className="font-semibold text-lg cursor-pointer hover:text-primary truncate"
                    onClick={() => navigate(`/application/${application.id}`)}
                    title={application.candidate.name}
                  >
                    {application.candidate.name}
                  </h3>
                  {application.candidate.gender && (
                    <span 
                      className={`text-lg font-bold flex-shrink-0 ${
                        application.candidate.gender.toLowerCase() === 'male' ? 'text-blue-600' : 
                        application.candidate.gender.toLowerCase() === 'female' ? 'text-pink-600' : 'text-gray-600'
                      }`} 
                      title={`Gender: ${application.candidate.gender}`}
                    >
                      {application.candidate.gender.toLowerCase() === 'male' ? '♂' : 
                       application.candidate.gender.toLowerCase() === 'female' ? '♀' : '?'}
                    </span>
                  )}
                </div>
                <div className="text-sm text-muted-foreground truncate" title={application.candidate.email}>
                  {application.candidate.email}
                </div>
                {application.candidate.location && (
                  <div className="flex items-center gap-2 mt-1">
                    {flagUrl && (
                      <img 
                        src={flagUrl} 
                        alt={`${country} flag`} 
                        className="w-4 h-3 object-cover rounded-sm flex-shrink-0"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-sm text-muted-foreground truncate" title={country || application.candidate.location}>
                      {country || application.candidate.location}
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
                  {edu.year && (
                    <div className="text-xs text-muted-foreground font-medium">
                      {edu.year}
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
              {recentJobs.map((job, index) => (
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
                  <div className="flex items-center gap-2">
                    {job.length && (
                      <span className="text-xs text-muted-foreground font-medium">
                        {job.length}
                      </span>
                    )}
                    {index === 0 && application.candidate.un_experience && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0.5">UN</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary info row - Languages and Total Experience */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Languages className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Languages:</span>
            </div>
            <div className="text-sm" title={getLanguageSummary(application.candidate.languages)}>
              {getLanguageSummary(application.candidate.languages)}
            </div>
          </div>
          
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-sm">Total Experience:</span>
            </div>
            <div className="text-lg font-semibold text-primary">
              {getTotalExperience(application.candidate.work_experience, application.candidate.years_of_experience)}
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

          {/* Center - Match info */}
          <div className="flex items-center gap-2">
            {getScoreBadge(application)}
          </div>

          {/* Right side - Action buttons */}
          <div className="flex items-center gap-2">
            {/* Longlist toggle */}
            <Button
              size="sm"
              variant={application.suggested_for_longlist ? "default" : "outline"}
              onClick={() => onAddToLonglist(application.id)}
              className="whitespace-nowrap"
            >
              {application.suggested_for_longlist ? (
                <>
                  <Check className="w-3 h-3 mr-1.5" />
                  Listed
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3 mr-1.5" />
                  Add
                </>
              )}
            </Button>

            {/* View button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/application/${application.id}`)}
              className="whitespace-nowrap"
            >
              <Eye className="w-3 h-3 mr-1" />
              View
            </Button>

            {/* Direct Shortlist button - temporarily enabled for all authorized users */}
            {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Hiring Manager')) && onDirectShortlist && (
              <Button
                size="sm"
                variant="default"
                onClick={() => onDirectShortlist(application.id)}
                className="whitespace-nowrap bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="w-3 h-3 mr-1" />
                Direct Shortlist
              </Button>
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