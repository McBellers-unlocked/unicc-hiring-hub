import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface TeamMember {
  id: string;
  name: string;
  job_title: string | null;
  unit: string | null;
  depth: number;
}

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
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

interface Props {
  teamMembers: TeamMember[];
  skills: SkillDefinition[];
  assessments: Assessment[];
}

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
  'Technical': 'bg-blue-500',
  'Leadership': 'bg-purple-500',
  'Communication': 'bg-teal-500',
  'Analytical': 'bg-indigo-500',
  'General': 'bg-slate-500',
};

export default function SkillHeatmap({ teamMembers, skills, assessments }: Props) {
  const [hoveredCell, setHoveredCell] = useState<{ memberId: string; skillId: string } | null>(null);

  // Group skills by category
  const skillsByCategory = useMemo(() => {
    const grouped = skills.reduce((acc, skill) => {
      const cat = skill.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {} as Record<string, SkillDefinition[]>);
    return grouped;
  }, [skills]);

  // Calculate member health scores
  const memberHealthScores = useMemo(() => {
    const scores: Record<string, { total: number; count: number; avgGap: number }> = {};
    teamMembers.forEach(member => {
      const memberAssessments = assessments.filter(a => a.user_id === member.id);
      let totalGap = 0;
      let count = 0;
      memberAssessments.forEach(a => {
        const level = a.manager_assessment ?? a.self_assessment;
        const required = a.required_level;
        if (level !== null && required !== null) {
          totalGap += level - required;
          count++;
        }
      });
      scores[member.id] = { total: totalGap, count, avgGap: count > 0 ? totalGap / count : 0 };
    });
    return scores;
  }, [teamMembers, assessments]);

  // Calculate skill averages
  const skillAverages = useMemo(() => {
    const avgs: Record<string, { avgLevel: number; avgGap: number; count: number }> = {};
    skills.forEach(skill => {
      const skillAssessments = assessments.filter(a => a.skill_id === skill.id);
      let totalLevel = 0;
      let totalGap = 0;
      let count = 0;
      skillAssessments.forEach(a => {
        const level = a.manager_assessment ?? a.self_assessment;
        const required = a.required_level;
        if (level !== null) {
          totalLevel += level;
          if (required !== null) {
            totalGap += level - required;
          }
          count++;
        }
      });
      avgs[skill.id] = { 
        avgLevel: count > 0 ? totalLevel / count : 0, 
        avgGap: count > 0 ? totalGap / count : 0,
        count 
      };
    });
    return avgs;
  }, [skills, assessments]);

  const getAssessment = (userId: string, skillId: string) => {
    return assessments.find(a => a.user_id === userId && a.skill_id === skillId);
  };

  const getGapStyles = (gap: number | null, isCritical: boolean = false) => {
    if (gap === null) return { 
      bg: 'bg-muted/20', 
      gradient: '',
      glow: '',
      text: 'text-muted-foreground'
    };
    if (gap >= 2) return { 
      bg: 'bg-gradient-to-br from-violet-400 to-violet-600', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-violet-500/30',
      text: 'text-white'
    };
    if (gap === 1) return { 
      bg: 'bg-gradient-to-br from-blue-400 to-blue-600', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-blue-500/30',
      text: 'text-white'
    };
    if (gap === 0) return { 
      bg: 'bg-gradient-to-br from-emerald-400 to-emerald-600', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-emerald-500/30',
      text: 'text-white'
    };
    if (gap === -1) return { 
      bg: 'bg-gradient-to-br from-amber-400 to-amber-600', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-amber-500/30',
      text: 'text-white'
    };
    return { 
      bg: 'bg-gradient-to-br from-rose-400 to-rose-600', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: isCritical ? 'shadow-rose-500/50 animate-pulse' : 'shadow-rose-500/30',
      text: 'text-white'
    };
  };

  const getGapLabel = (gap: number | null) => {
    if (gap === null) return 'No data';
    if (gap >= 2) return 'Excelling';
    if (gap === 1) return 'Exceeding';
    if (gap === 0) return 'Meeting';
    if (gap === -1) return 'Minor Gap';
    return 'Critical Gap';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const getHealthRingColor = (avgGap: number) => {
    if (avgGap >= 1) return 'ring-violet-500';
    if (avgGap >= 0) return 'ring-emerald-500';
    if (avgGap >= -0.5) return 'ring-amber-500';
    return 'ring-rose-500';
  };

  const formatSkillName = (name: string) => {
    if (name.length <= 18) return name;
    return name.slice(0, 16) + '...';
  };

  const getAvgGapColor = (avgGap: number) => {
    if (avgGap >= 1) return 'text-violet-500';
    if (avgGap >= 0) return 'text-emerald-500';
    if (avgGap >= -0.5) return 'text-amber-500';
    return 'text-rose-500';
  };

  if (skills.length === 0 || teamMembers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No skill data available to display.</p>
      </div>
    );
  }

  const displayMembers = teamMembers.slice(0, 10);
  const hoveredMemberId = hoveredCell?.memberId;
  const hoveredSkillId = hoveredCell?.skillId;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-auto max-h-[600px] p-2">
        <div className="min-w-[700px]">
          {/* Header row with avatar badges */}
          <div className="flex items-end pb-3 mb-2 border-b border-border/50">
            <div className="w-40 shrink-0" />
            {displayMembers.map((member, idx) => {
              const health = memberHealthScores[member.id];
              const ringColor = getHealthRingColor(health?.avgGap ?? 0);
              return (
                <Tooltip key={member.id}>
                  <TooltipTrigger asChild>
                    <div 
                      className="w-16 shrink-0 flex flex-col items-center gap-1 cursor-pointer"
                      style={{ animationDelay: `${idx * 50}ms` }}
                    >
                      <Avatar className={cn(
                        "h-10 w-10 ring-2 ring-offset-2 ring-offset-background transition-all duration-200",
                        ringColor,
                        hoveredMemberId === member.id && "scale-110 shadow-lg"
                      )}>
                        <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-bold">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className={cn(
                        "text-[10px] text-muted-foreground font-medium transition-colors",
                        hoveredMemberId === member.id && "text-foreground"
                      )}>
                        {health?.count ?? 0} skills
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="p-3">
                    <p className="font-semibold">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.job_title || 'Team Member'}</p>
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Skills Assessed:</span>
                        <span className="font-medium">{health?.count ?? 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Avg Gap:</span>
                        <span className={cn("font-medium", getAvgGapColor(health?.avgGap ?? 0))}>
                          {(health?.avgGap ?? 0) >= 0 ? '+' : ''}{(health?.avgGap ?? 0).toFixed(1)}
                        </span>
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
            {/* Team Avg header */}
            <div className="w-16 shrink-0 flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-muted/50 flex items-center justify-center">
                <span className="text-[10px] font-bold text-muted-foreground">AVG</span>
              </div>
              <span className="text-[10px] text-muted-foreground font-medium mt-1">Team</span>
            </div>
          </div>

          {/* Skills rows grouped by category */}
          <div className="space-y-4">
            {Object.entries(skillsByCategory).map(([category, categorySkills], catIdx) => (
              <div key={category} className="animate-fade-in" style={{ animationDelay: `${catIdx * 100}ms` }}>
                {/* Category header */}
                <div className="flex items-center mb-2 gap-2">
                  <div className={cn(
                    "w-1.5 h-4 rounded-full",
                    categoryColors[category] || categoryColors['General']
                  )} />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {category}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                </div>

                {/* Skills in category */}
                {categorySkills.slice(0, 8).map((skill, skillIdx) => {
                  const skillAvg = skillAverages[skill.id];
                  const isRowHovered = hoveredSkillId === skill.id;
                  
                  return (
                    <div 
                      key={skill.id} 
                      className={cn(
                        "flex items-center mb-1.5 py-1 px-1 rounded-lg transition-colors duration-150",
                        isRowHovered && "bg-muted/30"
                      )}
                      style={{ animationDelay: `${(catIdx * 100) + (skillIdx * 30)}ms` }}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="w-40 shrink-0 pr-3 text-right">
                            <span className={cn(
                              "text-xs font-medium transition-colors",
                              isRowHovered ? "text-foreground" : "text-muted-foreground"
                            )}>
                              {formatSkillName(skill.name)}
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          <p className="font-medium">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">{category}</p>
                        </TooltipContent>
                      </Tooltip>

                      {/* Cells for each team member */}
                      {displayMembers.map((member, memberIdx) => {
                        const assessment = getAssessment(member.id, skill.id);
                        const level = assessment?.manager_assessment ?? assessment?.self_assessment ?? null;
                        const required = assessment?.required_level ?? null;
                        const gap = level !== null && required !== null ? level - required : null;
                        const isCritical = gap !== null && gap <= -2;
                        const styles = getGapStyles(gap, isCritical);
                        const isHovered = hoveredCell?.memberId === member.id && hoveredCell?.skillId === skill.id;
                        const isInCrosshair = hoveredMemberId === member.id || hoveredSkillId === skill.id;

                        return (
                          <Tooltip key={`${member.id}-${skill.id}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={cn(
                                  "w-16 h-10 shrink-0 mx-0.5 rounded-lg cursor-pointer transition-all duration-200",
                                  styles.bg,
                                  styles.gradient,
                                  "hover:scale-105 hover:shadow-lg",
                                  isHovered && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xl z-10",
                                  isInCrosshair && !isHovered && "opacity-90",
                                  !isInCrosshair && hoveredCell && "opacity-50",
                                  gap === null && "border-2 border-dashed border-muted-foreground/20",
                                  isCritical && "animate-pulse"
                                )}
                                style={{ 
                                  animationDelay: `${(memberIdx * 30) + (skillIdx * 20)}ms`,
                                  boxShadow: isHovered ? `0 0 20px ${styles.glow}` : undefined
                                }}
                                onMouseEnter={() => setHoveredCell({ memberId: member.id, skillId: skill.id })}
                                onMouseLeave={() => setHoveredCell(null)}
                              >
                                {level !== null ? (
                                  <div className="flex flex-col items-center justify-center h-full">
                                    <span className={cn("text-sm font-bold drop-shadow-md", styles.text)}>
                                      {level}
                                    </span>
                                    <span className={cn("text-[9px] opacity-80", styles.text)}>
                                      /{required ?? '?'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-full">
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="p-3 backdrop-blur-sm">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6">
                                    <AvatarFallback className="text-[10px] bg-primary/20">
                                      {getInitials(member.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-semibold text-sm">{member.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{skill.name}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
                                  <div>
                                    <span className="text-muted-foreground">Level:</span>
                                    <span className="ml-1 font-medium">{level ?? 'N/A'}</span>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">Required:</span>
                                    <span className="ml-1 font-medium">{required ?? 'N/A'}</span>
                                  </div>
                                </div>
                                <div className={cn(
                                  "text-xs font-semibold px-2 py-1 rounded-full text-center",
                                  gap !== null && gap >= 0 
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400" 
                                    : "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                )}>
                                  {getGapLabel(gap)} {gap !== null && `(${gap >= 0 ? '+' : ''}${gap})`}
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        );
                      })}

                      {/* Team Average cell */}
                      <div className="w-16 h-10 shrink-0 mx-0.5 rounded-lg bg-muted/30 flex flex-col items-center justify-center">
                        <span className={cn("text-sm font-bold", getAvgGapColor(skillAvg?.avgGap ?? 0))}>
                          {skillAvg?.avgLevel.toFixed(1) ?? '—'}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          avg
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Member health score row */}
          <div className="flex items-center mt-4 pt-4 border-t border-border/50">
            <div className="w-40 shrink-0 pr-3 text-right">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Health Score
              </span>
            </div>
            {displayMembers.map((member) => {
              const health = memberHealthScores[member.id];
              const score = health?.count > 0 
                ? Math.round(((health.avgGap + 2) / 4) * 100) 
                : null;
              const scoreColor = score !== null
                ? score >= 75 ? 'text-violet-500' 
                  : score >= 50 ? 'text-emerald-500' 
                  : score >= 25 ? 'text-amber-500' 
                  : 'text-rose-500'
                : 'text-muted-foreground';
              
              return (
                <div 
                  key={member.id} 
                  className={cn(
                    "w-16 h-10 shrink-0 mx-0.5 rounded-lg bg-muted/20 flex items-center justify-center transition-all",
                    hoveredMemberId === member.id && "bg-muted/40 scale-105"
                  )}
                >
                  <span className={cn("text-sm font-bold", scoreColor)}>
                    {score !== null ? `${score}%` : '—'}
                  </span>
                </div>
              );
            })}
            <div className="w-16 h-10 shrink-0 mx-0.5" />
          </div>

          {/* Enhanced Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-4 border-t border-border/50">
            {[
              { label: 'Excelling (+2+)', gradient: 'from-violet-400 to-violet-600' },
              { label: 'Exceeding (+1)', gradient: 'from-blue-400 to-blue-600' },
              { label: 'Meeting (0)', gradient: 'from-emerald-400 to-emerald-600' },
              { label: 'Minor Gap (-1)', gradient: 'from-amber-400 to-amber-600' },
              { label: 'Critical (-2+)', gradient: 'from-rose-400 to-rose-600', pulse: true },
            ].map((item) => (
              <div 
                key={item.label}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/30 hover:bg-muted/50 transition-colors cursor-default"
              >
                <div className={cn(
                  "w-4 h-4 rounded-md bg-gradient-to-br shadow-sm",
                  item.gradient,
                  item.pulse && "animate-pulse"
                )} />
                <span className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
