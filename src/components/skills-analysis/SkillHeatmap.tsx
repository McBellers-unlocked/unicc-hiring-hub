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

        {/* Matrix container - full height, scrollbar will overlay from outside */}
        <div 
          ref={containerRef}
          className="h-[600px] w-full rounded-lg border border-border/30 overflow-hidden"
        >
          {/* Scrollable content area */}
          <div className="h-full overflow-y-auto overflow-x-hidden">
...
            </div>
          </div>
        </div>

        {/* Fixed-position horizontal scrollbar - overlays at bottom of matrix */}
        {isMatrixVisible && (
          <div 
            ref={hScrollRef}
            onScroll={handleExternalScroll}
            className="bg-background border-t border-border/30 overflow-x-auto shadow-lg"
            style={{
              ...scrollbarStyle,
              scrollbarWidth: 'auto'
            }}
          >
            <div style={{ width: contentWidth, height: '16px' }} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
