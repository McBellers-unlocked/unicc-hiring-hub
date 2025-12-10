import { Badge } from "@/components/ui/badge";
import { User, BookOpen, TrendingUp } from "lucide-react";

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
        <TrendingUp className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
        <p className="text-sm font-medium text-emerald-600">All Skills On Track</p>
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

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive" className="text-[10px]">Critical</Badge>;
      case 'moderate':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-[10px]">Moderate</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">Minor</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec, idx) => (
        <div 
          key={idx} 
          className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
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
                  <User className="h-3 w-3" />
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
