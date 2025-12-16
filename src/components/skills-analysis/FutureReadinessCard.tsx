import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Rocket, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";

interface SkillDefinition {
  id: string;
  name: string;
  ai_suggested_status: string | null;
}

interface Props {
  skills: SkillDefinition[];
}

export default function FutureReadinessCard({ skills }: Props) {
  const [staffWithEmergingSkills, setStaffWithEmergingSkills] = useState(0);
  const [totalStaff, setTotalStaff] = useState(0);
  const [loading, setLoading] = useState(true);

  const emergingSkillIds = useMemo(() => {
    return skills
      .filter(s => s.ai_suggested_status === 'emerging' || s.ai_suggested_status === 'new')
      .map(s => s.id);
  }, [skills]);

  useEffect(() => {
    fetchReadinessData();
  }, [emergingSkillIds]);

  const fetchReadinessData = async () => {
    if (emergingSkillIds.length === 0) {
      setLoading(false);
      return;
    }

    // Get count of unique staff with emerging skills
    const { data: assessments } = await supabase
      .from('skill_assessments')
      .select('user_id')
      .in('skill_id', emergingSkillIds)
      .gte('self_assessment', 2);

    const uniqueStaff = new Set(assessments?.map(a => a.user_id) || []);
    setStaffWithEmergingSkills(uniqueStaff.size);

    // Get total staff count
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    setTotalStaff(count || 0);
    setLoading(false);
  };

  const readinessScore = totalStaff > 0 
    ? Math.round((staffWithEmergingSkills / totalStaff) * 100) 
    : 0;

  const getReadinessLevel = (score: number) => {
    if (score >= 60) return { label: "Excellent", color: "text-green-600", icon: CheckCircle };
    if (score >= 40) return { label: "Good", color: "text-blue-600", icon: TrendingUp };
    if (score >= 20) return { label: "Developing", color: "text-yellow-600", icon: Rocket };
    return { label: "Needs Attention", color: "text-destructive", icon: AlertCircle };
  };

  const level = getReadinessLevel(readinessScore);
  const LevelIcon = level.icon;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Rocket className="h-5 w-5 text-primary" />
          Future Readiness Score
        </CardTitle>
        <CardDescription>
          Staff proficiency in emerging & new skills
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <div className="h-16 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold">{readinessScore}%</p>
                <div className={`flex items-center gap-1 text-sm ${level.color}`}>
                  <LevelIcon className="h-4 w-4" />
                  <span>{level.label}</span>
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{staffWithEmergingSkills} of {totalStaff}</p>
                <p>staff ready</p>
              </div>
            </div>
            
            <Progress value={readinessScore} className="h-3" />
            
            <div className="grid grid-cols-2 gap-4 pt-2 text-sm">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">Emerging Skills</p>
                <p className="text-lg font-semibold">
                  {skills.filter(s => s.ai_suggested_status === 'emerging').length}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-muted-foreground">New Skills</p>
                <p className="text-lg font-semibold">
                  {skills.filter(s => s.ai_suggested_status === 'new').length}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
