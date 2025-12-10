import { Badge } from "@/components/ui/badge";
import { User, BookOpen, TrendingUp, AlertTriangle, ArrowDown, Circle } from "lucide-react";

interface SkillGap {
  skillName: string;
  skillId: string;
  gapCount: number;
  totalGap: number;
}

interface TeamMember {
  id: string;
  name: string;
  job_title: string | null;
  unit: string | null;
  depth: number;
}

interface Assessment {
  id: string;
  user_id: string;
  skill_id: string;
  self_assessment: number | null;
  manager_assessment: number | null;
  required_level: number | null;
  status: string;
}

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
}

interface Props {
  gapsBySkill: SkillGap[];
  teamMembers: TeamMember[];
  assessments: Assessment[];
  skills: SkillDefinition[];
}

export default function TrainingRecommendations({ gapsBySkill, teamMembers, assessments, skills }: Props) {
  if (gapsBySkill.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-10 w-10 mx-auto mb-3 text-teal-500" />
        <p className="text-sm font-medium text-teal-600 dark:text-teal-400">All Skills On Track</p>
        <p className="text-xs text-muted-foreground mt-1">
          Your team is meeting or exceeding skill requirements
        </p>
      </div>
    );
  }

  // Get recommendations based on top gaps
  const recommendations = gapsBySkill.slice(0, 4).map(gap => {
    // Find team members with this gap
    const membersWithGap = assessments
      .filter(a => {
        if (a.skill_id !== gap.skillId) return false;
        const level = a.manager_assessment ?? a.self_assessment ?? 0;
        const required = a.required_level ?? 0;
        return level < required;
      })
      .map(a => teamMembers.find(m => m.id === a.user_id))
      .filter(Boolean)
      .slice(0, 3);

    const severity = gap.totalGap >= 4 ? 'critical' : gap.totalGap >= 2 ? 'moderate' : 'minor';

    return {
      skill: gap.skillName,
      severity,
      affectedCount: gap.gapCount,
      members: membersWithGap as TeamMember[],
    };
  });

  // Accessible severity badge with icon
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return (
          <Badge 
            variant="destructive" 
            className="text-[10px] flex items-center gap-1"
            aria-label="Critical severity"
          >
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Critical
          </Badge>
        );
      case 'moderate':
        return (
          <Badge 
            className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] flex items-center gap-1"
            aria-label="Moderate severity"
          >
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
            Moderate
          </Badge>
        );
      default:
        return (
          <Badge 
            variant="secondary" 
            className="text-[10px] flex items-center gap-1"
            aria-label="Minor severity"
          >
            <Circle className="h-3 w-3" aria-hidden="true" />
            Minor
          </Badge>
        );
    }
  };

  // Get severity indicator for list styling
  const getSeverityIndicator = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-500/5';
      case 'moderate':
        return 'border-l-orange-500 bg-orange-500/5';
      default:
        return 'border-l-muted-foreground bg-muted/30';
    }
  };

  return (
    <div className="space-y-4" role="list" aria-label="Training recommendations">
      {/* Legend for severity indicators */}
      <div className="flex flex-wrap gap-3 text-xs pb-2 border-b border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-red-500" aria-hidden="true" />
          <AlertTriangle className="h-3 w-3 text-red-500" aria-hidden="true" />
          <span className="text-muted-foreground">Critical priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-orange-500" aria-hidden="true" />
          <ArrowDown className="h-3 w-3 text-orange-500" aria-hidden="true" />
          <span className="text-muted-foreground">Moderate priority</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1 h-4 rounded-full bg-muted-foreground" aria-hidden="true" />
          <Circle className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
          <span className="text-muted-foreground">Minor priority</span>
        </div>
      </div>

      {recommendations.map((rec, idx) => (
        <div 
          key={idx} 
          className={`p-3 rounded-lg border border-l-4 hover:shadow-md transition-all ${getSeverityIndicator(rec.severity)}`}
          role="listitem"
          aria-label={`${rec.skill}: ${rec.severity} priority, ${rec.affectedCount} team members affected`}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="font-medium text-sm">{rec.skill}</span>
            </div>
            {getSeverityBadge(rec.severity)}
          </div>
          
          <p className="text-xs text-muted-foreground mb-2">
            {rec.affectedCount} team member{rec.affectedCount > 1 ? 's' : ''} need{rec.affectedCount === 1 ? 's' : ''} development
          </p>

          {rec.members.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {rec.members.map((member, mIdx) => (
                <div 
                  key={mIdx}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px]"
                >
                  <User className="h-3 w-3" aria-hidden="true" />
                  <span>{member.name.split(' ')[0]}</span>
                </div>
              ))}
              {rec.affectedCount > 3 && (
                <span className="text-[10px] text-muted-foreground px-2 py-0.5">
                  +{rec.affectedCount - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {gapsBySkill.length > 4 && (
        <p className="text-xs text-center text-muted-foreground pt-2">
          +{gapsBySkill.length - 4} more skill gaps identified
        </p>
      )}
    </div>
  );
}
