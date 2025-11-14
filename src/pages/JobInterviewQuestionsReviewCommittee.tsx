import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { ReviewCommitteeManager } from "@/components/ReviewCommitteeManager";

export default function JobInterviewQuestionsReviewCommittee() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();

  const { data: job, isLoading } = useQuery({
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

  if (isLoading) {
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/jobs")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Jobs
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Manage Review Committee</CardTitle>
            <CardDescription className="text-base">
              {job?.title} ({job?.notice_no})
            </CardDescription>
          </CardHeader>
        </Card>

        <ReviewCommitteeManager jobId={jobId!} />

        <Card>
          <CardHeader>
            <CardTitle>Access Review Pack</CardTitle>
            <CardDescription>
              Review committee members can access the complete review pack including all candidate applications, interview scores, and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(`/admin/jobs/${jobId}/review-committee`)}>
              Open Review Pack
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
