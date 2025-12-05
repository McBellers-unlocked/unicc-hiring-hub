import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Check, X, User, Settings2 } from "lucide-react";
import BatterySkillIndicator from "./BatterySkillIndicator";
import SkillLevelSelector, { SkillLevelDisplay } from "./SkillLevelSelector";

interface TeamMember {
  id: string;
  name: string;
  job_title: string | null;
  unit: string | null;
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

export default function TeamSkillsTable() {
  const { user } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [allSkillDefinitions, setAllSkillDefinitions] = useState<SkillDefinition[]>([]);
  
  // Cell edit state
  const [editingCell, setEditingCell] = useState<{ memberId: string; skillId: string } | null>(null);
  const [editRequiredLevel, setEditRequiredLevel] = useState<number | null>(null);
  
  // Bulk edit state
  const [bulkEditSkill, setBulkEditSkill] = useState<SkillDefinition | null>(null);
  const [bulkRequiredLevel, setBulkRequiredLevel] = useState<number | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchTeamData();
      fetchAllSkillDefinitions();
    }
  }, [user?.email]);

  const fetchAllSkillDefinitions = async () => {
    const { data } = await supabase
      .from('skill_definitions')
      .select('id, name, category')
      .eq('is_active', true)
      .order('category')
      .order('name');
    setAllSkillDefinitions(data || []);
  };

  const fetchTeamData = async () => {
    setLoading(true);
    
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('email', user?.email)
      .single();
    
    if (userError || !currentUser?.name) {
      setLoading(false);
      return;
    }
    
    const { data: members, error: membersError } = await supabase
      .from('users')
      .select('id, name, job_title, unit')
      .eq('line_manager', currentUser.name)
      .order('name');

    if (membersError) {
      toast.error("Failed to load team members");
      setLoading(false);
      return;
    }

    setTeamMembers(members || []);

    if (members && members.length > 0) {
      const memberIds = members.map(m => m.id);
      
      const { data: assessmentData } = await supabase
        .from('skill_assessments')
        .select('id, user_id, skill_id, self_assessment, manager_assessment, required_level, status')
        .in('user_id', memberIds);

      setAssessments(assessmentData || []);

      const skillIds = [...new Set((assessmentData || []).map(a => a.skill_id))];

      if (skillIds.length > 0) {
        const { data: skillData } = await supabase
          .from('skill_definitions')
          .select('id, name, category')
          .eq('is_active', true)
          .in('id', skillIds)
          .order('category')
          .order('name');

        setSkills(skillData || []);
      } else {
        setSkills([]);
      }
    } else {
      setSkills([]);
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

  const handleCellClick = (memberId: string, skillId: string) => {
    const assessment = getAssessment(memberId, skillId);
    setEditingCell({ memberId, skillId });
    setEditRequiredLevel(assessment?.required_level ?? null);
  };

  const handleSaveRequirement = async () => {
    if (!editingCell || editRequiredLevel === null) return;

    const existing = getAssessment(editingCell.memberId, editingCell.skillId);

    try {
      if (existing) {
        const { error } = await supabase
          .from('skill_assessments')
          .update({ required_level: editRequiredLevel })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('skill_assessments')
          .insert({
            user_id: editingCell.memberId,
            skill_id: editingCell.skillId,
            required_level: editRequiredLevel,
            status: 'draft'
          });
        if (error) throw error;
      }

      toast.success("Requirement updated");
      setEditingCell(null);
      fetchTeamData();
    } catch {
      toast.error("Failed to update requirement");
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

  const categories = [...new Set(skills.map(s => s.category))];
  
  const filteredSkills = selectedCategory === "all" 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  const pendingCount = assessments.filter(a => a.status === 'pending_approval').length;

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
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Skills Matrix</CardTitle>
            <CardDescription>
              Click any cell to set required skill levels for your team
            </CardDescription>
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
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
                    {teamMembers.map(member => (
                      <TableHead key={member.id} className="sticky top-0 bg-background z-10 text-center min-w-24 px-2">
                        <div className="text-xs">
                          <p className="font-medium truncate max-w-20">{member.name.split(' ')[0]}</p>
                          <p className="text-muted-foreground truncate max-w-20 text-[10px]">
                            {member.job_title?.split(' ').slice(0, 2).join(' ')}
                          </p>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="sticky top-0 bg-background z-10 w-12 text-center">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSkills.map(skill => (
                    <TableRow key={skill.id}>
                      <TableCell className="sticky left-0 bg-background z-10 border-r">
                        <div>
                          <p className="font-medium text-sm">{skill.name}</p>
                          <p className="text-xs text-muted-foreground">{skill.category}</p>
                        </div>
                      </TableCell>
                      {teamMembers.map(member => {
                        const assessment = getAssessment(member.id, skill.id);
                        const isEditing = editingCell?.memberId === member.id && editingCell?.skillId === skill.id;
                        
                        return (
                          <TableCell key={member.id} className="text-center p-1">
                            <Popover 
                              open={isEditing} 
                              onOpenChange={(open) => !open && setEditingCell(null)}
                            >
                              <PopoverTrigger asChild>
                                <div>
                                  <BatterySkillIndicator
                                    selfAssessment={assessment?.self_assessment ?? null}
                                    requiredLevel={assessment?.required_level ?? null}
                                    managerAssessment={assessment?.manager_assessment ?? null}
                                    status={assessment?.status}
                                    onClick={() => handleCellClick(member.id, skill.id)}
                                    compact
                                  />
                                </div>
                              </PopoverTrigger>
                              <PopoverContent className="w-64" side="top">
                                <div className="space-y-3">
                                  <div className="font-medium text-sm">{skill.name}</div>
                                  <div className="text-xs text-muted-foreground">{member.name}</div>
                                  
                                  {assessment?.self_assessment && (
                                    <div className="flex items-center justify-between text-sm">
                                      <span>Self Assessment:</span>
                                      <Badge variant="outline">Level {assessment.self_assessment}</Badge>
                                    </div>
                                  )}
                                  
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Required Level</label>
                                    <SkillLevelSelector
                                      value={editRequiredLevel}
                                      onChange={setEditRequiredLevel}
                                      size="sm"
                                    />
                                  </div>
                                  
                                  <div className="flex gap-2 pt-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="flex-1"
                                      onClick={() => setEditingCell(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      size="sm"
                                      className="flex-1"
                                      onClick={handleSaveRequirement}
                                      disabled={editRequiredLevel === null}
                                    >
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              </PopoverContent>
                            </Popover>
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
              Set the same required level for "{bulkEditSkill?.name}" across your entire team.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">{bulkEditSkill?.name}</p>
              <p className="text-xs text-muted-foreground">{bulkEditSkill?.category}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Required Level for All ({teamMembers.length} members)</label>
              <SkillLevelSelector
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
