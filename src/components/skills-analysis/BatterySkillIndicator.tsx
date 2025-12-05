import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface BatterySkillIndicatorProps {
  selfAssessment: number | null;
  requiredLevel: number | null;
  managerAssessment?: number | null;
  status?: string;
  onClick?: () => void;
  compact?: boolean;
}

export default function BatterySkillIndicator({
  selfAssessment,
  requiredLevel,
  managerAssessment,
  status,
  onClick,
  compact = false,
}: BatterySkillIndicatorProps) {
  const currentLevel = managerAssessment ?? selfAssessment ?? 0;
  const required = requiredLevel ?? 0;
  const gap = required - currentLevel;

  // Determine color based on gap
  const getSegmentColor = (segmentLevel: number) => {
    if (segmentLevel > currentLevel) {
      // Not filled - gray
      return "bg-muted";
    }
    
    if (required === 0) {
      // No requirement set - neutral blue
      return "bg-primary/60";
    }
    
    if (currentLevel >= required) {
      // Meeting or exceeding - green
      return "bg-emerald-500";
    }
    
    if (gap === 1) {
      // 1 level gap - amber
      return "bg-amber-500";
    }
    
    // 2+ level gap - red
    return "bg-destructive";
  };

  const getStatusText = () => {
    if (!requiredLevel) return "No requirement set";
    if (currentLevel === 0) return "Not assessed";
    if (currentLevel >= requiredLevel) return "Meeting requirement";
    if (gap === 1) return "1 level gap";
    return `${gap} level gap`;
  };

  const isPending = status === 'pending_approval';
  const isEmpty = !selfAssessment && !requiredLevel;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex flex-col items-center gap-1 p-1 rounded-md transition-colors",
              onClick && "hover:bg-muted/50 cursor-pointer",
              !onClick && "cursor-default"
            )}
          >
            {/* Battery container */}
            <div className="relative flex gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={cn(
                    "relative rounded-sm border border-border/50",
                    compact ? "w-4 h-5" : "w-5 h-6",
                    level <= currentLevel ? getSegmentColor(level) : "bg-muted/30"
                  )}
                >
                  {/* Required level marker */}
                  {required === level && required > 0 && (
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent border-b-primary" />
                    </div>
                  )}
                </div>
              ))}
              
              {/* Battery cap */}
              <div className={cn(
                "rounded-r-sm bg-border/50",
                compact ? "w-1 h-2 mt-1.5" : "w-1.5 h-2.5 mt-1.5"
              )} />
            </div>

            {/* Pending indicator */}
            {isPending && (
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}

            {/* Empty state indicator */}
            {isEmpty && (
              <span className="text-[10px] text-muted-foreground">Click to set</span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-48">
          <div className="space-y-1 text-xs">
            <p className="font-medium">{getStatusText()}</p>
            {selfAssessment && (
              <p>Self: Level {selfAssessment}</p>
            )}
            {managerAssessment && (
              <p>Manager: Level {managerAssessment}</p>
            )}
            {requiredLevel && (
              <p>Required: Level {requiredLevel}</p>
            )}
            {isPending && (
              <p className="text-amber-600">Pending approval</p>
            )}
            {onClick && (
              <p className="text-muted-foreground mt-1">Click to edit</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
