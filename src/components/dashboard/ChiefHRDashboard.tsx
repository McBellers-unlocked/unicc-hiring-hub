import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import StatsCard from "./StatsCard";
import { useToast } from "@/hooks/use-toast";

export default function ChiefHRDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    pendingReview: 0,
    reviewedThisWeek: 0,
    avgReviewTime: "2.3 days"
  });

  const [pendingRequisitions, setPendingRequisitions] = useState<any[]>([]);
  const [reviewComments, setReviewComments] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: pending, count: pendingCount } = await supabase
        .from('job_requisitions')
        .select('id, position_title, reference_number, status, created_at', { count: 'exact' })
        .eq('status', 'chief_hr_review')
        .order('created_at', { ascending: true });

      setPendingRequisitions(pending || []);
      
      setStats({
        pendingReview: pendingCount || 0,
        reviewedThisWeek: 0, // TODO: calculate
        avgReviewTime: "2.3 days"
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleApproval = async (requisitionId: string, approved: boolean) => {
    const comments = reviewComments[requisitionId] || '';
    
    try {
      const newStatus = approved ? 'hiring_manager_review' : 'pending_hr_review';
      
      const { error } = await supabase
        .from('job_requisitions')
        .update({ 
          status: newStatus,
          chief_hr_comments: comments
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: approved ? "Approved" : "Sent Back",
        description: approved 
          ? "Requisition sent to hiring manager for review" 
          : "Requisition sent back to HR for revisions"
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Chief HR Dashboard</h1>
        <p className="text-muted-foreground">
          Position Descriptions awaiting your review
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          title="Pending Review" 
          value={stats.pendingReview}
          alert={stats.pendingReview > 5}
          icon={Clock}
        />
        <StatsCard 
          title="Reviewed This Week" 
          value={stats.reviewedThisWeek}
          icon={CheckCircle}
        />
        <StatsCard 
          title="Avg Review Time" 
          value={stats.avgReviewTime}
          icon={Clock}
        />
      </div>

      {/* Requisitions for Review */}
      <Card>
        <CardHeader>
          <CardTitle>Position Descriptions for Review</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review <Badge className="ml-2">{stats.pendingReview}</Badge>
              </TabsTrigger>
              <TabsTrigger value="reviewed">Recently Reviewed</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending" className="space-y-4">
              {pendingRequisitions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No requisitions pending review</p>
              ) : (
                pendingRequisitions.map(req => (
                  <Card key={req.id} className="border-l-4 border-orange-500">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{req.position_title}</CardTitle>
                          <p className="text-sm text-muted-foreground">{req.reference_number}</p>
                        </div>
                        <Badge variant="secondary">Pending Review</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Add review comments..."
                        value={reviewComments[req.id] || ''}
                        onChange={(e) => setReviewComments({
                          ...reviewComments,
                          [req.id]: e.target.value
                        })}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={() => navigate(`/requisitions/${req.id}`)}
                          variant="outline"
                          className="flex-1"
                        >
                          View Details
                        </Button>
                        <Button
                          onClick={() => handleApproval(req.id, false)}
                          variant="outline"
                          className="flex-1"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Send Back
                        </Button>
                        <Button
                          onClick={() => handleApproval(req.id, true)}
                          className="flex-1"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </TabsContent>
            
            <TabsContent value="reviewed">
              <p className="text-muted-foreground text-center py-8">Recently reviewed requisitions will appear here</p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
