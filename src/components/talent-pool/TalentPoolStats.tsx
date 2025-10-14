import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Users, MapPin, Briefcase, GraduationCap, Globe } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "hsl(var(--accent))", "hsl(var(--muted))"];

export function TalentPoolStats() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["talent-pool-stats"],
    queryFn: async () => {
      const { data: candidates, error } = await supabase
        .from("candidates")
        .select("location, years_of_experience, education, skills, languages, un_experience");
      
      if (error) throw error;

      // Calculate statistics
      const totalCandidates = candidates.length;
      const withUNExperience = candidates.filter(c => c.un_experience).length;
      
      // Location distribution
      const locationCounts: Record<string, number> = {};
      candidates.forEach(c => {
        if (c.location) {
          locationCounts[c.location] = (locationCounts[c.location] || 0) + 1;
        }
      });
      const locationData = Object.entries(locationCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      // Experience distribution
      const experienceRanges = {
        "0-2 years": 0,
        "3-5 years": 0,
        "6-10 years": 0,
        "11-15 years": 0,
        "15+ years": 0,
      };
      candidates.forEach(c => {
        const exp = c.years_of_experience || 0;
        if (exp <= 2) experienceRanges["0-2 years"]++;
        else if (exp <= 5) experienceRanges["3-5 years"]++;
        else if (exp <= 10) experienceRanges["6-10 years"]++;
        else if (exp <= 15) experienceRanges["11-15 years"]++;
        else experienceRanges["15+ years"]++;
      });
      const experienceData = Object.entries(experienceRanges).map(([name, value]) => ({ name, value }));

      // Skills distribution (top 10)
      const skillCounts: Record<string, number> = {};
      candidates.forEach(c => {
        if (Array.isArray(c.skills)) {
          c.skills.forEach((skill: any) => {
            const skillName = typeof skill === 'string' ? skill : skill.name || skill.skill;
            if (skillName) {
              skillCounts[skillName] = (skillCounts[skillName] || 0) + 1;
            }
          });
        }
      });
      const skillsData = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, value]) => ({ name, value }));

      return {
        totalCandidates,
        withUNExperience,
        locationData,
        experienceData,
        skillsData,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Candidates</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCandidates}</div>
            <p className="text-xs text-muted-foreground">In talent pool</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">UN Experience</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.withUNExperience}</div>
            <p className="text-xs text-muted-foreground">
              {((stats.withUNExperience / stats.totalCandidates) * 100).toFixed(1)}% of pool
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unique Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.locationData.length}</div>
            <p className="text-xs text-muted-foreground">Top 10 shown</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Experience Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.experienceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {stats.experienceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.locationData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top 10 Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.skillsData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
