import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, ReferenceArea, Cell, Tooltip as RechartsTooltip, LabelList } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Target, AlertTriangle, Users, TrendingUp, GraduationCap, UserPlus, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import SkillPeopleDrillDown from "./SkillPeopleDrillDown";

interface SkillDefinition {
  id: string;
  name: string;
  ai_suggested_status: string | null;
}

interface Props {
  skills: SkillDefinition[];
}

interface SkillQuadrantData {
  id: string;
  name: string;
  criticality: number; // 1-5
  coverage: number; // 0-100%
  staffCount: number;
  belowRequired: number;
  topDivisions: { division: string; count: number }[];
  status: 'emerging' | 'established' | 'new' | 'legacy' | null;
  quadrant: "urgent" | "watch" | "healthy" | "deprioritize";
  avgLevel: number;
  requiredLevel: number;
}


const COVERAGE_TARGET = 70;
const CRITICALITY_THRESHOLD = 3;

// Demo data for presentations when no real data is available
const DEMO_DATA: SkillQuadrantData[] = [
  // URGENT quadrant (high criticality, low coverage) - larger belowRequired for bigger dots
  { id: "demo-1", name: "Cloud Security", criticality: 4.5, coverage: 35, staffCount: 28, belowRequired: 32, 
    topDivisions: [{ division: "DS", count: 8 }, { division: "CS", count: 6 }], 
    status: "emerging", quadrant: "urgent", avgLevel: 2.1, requiredLevel: 4 },
  { id: "demo-2", name: "AI/ML Operations", criticality: 4.8, coverage: 25, staffCount: 22, belowRequired: 26,
    topDivisions: [{ division: "DD", count: 7 }, { division: "DS", count: 5 }],
    status: "new", quadrant: "urgent", avgLevel: 1.8, requiredLevel: 4 },
  { id: "demo-3", name: "Zero Trust Architecture", criticality: 4.2, coverage: 42, staffCount: 19, belowRequired: 18,
    topDivisions: [{ division: "CS", count: 5 }, { division: "DS", count: 4 }],
    status: "emerging", quadrant: "urgent", avgLevel: 2.5, requiredLevel: 4 },
  
  // WATCH quadrant (low criticality, low coverage)  
  { id: "demo-4", name: "Legacy Systems", criticality: 2.2, coverage: 45, staffCount: 15, belowRequired: 12,
    topDivisions: [{ division: "OP", count: 4 }],
    status: "legacy", quadrant: "watch", avgLevel: 2.8, requiredLevel: 3 },
  { id: "demo-5", name: "Desktop Support", criticality: 1.8, coverage: 55, staffCount: 12, belowRequired: 8,
    topDivisions: [{ division: "DO", count: 3 }],
    status: "established", quadrant: "watch", avgLevel: 3.2, requiredLevel: 3 },
    
  // HEALTHY quadrant (high criticality, high coverage) - smaller dots
  { id: "demo-6", name: "Project Management", criticality: 4.0, coverage: 82, staffCount: 45, belowRequired: 5,
    topDivisions: [{ division: "DD", count: 3 }],
    status: "established", quadrant: "healthy", avgLevel: 3.8, requiredLevel: 3.5 },
  { id: "demo-7", name: "Stakeholder Engagement", criticality: 3.8, coverage: 78, staffCount: 38, belowRequired: 6,
    topDivisions: [{ division: "OP", count: 4 }],
    status: "established", quadrant: "healthy", avgLevel: 3.6, requiredLevel: 3 },
  { id: "demo-8", name: "Strategic Planning", criticality: 4.2, coverage: 75, staffCount: 32, belowRequired: 7,
    topDivisions: [{ division: "DD", count: 3 }],
    status: "established", quadrant: "healthy", avgLevel: 3.5, requiredLevel: 3 },
  { id: "demo-9", name: "Agile Methodology", criticality: 3.5, coverage: 85, staffCount: 42, belowRequired: 4,
    topDivisions: [{ division: "DD", count: 2 }],
    status: "established", quadrant: "healthy", avgLevel: 4.0, requiredLevel: 3.5 },
    
  // DEPRIORITIZE quadrant (low criticality, high coverage) - smallest dots
  { id: "demo-10", name: "Email Administration", criticality: 1.5, coverage: 92, staffCount: 50, belowRequired: 2,
    topDivisions: [{ division: "DO", count: 2 }],
    status: "legacy", quadrant: "deprioritize", avgLevel: 4.2, requiredLevel: 3 },
  { id: "demo-11", name: "Documentation", criticality: 2.0, coverage: 88, staffCount: 48, belowRequired: 3,
    topDivisions: [{ division: "MS", count: 3 }],
    status: "established", quadrant: "deprioritize", avgLevel: 4.0, requiredLevel: 3 },
];

export default function SkillRiskQuadrant({ skills }: Props) {
  const [quadrantData, setQuadrantData] = useState<SkillQuadrantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{
    open: boolean;
    skill: SkillQuadrantData | null;
  }>({ open: false, skill: null });

  useEffect(() => {
    fetchQuadrantData();
  }, [skills]);

  const fetchQuadrantData = async () => {
    if (skills.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Get all assessments with required levels and user division info
      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select(`
          skill_id, 
          user_id, 
          self_assessment, 
          required_level,
          users!inner(name, division)
        `)
        .eq("scope", "team");

      // Aggregate by skill
      const skillStats = new Map<string, {
        users: Set<string>;
        levels: number[];
        requiredLevels: number[];
        meetingRequired: number;
        belowRequired: number;
        divisionCounts: Map<string, number>;
        assessmentDetails: { userId: string; level: number; required: number; division: string }[];
      }>();

      (assessments || []).forEach((a: any) => {
        const stats = skillStats.get(a.skill_id) || {
          users: new Set(),
          levels: [],
          requiredLevels: [],
          meetingRequired: 0,
          belowRequired: 0,
          divisionCounts: new Map(),
          assessmentDetails: [],
        };
        stats.users.add(a.user_id);
        const division = a.users?.division || 'Unknown';
        
        if (a.self_assessment !== null) {
          stats.levels.push(a.self_assessment);
          const required = a.required_level || 3;
          
          if (a.self_assessment >= required) {
            stats.meetingRequired++;
          } else {
            stats.belowRequired++;
            // Count by division for gaps
            stats.divisionCounts.set(division, (stats.divisionCounts.get(division) || 0) + 1);
          }
          
          stats.assessmentDetails.push({
            userId: a.user_id,
            level: a.self_assessment,
            required,
            division,
          });
        }
        if (a.required_level) {
          stats.requiredLevels.push(a.required_level);
        }
        skillStats.set(a.skill_id, stats);
      });

      const data: SkillQuadrantData[] = skills.slice(0, 50).map((skill) => {
        const stats = skillStats.get(skill.id);
        const staffCount = stats?.users.size || 0;
        const avgLevel = stats?.levels.length
          ? stats.levels.reduce((a, b) => a + b, 0) / stats.levels.length
          : 0;
        const avgRequired = stats?.requiredLevels.length
          ? stats.requiredLevels.reduce((a, b) => a + b, 0) / stats.requiredLevels.length
          : 3;

        // Coverage: % of staff that have this skill at required level
        const coverage = staffCount > 0 && stats?.levels.length
          ? Math.round((stats.meetingRequired / stats.levels.length) * 100)
          : 0;

        // Criticality: based on status + required level
        let criticality = avgRequired;
        const status = skill.ai_suggested_status as SkillQuadrantData['status'];
        if (status === "emerging" || status === "new") {
          criticality = Math.min(5, criticality + 1);
        } else if (status === "legacy") {
          criticality = Math.max(1, criticality - 1);
        }

        // Top divisions with gaps
        const topDivisions = stats?.divisionCounts
          ? Array.from(stats.divisionCounts.entries())
              .map(([division, count]) => ({ division, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
          : [];

        // Determine quadrant with new thresholds
        let quadrant: SkillQuadrantData["quadrant"] = "deprioritize";
        if (coverage >= COVERAGE_TARGET && criticality >= CRITICALITY_THRESHOLD) quadrant = "healthy";
        else if (coverage >= COVERAGE_TARGET && criticality < CRITICALITY_THRESHOLD) quadrant = "deprioritize";
        else if (coverage < COVERAGE_TARGET && criticality >= CRITICALITY_THRESHOLD) quadrant = "urgent";
        else if (coverage < COVERAGE_TARGET && criticality < CRITICALITY_THRESHOLD) quadrant = "watch";

        return {
          id: skill.id,
          name: skill.name,
          criticality: Math.round(criticality * 10) / 10,
          coverage,
          staffCount,
          belowRequired: stats?.belowRequired || 0,
          topDivisions,
          status,
          quadrant,
          avgLevel: Math.round(avgLevel * 10) / 10,
          requiredLevel: Math.round(avgRequired * 10) / 10,
        };
      });

      const filteredData = data.filter((d) => d.staffCount > 0);
      
      // Use demo data if no real data available (for demo purposes)
      if (filteredData.length === 0) {
        setQuadrantData(DEMO_DATA);
      } else {
        setQuadrantData(filteredData);
      }
    } catch (error) {
      console.error("Error fetching quadrant data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDotClick = (skill: SkillQuadrantData) => {
    setDrillDown({ open: true, skill });
  };

  const urgentCount = quadrantData.filter((d) => d.quadrant === "urgent").length;
  const watchCount = quadrantData.filter((d) => d.quadrant === "watch").length;

  // Top 3 urgent skills for labeling
  const topUrgent = useMemo(() => {
    return quadrantData
      .filter((d) => d.quadrant === "urgent")
      .sort((a, b) => b.belowRequired - a.belowRequired)
      .slice(0, 3)
      .map((d) => d.id);
  }, [quadrantData]);

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "urgent": return "hsl(var(--destructive))";
      case "watch": return "hsl(var(--chart-4))";
      case "healthy": return "hsl(var(--chart-1))";
      default: return "hsl(var(--muted-foreground))";
    }
  };

  const getPointRadius = (belowRequired: number) => {
    // Size based on staff below required - more aggressive scaling for visual impact
    return Math.min(22, Math.max(6, belowRequired * 0.6 + 4));
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Risk & Impact Matrix
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[340px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Risk & Impact Matrix
              </CardTitle>
              <CardDescription>Click a skill to see staff gaps and recommended actions</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {watchCount > 0 && (
                <Badge variant="secondary" className="gap-1">
                  {watchCount} Watch
                </Badge>
              )}
              {urgentCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {urgentCount} Urgent
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 30, right: 30, bottom: 40, left: 30 }}>
                {/* Quadrant background fills */}
                <ReferenceArea 
                  x1={CRITICALITY_THRESHOLD} x2={5} y1={0} y2={COVERAGE_TARGET} 
                  fill="hsl(var(--destructive))" fillOpacity={0.12}
                />
                <ReferenceArea 
                  x1={CRITICALITY_THRESHOLD} x2={5} y1={COVERAGE_TARGET} y2={100} 
                  fill="hsl(var(--chart-1))" fillOpacity={0.10}
                />
                <ReferenceArea 
                  x1={1} x2={CRITICALITY_THRESHOLD} y1={0} y2={COVERAGE_TARGET} 
                  fill="hsl(var(--chart-4))" fillOpacity={0.10}
                />
                <ReferenceArea 
                  x1={1} x2={CRITICALITY_THRESHOLD} y1={COVERAGE_TARGET} y2={100} 
                  fill="hsl(var(--muted))" fillOpacity={0.25}
                />

                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                
                <XAxis
                  type="number"
                  dataKey="criticality"
                  domain={[1, 5]}
                  ticks={[1, 2, 3, 4, 5]}
                  name="Criticality"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => {
                    if (value === 1) return "Low";
                    if (value === 5) return "High";
                    return value.toString();
                  }}
                  label={{ value: "Business Criticality →", position: "bottom", offset: 20, fontSize: 11 }}
                />
                <YAxis
                  type="number"
                  dataKey="coverage"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 70, 100]}
                  name="Coverage"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) => `${value}%`}
                  label={{ value: "Coverage (% meeting required) →", angle: -90, position: "insideLeft", offset: 0, fontSize: 10, dy: 60 }}
                />

                {/* Quadrant divider lines */}
                <ReferenceLine 
                  x={CRITICALITY_THRESHOLD} 
                  stroke="hsl(var(--border))" 
                  strokeWidth={1.5}
                  strokeDasharray="4 4" 
                />
                <ReferenceLine 
                  y={COVERAGE_TARGET} 
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{ 
                    value: "70% Target", 
                    position: "right", 
                    fontSize: 9, 
                    fill: "hsl(var(--chart-1))",
                    offset: 5
                  }}
                />

                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as SkillQuadrantData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm min-w-[200px]">
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: getQuadrantColor(d.quadrant) }}
                          />
                          <p className="font-semibold">{d.name}</p>
                          {d.status && (
                            <Badge variant="outline" className="text-xs py-0 h-5">
                              {d.status}
                            </Badge>
                          )}
                        </div>
                        <Separator className="my-2" />
                        <div className="space-y-1 text-muted-foreground">
                          <div className="flex justify-between">
                            <span>Coverage:</span>
                            <span className="font-medium text-foreground">{d.coverage}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Criticality:</span>
                            <span className="font-medium text-foreground">{d.criticality}/5</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Below required:</span>
                            <span className="font-medium text-foreground">{d.belowRequired} staff</span>
                          </div>
                        </div>
                        {d.topDivisions.length > 0 && (
                          <>
                            <Separator className="my-2" />
                            <p className="text-xs text-muted-foreground mb-1">Top divisions impacted:</p>
                            <div className="flex flex-wrap gap-1">
                              {d.topDivisions.map((div) => (
                                <Badge key={div.division} variant="secondary" className="text-xs py-0">
                                  {div.division} ({div.count})
                                </Badge>
                              ))}
                            </div>
                          </>
                        )}
                        <Separator className="my-2" />
                        <p className="text-xs text-primary font-medium">Click to view details →</p>
                      </div>
                    );
                  }}
                />

                <Scatter
                  data={quadrantData}
                  onClick={(data) => handleDotClick(data as unknown as SkillQuadrantData)}
                  cursor="pointer"
                >
                  {quadrantData.map((entry, index) => {
                    const isEmerging = entry.status === 'emerging' || entry.status === 'new';
                    const isLegacy = entry.status === 'legacy';
                    const isTopUrgent = topUrgent.includes(entry.id);
                    
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={isEmerging ? "transparent" : getQuadrantColor(entry.quadrant)}
                        stroke={getQuadrantColor(entry.quadrant)}
                        strokeWidth={isEmerging ? 2.5 : 1}
                        fillOpacity={isLegacy ? 0.4 : 0.85}
                        r={getPointRadius(entry.belowRequired)}
                      />
                    );
                  })}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant Labels - positioned on chart */}
          <div className="relative -mt-[310px] h-[280px] pointer-events-none">
            <span className="absolute top-2 right-4 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
              HEALTHY
            </span>
            <span className="absolute top-2 left-12 text-xs font-semibold text-gray-600 bg-gray-200/80 px-2 py-0.5 rounded">
              DEPRIORITIZE
            </span>
            <span className="absolute bottom-8 right-4 text-xs font-semibold text-red-700 bg-red-100/80 px-2 py-0.5 rounded">
              URGENT
            </span>
            <span className="absolute bottom-8 left-12 text-xs font-semibold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
              WATCH
            </span>
          </div>

          {/* Legend */}
          <div className="mt-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-1.5 p-2 rounded bg-destructive/5 border border-destructive/20">
                <div className="w-3 h-3 rounded-full bg-destructive" />
                <span className="font-medium">Urgent</span>
                <span className="text-muted-foreground ml-auto">{quadrantData.filter(d => d.quadrant === 'urgent').length}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded bg-chart-4/5 border border-chart-4/20">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
                <span className="font-medium">Watch</span>
                <span className="text-muted-foreground ml-auto">{quadrantData.filter(d => d.quadrant === 'watch').length}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded bg-chart-1/5 border border-chart-1/20">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
                <span className="font-medium">Healthy</span>
                <span className="text-muted-foreground ml-auto">{quadrantData.filter(d => d.quadrant === 'healthy').length}</span>
              </div>
              <div className="flex items-center gap-1.5 p-2 rounded bg-muted/50">
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span className="font-medium">Deprioritize</span>
                <span className="text-muted-foreground ml-auto">{quadrantData.filter(d => d.quadrant === 'deprioritize').length}</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full border-2 border-muted-foreground bg-transparent" />
                <span>Outlined = Emerging/New skill</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
                <div className="w-3 h-3 rounded-full bg-muted-foreground" />
                <span>Size = Staff below required</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Coverage = % of staff meeting required level for each skill. Target: 70%
            </p>
          </div>
        </CardContent>
      </Card>

      <SkillPeopleDrillDown
        open={drillDown.open}
        onOpenChange={(open) => setDrillDown((prev) => ({ ...prev, open }))}
        skillName={drillDown.skill?.name || ""}
        skillId={drillDown.skill?.id}
        category={drillDown.skill?.topDivisions?.[0]?.division}
        lifecycleStage={drillDown.skill?.status || "Established"}
      />
    </>
  );
}
