import { CheckCircle2, Clock, Circle, FileText, User, UserCheck, Users } from "lucide-react";
import { format } from "date-fns";

// KPI targets in days for each stage
const STAGE_KPI_TARGETS: Record<string, number> = {
  'pd_submitted': 7,           // PD creation after init approved
  'hr_review': 14,             // HR review (includes Chief HR review)
  'hiring_manager_review': 5,  // Manager endorsement
  'chief_approval': 7,         // Division chief
  'director_approval': 7       // Director
};

// Calculate KPI variance for a completed stage
const calculateCompletedStageKPI = (
  stageKey: string,
  completedAt: string | null | undefined,
  previousStageCompletedAt: string | null | undefined
): { variance: number; kpiTarget: number } | null => {
  const kpiTarget = STAGE_KPI_TARGETS[stageKey];
  if (!kpiTarget || !completedAt || !previousStageCompletedAt) return null;

  const startDate = new Date(previousStageCompletedAt);
  const endDate = new Date(completedAt);
  const daysInStage = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const variance = kpiTarget - daysInStage; // Positive = completed ahead, Negative = overdue

  return { variance, kpiTarget };
};

// Calculate KPI variance for an active stage
const calculateActiveStageKPI = (
  stageKey: string,
  previousStageCompletedAt: string | null | undefined
): { variance: number; kpiTarget: number } | null => {
  const kpiTarget = STAGE_KPI_TARGETS[stageKey];
  if (!kpiTarget || !previousStageCompletedAt) return null;

  const startDate = new Date(previousStageCompletedAt);
  const now = new Date();
  const daysInStage = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const variance = kpiTarget - daysInStage;

  return { variance, kpiTarget };
};

interface WorkflowStage {
  key: string;
  label: string;
  shortLabel?: string;
  description?: string;
  isCompleted: boolean;
  isActive: boolean;
  completedAt?: string | null;
  completedBy?: string | null;
  previousStageCompletedAt?: string | null;
  icon?: typeof CheckCircle2;
}

interface RequisitionWorkflowTimelineProps {
  requisition: {
    status: string;
    created_at: string;
    initial_request_submitted?: boolean;
    initial_request_approved?: boolean;
    initial_request_approved_at?: string | null;
    pd_submitted_at?: string | null;
    hr_reviewed?: boolean;
    hr_reviewed_at?: string | null;
    hr_final_review_completed?: boolean;
    hr_final_review_at?: string | null;
    hiring_manager_confirmed_hr_changes?: boolean;
    hiring_manager_confirmed_at?: string | null;
    chief_of_division_approval?: boolean;
    chief_of_division_approved_at?: string | null;
    chief_of_division_sent_at?: string | null;
    director_approval?: boolean;
    director_approved_at?: string | null;
    converted_to_job_id?: string | null;
  };
  compact?: boolean;
}

// Get graduated color for active stage based on days remaining and KPI target
const getActiveStageColor = (daysRemaining: number, kpiTarget: number): string => {
  // Calculate thresholds based on stage target
  const highThreshold = Math.ceil(kpiTarget * 0.65);  // ~65% = green
  const midThreshold = Math.ceil(kpiTarget * 0.30);   // ~30% = orange
  
  if (daysRemaining >= highThreshold) return 'text-green-600';  // Plenty of time
  if (daysRemaining >= midThreshold) return 'text-orange-500';  // Getting tight
  if (daysRemaining >= 0) return 'text-red-600';                // Almost out of time
  return 'text-red-800 font-bold';                               // Overdue
};

// Component for displaying KPI badge
const KPIIndicator = ({ 
  stageKey, 
  isCompleted, 
  isActive, 
  completedAt, 
  previousStageCompletedAt 
}: {
  stageKey: string;
  isCompleted: boolean;
  isActive: boolean;
  completedAt?: string | null;
  previousStageCompletedAt?: string | null;
}) => {
  if (!STAGE_KPI_TARGETS[stageKey]) return null;

  if (isCompleted && completedAt && previousStageCompletedAt) {
    const kpi = calculateCompletedStageKPI(stageKey, completedAt, previousStageCompletedAt);
    if (!kpi) return null;
    
    const isOverdue = kpi.variance < 0;
    return (
      <span className={`text-[9px] font-medium ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
        {isOverdue ? `${Math.abs(kpi.variance)}d late` : `+${kpi.variance}d`}
      </span>
    );
  }

  if (isActive && previousStageCompletedAt) {
    const kpi = calculateActiveStageKPI(stageKey, previousStageCompletedAt);
    if (!kpi) return null;
    
    const colorClass = getActiveStageColor(kpi.variance, kpi.kpiTarget);
    return (
      <span className={`text-[9px] font-medium ${colorClass}`}>
        {kpi.variance < 0 ? `-${Math.abs(kpi.variance)}d` : `${kpi.variance}d left`}
      </span>
    );
  }

  return null;
};

export function RequisitionWorkflowTimeline({ requisition, compact = false }: RequisitionWorkflowTimelineProps) {
  const isInitialRequestPhase = requisition.status?.includes('initial_request') || 
    (requisition.initial_request_submitted && !requisition.initial_request_approved);

  const stages: WorkflowStage[] = [
    // Initial Request Phase
    {
      key: 'initial_request_draft',
      label: 'Initial Request Created',
      shortLabel: 'Init Request',
      description: 'Hiring manager creates initial request',
      isCompleted: true,
      isActive: requisition.status === 'initial_request_draft',
      completedAt: requisition.created_at,
      icon: FileText
    },
    {
      key: 'initial_request_submitted',
      label: 'Initial Request Submitted',
      shortLabel: 'Init Submitted',
      description: 'Awaiting Chief of Division review',
      isCompleted: !!requisition.initial_request_submitted,
      isActive: requisition.status === 'initial_request_submitted' || requisition.status === 'initial_request_chief_review',
      completedAt: requisition.initial_request_submitted ? requisition.created_at : null,
      icon: User
    },
    {
      key: 'initial_request_approved',
      label: 'Chief Approved Initial Request',
      shortLabel: 'Init Approved',
      description: 'Initial request approved, ready for full PD',
      isCompleted: !!requisition.initial_request_approved || !!requisition.chief_of_division_approval,
      isActive: false,
      completedAt: requisition.initial_request_approved_at || requisition.chief_of_division_approved_at,
      icon: UserCheck
    },
    // Full PD Phase
    {
      key: 'pd_submitted',
      label: 'Full PD Submitted',
      shortLabel: 'PD Submitted',
      description: 'Position description submitted for HR review',
      isCompleted: !!requisition.pd_submitted_at || ['hr_review', 'hiring_manager_review', 'chief_review', 'director_review', 'published'].includes(requisition.status) || !!requisition.hr_reviewed,
      isActive: !requisition.pd_submitted_at && requisition.status === 'draft' && !!requisition.initial_request_approved,
      completedAt: requisition.pd_submitted_at,
      previousStageCompletedAt: requisition.initial_request_approved_at,
      icon: FileText
    },
    {
      key: 'hr_review',
      label: 'HR Review',
      shortLabel: 'HR Review',
      description: 'HR reviewing and editing PD',
      // Only completed if hr_reviewed AND we've moved past this stage (manager has confirmed)
      isCompleted: !!requisition.hr_reviewed && (
        !!requisition.hiring_manager_confirmed_hr_changes || 
        ['chief_review', 'chief_division_review', 'chief_of_division_review', 'director_review', 'approved', 'published'].includes(requisition.status) ||
        !!requisition.converted_to_job_id
      ),
      isActive: requisition.status === 'hr_review' || 
        (requisition.status === 'hiring_manager_review' && !requisition.hiring_manager_confirmed_hr_changes),
      completedAt: requisition.hr_reviewed_at,
      // Use pd_submitted_at for KPI, fallback to created_at for legacy records already in HR review
      previousStageCompletedAt: requisition.pd_submitted_at || 
        (['hr_review', 'hiring_manager_review', 'chief_review', 'director_review', 'published'].includes(requisition.status) 
          ? requisition.created_at 
          : requisition.initial_request_approved_at),
      icon: Users
    },
    {
      key: 'hiring_manager_review',
      label: 'Manager Confirmation',
      shortLabel: 'Mgr Confirm',
      description: 'Hiring manager reviews HR changes',
      isCompleted: !!requisition.hiring_manager_confirmed_hr_changes,
      isActive: requisition.status === 'hiring_manager_review' && !requisition.hiring_manager_confirmed_hr_changes,
      completedAt: requisition.hiring_manager_confirmed_at,
      previousStageCompletedAt: requisition.hr_reviewed_at,
      icon: UserCheck
    },
    {
      key: 'chief_approval',
      label: 'Chief of Division Approval',
      shortLabel: 'Chief Approved',
      description: 'Chief reviewing final PD for approval',
      // Chief approval for FULL PD is only completed if:
      // 1. Manager has confirmed HR changes (meaning we're past initial request phase)
      // 2. HR has completed final review (meaning clean version was sent to chief)
      // 3. Chief has actually approved it
      isCompleted: (!!requisition.chief_of_division_approval && 
                    !!requisition.hiring_manager_confirmed_hr_changes &&
                    !!requisition.hr_final_review_completed) || 
                   ['director_review', 'approved'].includes(requisition.status) ||
                   !!requisition.converted_to_job_id,
      isActive: (requisition.status === 'chief_of_division_review' || 
                requisition.status === 'chief_division_review') &&
                !!requisition.hr_final_review_completed &&
                !requisition.director_approval,
      completedAt: requisition.chief_of_division_approved_at,
      previousStageCompletedAt: requisition.hiring_manager_confirmed_at,
      icon: UserCheck
    },
    {
      key: 'director_approval',
      label: 'Director Approval',
      shortLabel: 'Director',
      description: 'Director final approval',
      isCompleted: !!requisition.director_approval,
      isActive: requisition.status === 'director_review',
      completedAt: requisition.director_approved_at,
      previousStageCompletedAt: requisition.chief_of_division_approved_at,
      icon: UserCheck
    },
    {
      key: 'published',
      label: 'Published',
      shortLabel: 'Published',
      description: 'Job posting published',
      isCompleted: !!requisition.converted_to_job_id,
      isActive: false,
      completedAt: requisition.converted_to_job_id ? new Date().toISOString() : null,
      icon: CheckCircle2
    }
  ];

  // Filter stages based on phase
  const visibleStages = isInitialRequestPhase 
    ? stages.filter(s => s.key.includes('initial_request'))
    : stages;

  if (compact) {
    return (
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {visibleStages.map((stage, index) => {
          const Icon = stage.icon || Circle;
          return (
            <div key={stage.key} className="flex items-center flex-shrink-0">
              <div className="flex flex-col items-center min-w-[80px]">
                <div 
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                    ${stage.isActive
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse'
                      : stage.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                  title={stage.description}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className={`text-[10px] mt-1 text-center leading-tight ${
                  stage.isCompleted || stage.isActive ? 'font-medium' : 'text-muted-foreground'
                }`}>
                  {stage.shortLabel || stage.label}
                </span>
                <KPIIndicator
                  stageKey={stage.key}
                  isCompleted={stage.isCompleted}
                  isActive={stage.isActive}
                  completedAt={stage.completedAt}
                  previousStageCompletedAt={stage.previousStageCompletedAt}
                />
              </div>
              {index < visibleStages.length - 1 && (
                <div 
                  className={`
                    w-8 h-0.5 transition-all
                    ${stage.isCompleted ? 'bg-green-500' : 'bg-muted-foreground/20'}
                  `} 
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Phase indicator */}
      <div className="flex items-center gap-2 text-sm font-medium">
        {isInitialRequestPhase ? (
          <span className="flex items-center gap-2 text-yellow-600">
            <FileText className="h-4 w-4" />
            Initial Request Phase
          </span>
        ) : (
          <span className="flex items-center gap-2 text-blue-600">
            <FileText className="h-4 w-4" />
            Full Position Description Phase
          </span>
        )}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20" />
        <div className="space-y-6">
          {visibleStages.map((stage) => {
            const Icon = stage.icon || Circle;
            return (
              <div key={stage.key} className="relative flex gap-4 items-start">
                <div 
                  className={`
                    relative z-10 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all flex-shrink-0
                    ${stage.isActive
                      ? 'bg-blue-500 border-blue-500 text-white animate-pulse shadow-lg'
                      : stage.isCompleted 
                        ? 'bg-green-500 border-green-500 text-white shadow-sm' 
                        : 'bg-background border-muted-foreground/30 text-muted-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 pt-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${stage.isCompleted || stage.isActive ? '' : 'text-muted-foreground'}`}>
                      {stage.label}
                    </span>
                    <KPIIndicator
                      stageKey={stage.key}
                      isCompleted={stage.isCompleted}
                      isActive={stage.isActive}
                      completedAt={stage.completedAt}
                      previousStageCompletedAt={stage.previousStageCompletedAt}
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {stage.description}
                  </div>
                  {stage.isCompleted && stage.completedAt && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Completed: {format(new Date(stage.completedAt), 'MMM dd, yyyy HH:mm')}
                    </div>
                  )}
                  {stage.isActive && (
                    <div className="text-xs text-blue-600 font-medium mt-1">
                      Current Stage
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
