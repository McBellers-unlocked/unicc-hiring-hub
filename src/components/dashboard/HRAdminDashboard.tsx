import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Briefcase, Users, FileText, Calendar, ArrowRight, Search, FileCheck } from "lucide-react";
import StatsCard from "./StatsCard";
import ActionItem from "./ActionItem";

export default function HRAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    jobsClosingThisWeek: 0,
    videosExpiringToday: 0,
    videosExpiringTomorrow: 0,
    pdsStuckInReview: 0,
    pendingPDs: 0,
    applicationsNeedingLonglisting: 0,
    panelInterviewsToSchedule: 0,
    recentApplications: 0,
    jobsWithHighVolume: 0,
    topJobNeedingLonglisting: null as string | null
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const [jobsRes, videoAssignmentsRes, pdsRes, appsRes, panelInterviewsRes] = await Promise.all([
        supabase.from('jobs').select('id, closing_date, status'),
        supabase.from('video_assignments').select('id, deadline_at, status'),
        supabase.from('job_requisitions').select('id, status, created_at'),
        supabase.from('applications').select('id, job_id, status, submitted_at'),
        supabase.from('panel_interviews').select('id, application_id, status')
      ]);

      const jobs = jobsRes.data || [];
      const videoAssignments = videoAssignmentsRes.data || [];
      const pds = pdsRes.data || [];
      const applications = appsRes.data || [];
      const panelInterviews = panelInterviewsRes.data || [];

      // Jobs closing this week
      const jobsClosingThisWeek = jobs.filter(j => {
        if (!j.closing_date || j.status !== 'active') return false;
        const closingDate = new Date(j.closing_date);
        return closingDate >= now && closingDate <= oneWeekFromNow;
      }).length;

      // Video interviews expiring today and tomorrow
      const videosExpiringToday = videoAssignments.filter(v => {
        if (!v.deadline_at || v.status === 'Completed') return false;
        const deadline = new Date(v.deadline_at);
        return deadline >= now && deadline < tomorrow;
      }).length;

      const videosExpiringTomorrow = videoAssignments.filter(v => {
        if (!v.deadline_at || v.status === 'Completed') return false;
        const deadline = new Date(v.deadline_at);
        const dayAfterTomorrow = new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000);
        return deadline >= tomorrow && deadline < dayAfterTomorrow;
      }).length;

      // PDs stuck in review (>5 days)
      const pdsStuckInReview = pds.filter(pd => {
        if (!['hr_review', 'chief_hr_review'].includes(pd.status)) return false;
        const createdAt = new Date(pd.created_at);
        return createdAt < fiveDaysAgo;
      }).length;

      // All pending PDs
      const pendingPDs = pds.filter(pd => 
        ['hr_review', 'chief_hr_review'].includes(pd.status)
      ).length;

      // Applications needing longlisting (by job)
      const appsByJob = applications.reduce((acc, app) => {
        if (app.status === 'Application') {
          acc[app.job_id] = (acc[app.job_id] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);
      const applicationsNeedingLonglisting = Object.values(appsByJob).reduce((sum, count) => sum + count, 0);
      
      // Find job with most applications needing longlisting
      const topJobNeedingLonglisting = Object.entries(appsByJob).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Panel interviews to schedule (applications that need panel but don't have scheduled interview)
      const appsWithPanelInterview = new Set(panelInterviews.map(pi => pi.application_id));
      const panelInterviewsToSchedule = applications.filter(app => 
        app.status === 'Panel Interview' && !appsWithPanelInterview.has(app.id)
      ).length;

      // Recent applications (last 7 days)
      const recentApplications = applications.filter(app => {
        const submittedAt = new Date(app.submitted_at);
        return submittedAt >= sevenDaysAgo;
      }).length;

      // Jobs with high volume (>50 applications)
      const jobsWithHighVolume = Object.values(appsByJob).filter(count => count > 50).length;

      setStats({
        jobsClosingThisWeek,
        videosExpiringToday,
        videosExpiringTomorrow,
        pdsStuckInReview,
        pendingPDs,
        applicationsNeedingLonglisting,
        panelInterviewsToSchedule,
        recentApplications,
        jobsWithHighVolume,
        topJobNeedingLonglisting
      });
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Access Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/admin/jobs')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Manage Jobs</CardTitle>
                  <p className="text-sm text-muted-foreground">Create and edit job postings</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/admin/talent-pool')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Talent Pool</CardTitle>
                  <p className="text-sm text-muted-foreground">Search candidate database</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate('/admin/requisitions')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <FileCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">PD Pipeline</CardTitle>
                  <p className="text-sm text-muted-foreground">Manage position descriptions</p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard 
          title="Jobs Closing This Week" 
          value={stats.jobsClosingThisWeek} 
          alert={stats.jobsClosingThisWeek > 0}
          icon={Briefcase}
          onClick={() => navigate('/admin/jobs')}
        />
        <StatsCard 
          title="Videos Expiring Today" 
          value={stats.videosExpiringToday} 
          alert={stats.videosExpiringToday > 0}
          icon={AlertCircle}
          onClick={() => navigate('/admin/applications?filter=video_expiring')}
        />
        <StatsCard 
          title="PDs Stuck in Review" 
          value={stats.pdsStuckInReview} 
          alert={stats.pdsStuckInReview > 0}
          icon={FileText}
          onClick={() => navigate('/admin/requisitions?filter=stuck')}
        />
        <StatsCard 
          title="New Apps (7 Days)" 
          value={stats.recentApplications} 
          icon={Users}
          onClick={() => navigate('/admin/applications')}
        />
      </div>

      {/* Urgent Actions */}
      <Card className="border-l-4 border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center text-destructive">
            <AlertCircle className="mr-2 h-5 w-5" />
            Urgent Actions Required
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.jobsClosingThisWeek > 0 && (
            <ActionItem
              priority="high"
              title="Jobs Closing This Week"
              count={stats.jobsClosingThisWeek}
              description="Review and promote these positions"
              link="/admin/jobs"
            />
          )}
          {stats.videosExpiringToday > 0 && (
            <ActionItem
              priority="high"
              title="Video Interviews Expiring Today"
              count={stats.videosExpiringToday}
              description="Follow up with candidates or extend deadlines"
              link="/applications?filter=video_expiring"
            />
          )}
          {stats.videosExpiringTomorrow > 0 && (
            <ActionItem
              priority="high"
              title="Video Interviews Expiring Tomorrow"
              count={stats.videosExpiringTomorrow}
              description="Send reminder to candidates"
              link="/applications?filter=video_expiring"
            />
          )}
          {stats.pdsStuckInReview > 0 && (
            <ActionItem
              priority="high"
              title="Position Descriptions Stuck in Review"
              count={stats.pdsStuckInReview}
              description="PDs pending for more than 5 days"
              link="/admin/requisitions?filter=stuck"
            />
          )}
          {stats.jobsClosingThisWeek === 0 && stats.videosExpiringToday === 0 && 
           stats.videosExpiringTomorrow === 0 && stats.pdsStuckInReview === 0 && (
            <p className="text-sm text-muted-foreground">No urgent actions at the moment</p>
          )}
        </CardContent>
      </Card>

      {/* Important Actions */}
      <Card className="border-l-4 border-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center text-orange-600">
            Important Tasks
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.pendingPDs > 0 && (
            <ActionItem
              priority="medium"
              title="Review Position Descriptions"
              count={stats.pendingPDs}
              description="PDs awaiting HR review"
              link="/admin/requisitions"
            />
          )}
          {stats.applicationsNeedingLonglisting > 0 && (
            <ActionItem
              priority="medium"
              title="Applications Needing Longlisting"
              count={stats.applicationsNeedingLonglisting}
              description="Screen and create longlist"
              link={stats.topJobNeedingLonglisting ? `/applications?job=${stats.topJobNeedingLonglisting}&status=Application` : "/applications?status=Application"}
            />
          )}
          {stats.panelInterviewsToSchedule > 0 && (
            <ActionItem
              priority="medium"
              title="Panel Interviews to Schedule"
              count={stats.panelInterviewsToSchedule}
              description="Candidates ready for panel interview"
              link="/applications?status=Panel Interview"
            />
          )}
          {stats.pendingPDs === 0 && stats.applicationsNeedingLonglisting === 0 && 
           stats.panelInterviewsToSchedule === 0 && (
            <p className="text-sm text-muted-foreground">All important tasks completed</p>
          )}
        </CardContent>
      </Card>

      {/* Activity Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Applications in last 7 days</span>
            <Badge variant="secondary">{stats.recentApplications}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Jobs with high volume (&gt;50 apps)</span>
            <Badge variant="secondary">{stats.jobsWithHighVolume}</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
