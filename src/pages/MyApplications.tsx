import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, FileText, Calendar, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Application {
  id: string;
  status: string;
  submitted_at: string;
  phf_completed: boolean;
  job_id: string;
  job: {
    id: string;
    title: string;
    location: string;
    closing_date: string;
    notice_no: string;
  };
}

export default function MyApplications() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    
    fetchApplications();
  }, [user, navigate]);

  const fetchApplications = async () => {
    if (!user) return;

    try {
      // First get the candidate record for this user
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', user.email)
        .maybeSingle();

      if (candidateError) throw candidateError;

      if (!candidate) {
        setApplications([]);
        setLoading(false);
        return;
      }

      // Then get applications for this candidate
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          phf_completed,
          job_id,
          jobs!inner (
            id,
            title,
            location,
            closing_date,
            notice_no
          )
        `)
        .eq('candidate_id', candidate.id)
        .order('submitted_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      setApplications(applicationsData?.map(app => ({
        ...app,
        job: {
          ...app.jobs,
          id: app.job_id
        }
      })) || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load your applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'application':
        return 'bg-blue-100 text-blue-800';
      case 'screening':
        return 'bg-yellow-100 text-yellow-800';
      case 'interview':
        return 'bg-purple-100 text-purple-800';
      case 'offer':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">My Applications</h1>
        </div>

        {applications.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-500 text-center mb-6">
                You haven't applied to any positions yet. Browse our open positions to get started.
              </p>
              <Button onClick={() => navigate('/')}>
                Browse Jobs
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {applications.map((application) => (
              <Card key={application.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">{application.job.title}</CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {application.job.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {application.job.notice_no}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Applied: {formatDate(application.submitted_at)}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <div className={`flex items-center gap-2 ${
                        application.phf_completed ? 'text-green-600' : 'text-yellow-600'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${
                          application.phf_completed ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                        PHF: {application.phf_completed ? 'Completed' : 'Pending'}
                      </div>
                      {application.job.closing_date && (
                        <div className="text-gray-500">
                          Closes: {formatDate(application.job.closing_date)}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/apply/${application.job_id}`)}
                      disabled={application.phf_completed}
                    >
                      {application.phf_completed ? 'Application Complete' : 'Continue Application'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}