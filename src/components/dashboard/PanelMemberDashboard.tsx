import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Calendar, AlertCircle, CheckCircle2, Users } from "lucide-react";
import StatsCard from "./StatsCard";
import { format } from "date-fns";

export default function PanelMemberDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    upcomingInterviews: 0,
    pendingFeedback: 0,
    completedThisMonth: 0,
    totalInterviews: 0
  });

  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [pendingFeedback, setPendingFeedback] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Simplified approach - just show panel member basic stats for now
      // TODO: Implement full panel interview tracking
      
      setStats({
        upcomingInterviews: 0,
        pendingFeedback: 0,
        completedThisMonth: 0,
        totalInterviews: 0
      });

      setUpcomingInterviews([]);
      setPendingFeedback([]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">My Panel Interviews</h1>
        <p className="text-muted-foreground">Your interview schedule and feedback tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Upcoming Interviews" 
          value={stats.upcomingInterviews} 
          icon={Calendar} 
        />
        <StatsCard 
          title="Pending Feedback" 
          value={stats.pendingFeedback} 
          alert={stats.pendingFeedback > 0}
          icon={AlertCircle} 
        />
        <StatsCard 
          title="Completed This Month" 
          value={stats.completedThisMonth} 
          icon={CheckCircle2} 
        />
        <StatsCard 
          title="Total Interviews" 
          value={stats.totalInterviews} 
          icon={Users} 
        />
      </div>

      {/* Feedback Needed Alert */}
      {pendingFeedback.length > 0 && (
        <Card className="border-l-4 border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertCircle className="mr-2 h-5 w-5" />
              Feedback Needed
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingFeedback.map(interview => {
              const interviewData = interview.panel_interviews;
              const application = interviewData?.applications;
              
              return (
                <div key={interview.panel_interview_id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium">{application?.candidate_name || 'Candidate'}</p>
                    <p className="text-sm text-muted-foreground">
                      Interview: {interviewData?.scheduled_at ? format(new Date(interviewData.scheduled_at), 'PPP') : 'Date not set'}
                    </p>
                  </div>
                  <Button onClick={() => navigate(`/panel-interview/${interview.panel_interview_id}/feedback`)}>
                    Provide Feedback
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Interview Schedule */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming <Badge className="ml-2">{stats.upcomingInterviews}</Badge>
          </TabsTrigger>
          <TabsTrigger value="pending">
            Pending Feedback <Badge variant="destructive" className="ml-2">{stats.pendingFeedback}</Badge>
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="upcoming">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Interviews</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingInterviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No upcoming interviews</p>
              ) : (
                upcomingInterviews.map(interview => {
                  const interviewData = interview.panel_interviews;
                  const application = interviewData?.applications;
                  
                  return (
                    <div key={interview.panel_interview_id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold">{application?.candidate_name || 'Candidate'}</h4>
                          <p className="text-sm text-muted-foreground">
                            {interviewData?.scheduled_at ? format(new Date(interviewData.scheduled_at), 'PPP p') : 'Not scheduled'}
                          </p>
                        </div>
                        <Button 
                          variant="outline" 
                          onClick={() => navigate(`/applications/${interviewData?.application_id}`)}
                        >
                          View Application
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Pending Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingFeedback.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending feedback</p>
              ) : (
                <p className="text-muted-foreground">See feedback needed section above</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
