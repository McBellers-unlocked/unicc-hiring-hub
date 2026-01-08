import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, AlertCircle, TrendingUp, ChevronRight, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  ai_suggested_status: string | null;
  ai_suggested_category: string | null;
}

interface DivisionSkillAggregation {
  division: string;
  skillId: string;
  staffWithSkill: number;
  totalStaff: number;
  averageLevel: number | null;
  credentialCount: number;
}

interface GapData {
  skillId: string;
  skillName: string;
  gapSize: number;
  belowRequired: number;
  avgLevel: number;
  requiredLevel: number;
  priority: 'high' | 'medium' | 'low';
  topDivisions: { division: string; count: number }[];
}

interface Insight {
  type: 'critical' | 'warning' | 'opportunity';
  icon: React.ReactNode;
  headline: string;
  detail: string;
  action?: string;
  onClick?: () => void;
}

interface SkillsInsightsStripProps {
  divisionData: DivisionSkillAggregation[];
  divisionStaffCounts: Record<string, number>;
  skills: SkillDefinition[];
  gapData?: GapData[];
  onScrollTo?: (section: string) => void;
  onDivisionClick?: (division: string) => void;
}

const DIVISIONS = ['CS', 'DD', 'DO', 'DS', 'MS', 'OP'];
const TARGET_COVERAGE = 60; // Target coverage percentage

export default function SkillsInsightsStrip({
  divisionData,
  divisionStaffCounts,
  skills,
  gapData = [],
  onScrollTo,
  onDivisionClick,
}: SkillsInsightsStripProps) {
  const insights = useMemo<Insight[]>(() => {
    const result: Insight[] = [];

    // INSIGHT 1: Division with largest skill gap
    const emergingSkills = skills.filter(s => 
      s.ai_suggested_status === 'emerging' || s.ai_suggested_status === 'new'
    );
    
    if (emergingSkills.length > 0 && divisionData.length > 0) {
      const divisionCoverage = DIVISIONS.map(division => {
        const totalStaff = divisionStaffCounts[division] || 0;
        if (totalStaff === 0) return { division, coverage: 0, worstSkill: null as string | null, worstCoverage: 0 };

        let worstSkill: string | null = null;
        let worstCoverage = 100;

        emergingSkills.forEach(skill => {
          const data = divisionData.find(d => d.division === division && d.skillId === skill.id);
          const coverage = data ? (data.staffWithSkill / totalStaff) * 100 : 0;
          if (coverage < worstCoverage) {
            worstCoverage = coverage;
            worstSkill = skill.name;
          }
        });

        // Average coverage across emerging skills
        const relevantData = divisionData.filter(d => 
          d.division === division && 
          emergingSkills.some(s => s.id === d.skillId)
        );
        const avgCoverage = relevantData.length > 0
          ? relevantData.reduce((sum, d) => sum + (d.staffWithSkill / totalStaff) * 100, 0) / relevantData.length
          : 0;

        return { division, coverage: avgCoverage, worstSkill, worstCoverage };
      }).filter(d => divisionStaffCounts[d.division] > 0);

      if (divisionCoverage.length > 0) {
        const worst = divisionCoverage.sort((a, b) => a.coverage - b.coverage)[0];
        if (worst.coverage < TARGET_COVERAGE) {
          result.push({
            type: 'critical',
            icon: <AlertTriangle className="h-4 w-4 text-destructive" />,
            headline: `${worst.division} division has the largest emerging skills gap`,
            detail: `Coverage ${Math.round(worst.coverage)}% vs target ${TARGET_COVERAGE}%${worst.worstSkill ? ` • Weakest: ${worst.worstSkill}` : ''}`,
            action: 'View division',
            onClick: () => onDivisionClick?.(worst.division),
          });
        }
      }
    }

    // INSIGHT 2: Gap concentration in divisions
    if (gapData.length > 0) {
      const highPriorityGaps = gapData.filter(g => g.priority === 'high');
      if (highPriorityGaps.length > 0) {
        const divisionGapCounts = new Map<string, number>();
        
        highPriorityGaps.forEach(gap => {
          gap.topDivisions.forEach(d => {
            divisionGapCounts.set(d.division, (divisionGapCounts.get(d.division) || 0) + 1);
          });
        });

        const sortedDivisions = Array.from(divisionGapCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2);

        if (sortedDivisions.length >= 2) {
          const totalGaps = highPriorityGaps.length;
          const topTwoCount = sortedDivisions.reduce((sum, [, count]) => sum + count, 0);
          const concentration = Math.round((topTwoCount / (totalGaps * 2)) * 100); // Normalized

          result.push({
            type: 'warning',
            icon: <AlertCircle className="h-4 w-4 text-warning" />,
            headline: `${highPriorityGaps.length} priority gaps concentrated in ${sortedDivisions.map(d => d[0]).join(' & ')}`,
            detail: `These divisions account for ${concentration}% of critical skill gaps`,
            action: 'View gaps',
            onClick: () => onScrollTo?.('emerging-gaps'),
          });
        } else if (sortedDivisions.length === 1) {
          result.push({
            type: 'warning',
            icon: <AlertCircle className="h-4 w-4 text-warning" />,
            headline: `${highPriorityGaps.length} priority gaps primarily in ${sortedDivisions[0][0]}`,
            detail: `Focus training and hiring efforts on this division`,
            action: 'View gaps',
            onClick: () => onScrollTo?.('emerging-gaps'),
          });
        }
      }
    }

    // INSIGHT 3: Training impact opportunity
    if (gapData.length > 0) {
      // Find skill with most people close to required level (1-2 levels below)
      const trainableGaps = gapData
        .filter(g => g.gapSize > 0 && g.gapSize <= 2 && g.belowRequired >= 5)
        .sort((a, b) => b.belowRequired - a.belowRequired);

      if (trainableGaps.length > 0) {
        const topOpportunity = trainableGaps[0];
        const currentReadiness = Math.round(
          ((topOpportunity.avgLevel / topOpportunity.requiredLevel) * 100) || 0
        );
        // Estimate readiness after training closes gap
        const projectedReadiness = Math.min(100, currentReadiness + Math.round((topOpportunity.belowRequired / 100) * 30));

        result.push({
          type: 'opportunity',
          icon: <TrendingUp className="h-4 w-4 text-primary" />,
          headline: `Training ${topOpportunity.belowRequired} staff in ${topOpportunity.skillName} has highest ROI`,
          detail: `Close gap size of ${topOpportunity.gapSize.toFixed(1)} levels • ${topOpportunity.topDivisions.slice(0, 2).map(d => d.division).join(', ')} most impacted`,
          action: 'Create plan',
          onClick: () => onScrollTo?.('emerging-gaps'),
        });
      }
    }

    // Fallback insights if we don't have enough data
    if (result.length < 3) {
      // Add a general insight about emerging skills
      const emergingCount = skills.filter(s => s.ai_suggested_status === 'emerging').length;
      const newCount = skills.filter(s => s.ai_suggested_status === 'new').length;
      
      if (emergingCount + newCount > 0 && result.length < 3) {
        result.push({
          type: 'opportunity',
          icon: <TrendingUp className="h-4 w-4 text-primary" />,
          headline: `${emergingCount + newCount} skills identified as emerging or new`,
          detail: `Prioritize assessment coverage for these future-critical skills`,
          action: 'View skills',
          onClick: () => onScrollTo?.('status-bar'),
        });
      }

      // Add insight about legacy skills
      const legacyCount = skills.filter(s => s.ai_suggested_status === 'legacy').length;
      if (legacyCount > 0 && result.length < 3) {
        result.push({
          type: 'warning',
          icon: <AlertCircle className="h-4 w-4 text-warning" />,
          headline: `${legacyCount} legacy skills may need transition planning`,
          detail: `Review staff dependent on legacy skills for upskilling opportunities`,
          action: 'Review legacy',
          onClick: () => onScrollTo?.('status-bar'),
        });
      }
    }

    return result.slice(0, 3);
  }, [divisionData, divisionStaffCounts, skills, gapData, onScrollTo, onDivisionClick]);

  if (insights.length === 0) {
    return null;
  }

  return (
    <Card className="border-l-4 border-l-primary bg-gradient-to-r from-primary/5 to-transparent">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Lightbulb className="h-4 w-4" />
          Key Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                insight.onClick 
                  ? 'cursor-pointer hover:bg-muted/50' 
                  : ''
              }`}
              onClick={insight.onClick}
            >
              <div className="mt-0.5 shrink-0">
                {insight.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">
                  {insight.headline}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {insight.detail}
                </p>
              </div>
              {insight.action && (
                <Badge 
                  variant="secondary" 
                  className="shrink-0 text-xs cursor-pointer hover:bg-secondary/80"
                >
                  {insight.action}
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
