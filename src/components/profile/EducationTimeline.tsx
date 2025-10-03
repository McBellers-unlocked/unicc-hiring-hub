import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Calendar } from "lucide-react";

interface EducationTimelineProps {
  education: any[];
}

export default function EducationTimeline({ education }: EducationTimelineProps) {
  if (!education || education.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {education.map((edu, index) => (
            <div key={index} className="relative pl-8 pb-6 last:pb-0">
              {/* Timeline line */}
              {index < education.length - 1 && (
                <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-border" />
              )}
              
              {/* Timeline dot */}
              <div className="absolute left-0 top-1 w-4 h-4 rounded-full bg-accent ring-4 ring-background" />

              <div className="space-y-2">
                <div>
                  <h4 className="font-semibold text-lg">{edu.degree || edu.level}</h4>
                  <p className="text-muted-foreground font-medium">
                    {edu.institution || edu.school}
                  </p>
                  {edu.field_of_study && (
                    <p className="text-sm text-muted-foreground">
                      {edu.field_of_study}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span>{edu.year || edu.graduation_year}</span>
                </div>

                {edu.honors && (
                  <Badge variant="secondary" className="text-xs">
                    {edu.honors}
                  </Badge>
                )}

                {edu.gpa && (
                  <p className="text-sm text-muted-foreground">
                    GPA: {edu.gpa}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
