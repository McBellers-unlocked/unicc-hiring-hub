import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Circle, Target } from "lucide-react";

interface ProfileCompletionData {
  personalDetails: boolean;
  professionalSummary: boolean;
  workExperience: boolean;
  education: boolean;
  skills: boolean;
  languages: boolean;
  profilePhoto: boolean;
  availability: boolean;
}

interface ProfileCompletionWidgetProps {
  completionData: ProfileCompletionData;
  overallPercentage: number;
}

export default function ProfileCompletionWidget({ completionData, overallPercentage }: ProfileCompletionWidgetProps) {
  const sections = [
    { key: 'personalDetails', label: 'Personal Details', weight: 20 },
    { key: 'professionalSummary', label: 'Professional Summary', weight: 15 },
    { key: 'workExperience', label: 'Work Experience', weight: 25 },
    { key: 'education', label: 'Education', weight: 15 },
    { key: 'skills', label: 'Skills', weight: 10 },
    { key: 'languages', label: 'Languages', weight: 10 },
    { key: 'profilePhoto', label: 'Profile Photo', weight: 5 },
    { key: 'availability', label: 'Availability & Preferences', weight: 5 },
  ];

  const getCompletionColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletionVariant = (percentage: number) => {
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'destructive';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Profile Completion
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Overall Progress</span>
            <Badge variant={getCompletionVariant(overallPercentage)}>
              {overallPercentage}%
            </Badge>
          </div>
          <Progress value={overallPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {overallPercentage >= 80 
              ? "Great! Your profile is comprehensive." 
              : overallPercentage >= 60 
              ? "Good progress! Complete a few more sections." 
              : "Complete more sections to improve job matching."}
          </p>
        </div>

        <div className="space-y-2">
          <h4 className="text-sm font-medium">Section Checklist</h4>
          <div className="space-y-1">
            {sections.map((section) => {
              const isComplete = completionData[section.key as keyof ProfileCompletionData];
              return (
                <div key={section.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={isComplete ? 'text-foreground' : 'text-muted-foreground'}>
                      {section.label}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {section.weight}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {overallPercentage < 60 && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              <strong>Tip:</strong> Complete your profile to at least 60% to apply for jobs and improve your visibility to recruiters.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}