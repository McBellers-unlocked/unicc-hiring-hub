import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { ApplicationScoring } from '@/components/ApplicationScoring';
import { RequirementsChecklist } from '@/components/RequirementsChecklist';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { VideoRatingInterface } from '@/components/VideoRatingInterface';
import { PanelInterviewScheduler } from '@/components/PanelInterviewScheduler';
import { PanelInterviewList } from '@/components/PanelInterviewList';
import { PHFManager } from '@/components/PHFManager';
import { PHFInlineViewer } from '@/components/PHFInlineViewer';
import { MotivationLetterViewer } from '@/components/MotivationLetterViewer';
import { DocumentViewer } from '@/components/DocumentViewer';
import { InlineDocumentViewer } from '@/components/InlineDocumentViewer';
import { ReliableDocumentViewer } from '@/components/ReliableDocumentViewer';
import { LonglistDocumentUploader } from '@/components/LonglistDocumentUploader';
import { VideoInterviewManager } from '@/components/VideoInterviewManager';
import { ApplicationAuditViewer } from '@/components/ApplicationAuditViewer';
import { CompactCandidateView } from '@/components/CompactCandidateView';
import {
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  ExternalLink, 
  FileText, 
  Download,
  AlertCircle,
  CheckCircle,
  XCircle,
  Calendar,
  MessageSquare,
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

interface ApplicationData {
  id: string;
  status: string;
  submitted_at: string;
  updated_at: string;
  suggested_for_longlist: boolean;
  files: any;
  answers: any;
  phf_data: any;
  phf_completed: boolean;
  photo_url: string | null;
  phf_pdf_url: string | null;
  candidate_phf_url: string | null;
  source: string | null;
  candidate: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    location: string | null;
    linkedin_url: string | null;
    languages: any;
    work_auth: string | null;
  };
  job: {
    id: string;
    title: string;
    org_unit: string | null;
    location: string | null;
  };
  screening_scores?: {
    ai_score: number | null;
    rubric_breakdown: any;
  }[];
}

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { userRoles } = useAuth();
  const { toast } = useToast();
  
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState('');
  const [activeTab, setActiveTab] = useState("overview");
  const [showScheduler, setShowScheduler] = useState(false);
  const [videoQuestions, setVideoQuestions] = useState<any[]>([]);
  const [videoAnswers, setVideoAnswers] = useState<any[]>([]);

  // Check access permissions
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || 
                   userRoles.includes('Hiring Manager') || userRoles.includes('Panel Member');
  
  const canMoveToLonglist = userRoles.includes('Admin') || userRoles.includes('HR Assistant');

  useEffect(() => {
    if (id && hasAccess) {
      fetchApplication();
      fetchVideoData();
    }
  }, [id, hasAccess]);

  // Early return AFTER all hooks have been called
  if (!hasAccess) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Access Denied</h1>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const fetchApplication = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:candidates(*),
          job:jobs(id, title, org_unit, location),
          screening_scores(ai_score, rubric_breakdown)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setApplication(data);
    } catch (error) {
      console.error('Error fetching application:', error);
      toast({
        title: "Error",
        description: "Failed to load application",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchVideoData = async () => {
    try {
      // Fetch video answers
      const { data: answers, error: answersError } = await supabase
        .from('video_answers')
        .select('*')
        .eq('application_id', id)
        .order('taken_at', { ascending: true });

      if (answersError) throw answersError;
      setVideoAnswers(answers || []);

      // Fetch video questions if answers exist
      if (answers && answers.length > 0) {
        // Get the application's job to find the question set
        const { data: app, error: appError } = await supabase
          .from('applications')
          .select('job_id')
          .eq('id', id)
          .single();

        if (appError) throw appError;

        // Get the video question set for this job
        const { data: questionSet, error: questionSetError } = await supabase
          .from('video_question_sets')
          .select('questions')
          .eq('job_id', app.job_id)
          .single();

        if (questionSetError) throw questionSetError;
        setVideoQuestions(Array.isArray(questionSet?.questions) ? questionSet.questions : []);
      }
    } catch (error) {
      console.error('Error fetching video data:', error);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === 'Longlist' && application?.status === 'Application' && !canMoveToLonglist) {
      toast({
        title: "Access Denied",
        description: "Only HR Assistants can move applications to Longlist",
        variant: "destructive",
      });
      return;
    }

    // If moving from Application to Longlist and overriding AI suggestion, require reason
    if (newStatus === 'Longlist' && application?.status === 'Application' && 
        !application.suggested_for_longlist && !statusChangeReason.trim()) {
      setPendingStatus(newStatus);
      setShowStatusDialog(true);
      return;
    }

    await updateStatus(newStatus, statusChangeReason);
  };

  const updateStatus = async (newStatus: string, reason?: string) => {
    try {
      // Update application status
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: newStatus as any })
        .eq('id', id);

      if (updateError) throw updateError;

      // Log stage event
      const { error: logError } = await supabase
        .from('stage_events')
        .insert({
          application_id: id!,
          from_stage: application?.status as any,
          to_stage: newStatus as any,
          by_user: (await supabase.auth.getUser()).data.user?.id,
          reason: reason || null
        });

      if (logError) throw logError;

      toast({
        title: "Success",
        description: `Application moved to ${newStatus}`,
      });

      setShowStatusDialog(false);
      setStatusChangeReason('');
      setPendingStatus('');
      fetchApplication();
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Application': 'bg-blue-100 text-blue-800',
      'Longlist': 'bg-yellow-100 text-yellow-800',
      'Shortlist': 'bg-purple-100 text-purple-800',
      'Pre-Recorded Video': 'bg-indigo-100 text-indigo-800',
      'Panel Interview': 'bg-orange-100 text-orange-800',
      'Offer': 'bg-green-100 text-green-800',
      'Roster': 'bg-emerald-100 text-emerald-800',
      'Rejected': 'bg-red-100 text-red-800'
    } as const;

    return (
      <Badge className={variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    );
  };

  const renderFiles = () => {
    return (
      <div className="space-y-6">
        {/* PHF Document Viewer */}
        {application?.files?.phf_document && (
          <div>
            <h3 className="text-lg font-medium mb-4">Personal History Form (PHF)</h3>
            <ReliableDocumentViewer 
              fileUrl={application.files.phf_document}
              fileName="Personal History Form.pdf"
              fileType="pdf"
              className="w-full"
            />
          </div>
        )}
        
        {/* Motivation Letter Viewer - Show PDF version if available */}
        {application?.files?.motivation_letter && (
          <div>
            <h3 className="text-lg font-medium mb-4">Motivation Letter</h3>
            <ReliableDocumentViewer
              fileUrl={application.files.motivation_letter}
              fileName="Motivation Letter.pdf"
              fileType="pdf"
              className="w-full"
            />
          </div>
        )}
        
        {/* Motivation Statement Viewer - Show DOCX version if no PDF available */}
        {application?.files?.motivation_statement && !application?.files?.motivation_letter && (
          <div>
            <h3 className="text-lg font-medium mb-4">Motivation Statement</h3>
            <ReliableDocumentViewer
              fileUrl={application.files.motivation_statement}
              fileName="Motivation Statement.docx"
              fileType="docx"
              className="w-full"
            />
          </div>
        )}
        
        {/* PHF Data Summary (if available) */}
        {application.phf_data && (
          <div>
            <h3 className="text-lg font-medium mb-4">PHF Data Summary</h3>
            <PHFInlineViewer 
              phfData={application.phf_data}
              className="w-full"
            />
          </div>
        )}
        
        <PHFManager
          applicationId={id!}
          phfData={application.phf_data}
          phfCompleted={application.phf_completed || false}
          phfPdfUrl={application.phf_pdf_url}
          candidatePhfUrl={application.candidate_phf_url}
          photoUrl={application.photo_url}
          onUpdate={fetchApplication}
        />
        
        {application?.files && Object.keys(application.files).length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-4">Other Application Files</h3>
            <div className="space-y-4">
              {Object.entries(application.files)
                .filter(([key]) => !['phf_document', 'motivation_statement'].includes(key)) // Already shown above
                .map(([key, filePath]) => (
                <ReliableDocumentViewer
                  key={key}
                  fileUrl={filePath as string}
                  fileName={key.replace('_', ' ')}
                  className="w-full"
                />
              ))}
            </div>
          </div>
        )}
        
        {(!application?.files || Object.keys(application.files).length === 0) && !application.phf_data && (
          <p className="text-muted-foreground">No application data or files available</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">Loading application...</div>
        </div>
      </Layout>
    );
  }

  if (!application) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-destructive mb-4">Application Not Found</h1>
            <Button onClick={() => navigate('/admin/applications')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Applications
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  // Helper function to get current job
  const getCurrentJob = (employment: any[]) => {
    if (!employment || employment.length === 0) return null;
    
    // First, look for a job marked as current (is_present: true)
    const currentJob = employment.find(job => job.is_present === true);
    if (currentJob) return currentJob;
    
    // If no current job marked, get the most recent one (first in array, assuming sorted by date)
    return employment[0];
  };

  // Helper function to safely render language proficiency (handles both strings and objects)
  const getLanguageProficiency = (value: any): string => {
    if (!value) return 'N/A';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && value.english) return value.english;
    return String(value);
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/admin/applications')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{application.candidate.name}</h1>
              <p className="text-muted-foreground">{application.job.title}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(application.status)}
            {application.suggested_for_longlist && (
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                AI Suggested
              </Badge>
            )}
            {application.source === 'manual_entry' && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/admin/applications/${application.id}/edit`)}
                className="flex items-center gap-2"
              >
                <User className="w-4 h-4" />
                Edit Application
              </Button>
            )}
          </div>
        </div>

        {/* Status Management */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Status Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Current Status */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Current Status</h4>
                <div className="flex items-center gap-3">
                  {getStatusBadge(application.status)}
                  {application.suggested_for_longlist && (
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      AI Recommended
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last updated: {format(new Date(application.updated_at || application.submitted_at), 'PPp')}
                </p>
              </div>

              {/* Status Change */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Move to Stage</h4>
                <Select value={application.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Application">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        Application
                      </div>
                    </SelectItem>
                    <SelectItem value="Longlist">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                        Longlist
                      </div>
                    </SelectItem>
                    <SelectItem value="Shortlist">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        Shortlist
                      </div>
                    </SelectItem>
                    <SelectItem value="Pre-Recorded Video">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        Pre-Recorded Video
                      </div>
                    </SelectItem>
                    <SelectItem value="Panel Interview">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        Panel Interview
                      </div>
                    </SelectItem>
                    <SelectItem value="Offer">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Offer
                      </div>
                    </SelectItem>
                    <SelectItem value="Roster">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Roster
                      </div>
                    </SelectItem>
                    <SelectItem value="Rejected">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Rejected
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!canMoveToLonglist && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-md">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Only HR Assistants can move from Application to Longlist
                  </p>
                )}
              </div>

              {/* Quick Actions */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Quick Actions</h4>
                <div className="flex flex-col gap-2">
                  {application.status === 'Application' && canMoveToLonglist && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange('Longlist')}
                      className="justify-start"
                    >
                      Move to Longlist
                    </Button>
                  )}
                  {application.status === 'Longlist' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleStatusChange('Shortlist')}
                      className="justify-start"
                    >
                      Move to Shortlist
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleStatusChange('Rejected')}
                    className="justify-start text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject Application
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="motivation">Motivation</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Requirements Checklist - Keep at top for visual screening */}
            <RequirementsChecklist 
              applicationId={application.id}
              jobId={application.job.id}
              phfData={application.phf_data}
              candidateInfo={application.candidate}
            />

            {/* Personal Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Personal Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-6">
                  {(application.photo_url || application.phf_data?.personalDetails?.photoUrl) && (
                    <div className="flex-shrink-0">
                      <img 
                        src={application.photo_url || application.phf_data?.personalDetails?.photoUrl} 
                        alt="Candidate Photo" 
                        className="w-24 h-32 object-cover rounded border"
                      />
                    </div>
                  )}
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-xl font-semibold">
                        {application.phf_data?.personalDetails?.firstNames && application.phf_data?.personalDetails?.familyName 
                          ? `${application.phf_data.personalDetails.firstNames} ${application.phf_data.personalDetails.familyName}`
                          : application.candidate.name}
                      </h3>
                      <p className="text-muted-foreground">
                        {application.phf_data?.personalDetails?.title} • {application.phf_data?.personalDetails?.presentNationality || 'Nationality not specified'}
                      </p>
                      {application.phf_data?.personalDetails?.dateOfBirth && (
                        <p className="text-sm text-muted-foreground">
                          Born: {format(new Date(application.phf_data.personalDetails.dateOfBirth), 'PPP')}
                        </p>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{application.candidate.email}</span>
                        </div>
                        {application.candidate.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{application.candidate.phone}</span>
                          </div>
                        )}
                        {application.candidate.location && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm">{application.candidate.location}</span>
                          </div>
                        )}
                        {application.candidate.linkedin_url && (
                          <div className="flex items-center space-x-2">
                            <ExternalLink className="w-4 h-4 text-muted-foreground" />
                            <a 
                              href={application.candidate.linkedin_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-sm text-primary hover:underline"
                            >
                              LinkedIn Profile
                            </a>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-2">
                        {application.candidate.work_auth && (
                          <div>
                            <span className="text-sm font-medium">Work Authorization:</span>
                            <p className="text-sm text-muted-foreground">{application.candidate.work_auth}</p>
                          </div>
                        )}
                        <div>
                          <span className="text-sm font-medium">Application Submitted:</span>
                          <p className="text-sm text-muted-foreground">{format(new Date(application.submitted_at), 'PPP')}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium">PHF Status:</span>
                          <p className="text-sm text-muted-foreground">{application.phf_completed ? 'Completed' : 'Not Completed'}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Languages Section */}
            {application.phf_data?.languages && application.phf_data.languages.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5" />
                    <span>Languages ({application.phf_data.languages.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {application.phf_data.languages.map((lang: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="font-medium">{lang.language}</span>
                        <div className="flex gap-2">
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              Speaking: {getLanguageProficiency(lang.speaking)}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              Reading: {getLanguageProficiency(lang.reading)}
                            </Badge>
                          </div>
                          <div className="text-center">
                            <Badge variant="outline" className="text-xs">
                              Writing: {getLanguageProficiency(lang.writing)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Work Experience Section */}
            {application.phf_data?.employment && application.phf_data.employment.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Briefcase className="w-5 h-5" />
                    <span>Work Experience ({application.phf_data.employment.length} positions)</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {application.phf_data.employment.map((job: any, index: number) => (
                      <div key={index} className="border-l-2 border-primary pl-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">{job.exact_title_of_post || job.position_title || 'Position'}</h4>
                            <p className="text-muted-foreground">{job.employer_name || 'Organization'}</p>
                            <p className="text-sm text-muted-foreground">
                              {job.place_of_work || 'Location'} • {job.type_of_business || 'Industry'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium">
                              {job.from_year || 'Start'} - {job.is_present ? 'Present' : (job.to_year || 'End')}
                            </p>
                            {job.is_present && (
                              <Badge variant="secondary" className="mt-1">Current Position</Badge>
                            )}
                          </div>
                        </div>
                        
                        {job.main_duties_responsibilities && (
                          <div className="mt-2">
                            <h5 className="font-medium text-sm mb-1">Duties & Responsibilities:</h5>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">
                              {job.main_duties_responsibilities}
                            </p>
                          </div>
                        )}
                        
                        {job.reason_for_leaving && !job.is_present && (
                          <div className="mt-2">
                            <h5 className="font-medium text-sm mb-1">Reason for Leaving:</h5>
                            <p className="text-sm text-muted-foreground">{job.reason_for_leaving}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Education Section */}
            {application.phf_data?.education && application.phf_data.education.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <GraduationCap className="w-5 h-5" />
                    <span>Education ({application.phf_data.education.length})</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {application.phf_data.education.map((edu: any, index: number) => (
                      <div key={index} className="border-l-2 border-secondary pl-4 space-y-1">
                        <h4 className="font-semibold">{edu.degree_or_certificate_title || 'Degree/Certificate'}</h4>
                        <p className="text-muted-foreground">{edu.main_course_of_study || 'Field of Study'}</p>
                        <p className="font-medium text-sm">{edu.institution_name || 'Institution'}</p>
                        <p className="text-sm text-muted-foreground">
                          {edu.place_country || 'Location'} • {edu.from_year || 'Year'} - {edu.to_year || 'Year'}
                        </p>
                        {edu.distinguish_honors_obtained && (
                          <p className="text-sm">
                            <span className="font-medium">Honors:</span> {edu.distinguish_honors_obtained}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Skills Section */}
            {application.phf_data?.skills && application.phf_data.skills.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Skills</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {application.phf_data.skills.map((skill: any, index: number) => (
                      <Badge key={index} variant="secondary">
                        {typeof skill === 'string' ? skill : skill.name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Certifications Section */}
            {application.phf_data?.certifications && application.phf_data.certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {application.phf_data.certifications.map((cert: any, index: number) => (
                      <div key={index} className="p-3 bg-muted/50 rounded-lg">
                        <h5 className="font-medium">{cert.name || cert.title}</h5>
                        {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                        {cert.date && (
                          <p className="text-xs text-muted-foreground">
                            Issued: {format(new Date(cert.date), 'PPP')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="motivation">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Motivation Letter</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Check for uploaded motivation letter files first */}
                {application.files?.motivation_letter ? (
                  <DocumentViewer 
                    fileUrl={application.files.motivation_letter}
                    fileName="Motivation Letter"
                    className="mb-6"
                  />
                ) : application.phf_data?.motivationLetter?.motivation_letter_content ? (
                  <div className="space-y-4">
                    <div className="prose max-w-none">
                      <div className="bg-gray-50 p-6 rounded-lg border">
                        <h4 className="font-medium text-gray-900 mb-3 text-lg">
                          Personal Statement / Motivation Letter
                        </h4>
                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                          {application.phf_data.motivationLetter.motivation_letter_content}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Character count: {application.phf_data.motivationLetter.motivation_letter_content.length.toLocaleString()}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No motivation letter provided</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="w-5 h-5" />
                  <span>Application Files</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Upload interface for longlisted candidates */}
                {application.status === 'Longlist' && userRoles && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                  <div className="mb-6">
                    <LonglistDocumentUploader
                      applicationId={application.id}
                      currentFiles={application.files || {}}
                      onUploadComplete={fetchApplication}
                    />
                  </div>
                )}
                
                {/* Debug info - remove after testing */}
                <div className="p-2 bg-yellow-50 rounded text-xs mb-4">
                  <strong>Debug Info:</strong><br/>
                  Status: {application.status}<br/>
                  UserRoles: {userRoles ? userRoles.join(',') : 'null/undefined'}<br/>
                  Has Admin: {userRoles?.includes('Admin') ? 'Yes' : 'No'}<br/>
                  Has HR Assistant: {userRoles?.includes('HR Assistant') ? 'Yes' : 'No'}<br/>
                  Should Show Upload: {application.status === 'Longlist' && userRoles && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) ? 'Yes' : 'No'}
                </div>
                
                {/* Display uploaded documents with inline viewing */}
                <div className="space-y-6">
                  {application.files?.phf_document && (
                    <div>
                      <h4 className="font-medium mb-3">Personal History Form (PHF)</h4>
                      <DocumentViewer 
                        fileUrl={application.files.phf_document}
                        fileName="Personal History Form"
                        fileType="pdf"
                      />
                    </div>
                  )}
                  
                  {application.files?.motivation_letter && (
                    <div>
                      <h4 className="font-medium mb-3">Motivation Letter</h4>
                      <DocumentViewer 
                        fileUrl={application.files.motivation_letter}
                        fileName="Motivation Letter"
                        fileType="pdf"
                      />
                    </div>
                  )}
                </div>

                {/* Existing files section */}
                {renderFiles()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="emails">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>Email Thread</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Email integration coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="video">
            {application && (
              <VideoRatingInterface
                applicationId={application.id}
                questions={videoQuestions} 
                videoAnswers={videoAnswers} 
                onRatingUpdate={() => {
                  fetchApplication();
                  fetchVideoData();
                }}
              />
            )}
          </TabsContent>

          <TabsContent value="interviews" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Panel Interviews</h3>
              {application?.status === 'Shortlist' && (
                <Button onClick={() => setShowScheduler(!showScheduler)}>
                  {showScheduler ? 'Cancel' : 'Schedule Interview'}
                </Button>
              )}
            </div>
            
            {showScheduler && (
              <PanelInterviewScheduler
                applicationId={id!}
                onScheduled={() => {
                  setShowScheduler(false);
                  // Optionally refresh the interview list
                }}
              />
            )}
            
            <PanelInterviewList applicationId={id!} />
          </TabsContent>

          <TabsContent value="feedback">
            <Card>
              <CardHeader>
                <CardTitle>Panel Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Feedback system coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <ApplicationAuditViewer
              applicationId={application.id}
              candidateName={application.candidate.name}
              submittedAt={application.submitted_at}
            />
          </TabsContent>
        </Tabs>

        {/* Status Change Dialog */}
        <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Override AI Recommendation</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium">AI did not recommend this candidate for longlist</p>
                  <p className="text-xs text-muted-foreground">Please provide a reason for overriding this recommendation</p>
                </div>
              </div>
              <Textarea
                placeholder="Reason for moving to longlist despite AI recommendation..."
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                className="min-h-[100px]"
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => updateStatus(pendingStatus, statusChangeReason)}
                  disabled={!statusChangeReason.trim()}
                >
                  Confirm Move to Longlist
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}