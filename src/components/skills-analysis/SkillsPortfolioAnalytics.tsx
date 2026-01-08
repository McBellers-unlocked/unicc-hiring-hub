import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, TrendingUp, AlertTriangle, Sparkles, Clock, CheckCircle2, Building2 } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import FutureReadinessCard from "./FutureReadinessCard";
import EmergingSkillsGaps from "./EmergingSkillsGaps";
import DivisionSkillCell from "./DivisionSkillCell";
import DivisionSkillDrillDown from "./DivisionSkillDrillDown";

interface SkillStatusData {
  status: string | null;
  category: string | null;
  count: number;
}

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  skill_type?: string | null;
  ai_suggested_status: string | null;
  ai_suggested_category: string | null;
}

interface BarDataItem {
  category: string;
  fullCategory: string;
  established: number;
  emerging: number;
  new: number;
  legacy: number;
}

interface DivisionSkillAggregation {
  division: string;
  skillId: string;
  staffWithSkill: number;
  totalStaff: number;
  averageLevel: number | null;
  credentialCount: number;
}

const STATUS_COLORS: Record<string, string> = {
  established: "hsl(var(--chart-1))",
  emerging: "hsl(var(--chart-2))",
  new: "hsl(var(--chart-3))",
  legacy: "hsl(var(--chart-4))",
  uncategorized: "hsl(var(--muted-foreground))",
};

const STATUS_LABELS: Record<string, string> = {
  established: "Established",
  emerging: "Emerging",
  new: "New",
  legacy: "Legacy",
  uncategorized: "Uncategorized",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  established: <CheckCircle2 className="h-4 w-4" />,
  emerging: <TrendingUp className="h-4 w-4" />,
  new: <Sparkles className="h-4 w-4" />,
  legacy: <Clock className="h-4 w-4" />,
};

const DIVISIONS = ['CS', 'DD', 'DO', 'DS', 'MS', 'OP'];

export default function SkillsPortfolioAnalytics() {
  const { userRoles } = useAuth();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Organization matrix state (admin only)
  const [divisionData, setDivisionData] = useState<DivisionSkillAggregation[]>([]);
  const [divisionStaffCounts, setDivisionStaffCounts] = useState<Record<string, number>>({});
  const [matrixLoading, setMatrixLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [drillDown, setDrillDown] = useState<{
    open: boolean;
    division: string;
    skillId: string;
    skillName: string;
    isCredential: boolean;
  }>({ open: false, division: "", skillId: "", skillName: "", isCredential: false });

  const isAdmin = userRoles.some(r => ['Admin', 'HR Assistant', 'Chief of HR'].includes(r));

  useEffect(() => {
    fetchSkillsData();
    if (isAdmin) {
      fetchDivisionSkillsData();
    }
  }, [isAdmin]);

  const fetchSkillsData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, ai_suggested_status, ai_suggested_category')
      .eq('is_active', true);
    
    setSkills(data || []);
    setLoading(false);
  };

  const fetchDivisionSkillsData = async () => {
    setMatrixLoading(true);
    try {
      // Get staff counts by division
      const { data: users } = await supabase
        .from("users")
        .select("id, division")
        .in("division", DIVISIONS);

      if (!users) return;

      const staffCounts: Record<string, number> = {};
      const userDivisionMap = new Map<string, string>();
      
      DIVISIONS.forEach(d => staffCounts[d] = 0);
      users.forEach(u => {
        if (u.division) {
          staffCounts[u.division] = (staffCounts[u.division] || 0) + 1;
          userDivisionMap.set(u.id, u.division);
        }
      });
      setDivisionStaffCounts(staffCounts);

      // Get all skill assessments
      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select("user_id, skill_id, self_assessment, has_credential")
        .eq("scope", "team");

      if (!assessments) return;

      // Aggregate by division and skill
      const aggregationMap = new Map<string, {
        levels: number[];
        credentialCount: number;
        staffSet: Set<string>;
      }>();

      assessments.forEach(a => {
        const division = userDivisionMap.get(a.user_id);
        if (!division) return;

        const key = `${division}:${a.skill_id}`;
        if (!aggregationMap.has(key)) {
          aggregationMap.set(key, { levels: [], credentialCount: 0, staffSet: new Set() });
        }
        
        const agg = aggregationMap.get(key)!;
        agg.staffSet.add(a.user_id);
        
        if (a.self_assessment !== null) {
          agg.levels.push(a.self_assessment);
        }
        if (a.has_credential) {
          agg.credentialCount++;
        }
      });

      const divisionAggregations: DivisionSkillAggregation[] = [];
      aggregationMap.forEach((agg, key) => {
        const [division, skillId] = key.split(":");
        const avgLevel = agg.levels.length > 0 
          ? agg.levels.reduce((a, b) => a + b, 0) / agg.levels.length 
          : null;

        divisionAggregations.push({
          division,
          skillId,
          staffWithSkill: agg.staffSet.size,
          totalStaff: staffCounts[division] || 0,
          averageLevel: avgLevel,
          credentialCount: agg.credentialCount,
        });
      });

      setDivisionData(divisionAggregations);
    } catch (error) {
      console.error("Error fetching division skills:", error);
    } finally {
      setMatrixLoading(false);
    }
  };

  const metrics = useMemo(() => {
    const statusCounts: Record<string, number> = {
      established: 0,
      emerging: 0,
      new: 0,
      legacy: 0,
      uncategorized: 0,
    };

    const categoryStatusCounts: Record<string, Record<string, number>> = {};

    skills.forEach(skill => {
      const status = skill.ai_suggested_status || 'uncategorized';
      statusCounts[status] = (statusCounts[status] || 0) + 1;

      const category = skill.ai_suggested_category || skill.category || 'Other';
      if (!categoryStatusCounts[category]) {
        categoryStatusCounts[category] = { established: 0, emerging: 0, new: 0, legacy: 0 };
      }
      if (status !== 'uncategorized') {
        categoryStatusCounts[category][status] = (categoryStatusCounts[category][status] || 0) + 1;
      }
    });

    const totalCategorized = skills.length - statusCounts.uncategorized;
    const modernizationRate = totalCategorized > 0
      ? Math.round(((statusCounts.new + statusCounts.emerging) / totalCategorized) * 100)
      : 0;

    const legacyRisk = totalCategorized > 0
      ? Math.round((statusCounts.legacy / totalCategorized) * 100)
      : 0;

    const pieData = Object.entries(statusCounts)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => ({
        name: STATUS_LABELS[status] || status,
        value: count,
        color: STATUS_COLORS[status],
        status,
      }));

    const barData: BarDataItem[] = Object.entries(categoryStatusCounts)
      .map(([category, counts]) => ({
        category: category.length > 15 ? category.slice(0, 15) + '...' : category,
        fullCategory: category,
        established: counts.established || 0,
        emerging: counts.emerging || 0,
        new: counts.new || 0,
        legacy: counts.legacy || 0,
      }))
      .filter(d => d.established + d.emerging + d.new + d.legacy > 0)
      .sort((a, b) => (b.established + b.emerging + b.new + b.legacy) - (a.established + a.emerging + a.new + a.legacy))
      .slice(0, 6);

    return {
      total: skills.length,
      statusCounts,
      modernizationRate,
      legacyRisk,
      pieData,
      barData,
    };
  }, [skills]);

  const categories = useMemo(() => {
    const cats = new Set(skills.map(s => s.ai_suggested_category || s.category || "Other"));
    return ["all", ...Array.from(cats).sort()];
  }, [skills]);

  const filteredSkillsForMatrix = useMemo(() => {
    if (selectedCategory === "all") return skills;
    return skills.filter(s => (s.ai_suggested_category || s.category || "Other") === selectedCategory);
  }, [skills, selectedCategory]);

  const getDivisionSkillData = (division: string, skillId: string) => {
    return divisionData.find(d => d.division === division && d.skillId === skillId);
  };

  const handleCellClick = (division: string, skill: SkillDefinition) => {
    setDrillDown({
      open: true,
      division,
      skillId: skill.id,
      skillName: skill.name,
      isCredential: skill.skill_type === "credential",
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Active Skills"
          value={metrics.total}
          subtitle="in portfolio"
          icon={Briefcase}
        />
        <StatsCard
          title="Emerging Skills"
          value={metrics.statusCounts.emerging}
          subtitle={`${metrics.statusCounts.new} new skills`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Modernization Rate"
          value={`${metrics.modernizationRate}%`}
          subtitle="new + emerging"
          icon={Sparkles}
        />
        <StatsCard
          title="Legacy Skills"
          value={metrics.statusCounts.legacy}
          subtitle={metrics.legacyRisk > 20 ? "Review needed" : "Acceptable level"}
          icon={Clock}
          alert={metrics.legacyRisk > 20}
        />
      </div>

      {/* Warning for uncategorized */}
      {metrics.statusCounts.uncategorized > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="text-sm">
              <strong>{metrics.statusCounts.uncategorized} skills</strong> have not been categorized yet. 
              Run AI categorization from the Admin Skills Review page.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skills by Status Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Skills by Status</CardTitle>
            <CardDescription>Distribution of skill lifecycle stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={metrics.pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                    labelLine={false}
                  >
                    {metrics.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} stroke="hsl(var(--background))" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <div className="flex items-center gap-2">
                            {STATUS_ICONS[item.status]}
                            <p className="font-medium text-sm">{item.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {item.value} skills ({((item.value / metrics.total) * 100).toFixed(1)}%)
                          </p>
                        </div>
                      );
                    }}
                  />
                  <Legend
                    content={({ payload }) => (
                      <div className="flex flex-wrap justify-center gap-3 pt-2">
                        {payload?.map((entry: any, index: number) => (
                          <div key={index} className="flex items-center gap-1.5 text-xs">
                            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
                            <span className="text-muted-foreground">{entry.value}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Skills by Category Stacked Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Skills by Category & Status</CardTitle>
            <CardDescription>Breakdown across skill categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.barData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    width={100} 
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg shadow-lg p-3">
                          <p className="font-medium text-sm mb-2">{data.fullCategory}</p>
                          {payload.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.fill }} />
                              <span>{STATUS_LABELS[item.dataKey]}: {item.value}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="established" stackId="a" fill={STATUS_COLORS.established} />
                  <Bar dataKey="emerging" stackId="a" fill={STATUS_COLORS.emerging} />
                  <Bar dataKey="new" stackId="a" fill={STATUS_COLORS.new} />
                  <Bar dataKey="legacy" stackId="a" fill={STATUS_COLORS.legacy} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Future Readiness & Emerging Gaps */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FutureReadinessCard skills={skills} />
        <EmergingSkillsGaps skills={skills} />
      </div>

      {/* Organization Skills Matrix - Admin Only */}
      {isAdmin && (
        <>
          <Separator className="my-8" />
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Organization Skills Matrix
                  </CardTitle>
                  <CardDescription>
                    Skill coverage and proficiency levels across divisions
                  </CardDescription>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.slice(1).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {matrixLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px]">Skill</TableHead>
                        <TableHead className="text-center w-20">Type</TableHead>
                        {DIVISIONS.map(div => (
                          <TableHead key={div} className="text-center min-w-[80px]">
                            <div className="font-medium">{div}</div>
                            <div className="text-xs text-muted-foreground font-normal">
                              {divisionStaffCounts[div] || 0}
                            </div>
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSkillsForMatrix.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                            No skills found for this category
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredSkillsForMatrix.map(skill => {
                          const isCredential = skill.skill_type === "credential";
                          return (
                            <TableRow key={skill.id}>
                              <TableCell className="font-medium">{skill.name}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant={isCredential ? "default" : "secondary"} className="text-xs">
                                  {isCredential ? "Cert" : "Skill"}
                                </Badge>
                              </TableCell>
                              {DIVISIONS.map(div => {
                                const data = getDivisionSkillData(div, skill.id);
                                return (
                                  <TableCell key={div} className="p-1">
                                    <DivisionSkillCell
                                      staffWithSkill={data?.staffWithSkill || 0}
                                      totalStaffInDivision={divisionStaffCounts[div] || 0}
                                      averageLevel={data?.averageLevel || null}
                                      credentialCount={data?.credentialCount || 0}
                                      isCredential={isCredential}
                                      onClick={() => handleCellClick(div, skill)}
                                    />
                                  </TableCell>
                                );
                              })}
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <DivisionSkillDrillDown
            open={drillDown.open}
            onOpenChange={(open) => setDrillDown(prev => ({ ...prev, open }))}
            division={drillDown.division}
            skillId={drillDown.skillId}
            skillName={drillDown.skillName}
            isCredential={drillDown.isCredential}
          />
        </>
      )}
    </div>
  );
}
