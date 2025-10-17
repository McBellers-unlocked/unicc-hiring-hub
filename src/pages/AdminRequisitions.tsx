import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Eye,
  Calendar,
  User,
  Building,
  Edit2
} from "lucide-react";
import { ChiefHRReviewDialog } from "@/components/ChiefHRReviewDialog";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  status: string;
  created_at: string;
  created_by: string;
  hr_reviewed: boolean;
  hr_reviewed_at: string | null;
  hr_reviewed_by: string | null;
  chief_hr_reviewed: boolean;
  chief_hr_reviewed_at: string | null;
  chief_hr_reviewed_by: string | null;
  chief_hr_comments: string | null;
  hr_internal_status: string;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string | null;
  chief_of_division_approval: boolean;
  chief_of_division_approved_at: string | null;
  director_approval: boolean;
  director_approved_at: string | null;
  deputy_director_approval: boolean;
  deputy_director_approved_at: string | null;
  finance_controller_approval: boolean;
  finance_controller_approved_at: string | null;
  converted_to_job_id?: string;
}

export default function AdminRequisitions() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');

  useEffect(() => {
    if (!isAdmin && !isHR) {
      navigate('/');
      return;
    }
    fetchRequisitions();
  }, [isAdmin, isHR, navigate]);

  const fetchRequisitions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisitions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHRReview = async (requisitionId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hr_reviewed: true,
          hr_reviewed_at: new Date().toISOString(),
          hr_reviewed_by: user?.id,
          status: approved ? 'hiring_manager_review' : 'hr_amendments'
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Position description ${approved ? 'approved' : 'sent back for amendments'}`,
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const handleChiefHRReview = async (requisitionId: string, approved: boolean, comments?: string) => {
    try {
      const updateData = {
        chief_hr_reviewed: true,
        chief_hr_reviewed_at: new Date().toISOString(),
        chief_hr_reviewed_by: user?.id,
        hr_internal_status: approved ? 'ready_for_manager' : 'pending_initial_review',
        chief_hr_comments: comments || null
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: approved ? "Position description approved by Chief HR" : "Position description returned to HR with comments",
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const handleSendToManager = async (requisitionId: string) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          status: 'hiring_manager_review',
          hr_internal_status: 'pending_initial_review' // Reset for potential future changes
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position description sent to hiring manager for review",
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const handleHiringManagerConfirmation = async (requisitionId: string) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          status: 'chief_division_review'
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position description sent to Chief of Division for approval",
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (requisition: JobRequisition) => {
    // Check if converted to job (published)
    if ((requisition as any).converted_to_job_id) {
      return { label: 'Published', color: 'success', icon: CheckCircle2 };
    }
    
    switch (requisition.status) {
      case 'draft':
        return { label: 'Draft', color: 'secondary', icon: Clock };
      case 'hr_review':
        return { label: 'HR Review', color: 'warning', icon: AlertCircle };
      case 'hr_amendments':
        return { label: 'HR Amendments', color: 'destructive', icon: XCircle };
      case 'hiring_manager_review':
        if (requisition.hiring_manager_confirmed_hr_changes) {
          return { label: 'Manager Confirmed', color: 'success', icon: CheckCircle2 };
        } else {
          return { label: 'Manager Review', color: 'warning', icon: Clock };
        }
      case 'chief_division_review':
        return { label: 'Chief Review', color: 'info', icon: Clock };
      case 'director_review':
        return { label: 'Director Review', color: 'info', icon: Clock };
      case 'approved':
        return { label: 'Approved', color: 'success', icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', color: 'destructive', icon: XCircle };
      default:
        return { label: requisition.status, color: 'secondary', icon: AlertCircle };
    }
  };

  const getStatusVariant = (color: string) => {
    switch (color) {
      case 'success': return 'default';
      case 'warning': return 'default'; // Changed to default so we can style it orange
      case 'destructive': return 'destructive';
      case 'info': return 'outline';
      default: return 'secondary';
    }
  };

  const ApprovalTimeline = ({ requisition }: { requisition: JobRequisition }) => {
    const stages = [
      {
        key: 'submission',
        label: 'Submission',
        isCompleted: true,
        completedAt: requisition.created_at
      },
      {
        key: 'hr_review',
        label: 'HR Review',
        isCompleted: requisition.hr_reviewed,
        completedAt: requisition.hr_reviewed_at
      },
      {
        key: 'hiring_manager',
        label: 'Manager Approval',
        isCompleted: requisition.hiring_manager_confirmed_hr_changes,
        completedAt: requisition.hiring_manager_confirmed_at
      },
      {
        key: 'chief_approval',
        label: 'Chief Approval',
        isCompleted: requisition.chief_of_division_approval,
        completedAt: requisition.chief_of_division_approved_at
      },
      {
        key: 'director_approval',
        label: 'Director Approval',
        isCompleted: requisition.director_approval,
        completedAt: requisition.director_approved_at
      }
    ];

    return (
      <div className="flex items-center justify-between py-3 px-4 bg-muted/30 rounded-lg">
        {stages.map((stage, index) => (
          <div key={stage.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors
                ${stage.isCompleted 
                  ? 'bg-green-500 border-green-500 text-white' 
                  : 'bg-background border-muted-foreground text-muted-foreground'
                }
              `}>
                {stage.isCompleted ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
              </div>
              <span className="text-xs mt-1 text-center max-w-16 leading-tight">
                {stage.label}
              </span>
              {stage.isCompleted && stage.completedAt && (
                <span className="text-xs text-muted-foreground mt-1">
                  {new Date(stage.completedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
            {index < stages.length - 1 && (
              <div className={`
                w-12 h-0.5 mx-2 transition-colors
                ${stage.isCompleted ? 'bg-green-500' : 'bg-muted-foreground/30'}
              `} />
            )}
          </div>
        ))}
      </div>
    );
  };

  const filterRequisitions = (status: string) => {
    switch (status) {
      case 'pending-hr':
        return requisitions.filter(r => 
          r.status === 'hr_review' && r.hr_internal_status === 'pending_initial_review'
        );
      case 'chief-hr-review':
        return requisitions.filter(r => 
          r.status === 'hr_review' && r.hr_internal_status === 'pending_chief_review'
        );
      case 'hr-ready':
        return requisitions.filter(r => 
          r.status === 'hr_review' && r.hr_internal_status === 'ready_for_manager'
        );
      case 'amendments':
        return requisitions.filter(r => r.status === 'hr_amendments');
      case 'manager-confirmation':
        return requisitions.filter(r => r.status === 'hiring_manager_review');
      case 'in-progress':
        return requisitions.filter(r => 
          ['chief_division_review', 'director_review'].includes(r.status)
        );
      case 'completed':
        return requisitions.filter(r => ['approved', 'rejected'].includes(r.status) || r.converted_to_job_id);
      default:
        return requisitions;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manage PD Pipeline</h1>
          <p className="text-muted-foreground">Review and approve position descriptions</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Position Descriptions</TabsTrigger>
            <TabsTrigger value="pending-hr">
              Pending HR Review
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('pending-hr').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="chief-hr-review">
              Chief HR Review
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('chief-hr-review').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="hr-ready">
              Ready for Manager
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('hr-ready').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="amendments">
              Amendments Required
              <Badge variant="destructive" className="ml-2">
                {filterRequisitions('amendments').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="manager-confirmation">
              Manager Confirmation
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('manager-confirmation').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {(['all', 'pending-hr', 'chief-hr-review', 'hr-ready', 'amendments', 'manager-confirmation', 'in-progress', 'completed'] as const).map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              {filterRequisitions(tabValue).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No position descriptions found</p>
                  </CardContent>
                </Card>
              ) : (
                filterRequisitions(tabValue).map((requisition) => {
                  const statusInfo = getStatusInfo(requisition);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={requisition.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{requisition.position_title}</CardTitle>
                              <Badge 
                                variant={getStatusVariant(statusInfo.color)} 
                                className={`flex items-center gap-1 ${
                                  statusInfo.color === 'warning' ? 'bg-orange-500 hover:bg-orange-600 text-white' : 
                                  statusInfo.color === 'success' ? 'bg-green-500 hover:bg-green-600 text-white' : ''
                                }`}
                              >
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {requisition.reference_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {requisition.grade}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(requisition.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            </CardDescription>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/requisitions/${requisition.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            
                            {/* HR Initial Review Actions */}
                            {requisition.status === 'hr_review' && requisition.hr_internal_status === 'pending_initial_review' && (isAdmin || isHR) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/requisitions/${requisition.id}/hr-edit`)}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Edit & Review
                                </Button>
                              </>
                            )}
                            
                            {/* Chief HR Review Actions */}
                            {requisition.status === 'hr_review' && requisition.hr_internal_status === 'pending_chief_review' && isAdmin && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/requisitions/${requisition.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                <ChiefHRReviewDialog 
                                  requisitionId={requisition.id} 
                                  onComplete={fetchRequisitions} 
                                />
                              </div>
                            )}

                            {/* Ready for Manager - HR can send */}
                            {requisition.status === 'hr_review' && requisition.hr_internal_status === 'ready_for_manager' && (isAdmin || isHR) && (
                              <Button
                                size="sm"
                                onClick={() => handleSendToManager(requisition.id)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Send to Manager
                              </Button>
                            )}

                            {requisition.status === 'hiring_manager_review' && (isAdmin || isHR) && (
                              <>
                                {requisition.hiring_manager_confirmed_hr_changes ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleHiringManagerConfirmation(requisition.id)}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle2 className="h-4 w-4 mr-1" />
                                    Send to Chief Review
                                  </Button>
                                ) : (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Waiting for Manager Confirmation
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <ApprovalTimeline requisition={requisition} />
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Unit/Division:</span>
                              <span>{requisition.unit_section_division}</span>
                            </div>
                          
                          {requisition.hr_reviewed && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">HR Reviewed:</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                {requisition.hr_reviewed_at && new Date(requisition.hr_reviewed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {requisition.chief_hr_reviewed && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Chief HR Reviewed:</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                {requisition.chief_hr_reviewed_at && new Date(requisition.chief_hr_reviewed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}

                          {requisition.chief_hr_comments && (
                            <div className="text-sm">
                              <span className="text-muted-foreground">Chief HR Comments:</span>
                              <p className="mt-1 text-sm bg-muted/50 p-2 rounded border-l-2 border-blue-500">
                                {requisition.chief_hr_comments}
                              </p>
                            </div>
                          )}
                          
                          {requisition.status === 'hiring_manager_review' && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Manager Confirmed Changes:</span>
                              <span className="flex items-center gap-1">
                                {requisition.hiring_manager_confirmed_hr_changes ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                                    {requisition.hiring_manager_confirmed_at && new Date(requisition.hiring_manager_confirmed_at).toLocaleDateString()}
                                  </>
                                ) : (
                                  <>
                                    <Clock className="h-3 w-3 text-orange-500" />
                                    <span className="text-orange-600">Pending Confirmation</span>
                                  </>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {requisition.hiring_manager_confirmed_hr_changes && requisition.status !== 'hiring_manager_review' && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Manager Confirmed Changes:</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                {requisition.hiring_manager_confirmed_at && new Date(requisition.hiring_manager_confirmed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            {requisition.chief_of_division_approval && (
                              <Badge variant="outline" className="text-xs">Chief Approved</Badge>
                            )}
                            {requisition.director_approval && (
                              <Badge variant="outline" className="text-xs">Director Approved</Badge>
                            )}
                            {requisition.deputy_director_approval && (
                              <Badge variant="outline" className="text-xs">Deputy Director Approved</Badge>
                            )}
                            {requisition.finance_controller_approval && (
                              <Badge variant="outline" className="text-xs">Finance Approved</Badge>
                             )}
                           </div>
                         </div>
                         </div>
                       </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}