import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, GraduationCap, Briefcase, MapPin, Calendar, Phone, Mail } from 'lucide-react';

interface CompactCandidateViewProps {
  application: any;
  phfData?: any;
  photoUrl?: string;
}

export const CompactCandidateView: React.FC<CompactCandidateViewProps> = ({ 
  application, 
  phfData,
  photoUrl 
}) => {
  const formatDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB');
  };

  const getEducationData = () => {
    if (phfData?.education && phfData.education.length > 0) {
      return phfData.education;
    }
    return application?.candidate?.education || [];
  };

  const getEmploymentData = () => {
    if (phfData?.employment && phfData.employment.length > 0) {
      return phfData.employment;
    }
    return application?.candidate?.work_experience || [];
  };

  const calculateExperience = (employment: any[]) => {
    if (!employment || employment.length === 0) return 0;
    
    let totalMonths = 0;
    employment.forEach(job => {
      const startDate = new Date(job.from_year || job.startDate || '2000-01-01');
      const endDate = job.is_present || job.isCurrent ? new Date() : new Date(job.to_year || job.endDate || '2000-01-01');
      
      if (startDate && endDate) {
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
        const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
        totalMonths += diffMonths;
      }
    });
    
    return Math.floor(totalMonths / 12);
  };

  const candidateName = phfData?.personalDetails?.firstNames && phfData?.personalDetails?.familyName 
    ? `${phfData.personalDetails.firstNames} ${phfData.personalDetails.familyName}`
    : application?.candidate?.name;

  const candidateEmail = phfData?.personalDetails?.email || application?.candidate?.email;
  const candidatePhone = phfData?.personalDetails?.telephone || application?.candidate?.phone;
  const candidateLocation = phfData?.personalDetails?.presentAddress || application?.candidate?.location;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-h-screen overflow-hidden">
      {/* Left Column - Personal & Contact Info */}
      <div className="space-y-4">
        {/* Personal Information */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-4">
              {(photoUrl || phfData?.personalDetails?.photoUrl) && (
                <div className="flex-shrink-0">
                  <img 
                    src={photoUrl || phfData?.personalDetails?.photoUrl} 
                    alt="Candidate Photo" 
                    className="w-16 h-20 object-cover rounded border"
                  />
                </div>
              )}
              <div className="space-y-2 flex-1 min-w-0">
                <div>
                  <h3 className="font-semibold text-lg">{candidateName}</h3>
                  <p className="text-sm text-muted-foreground">
                    {phfData?.personalDetails?.title} • {phfData?.personalDetails?.presentNationality || 'Not specified'}
                  </p>
                </div>
                <div className="space-y-1 text-sm">
                  {candidateEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{candidateEmail}</span>
                    </div>
                  )}
                  {candidatePhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3 w-3" />
                      <span>{candidatePhone}</span>
                    </div>
                  )}
                  {candidateLocation && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span className="truncate">{candidateLocation}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Education Summary */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <GraduationCap className="h-5 w-5" />
              Education ({getEducationData().length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-64 overflow-y-auto">
            {getEducationData().length > 0 ? (
              getEducationData().map((edu: any, index: number) => (
                <div key={index} className="border-l-2 border-primary/20 pl-3 py-2">
                  <div className="font-medium text-sm">
                    {edu.degree_or_certificate_title || edu.degree_type || edu.degree || 'Degree/Certificate'}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {edu.main_course_of_study || edu.field_of_study || edu.field || 'Field of Study'}
                  </div>
                  <div className="text-sm font-medium">
                    {edu.institution_name || edu.institution || 'Institution'}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {edu.from_year || edu.startDate || 'Year'} - {edu.to_year || edu.endDate || 'Present'}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No education information available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Right Column - Work Experience */}
      <div className="space-y-4">
        {/* Experience Summary */}
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5" />
              Experience Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {calculateExperience(getEmploymentData())}
                </div>
                <div className="text-sm text-muted-foreground">Years Total</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-secondary">
                  {getEmploymentData().length}
                </div>
                <div className="text-sm text-muted-foreground">Positions</div>
              </div>
              <div className="flex-1 text-sm">
                <div className="font-medium">Current/Latest Position:</div>
                <div className="text-muted-foreground">
                  {getEmploymentData().length > 0 
                    ? `${getEmploymentData()[0]?.position_title || getEmploymentData()[0]?.position || 'Position'} at ${getEmploymentData()[0]?.employer_name || getEmploymentData()[0]?.organization || 'Organization'}`
                    : 'No employment history'
                  }
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Work Experience Details */}
        <Card className="flex-1">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calendar className="h-5 w-5" />
              Work History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-80 overflow-y-auto">
            {getEmploymentData().length > 0 ? (
              getEmploymentData().map((job: any, index: number) => (
                <div key={index} className="border-l-2 border-secondary/20 pl-3 py-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {job.position_title || job.position || job.title || 'Position'}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {job.employer_name || job.organization || job.company || 'Organization'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {job.place_of_work || job.location || 'Location'}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground ml-2 flex-shrink-0">
                      {job.from_year || job.startDate || 'Start'} - {
                        job.is_present || job.isCurrent ? 'Present' : 
                        (job.to_year || job.endDate || 'End')
                      }
                    </div>
                  </div>
                  {(job.is_present || job.isCurrent) && (
                    <Badge variant="secondary" className="mt-1 text-xs">Current</Badge>
                  )}
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">No work experience available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};