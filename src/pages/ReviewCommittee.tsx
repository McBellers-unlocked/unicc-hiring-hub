import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, Users, Award, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ReviewCommitteeScoreMatrix } from "@/components/ReviewCommitteeScoreMatrix";
import { ReviewCommitteeApplicationsList } from "@/components/ReviewCommitteeApplicationsList";

export default function ReviewCommittee() {
  const { jobId } = useParams<{ jobId: string }>();

  // Fetch job details
  const { data: job, isLoading: jobLoading } = useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
        .eq("id", jobId)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch all candidates for this job with stage history
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["all-candidates", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select(`
          *,
          candidate:candidates(*),
          feedback:feedback_form_responses(
            overall,
            recommendation,
            evaluator:users(name)
          )
        `)
        .eq("job_id", jobId)
        .order("submitted_at", { ascending: false });
      
      if (error) throw error;

      // Fetch stage events for all applications
      const appIds = data?.map(app => app.id) || [];
      const { data: stageEvents } = await supabase
        .from("stage_events")
        .select("*")
        .in("application_id", appIds)
        .order("at", { ascending: true });

      // Attach stage history to each application
      return data?.map(app => ({
        ...app,
        stageHistory: stageEvents?.filter(e => e.application_id === app.id) || []
      }));
    },
  });

  // Calculate interview statistics for each candidate
  const candidatesWithStats = candidates?.map((app) => {
    const feedbacks = app.feedback || [];
    const avgScore = feedbacks.length > 0
      ? feedbacks.reduce((sum, f) => sum + (f.overall || 0), 0) / feedbacks.length
      : 0;
    const percentage = (avgScore / 100) * 100;
    
    return {
      ...app,
      avgScore: Math.round(avgScore),
      percentage: Math.round(percentage),
      feedbackCount: feedbacks.length,
    };
  }).sort((a, b) => b.percentage - a.percentage);

  const exportToPDF = async () => {
    // TODO: Implement PDF export functionality
    console.log("Exporting to PDF...");
  };

  if (jobLoading || candidatesLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">Review Committee Pack</CardTitle>
                <CardDescription className="text-base">
                  {job?.title} ({job?.notice_no})
                </CardDescription>
              </div>
              <Button onClick={exportToPDF}>
                <Download className="h-4 w-4 mr-2" />
                Export Full Pack (PDF)
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Candidates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{candidates?.length || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Appointable (80%+)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {candidatesWithStats?.filter(c => c.percentage >= 80).length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recommended
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">
                {candidatesWithStats?.filter((c, idx) => c.percentage >= 80 && idx === 0).length || 0}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alternates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {candidatesWithStats?.filter((c, idx) => c.percentage >= 80 && idx > 0).length || 0}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="summary">
              <TrendingUp className="h-4 w-4 mr-2" />
              Summary & Rankings
            </TabsTrigger>
            <TabsTrigger value="applications">
              <FileText className="h-4 w-4 mr-2" />
              Applications
            </TabsTrigger>
            <TabsTrigger value="scores">
              <Award className="h-4 w-4 mr-2" />
              Interview Scores
            </TabsTrigger>
            <TabsTrigger value="report">
              <Users className="h-4 w-4 mr-2" />
              HR Report
            </TabsTrigger>
          </TabsList>

          {/* Summary Tab */}
          <TabsContent value="summary" className="space-y-4">
            <ReviewCommitteeScoreMatrix jobId={jobId!} />
          </TabsContent>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-6">
            <ReviewCommitteeApplicationsList applications={candidatesWithStats || []} />
          </TabsContent>

          {/* Scores Tab */}
          <TabsContent value="scores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Interview Scores Detail</CardTitle>
                <CardDescription>
                  Detailed breakdown of interview panel scores
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    Detailed score matrices are available in individual application views.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Report Tab */}
          <TabsContent value="report" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>HR Report</CardTitle>
                <CardDescription>
                  Final report prepared by HR representative
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Alert>
                  <AlertDescription>
                    HR report functionality coming soon. This will include panel consensus, recommendations, and procedural notes.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
