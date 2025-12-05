import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface SkillAssessment {
  selfAssessment: number | null;
  managerAssessment: number | null;
  requiredLevel: number | null;
  status: string;
}

interface AssessedSkillBadgeProps {
  skillName: string;
  assessment?: SkillAssessment | null;
}

function getSkillBadgeStyle(assessment?: SkillAssessment | null): {
  className: string;
  label: string;
} {
  // Unassessed or not approved - grey
  if (!assessment || assessment.status !== 'approved') {
    return {
      className: "bg-muted text-muted-foreground border-transparent",
      label: "Not assessed"
    };
  }

  const level = assessment.managerAssessment ?? assessment.selfAssessment;
  const required = assessment.requiredLevel;

  // If we don't have level data, show as grey
  if (level === null || required === null) {
    return {
      className: "bg-muted text-muted-foreground border-transparent",
      label: "Not assessed"
    };
  }

  const gap = level - required;

  // Pastel color scheme based on gap
  if (gap >= 2) {
    return {
      className: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
      label: `Excellence (+${gap})`
    };
  }
  if (gap === 1) {
    return {
      className: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
      label: "Exceeding (+1)"
    };
  }
  if (gap === 0) {
    return {
      className: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
      label: "Meeting requirement"
    };
  }
  if (gap === -1) {
    return {
      className: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
      label: "Minor gap (-1)"
    };
  }
  // gap <= -2
  return {
    className: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
    label: `Gap (${gap})`
  };
}

export function AssessedSkillBadge({ skillName, assessment }: AssessedSkillBadgeProps) {
  const { className, label } = getSkillBadgeStyle(assessment);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge 
          variant="outline" 
          className={cn("text-sm border cursor-default", className)}
        >
          {skillName}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">{label}</p>
        {assessment?.status === 'approved' && assessment.managerAssessment !== null && (
          <p className="text-xs text-muted-foreground">
            Level {assessment.managerAssessment ?? assessment.selfAssessment} / {assessment.requiredLevel} required
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
