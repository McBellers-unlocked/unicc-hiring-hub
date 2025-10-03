import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, Users, FileText, Calendar } from "lucide-react";
import StatsCard from "./StatsCard";
import ActionItem from "./ActionItem";

export default function HRAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalApplications: 0,
    activeJobs: 0,
    pendingPDs: 0,
    longlistingNeeded: 0,
    videoInterviews: 0,
    panelInterviews: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const appCount = await supabase.from('applications').select('*', { count: 'exact', head: true });
      const jobCount = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'Open');
      const pdCount = await supabase.from('job_requisitions').select('*', { count: 'exact', head: true }).in('status', ['pending_hr_review', 'chief_hr_review']);
      const longlist = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('stage', 'Screening');
      const video = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('stage', 'Pre-Recorded Video');
      const panel = await supabase.from('applications').select('*', { count: 'exact', head: true }).eq('stage', 'Panel Interview');

      setStats({
        totalApplications: appCount.count || 0,
        activeJobs: jobCount.count || 0,
        pendingPDs: pdCount.count || 0,
        longlistingNeeded: longlist.count || 0,
        videoInterviews: video.count || 0,
        panelInterviews: panel.count || 0
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="Total Applications" value={stats.totalApplications} icon={Users} />
        <StatsCard title="Active Jobs" value={stats.activeJobs} icon={Briefcase} />
        <StatsCard title="Pending PDs" value={stats.pendingPDs} alert={stats.pendingPDs > 5} icon={FileText} />
        <StatsCard title="Interviews This Week" value={0} icon={Calendar} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive text-base">
              <AlertCircle className="mr-2 h-4 w-4" />
              Urgent Actions
              {stats.pendingPDs > 0 && <Badge variant="destructive" className="ml-auto">{stats.pendingPDs}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>PDs needing review: {stats.pendingPDs}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-orange-500">
          <CardHeader>
            <CardTitle className="flex items-center text-orange-600 text-base">
              Important Actions
              <Badge variant="secondary" className="ml-auto">{stats.longlistingNeeded}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Longlisting needed: {stats.longlistingNeeded}</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center text-blue-600 text-base">Routine Tasks</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <p>Video interviews: {stats.videoInterviews}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Quick Actions</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <ActionItem
            priority="high"
            title="Review Position Descriptions"
            count={stats.pendingPDs}
            description="PDs awaiting your review"
            link="/admin/requisitions"
          />
          <ActionItem
            priority="medium"
            title="Longlisting"
            count={stats.longlistingNeeded}
            description="Applications need screening"
            link="/applications?stage=Screening"
          />
        </CardContent>
      </Card>
    </div>
  );
}
