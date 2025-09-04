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
import { VideoInterviewManager } from '@/components/VideoInterviewManager';
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
  const [activeTab, setActiveTab] = useState("summary");
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
            <div className="space-y-2">
              {Object.entries(application.files).map(([key, filePath]) => (
                <div key={key} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={filePath as string} target="_blank" rel="noopener noreferrer">
                      <Download className="w-3 h-3 mr-1" />
                      Download
                    </a>
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {(!application?.files || Object.keys(application.files).length === 0) && (
          <p className="text-muted-foreground">No additional files uploaded</p>
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
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="files">Files</TabsTrigger>
            <TabsTrigger value="ai-score">AI Score</TabsTrigger>
            <TabsTrigger value="emails">Emails</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="interviews">Interviews</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="space-y-6">
            <RequirementsChecklist 
              applicationId={application.id}
              jobId={application.job.id}
              phfData={application.phf_data}
              candidateInfo={application.candidate}
            />
            
            {/* Quick Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <GraduationCap className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-medium">Education</h3>
                      <p className="text-sm text-muted-foreground">
                        {application.phf_data?.education?.length || 0} entries
                      </p>
                      {application.phf_data?.education?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Latest: {application.phf_data.education[0]?.degree_or_certificate_title}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-medium">Experience</h3>
                      <p className="text-sm text-muted-foreground">
                        {application.phf_data?.employment?.length || 0} positions
                      </p>
                      {application.phf_data?.employment?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Current: {getCurrentJob(application.phf_data.employment)?.exact_title_of_post || 'Not specified'}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-8 h-8 text-primary" />
                    <div>
                      <h3 className="font-medium">Languages</h3>
                       <p className="text-sm text-muted-foreground">
                         {application.phf_data?.languages?.length || 0} languages
                       </p>
                       {application.phf_data?.languages?.length > 0 && (
                         <p className="text-xs text-muted-foreground mt-1">
                           {application.phf_data.languages.slice(0, 2).map((lang: any) => lang.language).join(', ')}
                         </p>
                       )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Candidate Profile</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      <span>{application.candidate.email}</span>
                    </div>
                    {application.candidate.phone && (
                      <div className="flex items-center space-x-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span>{application.candidate.phone}</span>
                      </div>
                    )}
                    {application.candidate.location && (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        <span>{application.candidate.location}</span>
                      </div>
                    )}
                    {application.candidate.linkedin_url && (
                      <div className="flex items-center space-x-2">
                        <ExternalLink className="w-4 h-4 text-muted-foreground" />
                        <a 
                          href={application.candidate.linkedin_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          LinkedIn Profile
                        </a>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    {application.candidate.work_auth && (
                      <div>
                        <h4 className="font-medium mb-1">Work Authorization</h4>
                        <p className="text-muted-foreground">{application.candidate.work_auth}</p>
                      </div>
                    )}
                    
                    {application.phf_data?.languages && application.phf_data.languages.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Languages</h4>
                        <div className="space-y-1">
                          {application.phf_data.languages.map((lang: any, index: number) => (
                            <div key={index} className="flex justify-between">
                              <span>{lang.language}</span>
                               <div className="flex gap-1">
                                 <Badge variant="outline" className="text-xs">
                                   S: {lang.speaking}
                                 </Badge>
                                 <Badge variant="outline" className="text-xs">
                                   R: {lang.reading}
                                 </Badge>
                                 <Badge variant="outline" className="text-xs">
                                   W: {lang.writing}
                                 </Badge>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Application Details</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Submitted:</span>
                      <p>{format(new Date(application.submitted_at), 'PPP pp')}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">PHF Completed:</span>
                      <p>{application.phf_completed ? 'Yes' : 'No'}</p>
                    </div>
                  </div>
                </div>
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
                {renderFiles()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ai-score">
            <ApplicationScoring applicationId={application.id} />
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