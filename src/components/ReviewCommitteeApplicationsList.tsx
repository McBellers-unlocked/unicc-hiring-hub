import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Award, ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";

interface Application {
  id: string;
  status: string;
  suggested_for_longlist?: boolean;
  avgScore?: number;
  percentage?: number;
  feedbackCount?: number;
  candidate?: {
    name?: string;
    email?: string;
    present_nationality?: string;
    gender?: string;
    years_of_experience?: number;
  };
}

interface ReviewCommitteeApplicationsListProps {
  applications: Application[];
}

function StageSection({ 
  title, 
  description, 
  candidates, 
  showInterviewScores = false 
}: { 
  title: string; 
  description: string; 
  candidates: Application[];
  showInterviewScores?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full">
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <CardTitle className="text-lg">{title} ({candidates.length})</CardTitle>
              </div>
            </div>
            <CardDescription className="text-left">{description}</CardDescription>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {candidates.length === 0 ? (
              <Alert>
                <AlertDescription>
                  No candidates in this stage yet.
                </AlertDescription>
              </Alert>
            ) : (
              candidates.map((app) => (
              <Card key={app.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <h4 className="font-semibold text-lg">{app.candidate?.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {app.candidate?.present_nationality || 'N/A'} • {app.candidate?.gender || 'N/A'} • {app.candidate?.years_of_experience || 0} years experience
                          </p>
                        </div>
                      </div>
                      
                      {showInterviewScores && app.avgScore !== undefined && (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-2 border-b">
                          <div>
                            <p className="text-sm text-muted-foreground">Interview Score</p>
                            <p className="font-semibold text-lg">{app.avgScore}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Feedback Count</p>
                            <p className="font-semibold text-lg">{app.feedbackCount || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Recommendation</p>
                            <Badge variant={app.percentage && app.percentage >= 80 ? "default" : app.percentage && app.percentage >= 60 ? "secondary" : "outline"}>
                              {app.percentage && app.percentage >= 80 ? "Appointable" : app.percentage && app.percentage >= 60 ? "Alternate" : "Not Recommended"}
                            </Badge>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Comments:</p>
                          <p className="text-sm text-foreground/80">Stage-specific comments would appear here</p>
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
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function ReviewCommitteeApplicationsList({ applications }: ReviewCommitteeApplicationsListProps) {
  if (!applications || applications.length === 0) {
    return (
      <Alert>
        <AlertDescription>
          No applications found for this job.
        </AlertDescription>
      </Alert>
    );
  }

  // Group candidates by their furthest stage (only appear in one section)
  const panelInterview = applications.filter(app => app.status === "Panel Interview");
  const videoInterview = applications.filter(app => 
    app.status === "Pre-Recorded Video" && !panelInterview.find(p => p.id === app.id)
  );
  const longlistedSelected = applications.filter(app => 
    app.status === "Longlist" && 
    app.suggested_for_longlist === true &&
    !panelInterview.find(p => p.id === app.id) &&
    !videoInterview.find(v => v.id === app.id)
  );
  const longlistedNotSelected = applications.filter(app => 
    app.status === "Longlist" && 
    app.suggested_for_longlist === false &&
    !panelInterview.find(p => p.id === app.id) &&
    !videoInterview.find(v => v.id === app.id)
  );
  const longlisted = applications.filter(app => 
    app.status === "Screening" && 
    app.suggested_for_longlist === true &&
    !panelInterview.find(p => p.id === app.id) &&
    !videoInterview.find(v => v.id === app.id) &&
    !longlistedSelected.find(l => l.id === app.id) &&
    !longlistedNotSelected.find(l => l.id === app.id)
  );
  const notLonglisted = applications.filter(app => 
    (app.status === "Screening" || app.status === "Application") && 
    app.suggested_for_longlist === false &&
    !panelInterview.find(p => p.id === app.id) &&
    !videoInterview.find(v => v.id === app.id) &&
    !longlistedSelected.find(l => l.id === app.id) &&
    !longlistedNotSelected.find(l => l.id === app.id) &&
    !longlisted.find(l => l.id === app.id)
  );

  return (
    <div className="space-y-4">
      <StageSection
        title="Panel Interview Stage"
        description="Candidates who have completed or are in panel interviews"
        candidates={panelInterview}
        showInterviewScores={true}
      />
      
      <StageSection
        title="Video Interview Stage"
        description="Candidates who completed video interviews with hiring manager overall comments"
        candidates={videoInterview}
      />
      
      <StageSection
        title="Longlisted - Selected by Hiring Manager"
        description="Candidates who were longlisted and selected to proceed by the hiring manager"
        candidates={longlistedSelected}
      />
      
      <StageSection
        title="Longlisted - Not Selected by Hiring Manager"
        description="Candidates who were longlisted but not selected to proceed by the hiring manager"
        candidates={longlistedNotSelected}
      />
      
      <StageSection
        title="Longlisted by HR"
        description="Candidates who were recommended for longlist by HR screening"
        candidates={longlisted}
      />
      
      <StageSection
        title="Not Longlisted"
        description="Candidates who were not recommended for longlist during HR screening"
        candidates={notLonglisted}
      />
    </div>
  );
}
