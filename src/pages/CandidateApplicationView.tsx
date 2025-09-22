import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PHFPreview } from '@/components/PHFPreview';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  FileText, 
  Calendar,
  GraduationCap,
  Briefcase,
  Eye,
  Download
} from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationData {
  id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  files: any;
  answers: any;
  phf_data: any;
  phf_completed: boolean;
  photo_url: string | null;
  phf_pdf_url: string | null;
  candidate_phf_url: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedin_url: string | null;
    work_auth: string | null;
  };
  job: {
    id: string;
    title: string;
    org_unit: string | null;
    location: string | null;
    notice_no: string | null;
    closing_date: string | null;
  };
}

export default function CandidateApplicationView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPHFPreview, setShowPHFPreview] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (id && user) {
      fetchApplication();
    }
  }, [id, user]);

  const fetchApplication = async () => {
    try {
      // First get the candidate record for this user
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('email', user?.email)
        .maybeSingle();

      if (candidateError) throw candidateError;

      if (!candidate) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to view this application",
          variant: "destructive"
        });
        navigate('/my-applications');
        return;
      }

      // Then get the application
      const { data: applicationData, error: applicationError } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          submitted_at,
          updated_at,
          files,
          answers,
          phf_data,
          phf_completed,
          photo_url,
          phf_pdf_url,
          candidate_phf_url,
          candidate:candidates!applications_candidate_id_fkey (
            id,
            name,
            email,
            phone,
            location,
            linkedin_url,
            work_auth
          ),
          job:jobs!applications_job_id_fkey (
            id,
            title,
            org_unit,
            location,
            notice_no,
            closing_date
          )
        `)
        .eq('id', id)
        .eq('candidate_id', candidate.id)
        .maybeSingle();

      if (applicationError) throw applicationError;

      if (!applicationData) {
        toast({
          title: "Application Not Found",
          description: "This application does not exist or you don't have permission to view it",
          variant: "destructive"
        });
        navigate('/my-applications');
        return;
      }

      setApplication(applicationData);
    } catch (error) {
      console.error('Error fetching application:', error);
      toast({
        title: "Error",
        description: "Failed to load application details",
        variant: "destructive"
      });
      navigate('/my-applications');
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
    return format(new Date(dateString), 'MMM dd, yyyy');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Not Found</h2>
          <p className="text-gray-600 mb-4">This application could not be found.</p>
          <Button onClick={() => navigate('/my-applications')}>
            Back to My Applications
          </Button>
        </div>
      </div>
    );
  }

  if (showPHFPreview && application.phf_data) {
    return (
      <PHFPreview
        phfData={application.phf_data}
        photoUrl={application.photo_url}
        onClose={() => setShowPHFPreview(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/my-applications')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to My Applications
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Application Details</h1>
        </div>

        {/* Application Header */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl mb-2">{application.job.title}</CardTitle>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {application.job.location}
                  </div>
                  {application.job.notice_no && (
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {application.job.notice_no}
                    </div>
                  )}
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
              {application.phf_completed && application.phf_data && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPHFPreview(true)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  View PHF
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Application Details Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="candidate-info">Candidate Information</TabsTrigger>
            {application.phf_completed && (
              <TabsTrigger value="phf-summary">PHF Summary</TabsTrigger>
            )}
            {application.answers && Object.keys(application.answers).length > 0 && (
              <TabsTrigger value="responses">Application Responses</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Application Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Application Status</h4>
                    <Badge className={getStatusColor(application.status)}>
                      {application.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Submission Date</h4>
                    <p className="text-gray-600">{formatDate(application.submitted_at)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Last Updated</h4>
                    <p className="text-gray-600">{formatDate(application.updated_at)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">PHF Status</h4>
                    <div className={`flex items-center gap-2 ${
                      application.phf_completed ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        application.phf_completed ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      {application.phf_completed ? 'Completed' : 'Pending'}
                    </div>
                  </div>
                </div>

                {application.phf_pdf_url && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Documents</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(application.phf_pdf_url!, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download PHF PDF
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="candidate-info">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Candidate Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Name</h4>
                    <p className="text-gray-600">{application.candidate.name}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Email</h4>
                    <p className="text-gray-600">{application.candidate.email}</p>
                  </div>
                  {application.candidate.phone && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Phone</h4>
                      <p className="text-gray-600">{application.candidate.phone}</p>
                    </div>
                  )}
                  {application.candidate.location && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Location</h4>
                      <p className="text-gray-600">{application.candidate.location}</p>
                    </div>
                  )}
                  {application.candidate.work_auth && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Work Authorization</h4>
                      <p className="text-gray-600">{application.candidate.work_auth}</p>
                    </div>
                  )}
                  {application.candidate.linkedin_url && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">LinkedIn</h4>
                      <a 
                        href={application.candidate.linkedin_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        View Profile
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {application.phf_completed && (
            <TabsContent value="phf-summary">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    PHF Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-600 mb-4">
                      Your Personal History Form has been completed and submitted. 
                      You can view the full details by clicking the button below.
                    </p>
                    <Button
                      onClick={() => setShowPHFPreview(true)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View Complete PHF
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {application.answers && Object.keys(application.answers).length > 0 && (
            <TabsContent value="responses">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5" />
                    Application Responses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(application.answers).map(([question, answer], index) => (
                      <div key={index} className="border-b border-gray-200 pb-4 last:border-b-0">
                        <h4 className="font-medium text-gray-900 mb-2">{question}</h4>
                        <p className="text-gray-600">{String(answer)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
}