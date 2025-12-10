import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Users, Target, TrendingUp, Award, GraduationCap, AlertTriangle } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import SkillHeatmap from "./SkillHeatmap";
import TeamSkillsRadar from "./TeamSkillsRadar";
import SkillDistributionChart from "./SkillDistributionChart";
import TopSkillGapsChart from "./TopSkillGapsChart";
import TrainingRecommendations from "./TrainingRecommendations";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function TeamSkillsAnalytics() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchCurrentUserName();
    }
  }, [user?.email]);

  useEffect(() => {
    if (currentUserName) {
      fetchTeamData();
    }
  }, [currentUserName]);

  const fetchCurrentUserName = async () => {
    const { data: currentUser } = await supabase
      .from('users')
      .select('name')
      .eq('email', user?.email)
      .maybeSingle();
    
    if (currentUser?.name) {
      setCurrentUserName(currentUser.name);
    }
  };

  const fetchTeamData = async () => {
    if (!currentUserName) return;
    
    setLoading(true);
    
    // Get all reports using the recursive function
    const { data: members } = await supabase
      .rpc('get_all_reports', { p_manager_name: currentUserName });
    
    const teamData = (members || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      job_title: m.job_title,
      unit: m.unit,
      depth: m.depth
    }));

    setTeamMembers(teamData);

    if (teamData.length > 0) {
      const memberIds = teamData.map((m: TeamMember) => m.id);
      
      // Fetch assessments
      const { data: assessmentData } = await supabase
        .from('skill_assessments')
        .select('id, user_id, skill_id, self_assessment, manager_assessment, required_level, status')
        .in('user_id', memberIds);

      setAssessments(assessmentData || []);

      // Fetch skill definitions
      const skillIds = [...new Set((assessmentData || []).map(a => a.skill_id))];
      if (skillIds.length > 0) {
        const { data: skillData } = await supabase
          .from('skill_definitions')
          .select('id, name, category')
          .in('id', skillIds);
        setSkills(skillData || []);
      }
    }

    setLoading(false);
  };

  // Calculate analytics metrics
  const metrics = useMemo(() => {
    if (assessments.length === 0) {
      return {
        teamSize: teamMembers.length,
        totalSkills: 0,
        coverage: 0,
        healthScore: 0,
        excelling: 0,
        exceeding: 0,
        meeting: 0,
        gaps: 0,
        criticalGaps: 0,
        totalGapLevels: 0,
        gapsBySkill: [] as { skillName: string; skillId: string; gapCount: number; totalGap: number }[],
        skillAggregates: [] as { skillName: string; category: string; avgLevel: number; requiredLevel: number }[],
        distribution: { excelling: 0, exceeding: 0, meeting: 0, minorGap: 0, criticalGap: 0 }
      };
    }

    let excelling = 0, exceeding = 0, meeting = 0, gaps = 0, criticalGaps = 0, totalGapLevels = 0;
    const gapMap = new Map<string, { count: number; total: number }>();
    const skillLevels = new Map<string, { levels: number[]; required: number[] }>();

    assessments.forEach(a => {
      const level = a.manager_assessment ?? a.self_assessment ?? 0;
      const required = a.required_level ?? 0;
      
      if (required > 0 && level > 0) {
        const gap = level - required;
        
        if (gap >= 2) excelling++;
        else if (gap === 1) exceeding++;
        else if (gap === 0) meeting++;
        else if (gap === -1) { gaps++; totalGapLevels += 1; }
        else { criticalGaps++; totalGapLevels += Math.abs(gap); }

        // Track gaps by skill
        if (gap < 0) {
          const skill = skills.find(s => s.id === a.skill_id);
          if (skill) {
            const existing = gapMap.get(skill.name) || { count: 0, total: 0 };
            gapMap.set(skill.name, { count: existing.count + 1, total: existing.total + Math.abs(gap) });
          }
        }

        // Track skill levels for radar
        const skill = skills.find(s => s.id === a.skill_id);
        if (skill) {
          const existing = skillLevels.get(skill.name) || { levels: [], required: [] };
          existing.levels.push(level);
          existing.required.push(required);
          skillLevels.set(skill.name, existing);
        }
      }
    });

    const totalAssessed = excelling + exceeding + meeting + gaps + criticalGaps;
    const healthScore = totalAssessed > 0 
      ? Math.round(((excelling * 100 + exceeding * 90 + meeting * 80 + gaps * 50 + criticalGaps * 20) / totalAssessed))
      : 0;

    const gapsBySkill = Array.from(gapMap.entries())
      .map(([skillName, data]) => ({
        skillName,
        skillId: skills.find(s => s.name === skillName)?.id || '',
        gapCount: data.count,
        totalGap: data.total
      }))
      .sort((a, b) => b.totalGap - a.totalGap)
      .slice(0, 8);

    const skillAggregates = Array.from(skillLevels.entries())
      .map(([skillName, data]) => ({
        skillName,
        category: skills.find(s => s.name === skillName)?.category || 'General',
        avgLevel: data.levels.reduce((a, b) => a + b, 0) / data.levels.length,
        requiredLevel: Math.max(...data.required)
      }))
      .slice(0, 8);

    const coverage = teamMembers.length > 0 
      ? Math.round((new Set(assessments.map(a => a.user_id)).size / teamMembers.length) * 100)
      : 0;

    return {
      teamSize: teamMembers.length,
      totalSkills: skills.length,
      coverage,
      healthScore,
      excelling,
      exceeding,
      meeting,
      gaps,
      criticalGaps,
      totalGapLevels,
      gapsBySkill,
      skillAggregates,
      distribution: { 
        excelling, 
        exceeding, 
        meeting, 
        minorGap: gaps, 
        criticalGap: criticalGaps 
      }
    };
  }, [assessments, skills, teamMembers]);

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

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No Team Data</h3>
          <p className="text-muted-foreground">
            Team analytics will appear when you have team members with skill assessments.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Team Size"
          value={metrics.teamSize}
          subtitle={`${new Set(teamMembers.map(m => m.depth)).size} levels`}
          icon={Users}
        />
        <StatsCard
          title="Skills Coverage"
          value={`${metrics.coverage}%`}
          subtitle={`${metrics.totalSkills} skills tracked`}
          icon={Target}
        />
        <StatsCard
          title="Team Health Score"
          value={metrics.healthScore}
          subtitle="out of 100"
          icon={TrendingUp}
          alert={metrics.healthScore < 60}
        />
        <StatsCard
          title="Excellence Count"
          value={metrics.excelling}
          subtitle={`${metrics.exceeding} exceeding`}
          icon={Award}
        />
      </div>

      {/* Alert for critical gaps */}
      {metrics.criticalGaps > 0 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm">
              <strong>{metrics.criticalGaps} critical skill gaps</strong> detected ({metrics.totalGapLevels} total gap levels). 
              Review the heatmap below to identify priority training needs.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main visualizations */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Skill Gap Heatmap */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Skill Gap Heatmap
            </CardTitle>
            <CardDescription>
              Visual overview of team skills vs requirements. Click cells for details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SkillHeatmap 
              teamMembers={teamMembers}
              skills={skills}
              assessments={assessments}
            />
          </CardContent>
        </Card>

        {/* Team Skills Radar */}
        <Card>
          <CardHeader>
            <CardTitle>Team Skills Radar</CardTitle>
            <CardDescription>
              Aggregate skill profile vs required levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TeamSkillsRadar data={metrics.skillAggregates} />
          </CardContent>
        </Card>

        {/* Distribution Donut */}
        <Card>
          <CardHeader>
            <CardTitle>Skill Distribution</CardTitle>
            <CardDescription>
              Breakdown of skill assessment outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SkillDistributionChart data={metrics.distribution} />
          </CardContent>
        </Card>

        {/* Top Skill Gaps */}
        <Card>
          <CardHeader>
            <CardTitle>Priority Skill Gaps</CardTitle>
            <CardDescription>
              Skills with the largest development needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TopSkillGapsChart data={metrics.gapsBySkill} />
          </CardContent>
        </Card>

        {/* Training Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Training Recommendations
            </CardTitle>
            <CardDescription>
              Suggested focus areas based on gap analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TrainingRecommendations 
              gapsBySkill={metrics.gapsBySkill}
              teamMembers={teamMembers}
              assessments={assessments}
              skills={skills}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
