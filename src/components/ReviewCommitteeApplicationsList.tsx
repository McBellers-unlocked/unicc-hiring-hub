import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Award } from "lucide-react";

interface Application {
  id: string;
  status: string;
  suggested_for_longlist?: boolean;
  avgScore: number;
  percentage: number;
  feedbackCount: number;
  candidate?: {
    name?: string;
    email?: string;
    present_nationality?: string;
    gender?: string;
    years_of_experience?: number;
  };
}

interface ReviewCommitteeApplicationsListProps {
  candidatesWithStats: Application[];
}

export function ReviewCommitteeApplicationsList({ candidatesWithStats }: ReviewCommitteeApplicationsListProps) {
  if (!candidatesWithStats || candidatesWithStats.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No candidates have reached the panel interview stage yet.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-purple-600" />
          Panel Interview Stage ({candidatesWithStats.length})
        </CardTitle>
        <CardDescription>
          Candidates who have completed or are in panel interviews with scoring and accumulated feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {candidatesWithStats.map((app) => (
          <Card key={app.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-4">
                    <div>
                      <h4 className="font-semibold text-lg">{app.candidate?.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {app.candidate?.present_nationality || 'N/A'} • {app.candidate?.gender || 'N/A'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Interview Score</p>
                      <p className="font-semibold text-lg">{app.avgScore}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Feedback Count</p>
                      <p className="font-semibold text-lg">{app.feedbackCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Recommendation</p>
                      <Badge variant={app.percentage >= 80 ? "default" : app.percentage >= 60 ? "secondary" : "outline"}>
                        {app.percentage >= 80 ? "Appointable" : app.percentage >= 60 ? "Alternate" : "Not Recommended"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Experience</p>
                      <p className="font-semibold">{app.candidate?.years_of_experience || 0} years</p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2 border-t">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">HR Screening Comments:</p>
                      <p className="text-sm text-foreground/80">Initial screening comments would appear here</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">HM Longlist Comments:</p>
                      <p className="text-sm text-foreground/80">Hiring Manager longlist selection comments would appear here</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Interview Feedback Summary:</p>
                      <p className="text-sm text-foreground/80">Average score: {app.avgScore}% from {app.feedbackCount} panel member(s)</p>
                    </div>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href={`/admin/applications/${app.id}`} target="_blank" rel="noopener noreferrer">
                    View Full Application
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
}
