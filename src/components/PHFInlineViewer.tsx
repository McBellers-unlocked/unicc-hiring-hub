import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { User, GraduationCap, Briefcase, Globe, Calendar, MapPin, Phone, Mail } from 'lucide-react';

interface PHFInlineViewerProps {
  phfData: any;
  className?: string;
}

export const PHFInlineViewer: React.FC<PHFInlineViewerProps> = ({ phfData, className }) => {
  if (!phfData) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No PHF data available</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Present';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
    } catch {
      return dateString;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="w-5 h-5" />
          Personal History Form
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Personal Information */}
        {phfData.personal_info && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <User className="w-4 h-4" />
              Personal Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
              {phfData.personal_info.name && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Name:</span>
                  <span>{phfData.personal_info.name}</span>
                </div>
              )}
              {phfData.personal_info.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Email:</span>
                  <span>{phfData.personal_info.email}</span>
                </div>
              )}
              {phfData.personal_info.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">Phone:</span>
                  <span>{phfData.personal_info.phone}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <Separator />

        {/* Education */}
        {phfData.education && phfData.education.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
              Education
            </h3>
            <div className="space-y-3">
              {phfData.education.map((edu: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">{edu.institution}</h4>
                      <p className="text-sm text-muted-foreground">{edu.fieldOfStudy}</p>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline">{edu.degreeType || edu.degree_type}</Badge>
                      <p className="text-sm text-muted-foreground mt-1">
                        {formatDate(edu.dateAwarded || edu.year_awarded)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Work Experience */}
        {phfData.work_experience && phfData.work_experience.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              Work Experience
            </h3>
            <div className="space-y-3">
              {phfData.work_experience.map((work: any, index: number) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {work.jobTitle || work.title}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {work.organization || work.company}
                      </p>
                    </div>
                    <div className="text-right">
                      {(work.isCurrent || work.is_present) && (
                        <Badge className="mb-2">Current</Badge>
                      )}
                      <p className="text-sm text-muted-foreground">
                        {formatDate(work.startDate || work.start_date)} - {' '}
                        {(work.isCurrent || work.is_present) ? 'Present' : formatDate(work.endDate || work.end_date)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Languages */}
        {phfData.languages && Object.keys(phfData.languages).length > 0 && (
          <div>
            <Separator />
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Languages
            </h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(phfData.languages).map(([lang, level]: [string, any]) => (
                <Badge key={lang} variant="outline">
                  {lang}: {typeof level === 'string' ? level : typeof level === 'object' ? Object.values(level).filter(Boolean).join(', ') : 'N/A'}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Additional Information */}
        {phfData.additional_info && (
          <div>
            <Separator />
            <h3 className="text-lg font-semibold mb-3">Additional Information</h3>
            <div className="p-4 bg-muted/20 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm">{phfData.additional_info}</pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};