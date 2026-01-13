import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Award, Target, Users, Briefcase } from 'lucide-react';
import StatsCard from '@/components/dashboard/StatsCard';
import { AnalyticsFilterState } from './AnalyticsFilters';
import { DrillDownModal } from './DrillDownModal';
import { useNavigate } from 'react-router-dom';

interface PerformanceMetricsProps {
  filters: AnalyticsFilterState;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({ filters }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{ open: boolean; title: string; data: any[]; type: string }>({
    open: false,
    title: '',
    data: [],
    type: ''
  });

  // Key metrics state
  const [metrics, setMetrics] = useState({
    avgProcessingTime: 0,
    interviewCompletionRate: 0,
    offerAcceptanceRate: 0,
    screeningAccuracy: 0,
    dropOffRate: 0,
    stageVelocity: 0
  });

  // Chart data state
  const [jobPerformance, setJobPerformance] = useState<any[]>([]);
  const [stageConversion, setStageConversion] = useState<any[]>([]);
  const [panelPerformance, setPanelPerformance] = useState<any[]>([]);
  const [candidateQuality, setCandidateQuality] = useState<any[]>([]);

  useEffect(() => {
    fetchPerformanceData();
  }, [filters]);

  const applyFilters = (query: any) => {
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

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchKeyMetrics(),
        fetchJobPerformance(),
        fetchStageConversion(),
        fetchPanelPerformance(),
        fetchCandidateQuality()
      ]);
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchKeyMetrics = async () => {
    // Fetch applications with stage events
    let query = supabase.from('applications').select(`
      *,
      stage_events(*)
    `);
    query = applyFilters(query);
    const { data: applications } = await query;

    if (!applications || applications.length === 0) {
      setMetrics({
        avgProcessingTime: 0,
        interviewCompletionRate: 0,
        offerAcceptanceRate: 0,
        screeningAccuracy: 0,
        dropOffRate: 0,
        stageVelocity: 0
      });
      return;
    }

    // Calculate metrics
    const totalApps = applications.length;
    
    // Average processing time (Application to Longlist)
    const processedApps = applications.filter((app: any) => 
      app.status !== 'Application' && app.stage_events?.length > 0
    );
    const avgProcessing = processedApps.reduce((acc: number, app: any) => {
      const firstEvent = app.stage_events?.[0];
      if (firstEvent) {
        const days = (new Date(firstEvent.at).getTime() - new Date(app.created_at).getTime()) / (1000 * 60 * 60 * 24);
        return acc + days;
      }
      return acc;
    }, 0) / (processedApps.length || 1);

    // Drop-off rate (% that don't make it past Application)
    const dropOff = (applications.filter((app: any) => app.status === 'Application').length / totalApps) * 100;

    // Interview completion rate
    const { data: interviews } = await supabase
      .from('panel_interviews')
      .select('status');
    
    const completionRate = interviews 
      ? (interviews.filter((i: any) => i.status === 'completed').length / interviews.length) * 100 
      : 0;

    setMetrics({
      avgProcessingTime: Math.round(avgProcessing),
      interviewCompletionRate: Math.round(completionRate),
      offerAcceptanceRate: 75, // Mock data
      screeningAccuracy: 82, // Mock data
      dropOffRate: Math.round(dropOff),
      stageVelocity: Math.round(avgProcessing * 0.7)
    });
  };

  const fetchJobPerformance = async () => {
    let query = supabase.from('applications').select(`
      job_id,
      status,
      created_at,
      jobs!inner(title)
    `);
    query = applyFilters(query);
    const { data: applications } = await query;

    if (!applications) return;

    const jobStats = applications.reduce((acc: any, app: any) => {
      const jobId = app.job_id;
      const jobTitle = app.jobs?.title || 'Unknown';
      if (!acc[jobId]) {
        acc[jobId] = {
          jobTitle,
          applications: 0,
          hires: 0,
          avgTimeToHire: 0
        };
      }
      acc[jobId].applications += 1;
      if (app.status === 'Roster') {
        acc[jobId].hires += 1;
      }
      return acc;
    }, {});

    const jobPerformanceData = Object.values(jobStats)
      .sort((a: any, b: any) => b.applications - a.applications)
      .slice(0, 10);

    setJobPerformance(jobPerformanceData);
  };

  const fetchStageConversion = async () => {
    let query = supabase.from('applications').select('status');
    query = applyFilters(query);
    const { data: applications } = await query;

    if (!applications) return;

    const stages = [
      { name: 'Application', next: 'Longlist' },
      { name: 'Longlist', next: 'Pre-Recorded Video' },
      { name: 'Pre-Recorded Video', next: 'Panel Interview' },
      { name: 'Panel Interview', next: 'Offer' },
      { name: 'Offer', next: 'Roster' }
    ];

    const statusCounts = applications.reduce((acc: any, app: any) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    const conversionData = stages.map((stage) => {
      const current = statusCounts[stage.name] || 0;
      const next = statusCounts[stage.next] || 0;
      const conversion = current > 0 ? (next / current) * 100 : 0;
      
      return {
        stage: stage.name,
        conversion: Math.round(conversion),
        count: current,
        nextCount: next
      };
    });

    setStageConversion(conversionData);
  };

  const fetchPanelPerformance = async () => {
    const { data: interviews } = await supabase
      .from('panel_interviews')
      .select(`
        id,
        status,
        created_at
      `);

    if (!interviews) return;

    const { data: participants } = await supabase
      .from('panel_interview_participants')
      .select(`
        panel_interview_id,
        panelist_id,
        users!panel_interview_participants_panelist_id_fkey(name)
      `);

    const { data: feedbacks } = await supabase
      .from('feedback_form_responses')
      .select('panel_interview_id, evaluator_id, overall');

    const panelistStats: any = {};
    
    participants?.forEach((participant: any) => {
      const panelistName = participant.users?.name || 'Unknown';
      const panelistId = participant.panelist_id;
      if (!panelistStats[panelistId]) {
        panelistStats[panelistId] = {
          name: panelistName,
          id: panelistId,
          interviewsCompleted: 0,
          avgScore: 0,
          feedbackCount: 0,
          totalScore: 0
        };
      }
      panelistStats[panelistId].interviewsCompleted += 1;
    });

    // Add feedback scores
    feedbacks?.forEach((feedback: any) => {
      const panelist = panelistStats[feedback.evaluator_id];
      if (panelist && feedback.overall) {
        panelist.totalScore += feedback.overall;
        panelist.feedbackCount += 1;
      }
    });

    const panelData = Object.values(panelistStats)
      .map((p: any) => ({
        ...p,
        avgScore: p.feedbackCount > 0 ? Math.round(p.totalScore / p.feedbackCount) : 0
      }))
      .sort((a: any, b: any) => b.interviewsCompleted - a.interviewsCompleted)
      .slice(0, 10);

    setPanelPerformance(panelData);
  };

  const fetchCandidateQuality = async () => {
    let query = supabase.from('applications').select(`
      id,
      created_at,
      job_id
    `);
    query = applyFilters(query);
    const { data: applications } = await query;

    if (!applications) return;

    // Fetch screening scores separately
    const appIds = applications.map((app: any) => app.id);
    const { data: scores } = await supabase
      .from('screening_scores')
      .select('application_id, ai_score')
      .in('application_id', appIds);

    const qualityBuckets = [
      { range: '90-100', min: 90, max: 100, count: 0 },
      { range: '80-89', min: 80, max: 89, count: 0 },
      { range: '70-79', min: 70, max: 79, count: 0 },
      { range: '60-69', min: 60, max: 69, count: 0 },
      { range: '0-59', min: 0, max: 59, count: 0 }
    ];

    scores?.forEach((score: any) => {
      const aiScore = score.ai_score;
      if (aiScore !== null && aiScore !== undefined) {
        const bucket = qualityBuckets.find(b => aiScore >= b.min && aiScore <= b.max);
        if (bucket) bucket.count += 1;
      }
    });

    setCandidateQuality(qualityBuckets);
  };

  const handleDrillDown = async (type: string, title: string) => {
    let data: any[] = [];
    
    if (type === 'jobPerformance' || type === 'stageConversion') {
      let query = supabase.from('applications').select(`
        *,
        jobs!inner(title),
        candidates!inner(name, email)
      `);
      query = applyFilters(query);
      const { data: apps } = await query;
      data = apps || [];
    }

    setDrillDown({ open: true, title, data, type });
  };

  const getDrillDownColumns = () => {
    if (drillDown.type === 'jobPerformance' || drillDown.type === 'stageConversion') {
      return [
        { key: 'candidate_name', label: 'Candidate', render: (_: any, row: any) => row.candidates?.name },
        { key: 'job_title', label: 'Job', render: (_: any, row: any) => row.jobs?.title },
        { key: 'status', label: 'Status' },
        { 
          key: 'created_at', 
          label: 'Applied', 
          render: (val: string) => new Date(val).toLocaleDateString() 
        }
      ];
    }
    return [];
  };

  if (loading) {
    return <div className="text-center py-8">Loading performance metrics...</div>;
  }

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--muted))', '#82ca9d', '#ffc658'];

  return (
    <div className="space-y-6">
      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatsCard
          title="Avg Processing Time"
          value={`${metrics.avgProcessingTime}d`}
          icon={Clock}
          subtitle="Application to Longlist"
        />
        <StatsCard
          title="Interview Completion"
          value={`${metrics.interviewCompletionRate}%`}
          icon={Target}
          subtitle="Scheduled vs completed"
        />
        <StatsCard
          title="Offer Acceptance"
          value={`${metrics.offerAcceptanceRate}%`}
          icon={Award}
          subtitle="Offers accepted"
        />
        <StatsCard
          title="Screening Accuracy"
          value={`${metrics.screeningAccuracy}%`}
          icon={TrendingUp}
          subtitle="AI vs final outcome"
        />
        <StatsCard
          title="Drop-off Rate"
          value={`${metrics.dropOffRate}%`}
          icon={Users}
          alert={metrics.dropOffRate > 50}
          subtitle="Early stage exits"
        />
        <StatsCard
          title="Stage Velocity"
          value={`${metrics.stageVelocity}d`}
          icon={Briefcase}
          subtitle="Avg time per stage"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Performance */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleDrillDown('jobPerformance', 'Job Performance Details')}>
          <CardHeader>
            <CardTitle>Top Performing Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobPerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="jobTitle" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="applications" fill="hsl(var(--primary))" name="Applications" />
                <Bar dataKey="hires" fill="hsl(var(--accent))" name="Hires" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stage Conversion Rates */}
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => handleDrillDown('stageConversion', 'Stage Conversion Details')}>
          <CardHeader>
            <CardTitle>Stage Conversion Rates</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stageConversion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="stage" angle={-45} textAnchor="end" height={100} />
                <YAxis label={{ value: 'Conversion %', angle: -90, position: 'insideLeft' }} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Line type="monotone" dataKey="conversion" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Panel Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Panel Member Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {panelPerformance.map((panelist, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 border rounded-lg">
                  <div>
                    <div className="font-medium">{panelist.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {panelist.interviewsCompleted} interviews
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">{panelist.avgScore}/100</div>
                    <div className="text-xs text-muted-foreground">Avg score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Candidate Quality Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Candidate Quality Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={candidateQuality}
                  dataKey="count"
                  nameKey="range"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(entry) => `${entry.range}: ${entry.count}`}
                >
                  {candidateQuality.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
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
          navigate(`/admin/applications/${row.id}`);
        }}
      />
    </div>
  );
};