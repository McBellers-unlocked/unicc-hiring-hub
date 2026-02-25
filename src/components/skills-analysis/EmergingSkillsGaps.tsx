import { useMemo, useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, Sparkles, Users, AlertTriangle, GraduationCap, Flag, Search, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import SkillPeopleDrillDown from "./SkillPeopleDrillDown";
import DevelopmentPlanModal from "./DevelopmentPlanModal";

interface SkillDefinition {
  id: string;
  name: string;
  ai_suggested_status: string | null;
  ai_suggested_category?: string | null;
  category?: string;
}

interface Props {
  skills: SkillDefinition[];
  onGapDataUpdate?: (data: {
    skillId: string;
    skillName: string;
    gapSize: number;
    belowRequired: number;
    avgLevel: number;
    requiredLevel: number;
    priority: 'high' | 'medium' | 'low';
    topDivisions: { division: string; count: number }[];
  }[]) => void;
  recruitmentFlags?: Set<string>;
  onFlagForRecruitment?: (skillIds: string[]) => void;
  onViewByLocation?: (skillName: string) => void;
}

interface SkillGapData {
  id: string;
  name: string;
  status: string;
  category: string;
  staffCount: number;
  avgProficiency: number;
  requiredLevel: number;
  gapSize: number;
  belowRequired: number;
  topDivisions: { division: string; count: number }[];
  priority: 'high' | 'medium' | 'low';
}

export default function EmergingSkillsGaps({ skills, onGapDataUpdate, recruitmentFlags, onFlagForRecruitment, onViewByLocation }: Props) {
  const [gapData, setGapData] = useState<SkillGapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<SkillGapData | null>(null);
  const [devPlanSkill, setDevPlanSkill] = useState<SkillGapData | null>(null);

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
      .select(`
        skill_id, 
        user_id, 
        self_assessment, 
        manager_assessment,
        required_level,
        users!inner(division)
      `)
      .in('skill_id', skillIds)
      .eq('scope', 'team');

    const skillStats = new Map<string, { 
      users: Set<string>; 
      levels: number[]; 
      requiredLevels: number[];
      belowRequired: number;
      divisionCounts: Map<string, number>;
    }>();
    
    (assessments || []).forEach((a: any) => {
      const stats = skillStats.get(a.skill_id) || { 
        users: new Set(), 
        levels: [], 
        requiredLevels: [],
        belowRequired: 0,
        divisionCounts: new Map()
      };
      stats.users.add(a.user_id);
      const level = a.manager_assessment ?? a.self_assessment ?? 0;
      const requiredLevel = a.required_level ?? 3;
      
      if (level > 0) {
        stats.levels.push(level);
        stats.requiredLevels.push(requiredLevel);
        if (level < requiredLevel) {
          stats.belowRequired++;
        }
      }
      
      const division = a.users?.division;
      if (division) {
        stats.divisionCounts.set(division, (stats.divisionCounts.get(division) || 0) + 1);
      }
      
      skillStats.set(a.skill_id, stats);
    });

    const gaps: SkillGapData[] = emergingSkills.map(skill => {
      const stats = skillStats.get(skill.id);
      const staffCount = stats?.users.size || 0;
      const avgProficiency = stats?.levels.length 
        ? stats.levels.reduce((a, b) => a + b, 0) / stats.levels.length 
        : 0;
      const avgRequired = stats?.requiredLevels.length
        ? stats.requiredLevels.reduce((a, b) => a + b, 0) / stats.requiredLevels.length
        : 3;
      const gapSize = Math.max(0, avgRequired - avgProficiency);
      const belowRequired = stats?.belowRequired || 0;
      
      const topDivisions = stats?.divisionCounts 
        ? Array.from(stats.divisionCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([division, count]) => ({ division, count }))
        : [];

      let priority: 'high' | 'medium' | 'low' = 'low';
      if ((belowRequired >= 5 && gapSize >= 1.5) || staffCount < 3) priority = 'high';
      else if (belowRequired >= 3 || gapSize >= 1) priority = 'medium';

      return {
        id: skill.id,
        name: skill.name,
        status: skill.ai_suggested_status || 'emerging',
        category: skill.ai_suggested_category || skill.category || 'General',
        staffCount,
        avgProficiency: Math.round(avgProficiency * 10) / 10,
        requiredLevel: Math.round(avgRequired * 10) / 10,
        gapSize: Math.round(gapSize * 10) / 10,
        belowRequired,
        topDivisions,
        priority,
      };
    }).sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    setGapData(gaps);
    setLoading(false);
    
    if (onGapDataUpdate) {
      onGapDataUpdate(gaps.map(g => ({
        skillId: g.id,
        skillName: g.name,
        gapSize: g.gapSize,
        belowRequired: g.belowRequired,
        avgLevel: g.avgProficiency,
        requiredLevel: g.requiredLevel,
        priority: g.priority,
        topDivisions: g.topDivisions,
      })));
    }
  };

  const handleToggleFlag = (gap: SkillGapData) => {
    if (!onFlagForRecruitment || !recruitmentFlags) return;
    const newFlags = new Set(recruitmentFlags);
    if (newFlags.has(gap.id)) {
      newFlags.delete(gap.id);
      toast.info(`"${gap.name}" removed from recruitment priorities`);
    } else {
      newFlags.add(gap.id);
      toast.success(`"${gap.name}" flagged as recruitment priority`);
    }
    onFlagForRecruitment(Array.from(newFlags));
  };

  const highPriorityCount = gapData.filter(g => g.priority === 'high').length;
  const displayData = expanded ? gapData : gapData.slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              Emerging Skills Gaps
            </CardTitle>
            <CardDescription>
              Priority skills needing workforce development
            </CardDescription>
          </div>
          {highPriorityCount > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {highPriorityCount} Critical
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : gapData.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No emerging skills tracked yet</p>
          </div>
        ) : (
          <TooltipProvider>
            <div className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Skill</TableHead>
                    <TableHead className="text-center w-[80px]">Gap</TableHead>
                    <TableHead className="text-center w-[90px]">Below Req</TableHead>
                    <TableHead className="w-[140px]">Top Divisions</TableHead>
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayData.map(gap => {
                    const isFlagged = recruitmentFlags?.has(gap.id);
                    return (
                      <TableRow key={gap.id} className={gap.priority === 'high' ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {isFlagged && (
                              <Flag className="h-3 w-3 text-primary flex-shrink-0 fill-primary" />
                            )}
                            {gap.status === 'new' ? (
                              <Sparkles className="h-3.5 w-3.5 text-chart-3 flex-shrink-0" />
                            ) : (
                              <TrendingUp className="h-3.5 w-3.5 text-chart-2 flex-shrink-0" />
                            )}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="font-medium text-sm truncate max-w-[140px] cursor-pointer hover:underline"
                                  onClick={() => setSelectedSkill(gap)}>
                                  {gap.name}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{gap.name}</p>
                                <p className="text-xs text-muted-foreground">{gap.category}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge 
                                variant={gap.gapSize >= 1.5 ? 'destructive' : gap.gapSize >= 1 ? 'secondary' : 'outline'}
                                className="text-xs cursor-default"
                              >
                                {gap.gapSize > 0 ? `-${gap.gapSize}` : '0'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Avg: {gap.avgProficiency} / Required: {gap.requiredLevel}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className={`text-sm font-medium ${gap.belowRequired >= 5 ? 'text-destructive' : ''}`}>
                              {gap.belowRequired}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            {gap.topDivisions.length === 0 ? (
                              <span className="text-xs text-muted-foreground">-</span>
                            ) : (
                              gap.topDivisions.map((d, i) => (
                                <Badge key={i} variant="outline" className="text-[10px] px-1.5 py-0">
                                  {d.division} ({d.count})
                                </Badge>
                              ))
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                                Act
                                <ChevronDown className="h-3 w-3 ml-1" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52 bg-popover">
                              <DropdownMenuItem onClick={() => setSelectedSkill(gap)}>
                                <Search className="h-3.5 w-3.5 mr-2" />
                                Find Internal Talent
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setDevPlanSkill(gap)}>
                                <GraduationCap className="h-3.5 w-3.5 mr-2" />
                                Create Development Plan
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleToggleFlag(gap)}>
                                <Flag className={`h-3.5 w-3.5 mr-2 ${isFlagged ? 'fill-primary text-primary' : ''}`} />
                                {isFlagged ? 'Unflag Recruitment' : 'Flag for Recruitment'}
                              </DropdownMenuItem>
                              {onViewByLocation && (
                                <DropdownMenuItem onClick={() => onViewByLocation(gap.name)}>
                                  <MapPin className="h-3.5 w-3.5 mr-2" />
                                  View by Location
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {gapData.length > 6 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full text-xs"
                  onClick={() => setExpanded(!expanded)}
                >
                  {expanded ? (
                    <>
                      <ChevronUp className="h-3 w-3 mr-1" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3 w-3 mr-1" />
                      Show {gapData.length - 6} More
                    </>
                  )}
                </Button>
              )}
            </div>
          </TooltipProvider>
        )}

        <SkillPeopleDrillDown
          open={!!selectedSkill}
          onOpenChange={(open) => !open && setSelectedSkill(null)}
          skillName={selectedSkill?.name || ""}
          skillId={selectedSkill?.id}
          category={selectedSkill?.category}
          lifecycleStage={selectedSkill?.status || "Emerging"}
        />

        <DevelopmentPlanModal
          open={!!devPlanSkill}
          onOpenChange={(open) => !open && setDevPlanSkill(null)}
          skillName={devPlanSkill?.name || ""}
          category={devPlanSkill?.category || "General"}
          avgProficiency={devPlanSkill?.avgProficiency || 0}
          requiredLevel={devPlanSkill?.requiredLevel || 3}
          belowRequired={devPlanSkill?.belowRequired || 0}
        />
      </CardContent>
    </Card>
  );
}
