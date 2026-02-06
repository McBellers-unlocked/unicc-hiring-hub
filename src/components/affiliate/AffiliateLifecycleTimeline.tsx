import { LIFECYCLE_STAGES, ChecklistItem, getStageStatus, getStageColorClass, StageStatus } from '@/lib/affiliateLifecycleConfig';
import { cn } from '@/lib/utils';
import { Check, AlertTriangle, Clock } from 'lucide-react';

interface AffiliateLifecycleTimelineProps {
  daysToOnboard: number;
  checklist: ChecklistItem[];
  activeStage?: string;
  onStageClick?: (stageKey: string) => void;
}

export function AffiliateLifecycleTimeline({
  daysToOnboard,
  checklist,
  activeStage,
  onStageClick,
}: AffiliateLifecycleTimelineProps) {
  const getStageIcon = (status: StageStatus) => {
    switch (status) {
      case 'complete':
        return <Check className="h-4 w-4 text-white" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-white" />;
      case 'pending':
      default:
        return <Clock className="h-4 w-4 text-white" />;
    }
  };

  return (
    <div className="w-full py-6">
      {/* Timeline container */}
      <div className="relative flex items-center justify-between">
        {/* Connecting line */}
        <div className="absolute left-0 right-0 top-1/2 h-1 bg-muted -translate-y-1/2 z-0" />
        
        {LIFECYCLE_STAGES.map((stage, index) => {
          const status = getStageStatus(stage.key, daysToOnboard, checklist);
          const isActive = activeStage === stage.key;
          
          return (
            <div
              key={stage.key}
              className="relative z-10 flex flex-col items-center cursor-pointer group"
              onClick={() => onStageClick?.(stage.key)}
            >
              {/* Day marker label */}
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Day {stage.dayMarker}
              </div>
              
              {/* Circle indicator */}
              <div
                className={cn(
                  'w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all',
                  getStageColorClass(status),
                  isActive && 'ring-4 ring-primary/30 scale-110',
                  'group-hover:scale-105'
                )}
              >
                {getStageIcon(status)}
              </div>
              
              {/* Stage label */}
              <div className={cn(
                'text-xs text-center mt-2 max-w-24 leading-tight',
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground'
              )}>
                {stage.label}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Current position indicator */}
      <div className="mt-6 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted rounded-full">
          <Clock className="h-4 w-4" />
          <span className="text-sm font-medium">
            {daysToOnboard > 0 
              ? `${daysToOnboard} days to onboard date`
              : daysToOnboard === 0 
                ? 'Onboard date is today!'
                : `${Math.abs(daysToOnboard)} days past onboard date`
            }
          </span>
        </div>
      </div>
    </div>
  );
}
