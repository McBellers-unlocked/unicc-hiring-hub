import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Users, Target, CheckCircle } from 'lucide-react';

interface FunnelData {
  stage: string;
  count: number;
  percentage: number;
  color: string;
}

interface TimeToHireData {
  month: string;
  avgDays: number;
  totalHires: number;
}

interface SourceData {
  source: string;
  applications: number;
  hires: number;
  conversionRate: number;
}

export const HiringFunnelDashboard: React.FC = () => {
  const [funnelData, setFunnelData] = useState<FunnelData[]>([]);
  const [timeToHireData, setTimeToHireData] = useState<TimeToHireData[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMetrics, setTotalMetrics] = useState({
    totalApplications: 0,
    avgTimeToHire: 0,
    conversionRate: 0,
    activeJobs: 0
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      await Promise.all([
        fetchFunnelData(),
        fetchTimeToHireData(),
        fetchSourceData(),
        fetchTotalMetrics()
      ]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFunnelData = async () => {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('status, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const statusCounts = applications?.reduce((acc: Record<string, number>, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {}) || {};

    const total = applications?.length || 0;
    const stages = [
      { stage: 'Applications', status: 'Application', color: '#8884d8' },
      { stage: 'Longlist', status: 'Longlist', color: '#82ca9d' },
      { stage: 'Shortlist', status: 'Shortlist', color: '#ffc658' },
      { stage: 'Video', status: 'Pre-Recorded Video', color: '#ff7300' },
      { stage: 'Panel', status: 'Panel Interview', color: '#8dd1e1' },
      { stage: 'Offer', status: 'Offer', color: '#d084d0' },
      { stage: 'Roster', status: 'Roster', color: '#82ca9d' }
    ];

    const funnel = stages.map(stage => ({
      stage: stage.stage,
      count: statusCounts[stage.status] || 0,
      percentage: total > 0 ? ((statusCounts[stage.status] || 0) / total) * 100 : 0,
      color: stage.color
    }));

    setFunnelData(funnel);
  };

  const fetchTimeToHireData = async () => {
    // Calculate time to hire from stage events
    const { data: stageEvents, error } = await supabase
      .from('stage_events')
      .select(`
        application_id,
        at,
        to_stage,
        applications!inner(created_at)
      `)
      .eq('to_stage', 'Roster')
      .order('at', { ascending: false })
      .limit(50);

    if (error) throw error;

    const timeToHireByMonth = stageEvents?.reduce((acc: Record<string, { total: number, count: number }>, event) => {
      const hireDate = new Date(event.at);
      const applicationDate = new Date(event.applications.created_at);
      const daysToHire = Math.floor((hireDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const month = hireDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      
      if (!acc[month]) {
        acc[month] = { total: 0, count: 0 };
      }
      acc[month].total += daysToHire;
      acc[month].count += 1;
      
      return acc;
    }, {}) || {};

    const chartData = Object.entries(timeToHireByMonth)
      .map(([month, data]) => ({
        month,
        avgDays: Math.round(data.total / data.count),
        totalHires: data.count
      }))
      .slice(-6);

    setTimeToHireData(chartData);
  };

  const fetchSourceData = async () => {
    const { data: applications, error } = await supabase
      .from('applications')
      .select('source, status');

    if (error) throw error;

    const sourceStats = applications?.reduce((acc: Record<string, { applications: number, hires: number }>, app) => {
      const source = app.source || 'Unknown';
      if (!acc[source]) {
        acc[source] = { applications: 0, hires: 0 };
      }
      acc[source].applications += 1;
      if (app.status === 'Roster') {
        acc[source].hires += 1;
      }
      return acc;
    }, {}) || {};

    const sourceData = Object.entries(sourceStats)
      .map(([source, stats]) => ({
        source,
        applications: stats.applications,
        hires: stats.hires,
        conversionRate: stats.applications > 0 ? (stats.hires / stats.applications) * 100 : 0
      }))
      .sort((a, b) => b.applications - a.applications)
      .slice(0, 10);

    setSourceData(sourceData);
  };

  const fetchTotalMetrics = async () => {
    const [applicationsRes, jobsRes, hiresRes] = await Promise.all([
      supabase.from('applications').select('id, created_at, status'),
      supabase.from('jobs').select('id').eq('status', 'active'),
      supabase.from('stage_events').select('at, applications!inner(created_at)').eq('to_stage', 'Roster')
    ]);

    const totalApplications = applicationsRes.data?.length || 0;
    const activeJobs = jobsRes.data?.length || 0;
    const hires = hiresRes.data || [];

    // Calculate average time to hire
    const avgTimeToHire = hires.length > 0 
      ? hires.reduce((acc, hire) => {
          const hireDate = new Date(hire.at);
          const appDate = new Date(hire.applications.created_at);
          return acc + Math.floor((hireDate.getTime() - appDate.getTime()) / (1000 * 60 * 60 * 24));
        }, 0) / hires.length
      : 0;

    const hiresCount = hires.length;
    const conversionRate = totalApplications > 0 ? (hiresCount / totalApplications) * 100 : 0;

    setTotalMetrics({
      totalApplications,
      avgTimeToHire: Math.round(avgTimeToHire),
      conversionRate: Math.round(conversionRate * 10) / 10,
      activeJobs
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.totalApplications}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.avgTimeToHire} days</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.conversionRate}%</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.activeJobs}</div>
          </CardContent>
        </Card>
      </div>

      {/* Hiring Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Funnel</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, 'Count']} />
              <Bar dataKey="count" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time to Hire Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Time to Hire Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={timeToHireData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="avgDays" stroke="#8884d8" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Effectiveness */}
        <Card>
          <CardHeader>
            <CardTitle>Source Effectiveness</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceData.slice(0, 5).map((source, index) => (
                <div key={source.source} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{source.source}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">{source.applications} apps</div>
                    <div className="text-xs text-muted-foreground">
                      {source.conversionRate.toFixed(1)}% conversion
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};