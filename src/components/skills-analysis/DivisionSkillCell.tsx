import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Users } from "lucide-react";

interface DivisionSkillCellProps {
  staffWithSkill: number;
  totalStaffInDivision: number;
  averageLevel: number | null;
  credentialCount?: number;
  isCredential?: boolean;
  onClick?: () => void;
}

const LEVEL_COLORS = [
  "bg-muted",           // 0 or null - not assessed
  "bg-red-500",         // 1 - Beginner
  "bg-orange-500",      // 2 - Elementary  
  "bg-yellow-500",      // 3 - Intermediate
  "bg-lime-500",        // 4 - Advanced
  "bg-green-500",       // 5 - Expert
];

export default function DivisionSkillCell({
  staffWithSkill,
  totalStaffInDivision,
  averageLevel,
  credentialCount = 0,
  isCredential = false,
  onClick,
}: DivisionSkillCellProps) {
  const coveragePercent = totalStaffInDivision > 0 
    ? (staffWithSkill / totalStaffInDivision) * 100 
    : 0;

  const getCoverageColor = () => {
    if (coveragePercent >= 50) return "bg-green-100 dark:bg-green-900/30";
    if (coveragePercent >= 25) return "bg-amber-100 dark:bg-amber-900/30";
    if (coveragePercent > 0) return "bg-red-100 dark:bg-red-900/30";
    return "bg-muted/50";
  };

  const getLevelColorIndex = () => {
    if (averageLevel === null || averageLevel === 0) return 0;
    return Math.round(averageLevel);
  };

  if (staffWithSkill === 0) {
    return (
      <div 
        className={cn(
          "h-10 flex items-center justify-center rounded text-xs text-muted-foreground",
          getCoverageColor(),
          onClick && "cursor-pointer hover:opacity-80"
        )}
        onClick={onClick}
      >
        —
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "h-10 flex items-center justify-center gap-1 rounded px-2",
              getCoverageColor(),
              onClick && "cursor-pointer hover:opacity-80 transition-opacity"
            )}
            onClick={onClick}
          >
            {isCredential ? (
              <div className="flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">
                  {credentialCount}/{totalStaffInDivision}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <div 
                  className={cn(
                    "w-3 h-3 rounded-full",
                    LEVEL_COLORS[getLevelColorIndex()]
                  )}
                />
                <span className="text-xs font-medium">
                  {staffWithSkill}
                </span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              <span>{staffWithSkill} of {totalStaffInDivision} staff ({coveragePercent.toFixed(0)}%)</span>
            </div>
            {isCredential ? (
              <div>{credentialCount} have credential</div>
            ) : (
              averageLevel !== null && (
                <div>Avg level: {averageLevel.toFixed(1)}/5</div>
              )
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
