import { CheckCircle2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PerformanceWorkflowTimelineProps {
  workplan: any;
  staffName?: string;
  supervisor1Name?: string;
  supervisor2Name?: string;
}

interface SubStep {
  id: string;
  label: string;
  isCompleted: boolean;
  isCurrent?: boolean;
}

interface Phase {
  id: string;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  subSteps: SubStep[];
}

export const PerformanceWorkflowTimeline = ({ 
  workplan, 
  staffName = 'Staff Member',
  supervisor1Name = '1st Level Supervisor',
  supervisor2Name = '2nd Level Supervisor'
}: PerformanceWorkflowTimelineProps) => {
  
  const currentPhase = workplan?.current_phase || 'begin_year';
  
  // Determine current step based on workplan data
  // Order: Initiate (begin only) → Complete Sections → Discussion → Staff Signature → Supervisor1 Signature
  // End-year has additional: Staff Acknowledgment → Supervisor2 Signature → Staff Final Signature
  const getCurrentStepInfo = () => {
    if (currentPhase === 'begin_year') {
      if (!workplan?.begin_year_submitted_at) return { phase: 'begin_year', step: 'complete_sections' };
      if (!workplan?.begin_year_discussion_at) return { phase: 'begin_year', step: 'discussion' };
      if (!workplan?.begin_year_staff_signed_at) return { phase: 'begin_year', step: 'staff_signature' };
      if (!workplan?.begin_year_supervisor1_signed_at) return { phase: 'begin_year', step: 'supervisor1_signature' };
      return { phase: 'mid_year', step: 'complete_sections' };
    }
    if (currentPhase === 'mid_year') {
      if (!workplan?.mid_year_submitted_at) return { phase: 'mid_year', step: 'complete_sections' };
      if (!workplan?.mid_year_discussion_at) return { phase: 'mid_year', step: 'discussion' };
      if (!workplan?.mid_year_staff_signed_at) return { phase: 'mid_year', step: 'staff_signature' };
      if (!workplan?.mid_year_supervisor1_signed_at) return { phase: 'mid_year', step: 'supervisor1_signature' };
      return { phase: 'end_year', step: 'complete_sections' };
    }
    if (currentPhase === 'end_year') {
      if (!workplan?.end_year_submitted_at) return { phase: 'end_year', step: 'complete_sections' };
      if (!workplan?.end_year_discussion_at) return { phase: 'end_year', step: 'discussion' };
      if (!workplan?.end_year_staff_signed_at) return { phase: 'end_year', step: 'staff_signature' };
      if (!workplan?.end_year_supervisor1_signed_at) return { phase: 'end_year', step: 'supervisor1_signature' };
      if (!workplan?.end_year_staff_acknowledgment_at) return { phase: 'end_year', step: 'staff_acknowledgment' };
      if (!workplan?.end_year_supervisor2_signed_at) return { phase: 'end_year', step: 'supervisor2_signature' };
      if (!workplan?.end_year_staff_final_signed_at) return { phase: 'end_year', step: 'staff_final_signature' };
      return { phase: 'completed', step: 'finish' };
    }
    return { phase: 'completed', step: 'finish' };
  };

  const currentStepInfo = getCurrentStepInfo();

  const isStepCompleted = (phase: string, stepId: string): boolean => {
    const phases = ['begin_year', 'mid_year', 'end_year', 'completed'];
    const currentPhaseIndex = phases.indexOf(currentPhase);
    const stepPhaseIndex = phases.indexOf(phase);
    
    // If phase is before current, all steps are completed
    if (stepPhaseIndex < currentPhaseIndex) return true;
    
    // If phase is after current, no steps are completed
    if (stepPhaseIndex > currentPhaseIndex) return false;
    
    // Same phase - check specific fields
    if (phase === 'begin_year') {
      if (stepId === 'initiate') return true; // Always completed once workplan exists
      if (stepId === 'complete_sections') return !!workplan?.begin_year_submitted_at;
      if (stepId === 'discussion') return !!workplan?.begin_year_discussion_at;
      if (stepId === 'staff_signature') return !!workplan?.begin_year_staff_signed_at;
      if (stepId === 'supervisor1_signature') return !!workplan?.begin_year_supervisor1_signed_at;
    }
    if (phase === 'mid_year') {
      if (stepId === 'complete_sections') return !!workplan?.mid_year_submitted_at;
      if (stepId === 'discussion') return !!workplan?.mid_year_discussion_at;
      if (stepId === 'staff_signature') return !!workplan?.mid_year_staff_signed_at;
      if (stepId === 'supervisor1_signature') return !!workplan?.mid_year_supervisor1_signed_at;
    }
    if (phase === 'end_year') {
      if (stepId === 'complete_sections') return !!workplan?.end_year_submitted_at;
      if (stepId === 'discussion') return !!workplan?.end_year_discussion_at;
      if (stepId === 'staff_signature') return !!workplan?.end_year_staff_signed_at;
      if (stepId === 'supervisor1_signature') return !!workplan?.end_year_supervisor1_signed_at;
      if (stepId === 'staff_acknowledgment') return !!workplan?.end_year_staff_acknowledgment_at;
      if (stepId === 'supervisor2_signature') return !!workplan?.end_year_supervisor2_signed_at;
      if (stepId === 'staff_final_signature') return !!workplan?.end_year_staff_final_signed_at;
    }
    return false;
  };

  const isCurrentStep = (phase: string, stepId: string): boolean => {
    return currentStepInfo.phase === phase && currentStepInfo.step === stepId;
  };

  const phases: Phase[] = [
    {
      id: 'begin_year',
      label: 'Begin-Year',
      colorClass: 'text-cyan-700',
      bgClass: 'bg-cyan-500',
      borderClass: 'border-cyan-500',
      subSteps: [
        { id: 'initiate', label: 'Start / Initiate Workplan', isCompleted: isStepCompleted('begin_year', 'initiate') },
        { id: 'complete_sections', label: 'Complete Sections', isCompleted: isStepCompleted('begin_year', 'complete_sections'), isCurrent: isCurrentStep('begin_year', 'complete_sections') },
        { id: 'discussion', label: 'Discussion Completed', isCompleted: isStepCompleted('begin_year', 'discussion'), isCurrent: isCurrentStep('begin_year', 'discussion') },
        { id: 'staff_signature', label: "Staff Member's Signature", isCompleted: isStepCompleted('begin_year', 'staff_signature'), isCurrent: isCurrentStep('begin_year', 'staff_signature') },
        { id: 'supervisor1_signature', label: "1st Level Supervisor's Signature", isCompleted: isStepCompleted('begin_year', 'supervisor1_signature'), isCurrent: isCurrentStep('begin_year', 'supervisor1_signature') },
      ]
    },
    {
      id: 'mid_year',
      label: 'Mid-Year',
      colorClass: 'text-blue-700',
      bgClass: 'bg-blue-500',
      borderClass: 'border-blue-500',
      subSteps: [
        { id: 'complete_sections', label: 'Complete Sections', isCompleted: isStepCompleted('mid_year', 'complete_sections'), isCurrent: isCurrentStep('mid_year', 'complete_sections') },
        { id: 'discussion', label: 'Discussion Completed', isCompleted: isStepCompleted('mid_year', 'discussion'), isCurrent: isCurrentStep('mid_year', 'discussion') },
        { id: 'staff_signature', label: "Staff Member's Signature", isCompleted: isStepCompleted('mid_year', 'staff_signature'), isCurrent: isCurrentStep('mid_year', 'staff_signature') },
        { id: 'supervisor1_signature', label: "1st Level Supervisor's Signature", isCompleted: isStepCompleted('mid_year', 'supervisor1_signature'), isCurrent: isCurrentStep('mid_year', 'supervisor1_signature') },
      ]
    },
    {
      id: 'end_year',
      label: 'End-Year',
      colorClass: 'text-purple-700',
      bgClass: 'bg-purple-500',
      borderClass: 'border-purple-500',
      subSteps: [
        { id: 'complete_sections', label: 'Complete Sections', isCompleted: isStepCompleted('end_year', 'complete_sections'), isCurrent: isCurrentStep('end_year', 'complete_sections') },
        { id: 'discussion', label: 'Discussion Completed', isCompleted: isStepCompleted('end_year', 'discussion'), isCurrent: isCurrentStep('end_year', 'discussion') },
        { id: 'staff_signature', label: "Staff Member's Signature", isCompleted: isStepCompleted('end_year', 'staff_signature'), isCurrent: isCurrentStep('end_year', 'staff_signature') },
        { id: 'supervisor1_signature', label: "1st Level Supervisor's Signature", isCompleted: isStepCompleted('end_year', 'supervisor1_signature'), isCurrent: isCurrentStep('end_year', 'supervisor1_signature') },
        { id: 'staff_acknowledgment', label: "Staff Member's Acknowledgment", isCompleted: isStepCompleted('end_year', 'staff_acknowledgment'), isCurrent: isCurrentStep('end_year', 'staff_acknowledgment') },
        { id: 'supervisor2_signature', label: "2nd Level Supervisor's Signature", isCompleted: isStepCompleted('end_year', 'supervisor2_signature'), isCurrent: isCurrentStep('end_year', 'supervisor2_signature') },
        { id: 'staff_final_signature', label: "Staff Member's Final Signature", isCompleted: isStepCompleted('end_year', 'staff_final_signature'), isCurrent: isCurrentStep('end_year', 'staff_final_signature') },
      ]
    }
  ];

  return (
    <div className="bg-card border rounded-lg overflow-hidden">
      {/* Header with supervisor info */}
      <div className="bg-muted/50 p-4 border-b">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border rounded-md p-3 bg-background">
              <p className="text-xs text-muted-foreground mb-1">Name of Staff Member</p>
              <p className="font-medium text-sm truncate">{staffName}</p>
            </div>
            <div className="border rounded-md p-3 bg-background">
              <p className="text-xs text-muted-foreground mb-1">1st Level Supervisor</p>
              <p className="font-medium text-sm truncate">{supervisor1Name}</p>
            </div>
            <div className="border rounded-md p-3 bg-background">
              <p className="text-xs text-muted-foreground mb-1">2nd Level Supervisor</p>
              <p className="font-medium text-sm truncate">{supervisor2Name}</p>
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Performance Workplan</p>
              <p className="text-sm font-mono text-primary">{workplan?.id?.slice(0, 8).toUpperCase() || 'DRAFT'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-6">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-2 justify-between">
          {phases.map((phase, phaseIndex) => (
            <div key={phase.id} className="flex-1 relative">
              {/* Phase Header Tab */}
              <div 
                className={cn(
                  "relative py-2 px-4 text-center font-semibold text-white text-sm mb-3",
                  phase.bgClass
                )}
                style={{
                  clipPath: 'polygon(0 0, 95% 0, 100% 50%, 95% 100%, 0 100%, 5% 50%)',
                }}
              >
                {phase.label}
              </div>

              {/* Sub-steps */}
              <div className="space-y-2">
                {phase.subSteps.map((step, stepIndex) => (
                  <div 
                    key={step.id}
                    className={cn(
                      "relative flex items-center gap-2 p-2 rounded-md text-xs transition-all",
                      step.isCompleted && "bg-green-50 dark:bg-green-950/30",
                      step.isCurrent && "bg-primary/10 ring-2 ring-primary",
                      !step.isCompleted && !step.isCurrent && "bg-muted/50"
                    )}
                  >
                    {/* Checkmark or Circle */}
                    <div className={cn(
                      "flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center",
                      step.isCompleted && "bg-green-500 text-white",
                      step.isCurrent && "bg-primary text-primary-foreground",
                      !step.isCompleted && !step.isCurrent && "bg-muted-foreground/20"
                    )}>
                      {step.isCompleted ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : step.isCurrent ? (
                        <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                      ) : (
                        <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                      )}
                    </div>
                    
                    {/* Label */}
                    <span className={cn(
                      "flex-1",
                      step.isCompleted && "text-green-700 dark:text-green-400",
                      step.isCurrent && "text-primary font-medium",
                      !step.isCompleted && !step.isCurrent && "text-muted-foreground"
                    )}>
                      {step.label}
                    </span>

                    {/* Current indicator */}
                    {step.isCurrent && (
                      <div className="flex items-center gap-1 text-primary">
                        <ArrowRight className="h-3 w-3 animate-pulse" />
                        <span className="text-[10px] font-medium whitespace-nowrap">You are here</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Connector arrow between phases */}
              {phaseIndex < phases.length - 1 && (
                <div className="hidden lg:flex absolute top-8 -right-3 z-10">
                  <div className="w-6 h-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Progress dots */}
        <div className="hidden lg:flex items-center justify-center mt-6 gap-2">
          {phases.map((phase, index) => {
            const phaseOrder = ['begin_year', 'mid_year', 'end_year'];
            const currentIndex = phaseOrder.indexOf(currentPhase);
            const phaseIndex = phaseOrder.indexOf(phase.id);
            const isCompleted = phaseIndex < currentIndex;
            const isCurrent = phaseIndex === currentIndex;
            
            return (
              <div key={phase.id} className="flex items-center gap-2">
                <div className={cn(
                  "w-3 h-3 rounded-full transition-all",
                  isCompleted && phase.bgClass,
                  isCurrent && "ring-2 ring-offset-2 ring-primary " + phase.bgClass,
                  !isCompleted && !isCurrent && "bg-muted"
                )} />
                {index < phases.length - 1 && (
                  <div className={cn(
                    "w-16 h-0.5",
                    phaseIndex < currentIndex ? phase.bgClass : "bg-muted"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Improvement Plan section */}
      <div className="px-6 pb-4">
        <div className="bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-md p-3">
          <p className="text-xs text-amber-800 dark:text-amber-400 font-medium">
            Performance Improvement Plan (PIP)
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
            A PIP may be established at any time during the performance evaluation cycle where the 
            informal process to address performance issues has not been successful. A PIP is required 
            for non-probationary fixed-term and continuing appointments; it is optional for probationary 
            fixed-term and temporary appointments.{' '}
            <a 
              href="mailto:hr@unicc.org?subject=PIP%20Request" 
              className="underline hover:text-amber-900 dark:hover:text-amber-300 font-medium"
            >
              Please speak to HR
            </a>{' '}
            about opening a PIP for a staff member.
          </p>
        </div>
      </div>

      {/* Notes section */}
      <div className="bg-muted/30 p-4 border-t text-xs text-muted-foreground space-y-2">
        <p><strong>Note:</strong> Performance Management is a shared responsibility between the staff member and supervisor(s).</p>
        <p>The performance cycle consists of three formal phases: Begin-Year (goal setting), Mid-Year (progress review), and End-Year (final evaluation).</p>
        <p>All signatures indicate acknowledgment of the documented discussion.</p>
      </div>
    </div>
  );
};
