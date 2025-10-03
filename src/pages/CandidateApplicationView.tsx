import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { PHFTabViewer } from '@/components/PHFTabViewer';
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
  Download,
  Video,
  CheckCircle2,
  Clock,
  PlayCircle
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';

interface VideoAssignment {
  id: string;
  status: string;
  deadline_at: string;
  token: string;
  opened_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}

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
  video_assignment?: VideoAssignment | null;
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

      // Then get the application with video assignment
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
            work_auth,
            education,
            work_experience,
            skills,
            certifications,
            languages
          ),
          job:jobs!applications_job_id_fkey (
            id,
            title,
            org_unit,
            location,
            notice_no,
            closing_date
          ),
          video_assignments (
            id,
            status,
            deadline_at,
            token,
            opened_at,
            started_at,
            completed_at
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

      setApplication({
        ...applicationData,
        video_assignment: applicationData.video_assignments?.[0] || null
      });
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
      <PHFTabViewer
        phfData={application.phf_data}
        candidateData={application.candidate}
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
                  View Submitted PHF
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
              <TabsTrigger value="motivation">Motivation Letter</TabsTrigger>
            )}
            {application.phf_completed && (
              <TabsTrigger value="phf-details">PHF Details</TabsTrigger>
            )}
            {application.answers && Object.keys(application.answers).length > 0 && (
              <TabsTrigger value="responses">Application Responses</TabsTrigger>
            )}
            {application.video_assignment && (
              <TabsTrigger value="assessments">Assessments</TabsTrigger>
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
            <TabsContent value="motivation">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Motivation Letter
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose max-w-none">
                    {application.phf_data?.motivationLetter?.motivation_letter_content ? (
                      <div className="whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                        {application.phf_data.motivationLetter.motivation_letter_content}
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No motivation letter provided</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {application.phf_completed && (
            <TabsContent value="phf-details">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    PHF Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Your Personal History Form has been completed and submitted.
                      Click below to view your submitted PHF in the same format you filled it out.
                    </p>
                    <Button
                      onClick={() => setShowPHFPreview(true)}
                      className="flex items-center gap-2"
                      size="lg"
                    >
                      <Eye className="h-4 w-4" />
                      View My Submitted PHF
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {application.phf_data?.education?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Education Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {application.phf_data?.employment?.length || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Employment Entries</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary mb-1">
                        {application.phf_data?.languages ? Object.keys(application.phf_data.languages).length : 0}
                      </div>
                      <div className="text-sm text-muted-foreground">Languages</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {application.video_assignment && (
            <TabsContent value="assessments">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5" />
                    Assessment Center
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {(() => {
                    const assignment = application.video_assignment!;
                    const daysUntilDeadline = differenceInDays(new Date(assignment.deadline_at), new Date());
                    const isExpired = daysUntilDeadline < 0;
                    const isUrgent = daysUntilDeadline <= 2 && !isExpired;

                    return (
                      <div className={`p-6 rounded-lg border-2 ${
                        isUrgent ? 'border-orange-300 bg-orange-50' : 
                        isExpired ? 'border-red-300 bg-red-50' :
                        assignment.status === 'Completed' ? 'border-green-300 bg-green-50' :
                        'border-blue-300 bg-blue-50'
                      }`}>
                        <div className="flex items-start justify-between mb-6">
                          <div>
                            <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                              <Video className="h-5 w-5" />
                              Video Interview
                            </h3>
                            <div className="flex items-center gap-3 mb-4">
                              <Badge className={
                                assignment.status === 'Completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : isExpired
                                  ? 'bg-red-100 text-red-800'
                                  : isUrgent
                                  ? 'bg-orange-100 text-orange-800'
                                  : 'bg-blue-100 text-blue-800'
                              }>
                                {assignment.status === 'Completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {assignment.status === 'InProgress' && <PlayCircle className="h-3 w-3 mr-1" />}
                                {assignment.status === 'NotStarted' && <Clock className="h-3 w-3 mr-1" />}
                                {assignment.status === 'Completed' 
                                  ? 'Completed'
                                  : isExpired
                                  ? 'Expired'
                                  : assignment.status === 'InProgress'
                                  ? 'In Progress'
                                  : 'Not Started'
                                }
                              </Badge>
                              {!isExpired && assignment.status !== 'Completed' && (
                                <span className={`text-sm font-medium ${isUrgent ? 'text-orange-700' : 'text-gray-700'}`}>
                                  {daysUntilDeadline === 0 
                                    ? 'Due today!' 
                                    : `${daysUntilDeadline} day${daysUntilDeadline !== 1 ? 's' : ''} remaining`
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                          <div>
                            {assignment.status === 'Completed' ? (
                              <Button variant="outline" disabled>
                                <CheckCircle2 className="h-4 w-4 mr-2" />
                                Submitted
                              </Button>
                            ) : !isExpired ? (
                              <Button
                                size="lg"
                                onClick={() => navigate(`/video-interview/${assignment.token}`)}
                                className="bg-purple-600 hover:bg-purple-700"
                              >
                                <PlayCircle className="h-5 w-5 mr-2" />
                                {assignment.status === 'InProgress' ? 'Continue Interview' : 'Start Interview'}
                              </Button>
                            ) : (
                              <Button variant="outline" disabled>
                                Expired
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                          <div className="bg-white p-4 rounded-lg">
                            <div className="text-sm text-gray-600 mb-1">Deadline</div>
                            <div className="font-semibold">{format(new Date(assignment.deadline_at), 'MMM dd, yyyy HH:mm')}</div>
                          </div>
                          {assignment.opened_at && (
                            <div className="bg-white p-4 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">First Opened</div>
                              <div className="font-semibold">{formatDistanceToNow(new Date(assignment.opened_at), { addSuffix: true })}</div>
                            </div>
                          )}
                          {assignment.completed_at && (
                            <div className="bg-white p-4 rounded-lg">
                              <div className="text-sm text-gray-600 mb-1">Submitted</div>
                              <div className="font-semibold">{formatDistanceToNow(new Date(assignment.completed_at), { addSuffix: true })}</div>
                            </div>
                          )}
                        </div>

                        {assignment.status !== 'Completed' && !isExpired && (
                          <div className="bg-white p-4 rounded-lg">
                            <h4 className="font-semibold mb-2">What to expect:</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <span>Answer a series of pre-recorded video questions</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <span>You'll have time to prepare before recording each answer</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <span>Make sure you're in a quiet location with good lighting</span>
                              </li>
                              <li className="flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                                <span>Test your camera and microphone before starting</span>
                              </li>
                            </ul>
                          </div>
                        )}

                        {assignment.status === 'Completed' && (
                          <div className="bg-white p-4 rounded-lg text-center">
                            <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                            <p className="text-gray-700 font-medium">
                              Thank you for completing your video interview!
                            </p>
                            <p className="text-sm text-gray-600 mt-2">
                              Your responses have been submitted and are being reviewed by our hiring team.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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