import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Settings, Check, X, User } from "lucide-react";
import SkillGapBar from "./SkillGapBar";
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
  
  // For adding skill requirements
  const [addSkillDialogOpen, setAddSkillDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null);

  useEffect(() => {
    if (user?.email) {
      fetchTeamData();
    }
  }, [user?.email]);

  const fetchTeamData = async () => {
    setLoading(true);
    
    // First, get the current user's name from their staff record by email
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('name')
      .eq('email', user?.email)
      .single();
    
    if (userError || !currentUser?.name) {
      setLoading(false);
      return;
    }
    
    // Fetch team members (users whose line_manager matches current user's name)
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
      
      // Fetch all assessments for team members
      const { data: assessmentData } = await supabase
        .from('skill_assessments')
        .select('id, user_id, skill_id, self_assessment, manager_assessment, required_level, status')
        .in('user_id', memberIds);

      setAssessments(assessmentData || []);

      // Get unique skill IDs from assessments
      const skillIds = [...new Set((assessmentData || []).map(a => a.skill_id))];

      // Fetch only skills that have assessments for team members
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

  const handleSetRequirement = async () => {
    if (!selectedMember || !selectedSkillId || !requiredLevel) {
      toast.error("Please select all fields");
      return;
    }

    const existing = getAssessment(selectedMember.id, selectedSkillId);

    if (existing) {
      const { error } = await supabase
        .from('skill_assessments')
        .update({ required_level: requiredLevel })
        .eq('id', existing.id);

      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('skill_assessments')
        .insert({
          user_id: selectedMember.id,
          skill_id: selectedSkillId,
          required_level: requiredLevel,
          status: 'draft'
        });

      if (error) throw error;
    }

    toast.success("Requirement set");
    setAddSkillDialogOpen(false);
    setSelectedMember(null);
    setSelectedSkillId("");
    setRequiredLevel(null);
    fetchTeamData();
  };

  const openAddSkillDialog = (member: TeamMember) => {
    setSelectedMember(member);
    setAddSkillDialogOpen(true);
  };

  // Get unique categories
  const categories = [...new Set(skills.map(s => s.category))];
  
  // Filter skills by category
  const filteredSkills = selectedCategory === "all" 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);

  // Get pending approvals count
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
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-amber-800">
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
              View and manage skill requirements for your team
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
          <div className="overflow-auto max-h-[600px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 left-0 bg-background z-20 min-w-48">Skill</TableHead>
                  {teamMembers.map(member => (
                    <TableHead key={member.id} className="sticky top-0 bg-background z-10 text-center min-w-28">
                      <div className="text-xs">
                        <p className="font-medium truncate">{member.name}</p>
                        <p className="text-muted-foreground truncate">{member.job_title}</p>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSkills.map(skill => (
                  <TableRow key={skill.id}>
                    <TableCell className="sticky left-0 bg-background z-10">
                      <div>
                        <p className="font-medium">{skill.name}</p>
                        <p className="text-xs text-muted-foreground">{skill.category}</p>
                      </div>
                    </TableCell>
                    {teamMembers.map(member => {
                      const assessment = getAssessment(member.id, skill.id);
                      return (
                        <TableCell key={member.id} className="text-center p-2">
                          {assessment ? (
                            <div className="flex flex-col items-center gap-1">
                              <SkillGapBar
                                selfAssessment={assessment.self_assessment}
                                requiredLevel={assessment.required_level}
                                managerAssessment={assessment.manager_assessment}
                                compact
                              />
                              {assessment.status === 'pending_approval' && (
                                <Badge variant="outline" className="text-amber-600 text-xs">
                                  Pending
                                </Badge>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">-</span>
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add Skill Requirement Dialog */}
      <Dialog open={addSkillDialogOpen} onOpenChange={setAddSkillDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Skill Requirement for {selectedMember?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Skill</label>
              <Select value={selectedSkillId} onValueChange={setSelectedSkillId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select skill..." />
                </SelectTrigger>
                <SelectContent>
                  {skills.map(skill => (
                    <SelectItem key={skill.id} value={skill.id}>
                      {skill.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Required Level</label>
              <SkillLevelSelector
                value={requiredLevel}
                onChange={setRequiredLevel}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={() => setAddSkillDialogOpen(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleSetRequirement} className="flex-1">
                Set Requirement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
