import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, ClipboardList, Calendar, Users, Eye, Edit, Clock, ListChecks } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function AdminAssessments() {
  const { data: assessments, isLoading } = useQuery({
    queryKey: ["written-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("written_assessments")
        .select(`
          *,
          assessment_emails(count),
          assessment_slots(
            id,
            status
          ),
          assessment_mcq_questions(count)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getSlotStats = (slots: any[]) => {
    if (!slots?.length) return { total: 0, completed: 0, pending: 0 };
    return {
      total: slots.length,
      completed: slots.filter((s) => s.status === "completed").length,
      pending: slots.filter((s) => s.status === "scheduled" || s.status === "in_progress").length,
    };
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Written Assessments</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage inbox simulation assessments for candidates
            </p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/assessment-series">
              <Button variant="outline">
                Assessment Series
              </Button>
            </Link>
            <Link to="/admin/assessments/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Assessment
              </Button>
            </Link>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : assessments?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first inbox simulation assessment to start evaluating candidates.
              </p>
              <Link to="/admin/assessments/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {assessments?.map((assessment) => {
              const slotStats = getSlotStats(assessment.assessment_slots as any[]);
              const emailCount = (assessment.assessment_emails as any)?.[0]?.count || 0;
              const questionCount = (assessment.assessment_mcq_questions as any)?.[0]?.count || 0;
              const isMCQ = assessment.assessment_type === "multiple_choice";

              return (
                <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">{assessment.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {assessment.description || "No description"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(assessment.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                          <Clock className="w-4 h-4 mr-1" />
                        </div>
                        <p className="font-semibold">{assessment.time_limit_minutes} min</p>
                        <p className="text-xs text-muted-foreground">Duration</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                          {isMCQ ? <ListChecks className="w-4 h-4 mr-1" /> : <ClipboardList className="w-4 h-4 mr-1" />}
                        </div>
                        <p className="font-semibold">{isMCQ ? questionCount : emailCount}</p>
                        <p className="text-xs text-muted-foreground">{isMCQ ? "Questions" : "Emails"}</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                          <Users className="w-4 h-4 mr-1" />
                        </div>
                        <p className="font-semibold">{slotStats.completed}/{slotStats.total}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/admin/assessments/${assessment.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/admin/assessments/${assessment.id}/slots`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Calendar className="w-4 h-4 mr-1" />
                          Slots
                        </Button>
                      </Link>
                      {slotStats.completed > 0 && (
                        <Link to={`/admin/assessments/${assessment.id}/review`}>
                          <Button variant="outline" size="sm">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">
                      Created {format(new Date(assessment.created_at), "MMM d, yyyy")}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
