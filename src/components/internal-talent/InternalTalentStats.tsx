import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, Building2, MapPin, Award, Clock } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "#8884d8", "#82ca9d", "#ffc658"];

export function InternalTalentStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["internal-talent-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("division, duty_station, current_grade, skills, entry_on_duty_date")
        .neq("role", "Candidate");
      
      if (error) throw error;

      // Calculate stats
      const divisionCounts: Record<string, number> = {};
      const stationCounts: Record<string, number> = {};
      const gradeCounts: Record<string, number> = {};
      const skillCounts: Record<string, number> = {};
      let withSkills = 0;
      let totalTenure = 0;
      let tenureCount = 0;

      data.forEach((user) => {
        // Division
        if (user.division) {
          divisionCounts[user.division] = (divisionCounts[user.division] || 0) + 1;
        }

        // Duty station
        if (user.duty_station) {
          stationCounts[user.duty_station] = (stationCounts[user.duty_station] || 0) + 1;
        }

        // Grade
        if (user.current_grade) {
          gradeCounts[user.current_grade] = (gradeCounts[user.current_grade] || 0) + 1;
        }

        // Skills
        if (Array.isArray(user.skills) && user.skills.length > 0) {
          withSkills++;
          user.skills.forEach((skill: any) => {
            const skillName = typeof skill === 'string' ? skill : skill.name || '';
            if (skillName) {
              skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
            }
          });
        }

        // Tenure
        if (user.entry_on_duty_date) {
          const years = (Date.now() - new Date(user.entry_on_duty_date).getTime()) / (1000 * 60 * 60 * 24 * 365);
          totalTenure += years;
          tenureCount++;
        }
      });

      return {
        totalStaff: data.length,
        withSkills,
        avgTenure: tenureCount > 0 ? (totalTenure / tenureCount).toFixed(1) : 0,
        divisionData: Object.entries(divisionCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        stationData: Object.entries(stationCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value),
        gradeData: Object.entries(gradeCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => {
            // Sort by grade level
            const order = ['G-4', 'G-5', 'G-6', 'G-7', 'P-2', 'P-3', 'P-4', 'P-5', 'D-1', 'D-2'];
            return order.indexOf(a.name) - order.indexOf(b.name);
          }),
        topSkills: Object.entries(skillCounts)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 10),
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStaff}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">With Skills Data</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withSkills}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.withSkills / stats.totalStaff) * 100).toFixed(0)}% of staff
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. Tenure</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgTenure} yrs</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Divisions</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.divisionData.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Division Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff by Division</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.divisionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {stats.divisionData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Duty Station Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff by Duty Station</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.stationData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Grade Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Staff by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.gradeData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.topSkills} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
