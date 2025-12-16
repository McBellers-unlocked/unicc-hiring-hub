import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkplanPhaseIndicatorProps {
  currentPhase: string;
  workplan: any;
}

export const WorkplanPhaseIndicator = ({ currentPhase, workplan }: WorkplanPhaseIndicatorProps) => {
  const phases = [
    { 
      id: 'begin_year', 
      label: 'Begin Year',
      description: 'Set objectives & competencies',
      staffSigned: workplan?.begin_year_staff_signed_at,
      supervisorSigned: workplan?.begin_year_supervisor1_signed_at
    },
    { 
      id: 'mid_year', 
      label: 'Mid Year',
      description: 'Review progress',
      staffSigned: workplan?.mid_year_staff_signed_at,
      supervisorSigned: workplan?.mid_year_supervisor1_signed_at
    },
    { 
      id: 'end_year', 
      label: 'End Year',
      description: 'Final evaluation',
      staffSigned: workplan?.end_year_staff_signed_at,
      supervisorSigned: workplan?.end_year_supervisor1_signed_at
    },
    { 
      id: 'completed', 
      label: 'Completed',
      description: 'Cycle finished',
      staffSigned: null,
      supervisorSigned: null
    }
  ];

  const getPhaseStatus = (phaseId: string) => {
    const phaseOrder = ['begin_year', 'mid_year', 'end_year', 'completed'];
    const currentIndex = phaseOrder.indexOf(currentPhase);
    const phaseIndex = phaseOrder.indexOf(phaseId);

    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className="bg-card border rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4">Performance Cycle Progress</h3>
      
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-500"
          style={{ 
            width: `${(phases.findIndex(p => p.id === currentPhase) / (phases.length - 1)) * 100}%` 
          }}
        />

        {/* Phase Indicators */}
        <div className="relative flex justify-between">
          {phases.map((phase) => {
            const status = getPhaseStatus(phase.id);
            
            return (
              <div key={phase.id} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center z-10 transition-all",
                    status === 'completed' && "bg-primary text-primary-foreground",
                    status === 'current' && "bg-primary/20 border-2 border-primary text-primary",
                    status === 'pending' && "bg-muted text-muted-foreground"
                  )}
                >
                  {status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : status === 'current' ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                
                <div className="mt-3 text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    status === 'current' && "text-primary",
                    status === 'pending' && "text-muted-foreground"
                  )}>
                    {phase.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {phase.description}
                  </p>
                  
                  {/* Signature Status */}
                  {status !== 'pending' && phase.id !== 'completed' && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center justify-center gap-1 text-xs">
                        {phase.staffSigned ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Staff
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Staff pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-xs">
                        {phase.supervisorSigned ? (
                          <span className="text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" /> Supervisor
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Supervisor pending</span>
                        )}
                      </div>
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
};
