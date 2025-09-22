import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Info, Plus } from 'lucide-react';

interface WorkExperienceEntry {
  position: string;
  company: string;
  start_date: string;
  end_date?: string;
  location?: string;
  is_current?: boolean;
  is_un_experience?: boolean;
  description?: string;
}

interface PHFWorkExperienceSectionProps {
  profileWorkExperience: WorkExperienceEntry[];
}

export default function PHFWorkExperienceSection({ profileWorkExperience }: PHFWorkExperienceSectionProps) {
  // Debug: Log the data to check what's being passed
  console.log('PHFWorkExperienceSection - profileWorkExperience:', profileWorkExperience);
  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const formatDate = (date: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date; // Return original if invalid date
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}`;
    };

    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : (endDate ? formatDate(endDate) : 'Present');
    
    return `${start} - ${end}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Employment Record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guidance */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900">
              <span className="font-medium">Employment Record (reverse chronological):</span> Include military service. Note periods not gainfully employed separately. Last 5 years require attestations.
            </p>
          </div>
        </div>

        {/* Work Experience Entries */}
        {profileWorkExperience && profileWorkExperience.length > 0 ? (
          <div className="space-y-3">
            {profileWorkExperience.map((experience, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-lg">
                      {experience.position}
                    </h4>
                    {experience.is_un_experience && (
                      <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                        UN Experience
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground font-medium">{experience.company}</p>
                  <div className="text-sm text-muted-foreground">
                    {formatDateRange(experience.start_date, experience.end_date, experience.is_current)}
                    {experience.location && (
                      <>
                        <span className="mx-2">•</span>
                        <span>{experience.location}</span>
                      </>
                    )}
                  </div>
                  {experience.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {experience.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No work experience information available in profile</p>
          </div>
        )}

        {/* Add Employment Entry Button */}
        <div className="border-2 border-dashed border-muted rounded-lg p-8">
          <div className="text-center">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Employment Entry
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}