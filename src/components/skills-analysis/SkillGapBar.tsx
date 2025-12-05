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
  const exceeding = requiredLevel && effectiveAssessment ? effectiveAssessment - requiredLevel : null;
  
  // 5-color spectrum: Red → Yellow → Green → Blue → Purple
  const getGapColor = () => {
    if (!gap || !exceeding) return "bg-muted";
    
    // Excellence: +2 or more → Purple
    if (exceeding >= 2) return "bg-purple-500";
    
    // Exceeding: +1 → UNICC Blue
    if (exceeding === 1) return "bg-primary";
    
    // Meeting requirement exactly → Green
    if (gap === 0) return "bg-emerald-500";
    
    // Minor gap: -1 → Yellow/Amber
    if (gap === 1) return "bg-amber-500";
    
    // Significant gap: -2 or worse → Red
    return "bg-red-500";
  };

  const getGapStatus = () => {
    if (!requiredLevel) return { text: "No requirement", color: "text-muted-foreground" };
    if (!effectiveAssessment) return { text: "Not assessed", color: "text-muted-foreground" };
    if (exceeding && exceeding >= 2) return { text: `Excelling (+${exceeding})`, color: "text-purple-600" };
    if (exceeding && exceeding === 1) return { text: `+${exceeding}`, color: "text-primary" };
    if (gap === 0) return { text: "Meeting ✓", color: "text-emerald-600" };
    if (gap === 1) return { text: `Gap: -${gap}`, color: "text-amber-600" };
    return { text: `Gap: -${gap}`, color: "text-red-600" };
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
                <span className={cn("font-medium", status.color)}>{status.text}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm space-y-1">
            <p>Self Assessment: <strong>{selfAssessment ?? 'Not set'}</strong></p>
            {managerAssessment && <p>Manager Override: <strong>{managerAssessment}</strong></p>}
            <p>Required Level: <strong>{requiredLevel ?? 'Not set'}</strong></p>
            {exceeding !== null && exceeding >= 2 && (
              <p className="text-purple-600 font-medium">
                Excelling: <strong>+{exceeding}</strong> above required
              </p>
            )}
            {exceeding !== null && exceeding === 1 && (
              <p className="text-primary">
                Exceeding: <strong>+{exceeding}</strong>
              </p>
            )}
            {gap !== null && gap > 0 && (
              <p className={gap >= 2 ? "text-red-600" : "text-amber-500"}>
                Gap: <strong>-{gap}</strong>
              </p>
            )}
            {gap === 0 && requiredLevel && (
              <p className="text-emerald-500">Meeting requirement ✓</p>
            )}
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
  
  // Excellence: +2 or more above required
  const excelling = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return effective && a.required_level && (effective - a.required_level) >= 2;
  });
  
  // Meeting or slightly above (+1 or exactly meeting)
  const meeting = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    const exceeding = effective && a.required_level ? effective - a.required_level : null;
    return exceeding !== null && exceeding >= 0 && exceeding < 2;
  });
  
  // Gaps
  const gaps = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return effective && a.required_level && effective < a.required_level;
  });
  
  const totalGap = gaps.reduce((sum, a) => {
    const effective = a.manager_assessment ?? a.self_assessment;
    return sum + (a.required_level! - (effective || 0));
  }, 0);

  // Exceeding by exactly 1
  const exceeding = withRequirements.filter(a => {
    const effective = a.manager_assessment ?? a.self_assessment;
    const diff = effective && a.required_level ? effective - a.required_level : null;
    return diff !== null && diff === 1;
  });

  return (
    <div className="flex items-center gap-4 text-sm flex-wrap">
      {excelling.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span className="font-medium">{excelling.length} excelling</span>
        </div>
      )}
      {exceeding.length > 0 && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>{exceeding.length} exceeding</span>
        </div>
      )}
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-emerald-500" />
        <span>{meeting.length} meeting</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500" />
        <span>{gaps.length} gaps ({totalGap} levels)</span>
      </div>
    </div>
  );
}
