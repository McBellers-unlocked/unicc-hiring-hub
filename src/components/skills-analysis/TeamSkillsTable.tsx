import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, X, User, Settings2, Users, Network, Brain, Cpu, ClipboardList, Award, CheckCircle, XCircle, Globe } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import BatterySkillIndicator from "./BatterySkillIndicator";
import BatteryLevelSelector from "./BatteryLevelSelector";
import { cn } from "@/lib/utils";
import { SkillLevelDisplay } from "./SkillLevelSelector";

interface TeamMember {
  id: string;
  name: string;
  job_title: string | null;
  unit: string | null;
  depth?: number;
}

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  skill_type?: 'proficiency' | 'credential';
  is_open_source?: boolean;
}

interface Assessment {
  id: string;
  user_id: string;
  skill_id: string;
  self_assessment: number | null;
  manager_assessment: number | null;
  required_level: number | null;
  status: string;
  scope: 'team' | 'individual';
  has_credential?: boolean | null;
}

type ViewMode = 'direct' | 'all';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Behavioral': <Brain className="h-4 w-4" />,
  'Technical & Domain': <Cpu className="h-4 w-4" />,
  'Methods & Processes': <ClipboardList className="h-4 w-4" />,
  'Certifications & Licenses': <Award className="h-4 w-4" />,
};

const CATEGORY_ORDER = ['Behavioral', 'Technical & Domain', 'Methods & Processes', 'Certifications & Licenses'];

export default function TeamSkillsTable() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allSkillDefinitions, setAllSkillDefinitions] = useState<SkillDefinition[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('direct');
  const [currentUserName, setCurrentUserName] = useState<string | null>(null);
  
  // Bulk edit state
  const [bulkEditSkill, setBulkEditSkill] = useState<SkillDefinition | null>(null);
  const [bulkRequiredLevel, setBulkRequiredLevel] = useState<number | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchCurrentUserName();
      fetchAllSkillDefinitions();
    }
  }, [user?.email]);

  useEffect(() => {
    if (currentUserName) {
      fetchTeamData();
    }
  }, [currentUserName, viewMode]);

  const fetchCurrentUserName = async () => {
    const { data: currentUser, error } = await supabase
      .from('users')
      .select('name')
      .eq('email', user?.email)
      .single();
    
    if (!error && currentUser?.name) {
      setCurrentUserName(currentUser.name);
    }
  };

  const fetchAllSkillDefinitions = async () => {
    const { data } = await supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, is_open_source')
      .eq('is_active', true)
      .order('category')
      .order('name');
    setAllSkillDefinitions((data || []) as SkillDefinition[]);
  };

  const fetchTeamData = async () => {
    if (!currentUserName) return;
    
    setLoading(true);
    
    let members: TeamMember[] = [];
    
    if (viewMode === 'all') {
      // Use the recursive function to get all reports
      const { data, error } = await supabase
        .rpc('get_all_reports', { p_manager_name: currentUserName });
      
      if (error) {
        console.error('Error fetching all reports:', error);
        toast.error("Failed to load team hierarchy");
        setLoading(false);
        return;
      }
      
      members = (data || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        job_title: m.job_title,
        unit: m.unit,
        depth: m.depth
      }));
    } else {
      // Direct reports only
      const { data, error } = await supabase
        .from('users')
        .select('id, name, job_title, unit')
        .eq('line_manager', currentUserName)
        .order('name');

      if (error) {
        toast.error("Failed to load team members");
        setLoading(false);
        return;
      }
      
      members = (data || []).map(m => ({ ...m, depth: 1 }));
    }

    setTeamMembers(members);

    if (members.length > 0) {
      const memberIds = members.map(m => m.id);
      
      const { data: assessmentData } = await supabase
        .from('skill_assessments')
        .select('id, user_id, skill_id, self_assessment, manager_assessment, required_level, status, scope, has_credential')
        .in('user_id', memberIds)
        .eq('scope', 'team'); // Only show team skills in matrix

      setAssessments((assessmentData || []) as Assessment[]);

      const skillIds = [...new Set((assessmentData || []).map(a => a.skill_id))];

      if (skillIds.length > 0) {
        const { data: skillData } = await supabase
          .from('skill_definitions')
          .select('id, name, category, skill_type, is_open_source')
          .eq('is_active', true)
          .in('id', skillIds)
          .order('category')
          .order('name');

        setSkills((skillData || []) as SkillDefinition[]);
      } else {
        setSkills([]);
      }
    } else {
      setSkills([]);
      setAssessments([]);
    }

    setLoading(false);
  };

  const getAssessment = (userId: string, skillId: string) => {
    return assessments.find(a => a.user_id === userId && a.skill_id === skillId);
  };

  const handleApprove = async (assessmentId: string) => {
    const { error } = await supabase
      .from('skill_assessments')
      .update({ 
        status: 'approved', 
        approved_at: new Date().toISOString(),
        approved_by: user?.id 
      })
      .eq('id', assessmentId);

    if (error) {
      toast.error("Failed to approve");
    } else {
      toast.success("Assessment approved");
      fetchTeamData();
    }
  };

  const handleReject = async (assessmentId: string) => {
    const { error } = await supabase
      .from('skill_assessments')
      .update({ status: 'rejected' })
      .eq('id', assessmentId);

    if (error) {
      toast.error("Failed to reject");
    } else {
      toast.success("Assessment rejected");
      fetchTeamData();
    }
  };

  // Direct click-to-set with optimistic update
  const handleDirectSetRequired = async (memberId: string, skillId: string, level: number) => {
    const existing = getAssessment(memberId, skillId);
    
    // Optimistic update - immediately update local state
    setAssessments(prev => {
      if (existing) {
        return prev.map(a => 
          a.id === existing.id ? { ...a, required_level: level } : a
        );
      } else {
        // Create temporary assessment for UI
        const tempAssessment: Assessment = {
          id: `temp-${memberId}-${skillId}`,
          user_id: memberId,
          skill_id: skillId,
          self_assessment: null,
          manager_assessment: null,
          required_level: level,
          status: 'draft',
          scope: 'team'
        };
        return [...prev, tempAssessment];
      }
    });

    // Save in background
    try {
      if (existing) {
        const { error } = await supabase
          .from('skill_assessments')
          .update({ required_level: level })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('skill_assessments')
          .insert({
            user_id: memberId,
            skill_id: skillId,
            required_level: level,
            status: 'draft'
          })
          .select()
          .single();
        if (error) throw error;
        
        // Replace temp assessment with real one
        if (data) {
          setAssessments(prev => 
            prev.map(a => 
              a.id === `temp-${memberId}-${skillId}` 
                ? { ...data, user_id: data.user_id, skill_id: data.skill_id } as Assessment
                : a
            )
          );
        }
      }
    } catch {
      // Revert on error
      toast.error("Failed to update requirement");
      fetchTeamData();
    }
  };

  const handleBulkSetRequirement = async () => {
    if (!bulkEditSkill || bulkRequiredLevel === null) return;

    try {
      for (const member of teamMembers) {
        const existing = getAssessment(member.id, bulkEditSkill.id);
        
        if (existing) {
          await supabase
            .from('skill_assessments')
            .update({ required_level: bulkRequiredLevel })
            .eq('id', existing.id);
        } else {
          await supabase
            .from('skill_assessments')
            .insert({
              user_id: member.id,
              skill_id: bulkEditSkill.id,
              required_level: bulkRequiredLevel,
              status: 'draft'
            });
        }
      }

      toast.success(`Required level set for all team members`);
      setBulkEditSkill(null);
      setBulkRequiredLevel(null);
      fetchTeamData();
    } catch {
      toast.error("Failed to set bulk requirement");
    }
  };

  // Sort categories by defined order
  const categories = [...new Set(skills.map(s => s.category))].sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  const filteredSkills = selectedCategory === "all" 
    ? skills.sort((a, b) => {
        const catA = CATEGORY_ORDER.indexOf(a.category);
        const catB = CATEGORY_ORDER.indexOf(b.category);
        if (catA !== catB) return (catA === -1 ? 999 : catA) - (catB === -1 ? 999 : catB);
        return a.name.localeCompare(b.name);
      })
    : skills.filter(s => s.category === selectedCategory);

  const pendingCount = assessments.filter(a => a.status === 'pending_approval').length;

  // Calculate hierarchy stats
  const maxDepth = Math.max(...teamMembers.map(m => m.depth || 1), 0);
  const directCount = teamMembers.filter(m => m.depth === 1).length;

  const getDepthLabel = (depth: number) => {
    if (depth === 1) return 'Direct';
    return `L${depth}`;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading team data...
        </CardContent>
      </Card>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No team members found.</p>
          <p className="text-sm mt-2">Team members are users whose line manager matches your name.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending approvals */}
      {pendingCount > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800 dark:text-amber-200">
              Pending Approvals ({pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Skill</TableHead>
                  <TableHead className="text-center">Self Assessment</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments
                  .filter(a => a.status === 'pending_approval')
                  .map(assessment => {
                    const member = teamMembers.find(m => m.id === assessment.user_id);
                    const skill = skills.find(s => s.id === assessment.skill_id);
                    return (
                      <TableRow key={assessment.id}>
                        <TableCell className="font-medium">{member?.name}</TableCell>
                        <TableCell>{skill?.name}</TableCell>
                        <TableCell className="text-center">
                          <SkillLevelDisplay level={assessment.self_assessment} />
                        </TableCell>
                        <TableCell className="text-center">
                          <SkillLevelDisplay level={assessment.required_level} />
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              size="icon" 
                              variant="ghost" 
                              className="text-emerald-600 hover:text-emerald-700"
                              onClick={() => handleApprove(assessment.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="icon" 
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                              onClick={() => handleReject(assessment.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Skills Matrix */}
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Team Skills Matrix</CardTitle>
            <CardDescription>
              Click any cell to set required skill levels for your team
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Toggle */}
            <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Direct Reports Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="all">
                  <div className="flex items-center gap-2">
                    <Network className="h-4 w-4" />
                    <span>Full Hierarchy</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-52">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>
                    <span className="flex items-center gap-2">
                      {CATEGORY_ICONS[cat]}
                      {cat}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        {/* Team Stats Banner */}
        {viewMode === 'all' && teamMembers.length > 0 && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-2">
              <span className="flex items-center gap-1.5">
                <Network className="h-4 w-4" />
                <strong className="text-foreground">{teamMembers.length}</strong> team members
              </span>
              <span className="text-border">•</span>
              <span>
                <strong className="text-foreground">{directCount}</strong> direct reports
              </span>
              {maxDepth > 1 && (
                <>
                  <span className="text-border">•</span>
                  <span>
                    <strong className="text-foreground">{maxDepth}</strong> levels deep
                  </span>
                </>
              )}
            </div>
          </div>
        )}
        
        <CardContent>
          {filteredSkills.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No skills with assessments found.</p>
              <p className="text-sm mt-2">Team members need to submit self-assessments first.</p>
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px] border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 left-0 bg-background z-20 min-w-56 border-r">
                      Skill
                    </TableHead>
                    {teamMembers.map((member, memberIndex) => {
                      // Format name: keep given names + surname initial (e.g., "Maria Isabel G.")
                      const formatDisplayName = (fullName: string) => {
                        const parts = fullName.split(' ').filter(Boolean);
                        if (parts.length <= 2) return fullName;
                        
                        // Find uppercase surname(s) at the end
                        const surnameIndex = parts.findIndex(p => p === p.toUpperCase() && p.length > 1);
                        if (surnameIndex > 0) {
                          const givenNames = parts.slice(0, surnameIndex).map(n => 
                            n.charAt(0).toUpperCase() + n.slice(1).toLowerCase()
                          ).join(' ');
                          const surnameInitial = parts[surnameIndex].charAt(0) + '.';
                          return `${givenNames} ${surnameInitial}`;
                        }
                        
                        // Fallback: first name + last initial
                        return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
                      };

                      return (
                        <TableHead 
                          key={member.id} 
                          className={cn(
                            "sticky top-0 z-10 text-center min-w-32 px-2",
                            memberIndex % 2 === 0 ? "bg-background" : "bg-muted/40"
                          )}
                        >
                          <div className="text-xs">
                            <p className="font-medium whitespace-normal leading-tight" title={member.name}>
                              {formatDisplayName(member.name)}
                            </p>
                            {viewMode === 'all' && member.depth && (
                              <Badge 
                                variant={member.depth === 1 ? 'default' : 'secondary'} 
                                className="text-[9px] px-1 py-0 h-4 mt-0.5"
                              >
                                {getDepthLabel(member.depth)}
                              </Badge>
                            )}
                            {viewMode === 'direct' && (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {member.job_title?.split(' ').slice(0, 2).join(' ')}
                              </p>
                            )}
                          </div>
                        </TableHead>
                      );
                    })}
                    <TableHead className="sticky top-0 bg-background z-10 w-12 text-center">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.map(skill => (
                    <TableRow key={skill.id}>
                      <TableCell className="sticky left-0 bg-background z-10 border-r">
                        <div className="flex items-center gap-2">
                          {CATEGORY_ICONS[skill.category]}
                          <div>
                            <p className="font-medium text-sm flex items-center gap-1">
                              {skill.name}
                              {skill.is_open_source && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Globe className="h-3 w-3 text-emerald-600 shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>Open source technology</TooltipContent>
                                </Tooltip>
                              )}
                            </p>
                            <p className="text-xs text-muted-foreground">{skill.category}</p>
                          </div>
                          {skill.skill_type === 'credential' && (
                            <Award className="h-3 w-3 text-amber-500 ml-auto" />
                          )}
                        </div>
                      </TableCell>
                      {teamMembers.map((member, memberIndex) => {
                        const assessment = getAssessment(member.id, skill.id);
                        const isCredential = skill.skill_type === 'credential';
                        
                        return (
                          <TableCell 
                            key={member.id} 
                            className={cn(
                              "text-center p-1 align-middle",
                              memberIndex % 2 === 0 ? "bg-background" : "bg-muted/40"
                            )}
                          >
                            <div className="flex items-center justify-center min-h-[44px]">
                              {isCredential ? (
                                // Credential display - simple check/x
                                <div className={cn(
                                  "inline-flex items-center justify-center w-8 h-8 rounded-full",
                                  assessment?.has_credential 
                                    ? "bg-emerald-100 dark:bg-emerald-900/30" 
                                    : "bg-muted"
                                )}>
                                  {assessment?.has_credential ? (
                                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                                  ) : (
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </div>
                              ) : (
                                <BatterySkillIndicator
                                  selfAssessment={assessment?.self_assessment ?? null}
                                  requiredLevel={assessment?.required_level ?? null}
                                  managerAssessment={assessment?.manager_assessment ?? null}
                                  status={assessment?.status}
                                  onSegmentClick={(level) => handleDirectSetRequired(member.id, skill.id, level)}
                                  compact
                                  editable
                                />
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell className="text-center p-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => {
                            setBulkEditSkill(skill);
                            setBulkRequiredLevel(null);
                          }}
                          title="Set required level for all team members"
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Edit Dialog */}
      <Dialog open={!!bulkEditSkill} onOpenChange={(open) => !open && setBulkEditSkill(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Required Level for All Team Members</DialogTitle>
            <DialogDescription>
              Set the same required level for "{bulkEditSkill?.name}" across {viewMode === 'all' ? 'your entire hierarchy' : 'your direct reports'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{bulkEditSkill?.name}</p>
              <p className="text-xs text-muted-foreground">{bulkEditSkill?.category}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Required Level for All ({teamMembers.length} members)</label>
              <BatteryLevelSelector
                value={bulkRequiredLevel}
                onChange={setBulkRequiredLevel}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setBulkEditSkill(null)} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleBulkSetRequirement} 
                className="flex-1"
                disabled={bulkRequiredLevel === null}
              >
                Set for All
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
