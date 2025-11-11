import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Clock, Users, Target, CheckCircle } from 'lucide-react';
import { DrillDownModal } from './analytics/DrillDownModal';
import { useNavigate } from 'react-router-dom';
import StatsCard from './dashboard/StatsCard';
import { AnalyticsFilterState } from './analytics/AnalyticsFilters';

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

interface HiringFunnelDashboardProps {
  filters?: AnalyticsFilterState;
}

export const HiringFunnelDashboard: React.FC<HiringFunnelDashboardProps> = ({ filters = {} }) => {
  const navigate = useNavigate();
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
  const [drillDown, setDrillDown] = useState<{
    open: boolean;
    title: string;
    data: any[];
    stage?: string;
    source?: string;
  }>({
    open: false,
    title: '',
    data: []
  });

  useEffect(() => {
    fetchDashboardData();
  }, [filters]);

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

  const buildQuery = (query: any) => {
    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom.toISOString());
    }
    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo.toISOString());
    }
    if (filters.jobId) {
      query = query.eq('job_id', filters.jobId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    return query;
  };

  const fetchFunnelData = async () => {
    let query = supabase
      .from('applications')
      .select('status, created_at, job_id')
      .order('created_at', { ascending: false });
    
    query = buildQuery(query);
    const { data: applications, error } = await query;

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
    let query = supabase
      .from('stage_events')
      .select(`
        application_id,
        at,
        to_stage,
        applications!inner(created_at, job_id)
      `)
      .eq('to_stage', 'Roster')
      .order('at', { ascending: false })
      .limit(50);
    
    if (filters.jobId) {
      query = query.eq('applications.job_id', filters.jobId);
    }
    
    const { data: stageEvents, error } = await query;

    if (error) throw error;

    const timeToHireByMonth = stageEvents?.reduce((acc: Record<string, { total: number, count: number }>, event) => {
      const hireDate = new Date(event.at);
      const applicationDate = new Date(event.applications.created_at);
      const daysToHire = Math.floor((hireDate.getTime() - applicationDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const month = hireDate.toLocaleDateString('en-GB', { year: 'numeric', month: 'short' });
      
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
    let query = supabase
      .from('applications')
      .select('source, status, job_id, created_at');
    
    query = buildQuery(query);
    const { data: applications, error } = await query;

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
    let appsQuery = supabase.from('applications').select('id, created_at, status, job_id');
    appsQuery = buildQuery(appsQuery);
    
    const [applicationsRes, jobsRes, hiresRes] = await Promise.all([
      appsQuery,
      supabase.from('jobs').select('id').eq('status', 'active'),
      supabase.from('stage_events').select('at, applications!inner(created_at, job_id)').eq('to_stage', 'Roster')
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

  const handleMetricClick = async (metricType: string) => {
    let query = supabase.from('applications').select(`
      *,
      jobs!inner(title),
      candidates!inner(name, email)
    `);
    
    query = buildQuery(query);
    
    if (metricType === 'active_jobs') {
      const { data: jobs } = await supabase.from('jobs').select('*').eq('status', 'active');
      setDrillDown({
        open: true,
        title: 'Active Jobs',
        data: jobs || []
      });
      return;
    }
    
    const { data } = await query;
    setDrillDown({
      open: true,
      title: metricType === 'applications' ? 'All Applications' : 'Applications Data',
      data: data || []
    });
  };

  const handleFunnelClick = async (stageName: string) => {
    // Map display stage names to actual status values
    const stageMapping: Record<string, string> = {
      'Applications': 'Application',
      'Longlist': 'Longlist',
      'Shortlist': 'Shortlist',
      'Video': 'Pre-Recorded Video',
      'Panel': 'Panel Interview',
      'Offer': 'Offer',
      'Roster': 'Roster'
    };
    
    const actualStatus = stageMapping[stageName] || stageName;
    
    let query = supabase.from('applications').select(`
      *,
      jobs!inner(title),
      candidates!inner(name, email)
    `);
    
    // Apply status filter without type assertion - let Supabase handle it
    if (actualStatus) {
      query = query.eq('status', actualStatus as any);
    }
    
    query = buildQuery(query);
    const { data } = await query;
    
    setDrillDown({
      open: true,
      title: `${stageName} Stage Applications`,
      data: data || [],
      stage: actualStatus
    });
  };

  const handleSourceClick = async (source: string) => {
    let query = supabase.from('applications').select(`
      *,
      jobs!inner(title),
      candidates!inner(name, email)
    `).eq('source', source);
    
    query = buildQuery(query);
    const { data } = await query;
    
    setDrillDown({
      open: true,
      title: `Applications from ${source}`,
      data: data || [],
      source
    });
  };

  const getDrillDownColumns = () => {
    if (drillDown.data[0]?.title) {
      // Jobs data
      return [
        { key: 'title', label: 'Job Title' },
        { key: 'grade', label: 'Grade' },
        { key: 'location', label: 'Location' },
        { 
          key: 'closing_date', 
          label: 'Closing Date',
          render: (val: string) => val ? new Date(val).toLocaleDateString() : 'N/A'
        }
      ];
    }
    
    // Applications data
    return [
      { 
        key: 'candidate_name', 
        label: 'Candidate',
        render: (_: any, row: any) => row.candidates?.name || 'N/A'
      },
      { 
        key: 'job_title', 
        label: 'Job',
        render: (_: any, row: any) => row.jobs?.title || 'N/A'
      },
      { key: 'status', label: 'Status' },
      { key: 'source', label: 'Source' },
      { 
        key: 'created_at', 
        label: 'Applied',
        render: (val: string) => new Date(val).toLocaleDateString()
      }
    ];
  };

  if (loading) {
    return <div className="text-center py-8">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard
          title="Total Applications"
          value={totalMetrics.totalApplications}
          icon={Users}
          onClick={() => handleMetricClick('applications')}
        />
        <StatsCard
          title="Avg Time to Hire"
          value={`${totalMetrics.avgTimeToHire} days`}
          icon={Clock}
          subtitle="From application to roster"
        />
        <StatsCard
          title="Conversion Rate"
          value={`${totalMetrics.conversionRate}%`}
          icon={Target}
          subtitle="Applications to hires"
        />
        <StatsCard
          title="Active Jobs"
          value={totalMetrics.activeJobs}
          icon={CheckCircle}
          onClick={() => handleMetricClick('active_jobs')}
        />
      </div>

      {/* Hiring Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Hiring Funnel (Click to drill down)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={funnelData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="stage" />
              <YAxis />
              <Tooltip formatter={(value, name) => [value, 'Count']} />
              <Bar 
                dataKey="count" 
                fill="hsl(var(--primary))" 
                onClick={(data) => handleFunnelClick(data.stage)}
                cursor="pointer"
              />
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
            <CardTitle>Source Effectiveness (Click to drill down)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sourceData.slice(0, 5).map((source, index) => (
                <div 
                  key={source.source} 
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => handleSourceClick(source.source)}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full bg-primary" />
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

      {/* Drill Down Modal */}
      <DrillDownModal
        open={drillDown.open}
        onClose={() => setDrillDown({ ...drillDown, open: false })}
        title={drillDown.title}
        data={drillDown.data}
        columns={getDrillDownColumns()}
        onRowClick={(row) => {
          if (row.id && !row.title) {
            // It's an application
            navigate(`/admin/applications/${row.id}`);
          } else if (row.id && row.title) {
            // It's a job
            navigate(`/admin/jobs/${row.id}`);
          }
        }}
      />
    </div>
  );
};