import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SkillGapBarProps {
  selfAssessment: number | null;
  requiredLevel: number | null;
  managerAssessment?: number | null;
  showLabels?: boolean;
  compact?: boolean;
}

export default function SkillGapBar({ 
  selfAssessment, 
  requiredLevel, 
  managerAssessment,
  showLabels = false,
  compact = false
}: SkillGapBarProps) {
  const effectiveAssessment = managerAssessment ?? selfAssessment;
  const gap = requiredLevel && effectiveAssessment ? requiredLevel - effectiveAssessment : null;
  
  const getGapColor = () => {
    if (!gap || gap <= 0) return "bg-emerald-500";
    if (gap === 1) return "bg-amber-500";
    return "bg-destructive";
  };

  const getGapStatus = () => {
    if (!requiredLevel) return { text: "No requirement", color: "text-muted-foreground" };
    if (!effectiveAssessment) return { text: "Not assessed", color: "text-muted-foreground" };
    if (gap && gap > 0) return { text: `Gap: ${gap}`, color: "text-destructive" };
    if (gap === 0) return { text: "Meeting", color: "text-emerald-600" };
    return { text: "Exceeding", color: "text-emerald-600" };
  };

  const status = getGapStatus();
  const barHeight = compact ? "h-2" : "h-3";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("w-full", compact ? "min-w-16" : "min-w-24")}>
            {/* Bar container */}
            <div className={cn("relative w-full bg-muted rounded-full overflow-hidden", barHeight)}>
              {/* Self/Manager assessment fill */}
              {effectiveAssessment && (
                <div 
                  className={cn("absolute left-0 top-0 h-full rounded-full transition-all", getGapColor())}
                  style={{ width: `${(effectiveAssessment / 5) * 100}%` }}
                />
              )}
              
              {/* Required level marker */}
              {requiredLevel && (
                <div 
                  className="absolute top-0 h-full w-0.5 bg-foreground/70"
                  style={{ left: `${(requiredLevel / 5) * 100}%` }}
                />
              )}
            </div>
            
            {/* Labels */}
            {showLabels && (
              <div className="flex justify-between mt-1 text-xs">
                <span className="text-muted-foreground">
                  {effectiveAssessment ? `${effectiveAssessment}/5` : '-'}
                </span>
                <span className={status.color}>{status.text}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p>Self Assessment: <strong>{selfAssessment ?? 'Not set'}</strong></p>
            {managerAssessment && <p>Manager Override: <strong>{managerAssessment}</strong></p>}
            <p>Required Level: <strong>{requiredLevel ?? 'Not set'}</strong></p>
            {gap !== null && <p className={gap > 0 ? "text-destructive" : "text-emerald-500"}>
              Gap: <strong>{gap > 0 ? `+${gap}` : gap}</strong>
            </p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function SkillGapSummary({ 
  assessments 
}: { 
  assessments: Array<{ self_assessment: number | null; required_level: number | null; manager_assessment?: number | null }> 
}) {
  const withRequirements = assessments.filter(a => a.required_level);
  const meeting = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return effective && a.required_level && effective >= a.required_level;
  });
  const gaps = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return effective && a.required_level && effective < a.required_level;
  });
  
  const totalGap = gaps.reduce((sum, a) => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return sum + (a.required_level! - (effective || 0));
  }, 0);

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span>{meeting.length} meeting</span>
      </div>
      <div className="flex items-center gap-1">
        <div className="w-3 h-3 rounded-full bg-destructive" />
        <span>{gaps.length} gaps ({totalGap} levels)</span>
      </div>
    </div>
  );
}
