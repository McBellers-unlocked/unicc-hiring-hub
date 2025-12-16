import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Sparkles, Users, AlertTriangle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface SkillDefinition {
  id: string;
  name: string;
  ai_suggested_status: string | null;
  ai_suggested_category?: string | null;
  category?: string;
}

interface Props {
  skills: SkillDefinition[];
}

interface SkillGapData {
  id: string;
  name: string;
  status: string;
  category: string;
  staffCount: number;
  avgProficiency: number;
  priority: 'high' | 'medium' | 'low';
}

export default function EmergingSkillsGaps({ skills }: Props) {
  const [gapData, setGapData] = useState<SkillGapData[]>([]);
  const [loading, setLoading] = useState(true);

  const emergingSkills = useMemo(() => {
    return skills.filter(s => 
      s.ai_suggested_status === 'emerging' || s.ai_suggested_status === 'new'
    );
  }, [skills]);

  useEffect(() => {
    fetchGapData();
  }, [emergingSkills]);

  const fetchGapData = async () => {
    if (emergingSkills.length === 0) {
      setLoading(false);
      return;
    }

    const skillIds = emergingSkills.map(s => s.id);
    
    const { data: assessments } = await supabase
      .from('skill_assessments')
      .select('skill_id, user_id, self_assessment, manager_assessment')
      .in('skill_id', skillIds);

    const skillStats = new Map<string, { users: Set<string>; levels: number[] }>();
    
    (assessments || []).forEach(a => {
      const stats = skillStats.get(a.skill_id) || { users: new Set(), levels: [] };
      stats.users.add(a.user_id);
      const level = a.manager_assessment ?? a.self_assessment ?? 0;
      if (level > 0) stats.levels.push(level);
      skillStats.set(a.skill_id, stats);
    });

    const gaps: SkillGapData[] = emergingSkills.map(skill => {
      const stats = skillStats.get(skill.id);
      const staffCount = stats?.users.size || 0;
      const avgProficiency = stats?.levels.length 
        ? stats.levels.reduce((a, b) => a + b, 0) / stats.levels.length 
        : 0;

      // Priority: high if few staff and low proficiency
      let priority: 'high' | 'medium' | 'low' = 'low';
      if (staffCount < 5 && avgProficiency < 2) priority = 'high';
      else if (staffCount < 10 || avgProficiency < 3) priority = 'medium';

      return {
        id: skill.id,
        name: skill.name,
        status: skill.ai_suggested_status || 'emerging',
        category: skill.ai_suggested_category || skill.category || 'General',
        staffCount,
        avgProficiency: Math.round(avgProficiency * 10) / 10,
        priority,
      };
    }).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setGapData(gaps.slice(0, 8));
    setLoading(false);
  };

  const highPriorityCount = gapData.filter(g => g.priority === 'high').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Emerging Skills Gaps
        </CardTitle>
        <CardDescription>
          Priority skills needing workforce development
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : gapData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No emerging skills tracked yet</p>
          </div>
        ) : (
          <>
            {highPriorityCount > 0 && (
              <div className="flex items-center gap-2 mb-4 p-2 bg-destructive/10 rounded-lg text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span>{highPriorityCount} high-priority gaps need attention</span>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-center">Staff</TableHead>
                  <TableHead className="text-center">Avg Level</TableHead>
                  <TableHead className="text-right">Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gapData.map(gap => (
                  <TableRow key={gap.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {gap.status === 'new' ? (
                          <Sparkles className="h-3.5 w-3.5 text-chart-3" />
                        ) : (
                          <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
                        )}
                        <span className="font-medium text-sm truncate max-w-[150px]" title={gap.name}>
                          {gap.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">{gap.staffCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center text-sm">
                      {gap.avgProficiency > 0 ? gap.avgProficiency.toFixed(1) : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge 
                        variant={gap.priority === 'high' ? 'destructive' : gap.priority === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {gap.priority}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </CardContent>
    </Card>
  );
}
