import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, FileText, CheckCircle, Clock, AlertCircle, Eye, UserCheck, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { RequisitionWorkflowTimeline } from "@/components/RequisitionWorkflowTimeline";
import { Layout } from "@/components/Layout";
import { getAssignedChief } from "@/lib/chiefAssignment";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  unit_section_division: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  hr_reviewed: boolean;
  hr_reviewed_at: string | null;
  hr_sent_at: string | null;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string | null;
  hiring_manager_sent_at: string | null;
  finance_controller_approval: boolean;
  finance_controller_approved_at: string | null;
  chief_of_division_approval: boolean;
  chief_of_division_approved_at: string | null;
  chief_of_division_sent_at: string | null;
  deputy_director_approval: boolean;
  deputy_director_approved_at: string | null;
  deputy_director_sent_at: string | null;
  director_approval: boolean;
  director_approved_at: string | null;
  director_sent_at: string | null;
  pdf_url?: string;
  converted_to_job_id?: string;
  initial_request_submitted?: boolean;
  initial_request_approved?: boolean;
  funding_status?: string;
  brief_outline?: string;
}

export default function JobRequisitions() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<'all' | 'mine'>('all');
  const [remindersSent, setRemindersSent] = useState<Record<string, boolean>>({});
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRequisitions();
      fetchRemindersSent();
    }
  }, [user, viewFilter]);

  const fetchRequisitions = async () => {
    try {
      let query = supabase
        .from('job_requisitions')
        .select('*');

      // Filter based on view preference or user role
      const isHiringManagerOnly = (userRoles.includes('Hiring Manager') || userRoles.includes('Director')) && !userRoles.includes('Admin') && !userRoles.includes('HR Assistant') && !userRoles.includes('Chief of HR');
      
      if (isHiringManagerOnly || viewFilter === 'mine') {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch position descriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchRemindersSent = async () => {
    try {
      const { data, error } = await supabase
        .from('email_send_log')
        .select('requisition_id')
        .eq('template_slug', 'pd_reminder')
        .eq('status', 'sent');

      if (error) throw error;

      const reminderMap: Record<string, boolean> = {};
      data?.forEach((log) => {
        if (log.requisition_id) {
          reminderMap[log.requisition_id] = true;
        }
      });
      setRemindersSent(reminderMap);
    } catch (error) {
      console.error('Error fetching reminder status:', error);
    }
  };

  const handleSendReminder = async (requisitionId: string) => {
    setSendingReminder(requisitionId);
    try {
      const { error } = await supabase.functions.invoke('send-pd-reminder', {
        body: { requisitionId }
      });

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: "PD reminder email sent to hiring manager successfully",
      });

      // Refresh reminder status
      await fetchRemindersSent();
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: "Failed to send reminder email",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const getStatusBadge = (requisition: JobRequisition) => {
    if (requisition.converted_to_job_id) {
      return <Badge variant="default" className="bg-green-500">Published</Badge>;
    }
    
    switch (requisition.status) {
      // Initial Request stages
      case 'initial_request_draft':
        return <Badge variant="secondary">Initial Request Draft</Badge>;
      case 'initial_request_submitted':
      case 'initial_request_chief_review':
        return <Badge variant="default" className="bg-yellow-500">Initial Request - Chief Review</Badge>;
      case 'initial_request_approved':
        return <Badge variant="default" className="bg-green-500">Initial Request Approved</Badge>;
      case 'initial_request_rejected':
        return <Badge variant="destructive">Initial Request Rejected</Badge>;
      // Full PD stages
      case 'pd_draft':
      case 'draft':
        return <Badge variant="secondary">PD Draft</Badge>;
      case 'pd_submitted':
        return <Badge variant="default" className="bg-blue-500">PD Submitted</Badge>;
      case 'hr_review':
        return <Badge variant="default" className="bg-orange-500">HR Review</Badge>;
      case 'hiring_manager_review':
        return <Badge variant="default" className="bg-blue-500">Manager Review</Badge>;
      case 'chief_of_division_review':
      case 'chief_division_review':
        return <Badge variant="default" className="bg-purple-500">Chief Review</Badge>;
      case 'director_review':
        return <Badge variant="default" className="bg-amber-500">Director Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">{requisition.status}</Badge>;
    }
  };

  const getApprovalProgress = (requisition: JobRequisition) => {
    const steps = [
      { 
        label: "Submission", 
        approved: true,
        sentAt: requisition.created_at,
        approvedAt: requisition.created_at
      },
      { 
        label: "HR Review", 
        approved: requisition.hr_reviewed,
        sentAt: requisition.hr_sent_at,
        approvedAt: requisition.hr_reviewed_at
      },
      { 
        label: "Hiring Manager Approval", 
        approved: requisition.hiring_manager_confirmed_hr_changes,
        sentAt: requisition.hiring_manager_sent_at,
        approvedAt: requisition.hiring_manager_confirmed_at
      },
      { 
        label: "Chief Approval", 
        approved: requisition.chief_of_division_approval,
        sentAt: requisition.chief_of_division_sent_at,
        approvedAt: requisition.chief_of_division_approved_at
      },
      { 
        label: "Director Approval", 
        approved: requisition.director_approval,
        sentAt: requisition.director_sent_at,
        approvedAt: requisition.director_approved_at
      },
      { 
        label: "Published", 
        approved: !!requisition.converted_to_job_id,
        sentAt: requisition.converted_to_job_id ? requisition.updated_at : null,
        approvedAt: requisition.converted_to_job_id ? requisition.updated_at : null
      },
    ];

    return (
      <div className="flex space-x-2 mt-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-xs">
            <div className="flex items-center">
              {step.approved ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400 mr-1" />
              )}
              <span className={step.approved ? "text-green-700" : "text-gray-500"}>
                {step.label}
              </span>
            </div>
            <div className="flex flex-col items-center mt-1 space-y-1">
              {/* Show sent date if available, otherwise show approved date for existing data */}
              {(step.sentAt || (step.approved && step.approvedAt)) && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Sent:</span> {new Date(step.sentAt || step.approvedAt!).toLocaleDateString('en-GB')}
                </div>
              )}
              {step.approved && step.approvedAt && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium">Approved:</span> {new Date(step.approvedAt).toLocaleDateString('en-GB')}
                </div>
              )}
            </div>
            {index < steps.length - 1 && <span className="mx-2 mt-2">→</span>}
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-semibold">Access Denied</p>
                <p className="text-muted-foreground">Please log in to view job requisitions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!userRoles.some(role => ['Admin', 'HR Assistant', 'Hiring Manager', 'Director', 'Chief of HR'].includes(role))) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-center">
                <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                <p className="text-lg font-semibold">Access Denied</p>
                <p className="text-muted-foreground">You don't have permission to view job requisitions.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">PD Pipeline</h1>
          <p className="text-muted-foreground">Manage position descriptions and approvals</p>
        </div>
        <div className="flex gap-2">
          {(userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR')) && (
            <Button 
              onClick={() => navigate('/admin/initial-requests')} 
              variant="outline"
              className="flex items-center gap-2"
            >
              <Eye className="h-4 w-4" />
              Review Initial Requests
            </Button>
          )}
          {userRoles.some(role => ['Admin', 'HR Assistant', 'Chief of HR'].includes(role)) && (
            <>
              <Button onClick={() => navigate('/requisitions/initial/new')} variant="outline" className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Initial Request
              </Button>
              <Button onClick={() => navigate('/requisitions/new')} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Position Description
              </Button>
            </>
          )}
          {(userRoles.includes('Hiring Manager') || userRoles.includes('Director')) && !userRoles.some(role => ['Admin', 'HR Assistant', 'Chief of HR'].includes(role)) && (
            <Button onClick={() => navigate('/requisitions/initial/new')} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              New Initial Request
            </Button>
          )}
        </div>
      </div>

      {(userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
        <Tabs value={viewFilter} onValueChange={(value) => setViewFilter(value as 'all' | 'mine')} className="mb-6">
          <TabsList>
            <TabsTrigger value="all">All Requisitions</TabsTrigger>
            <TabsTrigger value="mine">My Requisitions</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {requisitions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold">No Position Descriptions Found</p>
                  <p className="text-muted-foreground mb-4">Get started by creating your first position description.</p>
                  {userRoles.some(role => ['Admin', 'Hiring Manager', 'Director'].includes(role)) && (
                    <Button onClick={() => navigate('/requisitions/new')}>
                      Create Position Description
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            requisitions.map((requisition) => {
              const assignedChief = getAssignedChief(requisition.unit_section_division);
              const showChiefIndicator = requisition.funding_status || requisition.brief_outline; // Show for initial requests
              
              return (
              <Card key={requisition.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {requisition.position_title || 'Untitled Position'}
                        {getStatusBadge(requisition)}
                      </CardTitle>
                      <CardDescription>
                        Ref: {requisition.reference_number} • Created {format(new Date(requisition.created_at), 'MMM dd, yyyy')}
                      </CardDescription>
                      {showChiefIndicator && assignedChief && (
                        <div className="flex items-center gap-1 text-sm mt-2 text-muted-foreground">
                          <UserCheck className="w-4 h-4 text-primary" />
                          <span className="font-medium">Assigned Chief:</span>
                          <span>{assignedChief.name}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {/* View Request button - for viewing initial request form */}
                      {(requisition.funding_status || requisition.brief_outline) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/requisitions/initial/${requisition.id}?view=true`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Request
                        </Button>
                      )}
                      {/* Continue PD button for draft and PD draft requests */}
                      {(requisition.status === 'initial_request_draft' || requisition.status === 'draft' || requisition.status === 'pd_draft') && 
                       requisition.created_by === user?.id && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            if (requisition.status === 'initial_request_draft') {
                              navigate(`/requisitions/initial/${requisition.id}`);
                            } else {
                              navigate(`/requisitions/${requisition.id}/edit`);
                            }
                          }}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          Continue PD
                        </Button>
                      )}
                      {/* Continue to Full PD button for approved initial requests */}
                      {requisition.initial_request_approved && 
                       requisition.status === 'initial_request_approved' &&
                       (requisition.created_by === user?.id || 
                        userRoles.includes('Admin') || 
                        userRoles.includes('HR Assistant')
                       ) && (
                        <>
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => navigate(`/requisitions/${requisition.id}/edit`)}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Continue to Full PD
                          </Button>
                          {/* Send PD Reminder button - only for Admin/HR */}
                          {(userRoles.includes('Admin') || 
                            userRoles.includes('HR Assistant') || 
                            userRoles.includes('Chief of HR')) && (
                            <>
                              {remindersSent[requisition.id] ? (
                                <Badge variant="secondary" className="h-9 px-3">
                                  <Mail className="h-4 w-4 mr-1" />
                                  Reminder Sent
                                </Badge>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(requisition.id)}
                                  disabled={sendingReminder === requisition.id}
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  {sendingReminder === requisition.id ? 'Sending...' : 'Send PD Reminder'}
                                </Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {/* HR Final Review button - shown when manager has confirmed changes */}
                      {(requisition.status === 'hr_final_review' || 
                        (requisition.status === 'hr_review' && requisition.hiring_manager_confirmed_hr_changes)) && 
                        (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => navigate(`/requisitions/${requisition.id}/hr-edit`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Finalize & Send to Chief
                        </Button>
                      )}
                      {/* Convert to Job button - shown when requisition is approved by Director */}
                      {requisition.director_approval &&
                       !requisition.converted_to_job_id &&
                       (userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR')) && (
                        <Button
                          variant="default"
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            try {
                              const { data, error } = await supabase.functions.invoke('convert-requisition-to-job', {
                                body: { requisitionId: requisition.id }
                              });

                              if (error) throw error;

                              toast({
                                title: "Success",
                                description: "Job created successfully. Redirecting to edit page...",
                              });

                              // Navigate to the created job's edit page
                              setTimeout(() => {
                                navigate(`/admin/jobs/${data.jobId}/edit`);
                              }, 1500);
                            } catch (error) {
                              console.error('Error converting to job:', error);
                              toast({
                                title: "Error",
                                description: "Failed to convert to job posting",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Convert to Job
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Route to hiring manager review if status is hiring_manager_review and user is the hiring manager
                          if (requisition.status === 'hiring_manager_review' && requisition.created_by === user?.id) {
                            navigate(`/requisitions/${requisition.id}/hm-review`);
                          } else {
                            // Route to initial request form if:
                            // 1. Initial request was submitted but not approved, OR
                            // 2. Initial request draft exists (has funding_status/brief_outline but not submitted)
                            const hasInitialRequestData = !!requisition.funding_status || !!requisition.brief_outline;
                            const isStillInitialRequest = hasInitialRequestData && !requisition.initial_request_approved;
                            
                            if (isStillInitialRequest) {
                              navigate(`/requisitions/initial/${requisition.id}`);
                            } else {
                              navigate(`/requisitions/${requisition.id}`);
                            }
                          }
                        }}
                      >
                        {requisition.status === 'hiring_manager_review' && requisition.created_by === user?.id 
                          ? 'Review HR Changes' 
                          : 'View Details'
                        }
                      </Button>
                      {/* Only show PDF for Admin and HR Assistant */}
                      {requisition.pdf_url && (userRoles.includes('Admin') || userRoles.includes('HR Assistant')) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(requisition.pdf_url, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-muted-foreground">
                      Workflow Progress
                    </div>
                    <RequisitionWorkflowTimeline requisition={requisition} compact />
                  </div>
                </CardContent>
              </Card>
            );
            })
          )}
        </div>
      )}
      </div>
    </Layout>
  );
}