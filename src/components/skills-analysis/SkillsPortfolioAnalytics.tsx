import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Briefcase, TrendingUp, AlertTriangle, Sparkles, Clock, CheckCircle2, Building2, Target, ShieldAlert, Globe } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import FutureReadinessCard from "./FutureReadinessCard";
import EmergingSkillsGaps from "./EmergingSkillsGaps";
import DivisionSkillCell from "./DivisionSkillCell";
import DivisionSkillDrillDown from "./DivisionSkillDrillDown";
import SkillStatusBar from "./SkillStatusBar";
import SkillRiskQuadrant from "./SkillRiskQuadrant";
import SkillsDataQuality from "./SkillsDataQuality";
import OrganizationFilters, { FilterState } from "./OrganizationFilters";
import SkillsInsightsStrip from "./SkillsInsightsStrip";
interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  skill_type?: string | null;
  ai_suggested_status: string | null;
  ai_suggested_category: string | null;
  is_open_source?: boolean;
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

const DIVISIONS = ['CS', 'DD', 'DO', 'DS', 'MS', 'OP'];

export default function SkillsPortfolioAnalytics() {
  const { userRoles } = useAuth();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    division: "All",
    dutyStation: "All",
    grade: "All",
    workerType: "All",
    viewMode: "skill",
    ossOnly: false,
  });

  // Action KPIs
  const [criticalGaps, setCriticalGaps] = useState(0);
  const [coverageRate, setCoverageRate] = useState(0);
  
  // Gap data for insights strip
  const [gapData, setGapData] = useState<{
    skillId: string;
    skillName: string;
    gapSize: number;
    belowRequired: number;
    avgLevel: number;
    requiredLevel: number;
    priority: 'high' | 'medium' | 'low';
    topDivisions: { division: string; count: number }[];
  }[]>([]);
  
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

  // Refs for scrolling
  const emergingGapsRef = useRef<HTMLDivElement>(null);
  const statusBarRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRoles.some(r => ['Admin', 'HR Assistant', 'Chief of HR'].includes(r));

  // OSS product data
  const [ossProducts, setOssProducts] = useState<{ name: string; staffCount: number; license_type: string | null }[]>([]);

  useEffect(() => {
    fetchSkillsData();
    fetchActionKPIs();
    if (isAdmin) {
      fetchDivisionSkillsData();
      fetchOssProductData();
    }
  }, [isAdmin, filters.division, filters.dutyStation, filters.grade, filters.workerType]);

  const fetchSkillsData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, ai_suggested_status, ai_suggested_category, is_open_source')
      .eq('is_active', true);
    
    setSkills(data || []);
    setLoading(false);
  };

  const fetchActionKPIs = async () => {
    // First get filtered user IDs if filters are applied
    const hasFilters = filters.division !== "All" || filters.dutyStation !== "All" || 
                       filters.grade !== "All" || filters.workerType !== "All";
    
    let filteredUserIds: string[] = [];
    if (hasFilters) {
      let userQuery = supabase.from("users").select("id");
      if (filters.division !== "All") userQuery = userQuery.eq("division", filters.division);
      if (filters.dutyStation !== "All") userQuery = userQuery.eq("duty_station", filters.dutyStation);
      if (filters.grade !== "All") userQuery = userQuery.eq("current_grade", filters.grade);
      if (filters.workerType !== "All") userQuery = userQuery.eq("worker_type", filters.workerType);
      
      const { data: filteredUsers } = await userQuery;
      filteredUserIds = filteredUsers?.map(u => u.id) || [];
      
      // If no users match filters, set empty KPIs
      if (filteredUserIds.length === 0) {
        setCriticalGaps(0);
        setCoverageRate(0);
        return;
      }
    }

    // Calculate critical gaps (skills where avg < required)
    let assessmentQuery = supabase
      .from('skill_assessments')
      .select('skill_id, user_id, self_assessment, required_level')
      .eq('scope', 'team')
      .not('required_level', 'is', null);
    
    if (hasFilters && filteredUserIds.length > 0) {
      assessmentQuery = assessmentQuery.in('user_id', filteredUserIds);
    }

    const { data: assessments } = await assessmentQuery;

    const skillGaps = new Map<string, { total: number; belowRequired: number }>();
    (assessments || []).forEach(a => {
      const stats = skillGaps.get(a.skill_id) || { total: 0, belowRequired: 0 };
      stats.total++;
      if (a.self_assessment !== null && a.required_level !== null && a.self_assessment < a.required_level) {
        stats.belowRequired++;
      }
      skillGaps.set(a.skill_id, stats);
    });

    // Count skills where >50% are below required
    let criticalCount = 0;
    skillGaps.forEach(stats => {
      if (stats.total > 0 && (stats.belowRequired / stats.total) > 0.5) {
        criticalCount++;
      }
    });
    setCriticalGaps(criticalCount);

    // Calculate coverage rate (% meeting required for critical skills)
    let totalAssessed = 0;
    let meetingRequired = 0;
    (assessments || []).forEach(a => {
      if (a.self_assessment !== null && a.required_level !== null) {
        totalAssessed++;
        if (a.self_assessment >= a.required_level) {
          meetingRequired++;
        }
      }
    });
    setCoverageRate(totalAssessed > 0 ? Math.round((meetingRequired / totalAssessed) * 100) : 0);
  };

  const fetchDivisionSkillsData = async () => {
    setMatrixLoading(true);
    try {
      // Build query with filters
      let query = supabase
        .from("users")
        .select("id, division")
        .in("division", DIVISIONS);
      
      // Apply filters
      if (filters.division !== "All") query = query.eq("division", filters.division);
      if (filters.dutyStation !== "All") query = query.eq("duty_station", filters.dutyStation);
      if (filters.grade !== "All") query = query.eq("current_grade", filters.grade);
      if (filters.workerType !== "All") query = query.eq("worker_type", filters.workerType);

      const { data: users } = await query;

      if (!users) {
        setDivisionStaffCounts({});
        setDivisionData([]);
        return;
      }

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

      // Only fetch assessments for filtered users
      const userIds = users.map(u => u.id);
      if (userIds.length === 0) {
        setDivisionData([]);
        return;
      }

      const { data: assessments } = await supabase
        .from("skill_assessments")
        .select("user_id, skill_id, self_assessment, has_credential")
        .eq("scope", "team")
        .in("user_id", userIds);

      if (!assessments) return;

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

  const fetchOssProductData = async () => {
    try {
      // Get product-to-skill mappings
      const { data: mappings } = await supabase
        .from('product_skill_mappings')
        .select('product_id, skill_id');

      if (!mappings || mappings.length === 0) {
        setOssProducts([]);
        return;
      }

      // Get products
      const { data: products } = await supabase
        .from('open_source_products')
        .select('id, name, license_type')
        .eq('is_active', true);

      if (!products) {
        setOssProducts([]);
        return;
      }

      // Get assessment counts per skill
      const { data: assessments } = await supabase
        .from('skill_assessments')
        .select('skill_id, user_id')
        .eq('scope', 'team');

      // Build skill -> unique user count
      const skillUserCounts = new Map<string, Set<string>>();
      (assessments || []).forEach(a => {
        if (!skillUserCounts.has(a.skill_id)) skillUserCounts.set(a.skill_id, new Set());
        skillUserCounts.get(a.skill_id)!.add(a.user_id);
      });

      // Build product -> staff count via mappings
      const productStaffMap = new Map<string, Set<string>>();
      mappings.forEach(m => {
        const users = skillUserCounts.get(m.skill_id);
        if (users) {
          if (!productStaffMap.has(m.product_id)) productStaffMap.set(m.product_id, new Set());
          users.forEach(u => productStaffMap.get(m.product_id)!.add(u));
        }
      });

      const result = products
        .map(p => ({
          name: p.name,
          license_type: p.license_type,
          staffCount: productStaffMap.get(p.id)?.size || 0,
        }))
        .sort((a, b) => b.staffCount - a.staffCount)
        .slice(0, 10);

      setOssProducts(result);
    } catch (error) {
      console.error("Error fetching OSS product data:", error);
    }
  };

  // Apply OSS filter to skills
  const effectiveSkills = useMemo(() => {
    if (!filters.ossOnly) return skills;
    return skills.filter(s => s.is_open_source === true);
  }, [skills, filters.ossOnly]);

  // OSS analytics metrics
  const ossMetrics = useMemo(() => {
    const ossSkills = skills.filter(s => s.is_open_source === true);
    const ossPercent = skills.length > 0 ? Math.round((ossSkills.length / skills.length) * 100) : 0;

    // Division OSS breakdown from divisionData
    const divisionOss = DIVISIONS.map(div => {
      const divAssessments = divisionData.filter(d => d.division === div);
      const ossSkillIds = new Set(ossSkills.map(s => s.id));
      const ossAssessments = divAssessments.filter(d => ossSkillIds.has(d.skillId));
      const totalOssStaff = new Set(ossAssessments.flatMap(d => Array(d.staffWithSkill).fill(null))).size;
      const avgProf = ossAssessments.length > 0
        ? ossAssessments.reduce((sum, d) => sum + (d.averageLevel || 0), 0) / ossAssessments.length
        : 0;
      return {
        division: div,
        ossSkillCount: ossAssessments.length,
        staffWithOss: ossAssessments.reduce((sum, d) => sum + d.staffWithSkill, 0),
        avgProficiency: Math.round(avgProf * 10) / 10,
      };
    });

    return { ossCount: ossSkills.length, ossPercent, divisionOss };
  }, [skills, divisionData]);

  const metrics = useMemo(() => {
    const statusCounts: Record<string, number> = {
      established: 0,
      emerging: 0,
      new: 0,
      legacy: 0,
      uncategorized: 0,
    };

    const categoryStatusCounts: Record<string, Record<string, number>> = {};

    effectiveSkills.forEach(skill => {
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

    const totalCategorized = effectiveSkills.length - statusCounts.uncategorized;
    const modernizationRate = totalCategorized > 0
      ? Math.round(((statusCounts.new + statusCounts.emerging) / totalCategorized) * 100)
      : 0;

    const legacyRisk = totalCategorized > 0
      ? Math.round((statusCounts.legacy / totalCategorized) * 100)
      : 0;

    const barData: BarDataItem[] = Object.entries(categoryStatusCounts)
      .map(([category, counts]) => ({
        category: category.length > 12 ? category.slice(0, 12) + '…' : category,
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
      total: effectiveSkills.length,
      statusCounts,
      modernizationRate,
      legacyRisk,
      barData,
    };
  }, [effectiveSkills]);

  const categories = useMemo(() => {
    const cats = new Set(effectiveSkills.map(s => s.ai_suggested_category || s.category || "Other"));
    return ["all", ...Array.from(cats).sort()];
  }, [effectiveSkills]);

  const filteredSkillsForMatrix = useMemo(() => {
    if (selectedCategory === "all") return effectiveSkills;
    return effectiveSkills.filter(s => (s.ai_suggested_category || s.category || "Other") === selectedCategory);
  }, [effectiveSkills, selectedCategory]);

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

  // Scroll handler for insights strip
  const handleScrollTo = useCallback((section: string) => {
    if (section === 'emerging-gaps' && emergingGapsRef.current) {
      emergingGapsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (section === 'status-bar' && statusBarRef.current) {
      statusBarRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Handler for gap data from EmergingSkillsGaps
  const handleGapDataUpdate = useCallback((data: typeof gapData) => {
    setGapData(data);
  }, []);

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
      {/* Filter Bar + Data Quality */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <OrganizationFilters filters={filters} onChange={setFilters} />
        </div>
        <div className="w-full lg:w-72">
          <SkillsDataQuality />
        </div>
      </div>

      {/* Insights Strip - Admin Only */}
      {isAdmin && !matrixLoading && divisionData.length > 0 && (
        <SkillsInsightsStrip
          divisionData={divisionData}
          divisionStaffCounts={divisionStaffCounts}
          skills={effectiveSkills}
          gapData={gapData}
          onScrollTo={handleScrollTo}
          onDivisionClick={(division) => {
            setDrillDown({
              open: true,
              division,
              skillId: skills.find(s => s.ai_suggested_status === 'emerging')?.id || '',
              skillName: 'Division Overview',
              isCredential: false,
            });
          }}
        />
      )}

      {/* KPI Cards - 6 columns */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatsCard
          title="Total Skills"
          value={metrics.total}
          subtitle="in portfolio"
          icon={Briefcase}
        />
        <StatsCard
          title="Emerging"
          value={metrics.statusCounts.emerging}
          subtitle={`+${metrics.statusCounts.new} new`}
          icon={TrendingUp}
        />
        <StatsCard
          title="Modernization"
          value={`${metrics.modernizationRate}%`}
          subtitle="new + emerging"
          icon={Sparkles}
        />
        <StatsCard
          title="Legacy"
          value={metrics.statusCounts.legacy}
          subtitle={metrics.legacyRisk > 20 ? "Review needed" : "OK"}
          icon={Clock}
          alert={metrics.legacyRisk > 20}
        />
        <StatsCard
          title="Critical Gaps"
          value={criticalGaps}
          subtitle="high priority"
          icon={ShieldAlert}
          alert={criticalGaps > 5}
        />
        <StatsCard
          title="Coverage"
          value={`${coverageRate}%`}
          subtitle="meeting required"
          icon={Target}
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

      {/* Charts Row: Status Bar + Risk Quadrant */}
      <div ref={statusBarRef} className="grid gap-6 lg:grid-cols-2">
        <SkillStatusBar 
          statusCounts={{
            established: metrics.statusCounts.established,
            emerging: metrics.statusCounts.emerging,
            new: metrics.statusCounts.new,
            legacy: metrics.statusCounts.legacy,
          }} 
          total={metrics.total} 
        />
        <SkillRiskQuadrant skills={effectiveSkills} />
      </div>

      {/* Future Readiness + Skills by Category */}
      <div className="grid gap-6 lg:grid-cols-2">
        <FutureReadinessCard skills={effectiveSkills} />
        
        {/* Skills by Category Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Skills by Category</CardTitle>
            <CardDescription>Breakdown across skill categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.barData} layout="vertical" margin={{ left: 0, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    width={90} 
                    tick={{ fontSize: 10 }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
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

      {/* Emerging Skills Gaps - Full Width */}
      <div ref={emergingGapsRef}>
        <EmergingSkillsGaps skills={effectiveSkills} onGapDataUpdate={handleGapDataUpdate} />
      </div>

      {/* Open Source Coverage Analytics */}
      {isAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Open Source Coverage
            </CardTitle>
            <CardDescription>OSS skill adoption and product usage across the organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KPI Row */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{ossMetrics.ossCount}</p>
                <p className="text-xs text-muted-foreground">OSS Skills</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">{ossMetrics.ossPercent}%</p>
                <p className="text-xs text-muted-foreground">of Portfolio</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold">
                  {ossMetrics.divisionOss.reduce((sum, d) => sum + d.staffWithOss, 0)}
                </p>
                <p className="text-xs text-muted-foreground">Staff with OSS Skills</p>
              </div>
            </div>

            {/* Division Breakdown + Top Products side by side */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Division Breakdown */}
              <div>
                <h4 className="text-sm font-medium mb-3">Division Breakdown</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Division</TableHead>
                      <TableHead className="text-center">OSS Skills</TableHead>
                      <TableHead className="text-center">Staff</TableHead>
                      <TableHead className="text-center">Avg Prof.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ossMetrics.divisionOss.map(d => (
                      <TableRow key={d.division}>
                        <TableCell className="font-medium">{d.division}</TableCell>
                        <TableCell className="text-center">{d.ossSkillCount}</TableCell>
                        <TableCell className="text-center">{d.staffWithOss}</TableCell>
                        <TableCell className="text-center">
                          {d.avgProficiency > 0 ? d.avgProficiency : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Top Open Source Products */}
              <div>
                <h4 className="text-sm font-medium mb-3">Top Open Source Products</h4>
                {ossProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4">
                    No products configured yet. Add products from the Admin Skills Review page.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>License</TableHead>
                        <TableHead className="text-center">Staff</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ossProducts.map(p => (
                        <TableRow key={p.name}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.license_type || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">{p.staffCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                              <TableCell className="font-medium">
                                <span className="flex items-center gap-1">
                                  {skill.name}
                                  {skill.is_open_source && <Globe className="h-3 w-3 text-primary shrink-0" />}
                                </span>
                              </TableCell>
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