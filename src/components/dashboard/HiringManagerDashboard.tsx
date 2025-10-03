import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Briefcase, FileText } from "lucide-react";
import StatsCard from "./StatsCard";

export default function HiringManagerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ 
    myJobs: 0, 
    pendingReview: 0,
    recentApplications: 0,
    activeJobs: 0
  });
  const [myJobIds, setMyJobIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    // Get jobs where user is hiring manager
    const { data: jobAssignments } = await supabase
      .from('job_hiring_managers')
      .select('job_id')
      .eq('user_id', user.id);
    
    const jobIds = jobAssignments?.map(a => a.job_id) || [];
    setMyJobIds(jobIds);
    
    // Get active jobs count
    const { count: activeJobsCount } = await supabase
      .from('jobs')
      .select('id', { count: 'exact', head: true })
      .in('id', jobIds)
      .eq('status', 'active');
    
    // Get recent applications (last 7 days) for my jobs
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: recentAppsCount } = await supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .in('job_id', jobIds)
      .gte('submitted_at', sevenDaysAgo.toISOString());
    
    // Get pending PDs
    const { count: pdsCount } = await supabase
      .from('job_requisitions')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', user.id)
      .eq('status', 'hiring_manager_review');
    
    setStats({ 
      myJobs: jobIds.length,
      activeJobs: activeJobsCount || 0,
      pendingReview: pdsCount || 0,
      recentApplications: recentAppsCount || 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard 
          title="Active Jobs" 
          value={stats.activeJobs}
          subtitle={`${stats.myJobs} total jobs`}
          icon={Briefcase} 
        />
        <StatsCard 
          title="New Applications (7d)" 
          value={stats.recentApplications}
          icon={FileText}
          alert={stats.recentApplications > 10}
        />
        <StatsCard 
          title="PDs Pending Review" 
          value={stats.pendingReview} 
          alert={stats.pendingReview > 0} 
          icon={FileText} 
        />
      </div>

      {stats.pendingReview > 0 && (
        <Card className="border-l-4 border-orange-500">
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Review Position Descriptions</p>
                <p className="text-sm text-muted-foreground">{stats.pendingReview} PDs need your approval</p>
              </div>
              <Button onClick={() => navigate('/requisitions')}>Review Now</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button 
              onClick={() => {
                if (myJobIds.length > 0) {
                  navigate(`/applications?job=${myJobIds[0]}`);
                } else {
                  navigate('/applications');
                }
              }} 
              variant="outline" 
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              View Applications for My Jobs
            </Button>
            <Button 
              onClick={() => navigate('/requisitions')} 
              variant="outline" 
              className="w-full justify-start"
            >
              <FileText className="h-4 w-4 mr-2" />
              Manage Position Descriptions
            </Button>
            <Button 
              onClick={() => navigate('/requisitions/new')} 
              variant="outline" 
              className="w-full justify-start"
            >
              <Briefcase className="h-4 w-4 mr-2" />
              Create New Position Description
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
