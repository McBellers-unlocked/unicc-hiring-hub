import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, 
  Video, 
  Users, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  job: {
    id: string;
    title: string;
    notice_no: string;
  };
}

interface PipelineStage {
  key: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  color: string;
  bgColor: string;
}

export default function ApplicationPipelineTracker() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user]);

  const fetchApplications = async () => {
    try {
      // First get candidate id
      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', user?.email)
        .maybeSingle();

      if (!candidate) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          jobs!inner(
            id,
            title,
            notice_no
          )
        `)
        .eq('candidate_id', candidate.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setApplications(data?.map((app: any) => ({
        id: app.id,
        status: app.status,
        submitted_at: app.submitted_at,
        updated_at: app.updated_at,
        job: {
          id: app.jobs.id,
          title: app.jobs.title,
          notice_no: app.jobs.notice_no
        }
      })) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Count applications by stage
  const getStageCount = (statuses: string[]) => {
    return applications.filter(app => 
      statuses.some(s => app.status?.toLowerCase().includes(s.toLowerCase()))
    ).length;
  };

  const stages: PipelineStage[] = [
    {
      key: 'applied',
      label: 'Applied',
      icon: <FileText className="h-4 w-4" />,
      count: getStageCount(['application', 'submitted', 'received', 'screening', 'review', 'longlist', 'shortlist']),
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 dark:bg-slate-800'
    },
    {
      key: 'video',
      label: 'Video Interview',
      icon: <Video className="h-4 w-4" />,
      count: getStageCount(['video']),
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    {
      key: 'interview',
      label: 'Interview',
      icon: <Users className="h-4 w-4" />,
      count: getStageCount(['interview', 'panel', 'offer', 'hired', 'selected']),
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    }
  ];

  // Get recent activity (last 3 updated applications)
  const recentActivity = applications.slice(0, 3);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (applications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Application Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="font-medium text-foreground mb-1">No applications yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Start applying to track your progress here
            </p>
            <Button onClick={() => navigate('/jobs')}>
              Browse Open Positions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Application Pipeline
            </CardTitle>
            <CardDescription>
              {applications.length} total application{applications.length !== 1 ? 's' : ''}
            </CardDescription>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/my-applications')}
            className="text-muted-foreground"
          >
            View All
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pipeline Stages */}
        <div className="grid grid-cols-3 gap-2">
          {stages.map((stage, index) => (
            <div key={stage.key} className="relative">
              <div className={`${stage.bgColor} rounded-lg p-3 text-center`}>
                <div className={`${stage.color} flex justify-center mb-1`}>
                  {stage.icon}
                </div>
                <div className={`text-2xl font-bold ${stage.color}`}>
                  {stage.count}
                </div>
                <div className="text-xs text-muted-foreground">
                  {stage.label}
                </div>
              </div>
              {/* Arrow connector */}
              {index < stages.length - 1 && (
                <div className="hidden sm:block absolute top-1/2 -right-1 transform -translate-y-1/2 text-muted-foreground/30 z-10">
                  <ChevronRight className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <div className="pt-3 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Recent Activity</h4>
            <div className="space-y-2">
              {recentActivity.map((app) => (
                <div 
                  key={app.id}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/my-applications`)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span className="text-sm font-medium truncate">
                      {app.job.title}
                    </span>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {app.status || 'Applied'}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0 ml-2">
                    {formatDistanceToNow(new Date(app.updated_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
