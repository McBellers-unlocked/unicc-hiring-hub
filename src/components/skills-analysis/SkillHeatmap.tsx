import { useMemo, useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

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

  const getAssessment = (userId: string, skillId: string) => {
    return assessments.find(a => a.user_id === userId && a.skill_id === skillId);
  };

  const getGapColor = (gap: number | null) => {
    if (gap === null) return 'bg-muted/30';
    if (gap >= 2) return 'bg-violet-500/80 dark:bg-violet-600/80'; // Excelling
    if (gap === 1) return 'bg-blue-500/80 dark:bg-blue-600/80'; // Exceeding
    if (gap === 0) return 'bg-emerald-500/80 dark:bg-emerald-600/80'; // Meeting
    if (gap === -1) return 'bg-amber-500/80 dark:bg-amber-600/80'; // Minor gap
    return 'bg-rose-500/80 dark:bg-rose-600/80'; // Critical gap
  };

  const getGapLabel = (gap: number | null) => {
    if (gap === null) return 'No data';
    if (gap >= 2) return 'Excelling';
    if (gap === 1) return 'Exceeding';
    if (gap === 0) return 'Meeting';
    if (gap === -1) return 'Minor Gap';
    return 'Critical Gap';
  };

  const formatName = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length <= 2) return name;
    // First name + surname initial
    const firstName = parts[0];
    const lastName = parts[parts.length - 1];
    return `${firstName} ${lastName.charAt(0)}.`;
  };

  const formatSkillName = (name: string) => {
    if (name.length <= 12) return name;
    return name.slice(0, 10) + '...';
  };

  if (skills.length === 0 || teamMembers.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No skill data available to display.</p>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <div className="overflow-auto max-h-[500px]">
        <div className="min-w-[600px]">
          {/* Header row with member names */}
          <div className="flex">
            <div className="w-32 shrink-0" />
            {teamMembers.slice(0, 12).map((member) => (
              <Tooltip key={member.id}>
                <TooltipTrigger asChild>
                  <div className="w-14 shrink-0 px-0.5 text-center">
                    <span className="text-[10px] text-muted-foreground font-medium truncate block transform -rotate-45 origin-left translate-x-4 translate-y-2 w-20">
                      {formatName(member.name)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-xs text-muted-foreground">{member.job_title}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Skills rows grouped by category */}
          <div className="mt-8 space-y-2">
            {Object.entries(skillsByCategory).map(([category, categorySkills]) => (
              <div key={category}>
                {/* Category header */}
                <div className="flex items-center mb-1">
                  <div className="w-32 shrink-0 pr-2">
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                      {category}
                    </span>
                  </div>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Skills in category */}
                {categorySkills.slice(0, 6).map((skill) => (
                  <div key={skill.id} className="flex items-center mb-0.5">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="w-32 shrink-0 pr-2 text-right">
                          <span className="text-xs text-foreground truncate block">
                            {formatSkillName(skill.name)}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="left">
                        <p>{skill.name}</p>
                      </TooltipContent>
                    </Tooltip>

                    {/* Cells for each team member */}
                    {teamMembers.slice(0, 12).map((member) => {
                      const assessment = getAssessment(member.id, skill.id);
                      const level = assessment?.manager_assessment ?? assessment?.self_assessment ?? null;
                      const required = assessment?.required_level ?? null;
                      const gap = level !== null && required !== null ? level - required : null;
                      const isHovered = hoveredCell?.memberId === member.id && hoveredCell?.skillId === skill.id;

                      return (
                        <Tooltip key={`${member.id}-${skill.id}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                "w-14 h-7 shrink-0 mx-0.5 rounded-sm cursor-pointer transition-all duration-150",
                                getGapColor(gap),
                                isHovered && "ring-2 ring-primary ring-offset-1",
                                gap === null && "border border-dashed border-muted-foreground/30"
                              )}
                              onMouseEnter={() => setHoveredCell({ memberId: member.id, skillId: skill.id })}
                              onMouseLeave={() => setHoveredCell(null)}
                            >
                              {level !== null && (
                                <div className="flex items-center justify-center h-full">
                                  <span className="text-[10px] font-bold text-white drop-shadow-sm">
                                    {level}/{required ?? '?'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="space-y-1">
                              <p className="font-medium">{member.name}</p>
                              <p className="text-xs text-muted-foreground">{skill.name}</p>
                              <div className="flex items-center gap-2 text-xs">
                                <span>Level: {level ?? 'N/A'}</span>
                                <span>Required: {required ?? 'N/A'}</span>
                              </div>
                              <p className={cn(
                                "text-xs font-medium",
                                gap !== null && gap >= 0 ? "text-emerald-400" : "text-rose-400"
                              )}>
                                {getGapLabel(gap)}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-violet-500" />
              <span className="text-[10px] text-muted-foreground">Excelling (+2)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-blue-500" />
              <span className="text-[10px] text-muted-foreground">Exceeding (+1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[10px] text-muted-foreground">Meeting (0)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-amber-500" />
              <span className="text-[10px] text-muted-foreground">Gap (-1)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-rose-500" />
              <span className="text-[10px] text-muted-foreground">Critical (-2+)</span>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
