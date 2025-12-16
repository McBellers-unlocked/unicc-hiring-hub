import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Briefcase, TrendingUp, AlertTriangle, Sparkles, Clock, CheckCircle2 } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import FutureReadinessCard from "./FutureReadinessCard";
import EmergingSkillsGaps from "./EmergingSkillsGaps";

interface SkillStatusData {
  status: string | null;
  category: string | null;
  count: number;
}

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
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

export default function SkillsPortfolioAnalytics() {
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSkillsData();
  }, []);

  const fetchSkillsData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('skill_definitions')
      .select('id, name, category, ai_suggested_status, ai_suggested_category')
      .eq('is_active', true);
    
    setSkills(data || []);
    setLoading(false);
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
    </div>
  );
}
