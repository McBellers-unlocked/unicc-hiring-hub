import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Calendar } from "lucide-react";

interface WorkExperienceTimelineProps {
  workExperience: any[];
}

export default function WorkExperienceTimeline({ workExperience }: WorkExperienceTimelineProps) {
  if (!workExperience || workExperience.length === 0) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Work Experience
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {workExperience.map((exp, index) => (
            <div key={index} className="relative pl-8 pb-6 last:pb-0">
              {/* Timeline line */}
              {index < workExperience.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-border" />
              )}
              
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-primary ring-4 ring-background" />

              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-lg">{exp.position || exp.position_title}</h4>
                  <p className="text-muted-foreground font-medium">
                    {exp.organization || exp.company}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>
                    {formatDate(exp.startDate || exp.start_date)} - {' '}
                    {exp.isCurrent || exp.is_present 
                      ? <Badge variant="secondary" className="text-xs">Current</Badge>
                      : formatDate(exp.endDate || exp.end_date)
                    }
                  </span>
                </div>

                {exp.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {exp.description}
                  </p>
                )}

                {exp.responsibilities && Array.isArray(exp.responsibilities) && exp.responsibilities.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium mb-1">Key Responsibilities:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {exp.responsibilities.map((resp: string, idx: number) => (
                        <li key={idx}>{resp}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
