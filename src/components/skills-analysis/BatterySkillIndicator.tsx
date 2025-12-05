import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface BatterySkillIndicatorProps {
  selfAssessment: number | null;
  requiredLevel: number | null;
  managerAssessment?: number | null;
  status?: string;
  onClick?: () => void;
  onSegmentClick?: (level: number) => void;
  compact?: boolean;
  editable?: boolean;
}

export default function BatterySkillIndicator({
  selfAssessment,
  requiredLevel,
  managerAssessment,
  status,
  onClick,
  onSegmentClick,
  compact = false,
  editable = false,
}: BatterySkillIndicatorProps) {
  const [hoverLevel, setHoverLevel] = useState<number | null>(null);
  
  const currentLevel = managerAssessment ?? selfAssessment ?? 0;
  const required = requiredLevel ?? 0;
  const gap = required - currentLevel;
  const exceeding = currentLevel - required;

  // 5-color spectrum: Red → Yellow → Green → Blue → Purple
  const getSegmentColor = (segmentLevel: number) => {
    if (segmentLevel > currentLevel) {
      return "bg-muted";
    }
    
    if (required === 0) {
      return "bg-primary/60";
    }
    
    // Excellence: +2 or more → Purple
    if (exceeding >= 2) {
      return "bg-purple-500";
    }
    
    // Exceeding: +1 → UNICC Blue
    if (exceeding === 1) {
      return "bg-primary";
    }
    
    // Meeting requirement exactly → Green
    if (currentLevel === required) {
      return "bg-emerald-500";
    }
    
    // Minor gap: -1 → Yellow/Amber
    if (gap === 1) {
      return "bg-amber-500";
    }
    
    // Significant gap: -2 or worse → Red
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (!requiredLevel) return "No requirement set";
    if (currentLevel === 0) return "Not assessed";
    if (exceeding >= 2) return "Excelling";
    if (exceeding === 1) return "Exceeding requirement";
    if (currentLevel === requiredLevel) return "Meeting requirement";
    if (gap === 1) return "1 level gap";
    return `${gap} level gap`;
  };

  // Get gap badge info - 5-color spectrum
  const getGapBadge = () => {
    if (required === 0 || currentLevel === 0) return null;
    
    if (exceeding >= 2) {
      return { text: `+${exceeding}`, className: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
    }
    if (exceeding === 1) {
      return { text: `+${exceeding}`, className: "bg-primary/20 text-primary" };
    }
    if (gap === 0) {
      return { text: "✓", className: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" };
    }
    if (gap === 1) {
      return { text: `-${gap}`, className: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    }
    return { text: `-${gap}`, className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-bold" };
  };

  const isPending = status === 'pending_approval';
  const isEmpty = !selfAssessment && !requiredLevel;
  const gapBadge = getGapBadge();

  const handleSegmentClick = (level: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSegmentClick) {
      onSegmentClick(level);
    }
  };

  // Determine which level to show the arrow for (hover preview or actual)
  const displayRequired = hoverLevel ?? required;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "flex flex-col items-center gap-1 p-1 rounded-md transition-colors",
              onClick && !editable && "hover:bg-muted/50 cursor-pointer",
              !onClick && !editable && "cursor-default",
              editable && "cursor-default"
            )}
          >
            {/* Battery container */}
            <div className="relative flex gap-0.5">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  onClick={(e) => editable && handleSegmentClick(level, e)}
                  onMouseEnter={() => editable && setHoverLevel(level)}
                  onMouseLeave={() => setHoverLevel(null)}
                  className={cn(
                    "relative rounded-sm border border-border/50 transition-all duration-150",
                    compact ? "w-4 h-5" : "w-5 h-6",
                    level <= currentLevel ? getSegmentColor(level) : "bg-muted/30",
                    editable && "cursor-pointer hover:ring-2 hover:ring-primary/50 hover:scale-110"
                  )}
                >
                  {/* Required level marker - show at hover position or actual position */}
                  {displayRequired === level && displayRequired > 0 && (
                    <div 
                      className={cn(
                        "absolute -bottom-2.5 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all duration-150",
                        hoverLevel && "opacity-70"
                      )}
                    >
                      <div className={cn(
                        "w-0 h-0 border-l-[4px] border-r-[4px] border-b-[4px] border-l-transparent border-r-transparent",
                        hoverLevel ? "border-b-primary/50" : "border-b-primary"
                      )} />
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

            {/* Gap badge - always visible when applicable */}
            {gapBadge && !editable && (
              <span className={cn(
                "text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none",
                gapBadge.className
              )}>
                {gapBadge.text}
              </span>
            )}

            {/* Pending indicator */}
            {isPending && (
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}

            {/* Empty state indicator */}
            {isEmpty && !editable && (
              <span className="text-[10px] text-muted-foreground">Click to set</span>
            )}
            
            {/* Editable hint */}
            {editable && isEmpty && (
              <span className="text-[10px] text-muted-foreground">Click segment</span>
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
            {requiredLevel && exceeding >= 2 && (
              <p className="text-purple-600 font-medium">+{exceeding} above required (Excelling!)</p>
            )}
            {requiredLevel && exceeding === 1 && (
              <p className="text-primary">+{exceeding} above required</p>
            )}
            {isPending && (
              <p className="text-amber-600">Pending approval</p>
            )}
            {editable && (
              <p className="text-muted-foreground mt-1">Click a segment to set required level</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
