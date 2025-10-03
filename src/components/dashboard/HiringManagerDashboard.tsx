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
  const [stats, setStats] = useState({ myJobs: 0, pendingReview: 0 });

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    
    const jobsResult = await supabase.from('job_hiring_managers').select('job_id', { count: 'exact', head: true }).eq('user_id', user.id);
    const pdsResult = await supabase.from('job_requisitions').select('*', { count: 'exact', head: true }).eq('created_by', user.id).eq('status', 'hiring_manager_review');
    
    setStats({ myJobs: jobsResult.count || 0, pendingReview: pdsResult.count || 0 });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatsCard title="My Jobs" value={stats.myJobs} icon={Briefcase} />
        <StatsCard title="Pending My Review" value={stats.pendingReview} alert={stats.pendingReview > 0} icon={FileText} />
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
              <Button onClick={() => navigate('/requisitions')}>Review</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>My Jobs & Position Descriptions</CardTitle>
            <Button onClick={() => navigate('/requisitions/new')} variant="outline">Create New PD</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Button onClick={() => navigate('/jobs')} variant="outline" className="w-full">View My Jobs</Button>
            <Button onClick={() => navigate('/requisitions')} variant="outline" className="w-full">View My PDs</Button>
            <Button onClick={() => navigate('/applications')} variant="outline" className="w-full">View Applications</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
