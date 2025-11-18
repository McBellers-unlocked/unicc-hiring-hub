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
    activeJobs: 0,
    approvedInitialRequests: 0,
    approvedPDs: 0
  });
  const [myJobIds, setMyJobIds] = useState<string[]>([]);
  const [recentlyApproved, setRecentlyApproved] = useState<any[]>([]);

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
    
    // Get recently approved initial requests (last 30 days) - only those that haven't moved beyond initial approval
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const { data: approvedInitial, count: approvedInitialCount } = await supabase
      .from('job_requisitions')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id)
      .eq('initial_request_approved', true)
      .eq('status', 'initial_request_approved')
      .gte('initial_request_approved_at', thirtyDaysAgo.toISOString())
      .order('initial_request_approved_at', { ascending: false })
      .limit(5);
    
    // Get recently approved full PDs (last 30 days)
    const { data: approvedPDs, count: approvedPDsCount } = await supabase
      .from('job_requisitions')
      .select('*', { count: 'exact' })
      .eq('created_by', user.id)
      .eq('chief_of_division_approval', true)
      .in('status', ['chief_division_review', 'deputy_director_review', 'director_review', 'finance_review', 'hr_review'])
      .gte('chief_of_division_approved_at', thirtyDaysAgo.toISOString())
      .order('chief_of_division_approved_at', { ascending: false })
      .limit(5);
    
    // Combine and sort by approval date
    const combined = [
      ...(approvedInitial || []).map(r => ({ ...r, approvalType: 'Initial Request' })),
      ...(approvedPDs || []).map(r => ({ ...r, approvalType: 'Full PD' }))
    ].sort((a, b) => {
      const dateA = new Date(a.initial_request_approved_at || a.chief_of_division_approved_at || 0);
      const dateB = new Date(b.initial_request_approved_at || b.chief_of_division_approved_at || 0);
      return dateB.getTime() - dateA.getTime();
    }).slice(0, 5);
    
    setRecentlyApproved(combined);
    
    setStats({ 
      myJobs: jobIds.length,
      activeJobs: activeJobsCount || 0,
      pendingReview: pdsCount || 0,
      recentApplications: recentAppsCount || 0,
      approvedInitialRequests: approvedInitialCount || 0,
      approvedPDs: approvedPDsCount || 0
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard 
          title="Active Jobs" 
          value={stats.activeJobs}
          subtitle={`${stats.myJobs} total jobs`}
          icon={Briefcase}
          onClick={() => navigate('/admin/jobs')}
        />
        <StatsCard 
          title="New Applications (7d)" 
          value={stats.recentApplications}
          icon={FileText}
          alert={stats.recentApplications > 10}
          onClick={() => {
            if (myJobIds.length > 0) {
              navigate(`/applications/manage?job=${myJobIds[0]}`);
            } else {
              navigate('/applications');
            }
          }}
        />
        <StatsCard 
          title="PDs Pending Review" 
          value={stats.pendingReview} 
          alert={stats.pendingReview > 0} 
          icon={FileText}
          onClick={() => navigate('/requisitions')}
        />
        <StatsCard 
          title="Initial Requests Approved (30d)" 
          value={stats.approvedInitialRequests}
          icon={FileText}
          onClick={() => navigate('/requisitions')}
        />
        <StatsCard 
          title="Full PDs Approved (30d)" 
          value={stats.approvedPDs}
          icon={FileText}
          onClick={() => navigate('/requisitions')}
        />
      </div>

      {stats.pendingReview > 0 && (
        <Card className="border-l-4 border-orange-500">
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Review Position Descriptions</p>
                <p className="text-sm text-muted-foreground">{stats.pendingReview} PDs need your approval</p>
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => navigate('/requisitions')}
                  className="flex-1"
                >
                  My PDs
                </Button>
                <Button 
                  onClick={() => navigate('/chief-division-view')}
                  variant="outline"
                  className="flex-1"
                >
                  Chief View
                </Button>
              </div>
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
                  navigate(`/applications/manage?job=${myJobIds[0]}`);
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

      {recentlyApproved.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recently Approved by Chief (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentlyApproved.map((req) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex-1">
                    <p className="font-semibold">{req.position_title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className="text-xs cursor-pointer hover:bg-primary/10 transition-colors" 
                        onClick={() => navigate(`/requisitions/${req.id}`)}
                      >
                        {req.approvalType}
                      </Badge>
                      {req.grade && <Badge variant="secondary" className="text-xs">{req.grade}</Badge>}
                      <span className="text-xs text-muted-foreground">
                        Approved {new Date(req.initial_request_approved_at || req.chief_of_division_approved_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/requisitions/${req.id}`)}
                    >
                      View
                    </Button>
                    {req.approvalType === 'Initial Request' && (
                      <Button 
                        size="sm"
                        onClick={() => navigate(`/requisitions/${req.id}/edit`)}
                      >
                        Create Full PD
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
