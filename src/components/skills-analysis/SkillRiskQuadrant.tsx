import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, ResponsiveContainer, ReferenceLine, Cell, Tooltip as RechartsTooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Target, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

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
  quadrant: "urgent" | "monitor" | "healthy" | "low-priority";
  avgLevel: number;
}

interface StaffGap {
  userId: string;
  userName: string;
  currentLevel: number;
  requiredLevel: number;
  gap: number;
}

export default function SkillRiskQuadrant({ skills }: Props) {
  const [quadrantData, setQuadrantData] = useState<SkillQuadrantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [drillDown, setDrillDown] = useState<{
    open: boolean;
    skill: SkillQuadrantData | null;
    staffGaps: StaffGap[];
  }>({ open: false, skill: null, staffGaps: [] });

  useEffect(() => {
    fetchQuadrantData();
  }, [skills]);

  const fetchQuadrantData = async () => {
    if (skills.length === 0) {
      setLoading(false);
      return;
    }

    try {
      // Get all assessments with required levels
      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select("skill_id, user_id, self_assessment, required_level")
        .eq("scope", "team");

      // Get total staff count
      const { count: totalStaff } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true });

      const staffTotal = totalStaff || 1;

      // Aggregate by skill
      const skillStats = new Map<string, {
        users: Set<string>;
        levels: number[];
        requiredLevels: number[];
        meetingRequired: number;
      }>();

      (assessments || []).forEach((a) => {
        const stats = skillStats.get(a.skill_id) || {
          users: new Set(),
          levels: [],
          requiredLevels: [],
          meetingRequired: 0,
        };
        stats.users.add(a.user_id);
        if (a.self_assessment !== null) {
          stats.levels.push(a.self_assessment);
          if (a.required_level && a.self_assessment >= a.required_level) {
            stats.meetingRequired++;
          }
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
        if (skill.ai_suggested_status === "emerging" || skill.ai_suggested_status === "new") {
          criticality = Math.min(5, criticality + 1);
        } else if (skill.ai_suggested_status === "legacy") {
          criticality = Math.max(1, criticality - 1);
        }

        // Determine quadrant
        let quadrant: SkillQuadrantData["quadrant"] = "low-priority";
        if (coverage >= 50 && criticality >= 3) quadrant = "healthy";
        else if (coverage >= 50 && criticality < 3) quadrant = "monitor";
        else if (coverage < 50 && criticality >= 3) quadrant = "urgent";

        return {
          id: skill.id,
          name: skill.name,
          criticality: Math.round(criticality * 10) / 10,
          coverage,
          staffCount,
          quadrant,
          avgLevel: Math.round(avgLevel * 10) / 10,
        };
      });

      setQuadrantData(data.filter((d) => d.staffCount > 0));
    } catch (error) {
      console.error("Error fetching quadrant data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDotClick = async (skill: SkillQuadrantData) => {
    // Fetch staff with gaps for this skill
    const { data: assessments } = await supabase
      .from("skill_assessments")
      .select(`
        user_id,
        self_assessment,
        required_level,
        users!inner(name)
      `)
      .eq("skill_id", skill.id)
      .eq("scope", "team")
      .not("self_assessment", "is", null);

    const staffGaps: StaffGap[] = (assessments || [])
      .map((a: any) => ({
        userId: a.user_id,
        userName: a.users?.name || "Unknown",
        currentLevel: a.self_assessment || 0,
        requiredLevel: a.required_level || 3,
        gap: (a.required_level || 3) - (a.self_assessment || 0),
      }))
      .filter((s) => s.gap > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 15);

    setDrillDown({ open: true, skill, staffGaps });
  };

  const urgentCount = quadrantData.filter((d) => d.quadrant === "urgent").length;

  const getQuadrantColor = (quadrant: string) => {
    switch (quadrant) {
      case "urgent": return "hsl(var(--destructive))";
      case "monitor": return "hsl(var(--chart-4))";
      case "healthy": return "hsl(var(--chart-1))";
      default: return "hsl(var(--muted-foreground))";
    }
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
          <Skeleton className="h-[300px] w-full" />
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
              <CardDescription>Click a skill to see staff gaps</CardDescription>
            </div>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                {urgentCount} Urgent
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis
                  type="number"
                  dataKey="criticality"
                  domain={[0, 5]}
                  tickCount={6}
                  name="Criticality"
                  label={{ value: "Business Criticality →", position: "bottom", offset: 10, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="coverage"
                  domain={[0, 100]}
                  tickCount={5}
                  name="Coverage"
                  label={{ value: "Coverage % →", angle: -90, position: "insideLeft", offset: 5, fontSize: 11 }}
                  tick={{ fontSize: 10 }}
                />
                {/* Quadrant reference lines */}
                <ReferenceLine x={3} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                <ReferenceLine y={50} stroke="hsl(var(--border))" strokeDasharray="3 3" />
                
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as SkillQuadrantData;
                    return (
                      <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                        <p className="font-semibold">{d.name}</p>
                        <p className="text-muted-foreground">Coverage: {d.coverage}%</p>
                        <p className="text-muted-foreground">Criticality: {d.criticality}/5</p>
                        <p className="text-muted-foreground">Staff: {d.staffCount}</p>
                        <p className="text-xs mt-1 text-primary">Click to drill down</p>
                      </div>
                    );
                  }}
                />
                <Scatter
                  data={quadrantData}
                  onClick={(data) => handleDotClick(data as unknown as SkillQuadrantData)}
                  cursor="pointer"
                >
                  {quadrantData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getQuadrantColor(entry.quadrant)}
                      fillOpacity={0.8}
                      r={Math.min(8, Math.max(4, entry.staffCount / 5))}
                    />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Quadrant Legend */}
          <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
              <div className="w-2.5 h-2.5 rounded-full bg-destructive" />
              <span>Urgent</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--chart-4))" }} />
              <span>Monitor</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: "hsl(var(--chart-1))" }} />
              <span>Healthy</span>
            </div>
            <div className="flex items-center gap-1.5 p-1.5 rounded bg-muted/50">
              <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground" />
              <span>Low Priority</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-Down Dialog */}
      <Dialog open={drillDown.open} onOpenChange={(open) => setDrillDown((prev) => ({ ...prev, open }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Staff Gaps: {drillDown.skill?.name}</DialogTitle>
            <DialogDescription>
              Staff who are below required level for this skill
            </DialogDescription>
          </DialogHeader>
          {drillDown.staffGaps.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              No staff gaps found for this skill
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead className="text-center">Current</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="text-center">Gap</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {drillDown.staffGaps.map((staff) => (
                  <TableRow key={staff.userId}>
                    <TableCell className="font-medium">{staff.userName}</TableCell>
                    <TableCell className="text-center">{staff.currentLevel}</TableCell>
                    <TableCell className="text-center">{staff.requiredLevel}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={staff.gap >= 2 ? "destructive" : "secondary"}>
                        -{staff.gap}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}