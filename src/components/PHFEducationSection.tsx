import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GraduationCap, Info, Plus } from 'lucide-react';

interface EducationEntry {
  institution: string;
  degree?: string;
  degree_type?: string;
  field_of_study?: string;
  field?: string;
  grade?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  description?: string;
  is_current?: boolean;
  isCurrent?: boolean;
}

interface PHFEducationSectionProps {
  profileEducation: EducationEntry[];
}

export default function PHFEducationSection({ profileEducation }: PHFEducationSectionProps) {
  console.log('PHFEducationSection - profileEducation:', profileEducation);
  if (profileEducation) {
    profileEducation.forEach((edu, index) => {
      console.log(`PHF Education ${index}:`, edu);
    });
  }
  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const formatDate = (date: string) => {
      if (!date) return '';
      
      // Handle YYYY-MM format
      if (date.includes('-') && date.length <= 7) {
        const [year, month] = date.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      
      // Try to parse as a full date
      const d = new Date(date);
      if (isNaN(d.getTime())) return date; // Return original if invalid date
      return d.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short'
      });
    };

    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : (endDate ? formatDate(endDate) : 'Present');
    
    return `${start} - ${end}`;
  };

  const formatDegreeTitle = (degree: string, fieldOfStudy: string) => {
    // If field of study exists and is different from degree, combine them appropriately
    if (fieldOfStudy && fieldOfStudy.trim() !== '') {
      // Check if the degree already contains the field of study
      if (degree.toLowerCase().includes(fieldOfStudy.toLowerCase())) {
        return degree;
      }
      // Otherwise, format as "Degree in Field of Study"
      return `${degree} in ${fieldOfStudy}`;
    }
    return degree;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guidance */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900">
              <span className="font-medium">Guidance:</span> Exclude primary/secondary education if you have a university degree or equivalent. Include postgraduate/professional courses.
            </p>
          </div>
        </div>

        {/* Education Entries */}
        {profileEducation && profileEducation.length > 0 ? (
          <div className="space-y-3">
            {profileEducation.map((education, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h4 className="font-medium text-lg">
                    {formatDegreeTitle(education.degree || education.degree_type, education.field_of_study || education.field)}
                  </h4>
                  <p className="text-muted-foreground">{education.institution}</p>
                  <div className="text-sm text-muted-foreground">
                    {formatDateRange(education.start_date || education.startDate, education.end_date || education.endDate, education.is_current || education.isCurrent)}
                    {education.grade && (
                      <>
                        <span className="mx-2">•</span>
                        <span>Grade: {education.grade}</span>
                      </>
                    )}
                  </div>
                </div>
                  </div>
                  {education.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {education.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No education information available in profile</p>
          </div>
        )}

        {/* Add Education Entry Button */}
        <div className="border-2 border-dashed border-muted rounded-lg p-8">
          <div className="text-center">
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" />
              Add Education Entry
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}