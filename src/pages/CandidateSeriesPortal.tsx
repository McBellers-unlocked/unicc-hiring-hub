import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Clock, Lock, CheckCircle2, Play, FileText, AlertCircle } from "lucide-react";

export default function CandidateSeriesPortal() {
  const { token } = useParams();
  const navigate = useNavigate();

  // Validate token and get series info
  const { data: seriesAccess, isLoading: accessLoading, error: accessError } = useQuery({
    queryKey: ["series-access", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("validate_series_token", { p_token: token });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Invalid or expired access token");
      return data[0];
    },
    enabled: !!token,
    retry: false,
  });

  // Get series parts with completion status
  const { data: parts, isLoading: partsLoading } = useQuery({
    queryKey: ["series-parts", seriesAccess?.series_id, seriesAccess?.candidate_email],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("get_series_parts_with_status", {
          p_series_id: seriesAccess.series_id,
          p_candidate_email: seriesAccess.candidate_email,
        });
      if (error) throw error;
      return data;
    },
    enabled: !!seriesAccess?.series_id,
  });

  const getPartStatus = (part: any) => {
    if (part.slot_status === "completed") return "completed";
    if (part.slot_status === "in_progress") return "in_progress";
    if (!part.is_unlocked) return "locked";
    return "available";
  };

  const getTimeLimitDisplay = (part: any) => {
    if (part.assessment_type === "research_exercise" && part.time_limit_hours) {
      return `${part.time_limit_hours} hours`;
    }
    return `${part.time_limit_minutes || 90} minutes`;
  };

  const handleStartPart = (part: any) => {
    if (part.assessment_type === "research_exercise") {
      // For research exercises, we need to create a slot and navigate
      navigate(`/research/${token}/${part.assessment_id}`);
    } else {
      // For inbox simulations, navigate to the existing assessment flow
      if (part.slot_id) {
        navigate(`/assessment/${part.slot_id}`);
      } else {
        // Need to create a slot first - this will be handled by the assessment page
        navigate(`/assessment/${token}/${part.assessment_id}`);
      }
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto p-4">
          <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto mb-8" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (accessError || !seriesAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This assessment series link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isSeriesOpen = !seriesAccess.series_opens_at || new Date(seriesAccess.series_opens_at) <= new Date();
  const isSeriesClosed = seriesAccess.series_closes_at && new Date(seriesAccess.series_closes_at) < new Date();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{seriesAccess.series_title}</h1>
          {seriesAccess.series_description && (
            <p className="text-muted-foreground">{seriesAccess.series_description}</p>
          )}
          <p className="text-sm text-muted-foreground mt-2">
            Welcome, {seriesAccess.candidate_name}
          </p>
        </div>

        {seriesAccess.series_opens_at && seriesAccess.series_closes_at && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span>
                  {isSeriesClosed ? (
                    <span className="text-destructive">This series has closed</span>
                  ) : !isSeriesOpen ? (
                    <>Opens {format(new Date(seriesAccess.series_opens_at), "MMM d, yyyy 'at' HH:mm")}</>
                  ) : (
                    <>Closes {format(new Date(seriesAccess.series_closes_at), "MMM d, yyyy 'at' HH:mm")}</>
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {isSeriesClosed ? (
          <Card>
            <CardContent className="py-8 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">This assessment series has closed</p>
              <p className="text-muted-foreground">
                The deadline was {format(new Date(seriesAccess.series_closes_at), "MMM d, yyyy 'at' HH:mm")}
              </p>
            </CardContent>
          </Card>
        ) : !isSeriesOpen ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-lg font-medium">This assessment series is not yet open</p>
              <p className="text-muted-foreground">
                Please return on {format(new Date(seriesAccess.series_opens_at), "MMM d, yyyy 'at' HH:mm")}
              </p>
            </CardContent>
          </Card>
        ) : partsLoading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {parts?.map((part: any, index: number) => {
              const status = getPartStatus(part);

              return (
                <Card
                  key={part.part_id}
                  className={status === "locked" ? "opacity-60" : ""}
                >
                  <CardContent className="py-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                            status === "completed"
                              ? "bg-emerald-100 text-emerald-700"
                              : status === "in_progress"
                              ? "bg-blue-100 text-blue-700"
                              : status === "locked"
                              ? "bg-muted text-muted-foreground"
                              : "bg-primary text-primary-foreground"
                          }`}
                        >
                          {status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5" />
                          ) : status === "locked" ? (
                            <Lock className="w-4 h-4" />
                          ) : (
                            index + 1
                          )}
                        </div>
                        <div>
                          <h3 className="font-semibold">{part.part_title || `Part ${index + 1}`}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {part.assessment_type === "research_exercise" ? (
                              <span className="flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Research Exercise
                              </span>
                            ) : (
                              "Inbox Simulation"
                            )}
                            {" • "}
                            {getTimeLimitDisplay(part)}
                          </p>
                          {status === "locked" && (
                            <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                              <Lock className="w-3 h-3" />
                              Complete Part {index} to unlock
                            </p>
                          )}
                          {status === "in_progress" && part.started_at && (
                            <p className="text-xs text-blue-600 mt-2">
                              Started {format(new Date(part.started_at), "MMM d 'at' HH:mm")}
                            </p>
                          )}
                          {status === "completed" && part.submitted_at && (
                            <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Completed {format(new Date(part.submitted_at), "MMM d 'at' HH:mm")}
                            </p>
                          )}
                        </div>
                      </div>
                      <div>
                        {status === "completed" ? (
                          <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>
                        ) : status === "in_progress" ? (
                          <Button size="sm" onClick={() => handleStartPart(part)}>
                            <Play className="w-4 h-4 mr-1" />
                            Continue
                          </Button>
                        ) : status === "available" ? (
                          <Button size="sm" onClick={() => handleStartPart(part)}>
                            <Play className="w-4 h-4 mr-1" />
                            Start
                          </Button>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            Locked
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>Having trouble? Contact the assessment administrator for assistance.</p>
        </div>
      </div>
    </div>
  );
}
