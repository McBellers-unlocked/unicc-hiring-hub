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
  Edit2,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { ChiefHRReviewDialog } from "@/components/ChiefHRReviewDialog";
import { RequisitionWorkflowTimeline } from "@/components/RequisitionWorkflowTimeline";
import { getDivisionCode } from "@/lib/chiefAssignment";

// KPI targets in days for each stage
const STAGE_KPIS = {
  pd_creation: { days: 7, label: 'PD Creation' },
  hr_review: { days: 14, label: 'HR Review' },  // Includes Chief HR review
  manager_endorsement: { days: 5, label: 'Manager Endorsement' },
  chief_hr: { days: 7, label: 'Chief HR' },
  division_chief: { days: 7, label: 'Division Chief' },
  director: { days: 7, label: 'Director' }
};

interface JobRequisition {
  id: string;
  slug: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  status: string;
  created_at: string;
  created_by: string;
  hiring_manager_name?: string;
  internal_only: boolean;
  pd_submitted_at: string | null;
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
  initial_request_approved?: boolean;
  initial_request_approved_at?: string | null;
  funding_status?: string;
  brief_outline?: string;
}

// Helper to calculate days between two dates
const daysBetween = (start: string | null | undefined, end: string | null | undefined): number => {
  if (!start || !end) return 0;
  const startDate = new Date(start);
  const endDate = new Date(end);
  return Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
};

// Total workflow target: 40 days from initial request approval to job posting
const TOTAL_WORKFLOW_DAYS = 40;

// Calculate cumulative KPI: days remaining from 40-day total target
const calculateCumulativeKPI = (requisition: JobRequisition): number => {
  // Start from initial request approval, or created_at as fallback
  const startDate = requisition.initial_request_approved_at || requisition.created_at;
  if (!startDate) return 0;
  
  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  
  // Return days remaining (positive = ahead, negative = behind)
  return TOTAL_WORKFLOW_DAYS - daysElapsed;
};

// Calculate KPI status for a requisition's current stage only
const calculateKPIStatus = (requisition: JobRequisition): { 
  daysVariance: number; 
  stage: string;
  kpiTarget: number;
} | null => {
  const now = new Date();
  let stageStartDate: Date | null = null;
  let stage: string = '';
  let kpiTarget: number = 0;

  // Determine current stage and when it started
  if (requisition.status === 'initial_request_approved') {
    // PD Creation - time since initial request was approved
    stageStartDate = requisition.initial_request_approved_at 
      ? new Date(requisition.initial_request_approved_at) : null;
    stage = 'PD Creation';
    kpiTarget = STAGE_KPIS.pd_creation.days;
  } else if (requisition.status === 'hr_review') {
    // HR Review - time since PD was submitted
    stageStartDate = requisition.pd_submitted_at 
      ? new Date(requisition.pd_submitted_at) 
      : new Date(requisition.created_at);
    stage = 'HR Review';
    kpiTarget = STAGE_KPIS.hr_review.days;
  } else if (requisition.status === 'hiring_manager_review') {
    // Manager Endorsement - time since HR completed their review
    stageStartDate = requisition.hr_reviewed_at ? new Date(requisition.hr_reviewed_at) : null;
    stage = 'Manager Endorsement';
    kpiTarget = STAGE_KPIS.manager_endorsement.days;
  } else if (['chief_of_division_review', 'chief_division_review'].includes(requisition.status)) {
    // Division Chief - time since manager confirmed
    stageStartDate = requisition.hiring_manager_confirmed_at 
      ? new Date(requisition.hiring_manager_confirmed_at) : null;
    stage = 'Division Chief';
    kpiTarget = STAGE_KPIS.division_chief.days;
  } else if (requisition.status === 'director_review') {
    // Director - time since division chief approved
    stageStartDate = requisition.chief_of_division_approved_at 
      ? new Date(requisition.chief_of_division_approved_at) : null;
    stage = 'Director';
    kpiTarget = STAGE_KPIS.director.days;
  }

  if (!stageStartDate) return null;

  const daysInStage = Math.floor((now.getTime() - stageStartDate.getTime()) / (1000 * 60 * 60 * 24));
  const daysVariance = kpiTarget - daysInStage; // Positive = time remaining, Negative = overdue

  return { daysVariance, stage, kpiTarget };
};

// KPI Badge component for current stage
const KPIBadge = ({ kpiStatus }: { kpiStatus: { daysVariance: number; stage: string; kpiTarget: number } }) => {
  const isOverdue = kpiStatus.daysVariance < 0;
  const isWarning = kpiStatus.daysVariance >= 0 && kpiStatus.daysVariance <= 2;
  const daysText = Math.abs(kpiStatus.daysVariance);
  
  return (
    <Badge 
      variant="outline"
      className={`text-xs font-medium ${
        isOverdue ? "border-red-500 text-red-600 bg-red-50" :
        isWarning ? "border-orange-500 text-orange-600 bg-orange-50" :
        "border-green-500 text-green-600 bg-green-50"
      }`}
    >
      <Clock className="h-3 w-3 mr-1" />
      {isOverdue 
        ? `-${daysText}d overdue` 
        : `+${daysText}d remaining`
      }
    </Badge>
  );
};

// Cumulative KPI Badge component (shows days remaining from 40-day total)
const CumulativeKPIBadge = ({ requisition }: { requisition: JobRequisition }) => {
  const daysRemaining = calculateCumulativeKPI(requisition);
  
  // Don't show for initial request stages or completed requisitions
  if (requisition.status?.includes('initial_request') || requisition.converted_to_job_id) {
    return null;
  }
  
  const daysText = Math.abs(daysRemaining);
  
  // Graduated colors based on days remaining
  const getColor = () => {
    if (daysRemaining >= 15) return "border-green-500 text-green-700 bg-green-50";   // 15+ days left
    if (daysRemaining >= 7) return "border-green-400 text-green-600 bg-green-50";    // 7-14 days left
    if (daysRemaining >= 0) return "border-orange-500 text-orange-600 bg-orange-50"; // 0-6 days left
    if (daysRemaining >= -7) return "border-red-500 text-red-600 bg-red-50";         // 1-7 days overdue
    return "border-red-600 text-red-800 bg-red-100 font-bold";                        // 8+ days overdue
  };
  
  return (
    <Badge variant="outline" className={`text-xs font-medium ${getColor()}`}>
      {daysRemaining < 0 ? `-${daysText}d` : `+${daysText}d`}
    </Badge>
  );
};

export default function AdminRequisitions() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const [userDivision, setUserDivision] = useState<string | null>(null);
  const [remindersSent, setRemindersSent] = useState<Set<string>>(new Set());
  const [hmReviewRemindersSent, setHmReviewRemindersSent] = useState<Set<string>>(new Set());
  const [sendingReminder, setSendingReminder] = useState<string | null>(null);
  const [sendingHMReviewReminder, setSendingHMReviewReminder] = useState<string | null>(null);
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');
  const isChiefHR = userRoles.includes('Chief of HR');
  const isHiringManager = userRoles.includes('Hiring Manager');
  const isDirector = userRoles.includes('Director');

  useEffect(() => {
    if (!isAdmin && !isHR && !isChiefHR && !isHiringManager && !isDirector) {
      navigate('/');
      return;
    }
    fetchUserDivision();
    fetchRequisitions();
    fetchRemindersSent();
    fetchHMReviewRemindersSent();
  }, [isAdmin, isHR, isChiefHR, isHiringManager, isDirector, navigate]);

  const fetchUserDivision = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('division')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      setUserDivision(data?.division || null);
    } catch (error) {
      console.error('Error fetching user division:', error);
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
      
      const sentIds = new Set(data?.map(log => log.requisition_id).filter(Boolean) || []);
      setRemindersSent(sentIds);
    } catch (error) {
      console.error('Error fetching reminders sent:', error);
    }
  };

  const fetchHMReviewRemindersSent = async () => {
    try {
      const { data, error } = await supabase
        .from('email_send_log')
        .select('requisition_id')
        .eq('template_slug', 'hm_review_reminder')
        .eq('status', 'sent');

      if (error) throw error;
      
      const sentIds = new Set(data?.map(log => log.requisition_id).filter(Boolean) || []);
      setHmReviewRemindersSent(sentIds);
    } catch (error) {
      console.error('Error fetching HM review reminders sent:', error);
    }
  };

  const handleSendReminder = async (requisitionId: string) => {
    if (!confirm('Send a reminder email to the hiring manager to complete their Position Description?')) {
      return;
    }

    setSendingReminder(requisitionId);
    try {
      const { error } = await supabase.functions.invoke('send-pd-reminder', {
        body: { requisitionId }
      });

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: "The hiring manager has been notified to complete their Position Description.",
      });

      // Refresh the reminders list
      await fetchRemindersSent();
    } catch (error: any) {
      console.error('Error sending reminder:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder email",
        variant: "destructive",
      });
    } finally {
      setSendingReminder(null);
    }
  };

  const handleSendHMReviewReminder = async (requisitionId: string) => {
    if (!confirm('Send a reminder email to the hiring manager to review and finalize the Position Description?')) {
      return;
    }

    setSendingHMReviewReminder(requisitionId);
    try {
      const { error } = await supabase.functions.invoke('send-hm-review-reminder', {
        body: { requisitionId }
      });

      if (error) throw error;

      toast({
        title: "Reminder Sent",
        description: "The hiring manager has been reminded to review and finalize the Position Description.",
      });

      // Refresh the HM review reminders list
      await fetchHMReviewRemindersSent();
    } catch (error: any) {
      console.error('Error sending HM review reminder:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send reminder email",
        variant: "destructive",
      });
    } finally {
      setSendingHMReviewReminder(null);
    }
  };

  const fetchRequisitions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select(`
          *,
          users!job_requisitions_created_by_fkey (
            name
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Map the data to include hiring manager name
      const mappedData = data?.map(req => ({
        ...req,
        hiring_manager_name: (req as any).users?.name
      })) || [];
      
      setRequisitions(mappedData);
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
          status: 'chief_of_division_review'
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

  const handleSendToChief = async (requisitionId: string) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          status: 'chief_of_division_review',
          hr_internal_status: 'sent_to_chief_for_pd_approval',
          hr_final_review_completed: true,
          hr_final_review_at: new Date().toISOString(),
          hr_final_review_by: user?.id
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Full position description sent to Chief of Division for final approval",
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error sending to Chief:', error);
      toast({
        title: "Error",
        description: "Failed to send to Chief of Division",
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
      // Initial Request stages
      case 'initial_request_draft':
        return { label: 'Initial Request Draft', color: 'secondary', icon: Clock };
      case 'initial_request_submitted':
      case 'initial_request_chief_review':
        return { label: 'Initial Request - Chief Review', color: 'warning', icon: AlertCircle };
      case 'initial_request_approved':
        return { label: 'Initial Request Approved', color: 'success', icon: CheckCircle2 };
      case 'initial_request_rejected':
        return { label: 'Initial Request Rejected', color: 'destructive', icon: XCircle };
      // Full PD stages
      case 'pd_draft':
      case 'draft':
        return { label: 'PD Draft', color: 'secondary', icon: Clock };
      case 'pd_submitted':
        return { label: 'PD Submitted', color: 'info', icon: Clock };
      case 'hr_review':
        return { label: 'HR Review', color: 'warning', icon: AlertCircle };
      case 'hiring_manager_review':
        if (requisition.hiring_manager_confirmed_hr_changes) {
          return { label: 'Manager Confirmed', color: 'success', icon: CheckCircle2 };
        } else {
          return { label: 'Manager Review', color: 'warning', icon: Clock };
        }
      case 'chief_division_review':
      case 'chief_of_division_review':
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

  const filterRequisitions = (status: string) => {
    switch (status) {
      case 'my-division-initial':
        // Filter initial requests for the user's division
        return requisitions.filter(r => {
          if (!r.status.includes('initial_request') || r.initial_request_approved) return false;
          if (!userDivision) return false;
          
          // Get the division code for this requisition
          const reqDivisionCode = getDivisionCode(r.unit_section_division);
          return reqDivisionCode === userDivision;
        });
      case 'initial-requests':
        return requisitions.filter(r => 
          r.status.includes('initial_request')
        );
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
      case 'hr-final-review':
        return requisitions.filter(r => 
          r.status === 'hr_review' && r.hr_internal_status === 'pending_final_review'
        );
      case 'amendments':
        return requisitions.filter(r => r.status === 'hr_amendments');
      case 'manager-confirmation':
        return requisitions.filter(r => r.status === 'hiring_manager_review');
      case 'in-progress':
        return requisitions.filter(r => 
          ['chief_division_review', 'chief_of_division_review', 'director_review'].includes(r.status)
        );
      case 'completed':
        return requisitions.filter(r => ['approved', 'rejected'].includes(r.status) || r.converted_to_job_id);
      default:
        return sortByPriority(requisitions);
    }
  };

  // Priority-based sorting for the "All" view
  const sortByPriority = (reqs: JobRequisition[]): JobRequisition[] => {
    const getPriority = (req: JobRequisition): number => {
      // Priority 1: HR Review (pending_initial_review)
      if (req.status === 'hr_review' && req.hr_internal_status === 'pending_initial_review') return 1;
      
      // Priority 2: Manager Confirmation
      if (req.status === 'hiring_manager_review') return 2;
      
      // Priority 3: Chief of Division Approval
      if (['chief_of_division_review', 'chief_division_review'].includes(req.status)) return 3;
      
      // Priority 4: Director Approval
      if (req.status === 'director_review') return 4;
      
      // Priority 5: Initial Request Approved (waiting for full PD)
      if (req.status === 'initial_request_approved') return 5;
      
      // Priority 6: Initial Request Submitted (pending approval)
      if (['initial_request_submitted', 'initial_request_chief_review'].includes(req.status)) return 6;
      
      // Priority 7: Everything else (drafts, completed, etc.)
      return 7;
    };
    
    const getWaitDate = (req: JobRequisition): Date => {
      // Use the date when the item entered its current status, or created_at as fallback
      if (req.status === 'hr_review' && req.hr_internal_status === 'pending_initial_review') {
        return new Date(req.created_at);
      }
      if (req.status === 'hiring_manager_review') {
        return new Date(req.hr_reviewed_at || req.created_at);
      }
      if (req.status === 'chief_of_division_review' || req.status === 'chief_division_review') {
        return new Date(req.hiring_manager_confirmed_at || req.created_at);
      }
      if (req.status === 'director_review') {
        return new Date(req.chief_of_division_approved_at || req.created_at);
      }
      return new Date(req.created_at);
    };
    
    return [...reqs].sort((a, b) => {
      const priorityA = getPriority(a);
      const priorityB = getPriority(b);
      
      // Sort by priority first
      if (priorityA !== priorityB) return priorityA - priorityB;
      
      // Within same priority: action items (1-6) show oldest first, others show newest first
      if (priorityA <= 6) {
        return getWaitDate(a).getTime() - getWaitDate(b).getTime();
      } else {
        return getWaitDate(b).getTime() - getWaitDate(a).getTime();
      }
    });
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
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Manage PD Pipeline</h1>
            <p className="text-muted-foreground">Review and approve position descriptions</p>
          </div>
          <Button onClick={() => navigate('/requisitions/initial/new')}>
            Create Initial Request
          </Button>
        </div>

        <Tabs defaultValue={(isHiringManager || isDirector) && !isAdmin && !isHR ? "my-division-initial" : "all"} className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Position Descriptions</TabsTrigger>
            {(isHiringManager || isDirector) && userDivision && (
              <TabsTrigger value="my-division-initial">
                My Division - Initial Review
                <Badge variant="secondary" className="ml-2">
                  {filterRequisitions('my-division-initial').length}
                </Badge>
              </TabsTrigger>
            )}
            <TabsTrigger value="initial-requests">
              Initial Requests
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('initial-requests').length}
              </Badge>
            </TabsTrigger>
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
            <TabsTrigger value="hr-final-review">
              Final HR Review
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('hr-final-review').length}
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

          {(['all', 'my-division-initial', 'initial-requests', 'pending-hr', 'chief-hr-review', 'hr-ready', 'hr-final-review', 'amendments', 'manager-confirmation', 'in-progress', 'completed'] as const).map(tabValue => (
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
                            <div className="flex items-center gap-2 flex-wrap">
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
                              <CumulativeKPIBadge requisition={requisition} />
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
              {requisition.hiring_manager_name && (
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" />
                  {requisition.hiring_manager_name}
                </span>
              )}
              {requisition.internal_only && (
                <Badge variant="default" className="ml-2">Internal Only</Badge>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(requisition.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
                            </CardDescription>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {/* View Request button - for viewing initial request form */}
                            {(requisition.funding_status || requisition.brief_outline) && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate(`/requisitions/initial/${(requisition as any).slug || requisition.id}?view=true`)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View Request
                              </Button>
                            )}

                            {/* Continue PD Button for Drafts and PD Drafts */}
                            {(requisition.status === 'initial_request_draft' || requisition.status === 'draft' || requisition.status === 'pd_draft') && (
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  if (requisition.status === 'initial_request_draft') {
                                    navigate(`/requisitions/initial/${(requisition as any).slug || requisition.id}`);
                                  } else {
                                    navigate(`/requisitions/${(requisition as any).slug || requisition.id}/edit`);
                                  }
                                }}
                              >
                                <Edit2 className="h-4 w-4 mr-1" />
                                Continue PD
                              </Button>
                            )}

                            {/* Send PD Reminder for Approved Initial Requests */}
                            {requisition.status === 'initial_request_approved' && requisition.initial_request_approved && (isAdmin || isHR) && (
                              <>
                                {remindersSent.has(requisition.id) && (
                                  <Badge variant="secondary" className="flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    Reminder Sent
                                  </Badge>
                                )}
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSendReminder(requisition.id)}
                                  disabled={sendingReminder === requisition.id}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Mail className="h-4 w-4 mr-1" />
                                  {sendingReminder === requisition.id ? 'Sending...' : 'Send PD Reminder'}
                                </Button>
                              </>
                            )}
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/requisitions/${(requisition as any).slug || requisition.id}`)}
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
                                  onClick={() => navigate(`/requisitions/${(requisition as any).slug || requisition.id}/hr-edit`)}
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
                                  onClick={() => navigate(`/requisitions/${(requisition as any).slug || requisition.id}`)}
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  View Details
                                </Button>
                                <ChiefHRReviewDialog 
                                  requisitionId={requisition.id}
                                  requisitionSlug={(requisition as any).slug}
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

                            {/* Final HR Review - After Manager confirms */}
                            {requisition.status === 'hr_review' && requisition.hr_internal_status === 'pending_final_review' && (isAdmin || isHR) && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigate(`/requisitions/${(requisition as any).slug || requisition.id}/hr-final-edit`)}
                                  className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                >
                                  <Edit2 className="h-4 w-4 mr-1" />
                                  Final Review
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleSendToChief(requisition.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Send to Chief for Approval
                                </Button>
                              </>
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
                                  <>
                                    {/* Show reminder button and badge only when Chief HR has reviewed */}
                                    {requisition.chief_hr_reviewed && (
                                      <>
                                        {hmReviewRemindersSent.has(requisition.id) && (
                                          <Badge variant="secondary" className="flex items-center gap-1">
                                            <Mail className="h-3 w-3" />
                                            Reminder Sent
                                          </Badge>
                                        )}
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleSendHMReviewReminder(requisition.id)}
                                          disabled={sendingHMReviewReminder === requisition.id}
                                          className="text-blue-600 border-blue-600 hover:bg-blue-50"
                                        >
                                          <Mail className="h-4 w-4 mr-1" />
                                          {sendingHMReviewReminder === requisition.id ? 'Sending...' : 'Send Review Reminder'}
                                        </Button>
                                      </>
                                    )}
                                    <Badge variant="secondary" className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Waiting for Manager Confirmation
                                    </Badge>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm font-medium mb-2">Workflow Status</div>
                            <RequisitionWorkflowTimeline requisition={requisition} compact />
                          </div>
                          
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
                                {requisition.hr_reviewed_at && format(new Date(requisition.hr_reviewed_at), 'dd MMM yyyy')}
                              </span>
                            </div>
                          )}

                          {requisition.chief_hr_reviewed && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Chief HR Reviewed:</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                {requisition.chief_hr_reviewed_at && format(new Date(requisition.chief_hr_reviewed_at), 'dd MMM yyyy')}
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
                                    {requisition.hiring_manager_confirmed_at && format(new Date(requisition.hiring_manager_confirmed_at), 'dd MMM yyyy')}
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
                                {requisition.hiring_manager_confirmed_at && format(new Date(requisition.hiring_manager_confirmed_at), 'dd MMM yyyy')}
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