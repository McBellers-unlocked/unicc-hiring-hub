import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { GapIcon, AccessibleLegend, getGapAriaLabel, ACCESSIBLE_COLORS } from "@/lib/accessibilityPatterns";

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
  
  // Refs for synchronized scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const hScrollRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState(0);
  const isScrollingSyncRef = useRef(false);

  // Calculate content width for horizontal scrollbar
  useEffect(() => {
    if (innerContentRef.current) {
      const updateWidth = () => {
        if (innerContentRef.current) {
          setContentWidth(innerContentRef.current.scrollWidth);
        }
      };
      updateWidth();
      const observer = new ResizeObserver(updateWidth);
      observer.observe(innerContentRef.current);
      return () => observer.disconnect();
    }
  }, [teamMembers, skills]);

  // Sync horizontal scroll: sticky scrollbar -> inner content
  const handleExternalScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (hScrollRef.current && innerContentRef.current) {
      isScrollingSyncRef.current = true;
      innerContentRef.current.scrollLeft = hScrollRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  }, []);

  // Sync horizontal scroll: inner content -> sticky scrollbar
  const handleInnerContentScroll = useCallback(() => {
    if (isScrollingSyncRef.current) return;
    if (innerContentRef.current && hScrollRef.current) {
      isScrollingSyncRef.current = true;
      hScrollRef.current.scrollLeft = innerContentRef.current.scrollLeft;
      requestAnimationFrame(() => {
        isScrollingSyncRef.current = false;
      });
    }
  }, []);

  // Group skills by category and sort by variance (most meaningful first)
  const skillsByCategory = useMemo(() => {
    // First calculate skill averages for sorting
    const skillGaps: Record<string, number> = {};
    skills.forEach(skill => {
      const skillAssessments = assessments.filter(a => a.skill_id === skill.id);
      let totalGap = 0;
      let count = 0;
      skillAssessments.forEach(a => {
        const level = a.manager_assessment ?? a.self_assessment;
        const required = a.required_level;
        if (level !== null && required !== null) {
          totalGap += level - required;
          count++;
        }
      });
      skillGaps[skill.id] = count > 0 ? Math.abs(totalGap / count) : 0;
    });

    // Group by category
    const grouped = skills.reduce((acc, skill) => {
      const cat = skill.category || 'General';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(skill);
      return acc;
    }, {} as Record<string, SkillDefinition[]>);

    // Sort each category by variance (highest first) so meaningful skills appear first
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => skillGaps[b.id] - skillGaps[a.id]);
    });

    return grouped;
  }, [skills, assessments]);

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

  // Accessible color styles with patterns for gaps
  const getGapStyles = (gap: number | null, isCritical: boolean = false) => {
    if (gap === null) return { 
      bg: 'bg-muted/20', 
      gradient: '',
      glow: '',
      text: 'text-muted-foreground',
      patternClass: '',
      color: ACCESSIBLE_COLORS.noData.bg
    };
    if (gap >= 2) return { 
      bg: 'bg-gradient-to-br from-violet-500 to-violet-700', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-violet-500/30',
      text: 'text-white',
      patternClass: '',
      color: ACCESSIBLE_COLORS.excelling.bg
    };
    if (gap === 1) return { 
      bg: 'bg-gradient-to-br from-blue-500 to-blue-700', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-blue-500/30',
      text: 'text-white',
      patternClass: 'pattern-dots',
      color: ACCESSIBLE_COLORS.exceeding.bg
    };
    if (gap === 0) return { 
      bg: 'bg-gradient-to-br from-teal-500 to-teal-700', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-teal-500/30',
      text: 'text-white',
      patternClass: '',
      color: ACCESSIBLE_COLORS.meeting.bg
    };
    if (gap === -1) return { 
      bg: 'bg-gradient-to-br from-orange-500 to-orange-700', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: 'shadow-orange-500/30',
      text: 'text-white',
      patternClass: 'pattern-diagonal-light',
      color: ACCESSIBLE_COLORS.minorGap.bg
    };
    return { 
      bg: 'bg-gradient-to-br from-red-500 to-red-700', 
      gradient: 'shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]',
      glow: isCritical ? 'shadow-lg shadow-red-500/50' : 'shadow-red-500/30',
      text: 'text-white',
      patternClass: 'pattern-diagonal-heavy',
      color: ACCESSIBLE_COLORS.criticalGap.bg
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
    if (avgGap >= 0) return 'ring-teal-500';
    if (avgGap >= -0.5) return 'ring-orange-500';
    return 'ring-red-500';
  };

  const formatSkillName = (name: string) => {
    if (name.length <= 18) return name;
    return name.slice(0, 16) + '...';
  };

  const getAvgGapColor = (avgGap: number) => {
    if (avgGap >= 1) return 'text-violet-500';
    if (avgGap >= 0) return 'text-teal-500';
    if (avgGap >= -0.5) return 'text-orange-500';
    return 'text-red-500';
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

  // Calculate grid template columns: skill name + members + team avg
  const gridTemplateColumns = `180px repeat(${displayMembers.length}, 68px) 68px`;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="space-y-4">
        {/* Accessible Legend */}
        <div className="p-3 bg-muted/30 rounded-lg">
          <p className="text-xs font-medium text-muted-foreground mb-2">Legend (Icon + Color + Pattern)</p>
          <AccessibleLegend />
        </div>

        {/* Outer container with flex layout - scrollbar is OUTSIDE scroll area */}
        <div className="h-[600px] w-full rounded-lg border border-border/30 flex flex-col">
          {/* Scrollable content area - takes remaining space */}
          <div 
            ref={containerRef}
            className="flex-1 overflow-y-auto overflow-x-hidden min-h-0"
          >
            {/* Inner horizontally scrollable content - scrollbar hidden, controlled by external scrollbar */}
            <div 
              ref={innerContentRef}
              onScroll={handleInnerContentScroll}
              className="min-w-fit p-2 overflow-x-auto [&::-webkit-scrollbar]:hidden"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
            {/* Header row with avatar badges - sticky */}
            <div
              className="grid items-end pb-3 mb-3 border-b border-border/50 gap-2 sticky top-0 bg-background/95 backdrop-blur-sm z-20 pt-2"
              style={{ gridTemplateColumns }}
            >
              <div className="sticky left-0 bg-background/95 backdrop-blur-sm z-10" /> {/* Empty cell for skill name column */}
              {displayMembers.map((member, idx) => {
                const health = memberHealthScores[member.id];
                const ringColor = getHealthRingColor(health?.avgGap ?? 0);
                return (
                  <Tooltip key={member.id}>
                    <TooltipTrigger asChild>
                      <div 
                        className="flex flex-col items-center gap-1 cursor-pointer"
                        style={{ animationDelay: `${idx * 50}ms` }}
                      >
                        <Avatar className={cn(
                          "h-9 w-9 ring-2 ring-offset-2 ring-offset-background transition-all duration-200",
                          ringColor,
                          hoveredMemberId === member.id && "scale-110 shadow-lg"
                        )}>
                          <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary text-primary-foreground text-xs font-bold">
                            {getInitials(member.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className={cn(
                          "text-[10px] text-muted-foreground font-medium transition-colors text-center leading-tight",
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
              <div className="flex flex-col items-center">
                <div className="h-9 w-9 rounded-full bg-muted/50 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-muted-foreground">AVG</span>
                </div>
                <span className="text-[10px] text-muted-foreground font-medium mt-1">Team</span>
              </div>
            </div>

            {/* Skills rows grouped by category */}
            <div className="space-y-6">
              {Object.entries(skillsByCategory).map(([category, categorySkills], catIdx) => (
                <div key={category} className="animate-fade-in" style={{ animationDelay: `${catIdx * 100}ms` }}>
                  {/* Category header */}
                  <div className="flex items-center mb-3 gap-2">
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
                  <div className="space-y-2">
                    {categorySkills.slice(0, 12).map((skill, skillIdx) => {
                      const skillAvg = skillAverages[skill.id];
                      const isRowHovered = hoveredSkillId === skill.id;
                      
                      return (
                        <div 
                          key={skill.id} 
                          className={cn(
                            "grid items-center gap-2 py-1 px-1 rounded-lg transition-colors duration-150",
                            isRowHovered && "bg-muted/30"
                          )}
                          style={{ 
                            gridTemplateColumns,
                            animationDelay: `${(catIdx * 100) + (skillIdx * 30)}ms` 
                          }}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="pr-2 text-right sticky left-0 bg-background/95 backdrop-blur-sm z-10">
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
                            const ariaLabel = getGapAriaLabel(gap);

                            return (
                              <Tooltip key={`${member.id}-${skill.id}`}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={cn(
                                      "h-11 rounded-xl cursor-pointer transition-all duration-200 relative overflow-hidden",
                                      styles.bg,
                                      styles.gradient,
                                      "hover:scale-105 hover:shadow-lg",
                                      isHovered && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110 shadow-xl z-10",
                                      isInCrosshair && !isHovered && "opacity-90",
                                      !isInCrosshair && hoveredCell && "opacity-50",
                                      gap === null && "border-2 border-dashed border-muted-foreground/20",
                                      isCritical && "ring-2 ring-red-400/60"
                                    )}
                                    style={{ 
                                      animationDelay: `${(memberIdx * 30) + (skillIdx * 20)}ms`,
                                      boxShadow: isHovered ? `0 0 20px ${styles.glow}` : undefined
                                    }}
                                    onMouseEnter={() => setHoveredCell({ memberId: member.id, skillId: skill.id })}
                                    onMouseLeave={() => setHoveredCell(null)}
                                    role="gridcell"
                                    aria-label={`${member.name}, ${skill.name}: ${ariaLabel}`}
                                  >
                                    {/* Pattern overlay for gaps - accessibility enhancement */}
                                    {gap !== null && gap < 0 && (
                                      <div 
                                        className="absolute inset-0 pointer-events-none"
                                        style={{
                                          backgroundImage: gap === -1 
                                            ? 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(0,0,0,0.15) 4px, rgba(0,0,0,0.15) 8px)'
                                            : 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.25) 3px, rgba(0,0,0,0.25) 6px)',
                                        }}
                                        aria-hidden="true"
                                      />
                                    )}
                                    
                                    {level !== null ? (
                                      <div className="flex flex-col items-center justify-center h-full relative z-10">
                                        {/* Icon indicator for accessibility */}
                                        <div className="absolute top-1.5 right-1.5">
                                          <GapIcon gap={gap} size="sm" className={cn(styles.text, "opacity-90")} />
                                        </div>
                                        {/* Prominent gap value */}
                                        <span className={cn("text-lg font-bold drop-shadow-md leading-none", styles.text)}>
                                          {gap !== null ? (gap >= 0 ? `+${gap}` : gap) : '?'}
                                        </span>
                                        {/* Tiny status label */}
                                        <span className={cn("text-[8px] font-medium opacity-75 mt-0.5", styles.text)}>
                                          {getGapLabel(gap)}
                                        </span>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-center h-full">
                                        <GapIcon gap={null} size="md" />
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
                                      "flex items-center justify-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full",
                                      gap !== null && gap >= 0 
                                        ? "bg-teal-500/20 text-teal-600 dark:text-teal-400" 
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                    )}>
                                      <GapIcon gap={gap} size="sm" />
                                      {getGapLabel(gap)} {gap !== null && `(${gap >= 0 ? '+' : ''}${gap})`}
                                    </div>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}

                          {/* Team Average cell */}
                          <div className="h-11 rounded-xl bg-muted/30 flex flex-col items-center justify-center">
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
                    {categorySkills.length > 12 && (
                      <div className="text-xs text-muted-foreground italic pl-[180px] pt-1">
                        + {categorySkills.length - 12} more skills not shown
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Health Score row */}
            <div 
              className="grid items-center mt-4 pt-3 border-t border-border/50 gap-2"
              style={{ gridTemplateColumns }}
            >
              <div className="pr-2 text-right sticky left-0 bg-background/95 backdrop-blur-sm z-10">
                <span className="text-xs font-semibold text-muted-foreground">Health Score</span>
              </div>
              {displayMembers.map(member => {
                const health = memberHealthScores[member.id];
                const avgGap = health?.avgGap ?? 0;
                return (
                  <div 
                    key={member.id}
                    className="h-9 rounded-xl bg-muted/20 flex items-center justify-center"
                  >
                    <span className={cn("text-xs font-bold", getAvgGapColor(avgGap))}>
                      {avgGap >= 0 ? '+' : ''}{avgGap.toFixed(1)}
                    </span>
                  </div>
                );
              })}
              <div className="h-9" /> {/* Empty cell for team avg column */}
            </div>
            </div>
          </div>
          
          {/* Always-visible horizontal scrollbar - OUTSIDE scroll area */}
          <div 
            ref={hScrollRef}
            onScroll={handleExternalScroll}
            className="flex-shrink-0 bg-background border-t border-border/30 overflow-x-auto"
            style={{ scrollbarWidth: 'auto' }}
          >
            <div style={{ width: contentWidth, height: '16px' }} />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
