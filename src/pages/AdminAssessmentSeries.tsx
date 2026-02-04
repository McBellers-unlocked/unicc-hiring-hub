import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Layers, Calendar, Users, Edit, Clock, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export default function AdminAssessmentSeries() {
  const { data: series, isLoading } = useQuery({
    queryKey: ["assessment-series"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_series")
        .select(`
          *,
          assessment_series_parts(count),
          assessment_series_candidates(count)
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

  const formatDateRange = (opens: string | null, closes: string | null) => {
    if (!opens && !closes) return "No dates set";
    if (opens && closes) {
      return `${format(new Date(opens), "MMM d, HH:mm")} - ${format(new Date(closes), "MMM d, HH:mm")}`;
    }
    if (opens) return `Opens ${format(new Date(opens), "MMM d, HH:mm")}`;
    if (closes) return `Closes ${format(new Date(closes), "MMM d, HH:mm")}`;
    return "";
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Link to="/admin/assessments">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Assessments
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Assessment Series</h1>
            <p className="text-muted-foreground mt-1">
              Create multi-part assessments with sequential exercises
            </p>
          </div>
          <Link to="/admin/assessment-series/new">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Series
            </Button>
          </Link>
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
        ) : series?.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Layers className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assessment series yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first multi-part assessment series to combine different exercises.
              </p>
              <Link to="/admin/assessment-series/new">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Series
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {series?.map((s) => {
              const partsCount = (s.assessment_series_parts as any)?.[0]?.count || 0;
              const candidatesCount = (s.assessment_series_candidates as any)?.[0]?.count || 0;

              return (
                <Card key={s.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg line-clamp-1">{s.title}</CardTitle>
                        <CardDescription className="line-clamp-2 mt-1">
                          {s.description || "No description"}
                        </CardDescription>
                      </div>
                      {getStatusBadge(s.status)}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <Clock className="w-4 h-4" />
                      <span>{formatDateRange(s.series_opens_at, s.series_closes_at)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                          <Layers className="w-4 h-4 mr-1" />
                        </div>
                        <p className="font-semibold">{partsCount}</p>
                        <p className="text-xs text-muted-foreground">Parts</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center justify-center text-muted-foreground mb-1">
                          <Users className="w-4 h-4 mr-1" />
                        </div>
                        <p className="font-semibold">{candidatesCount}</p>
                        <p className="text-xs text-muted-foreground">Candidates</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Link to={`/admin/assessment-series/${s.id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </Link>
                      <Link to={`/admin/assessment-series/${s.id}/candidates`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Users className="w-4 h-4 mr-1" />
                          Candidates
                        </Button>
                      </Link>
                    </div>

                    <p className="text-xs text-muted-foreground mt-3">
                      Created {format(new Date(s.created_at), "MMM d, yyyy")}
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
