import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Edit2, Clock, CheckCircle, XCircle, AlertCircle, Users, User, Award, Brain, Cpu, ClipboardList, Sparkles, TrendingUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import SkillAssessmentDialog from "./SkillAssessmentDialog";
import { SkillGapSummary } from "./SkillGapBar";
import BatterySkillIndicator from "./BatterySkillIndicator";

interface Assessment {
  id: string;
  skill_id: string;
  self_assessment: number | null;
  manager_assessment: number | null;
  required_level: number | null;
  status: string;
  remarks: string | null;
  expiration_date: string | null;
  assessed_at: string | null;
  scope: 'team' | 'individual';
  has_credential: boolean | null;
  skill_definitions: {
    name: string;
    category: string;
    skill_type: 'proficiency' | 'credential';
    status: string | null;
  };
}

const SKILL_STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  new: { icon: <Sparkles className="h-3 w-3" />, label: 'New', color: 'text-blue-500' },
  emerging: { icon: <TrendingUp className="h-3 w-3" />, label: 'Emerging', color: 'text-green-500' },
  legacy: { icon: <Clock className="h-3 w-3" />, label: 'Legacy', color: 'text-amber-500' },
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Behavioral': <Brain className="h-4 w-4" />,
  'Technical & Domain': <Cpu className="h-4 w-4" />,
  'Methods & Processes': <ClipboardList className="h-4 w-4" />,
  'Certifications & Licenses': <Award className="h-4 w-4" />,
};

const CATEGORY_ORDER = ['Behavioral', 'Technical & Domain', 'Methods & Processes', 'Certifications & Licenses'];

export default function MySkillsAssessment() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAssessment, setEditingAssessment] = useState<Assessment | null>(null);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    if (user?.id) {
      fetchAssessments();
      fetchUserName();
    }
  }, [user?.id]);

  const fetchUserName = async () => {
    const { data } = await supabase
      .from('users')
      .select('name')
      .eq('id', user!.id)
      .single();
    if (data) setUserName(data.name);
  };

  const fetchAssessments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('skill_assessments')
      .select(`
        id,
        skill_id,
        self_assessment,
        manager_assessment,
        required_level,
        status,
        remarks,
        expiration_date,
        assessed_at,
        scope,
        has_credential,
        skill_definitions (name, category, skill_type, status)
      `)
      .eq('user_id', user!.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast.error("Failed to load assessments");
    } else {
      setAssessments((data as any) || []);
    }
    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Draft</Badge>;
      case 'pending_approval':
        return <Badge variant="outline" className="text-amber-600 border-amber-300"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-emerald-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const handleEdit = (assessment: Assessment) => {
    setEditingAssessment(assessment);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditingAssessment(null);
    setDialogOpen(true);
  };

  // Group by category with proper ordering
  const groupedAssessments = useMemo(() => {
    const groups = assessments.reduce((acc, a) => {
      const category = a.skill_definitions?.category || 'Uncategorized';
      if (!acc[category]) acc[category] = [];
      acc[category].push(a);
      return acc;
    }, {} as Record<string, Assessment[]>);

    // Sort by defined order
    const sortedGroups: Record<string, Assessment[]> = {};
    CATEGORY_ORDER.forEach(cat => {
      if (groups[cat]) sortedGroups[cat] = groups[cat];
    });
    // Add any remaining categories
    Object.keys(groups).forEach(cat => {
      if (!sortedGroups[cat]) sortedGroups[cat] = groups[cat];
    });
    return sortedGroups;
  }, [assessments]);

  // Only include proficiency skills in gap summary
  const proficiencyAssessments = assessments.filter(
    a => a.skill_definitions?.skill_type !== 'credential'
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Loading your skills...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>My Skills Assessment</CardTitle>
            <CardDescription>
              Self-assess your skills and submit for manager approval
            </CardDescription>
          </div>
          <Button onClick={handleAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Add Skill
          </Button>
        </CardHeader>
        <CardContent>
          {proficiencyAssessments.length > 0 && (
            <div className="mb-6">
              <SkillGapSummary assessments={proficiencyAssessments} />
            </div>
          )}

          {assessments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="mb-4">You haven't added any skills yet.</p>
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Skill
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedAssessments).map(([category, categoryAssessments]) => {
                const isCredentialCategory = category === 'Certifications & Licenses';
                
                return (
                  <div key={category}>
                    <h3 className="font-semibold text-sm text-muted-foreground mb-3 flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      {category}
                      <Badge variant="outline" className="ml-2 text-xs">{categoryAssessments.length}</Badge>
                    </h3>
                    
                    {isCredentialCategory ? (
                      // Credentials display - simple yes/no badges
                      <div className="flex flex-wrap gap-2">
                        {categoryAssessments.map((assessment) => (
                          <div
                            key={assessment.id}
                            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors ${
                              assessment.has_credential 
                                ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800' 
                                : 'bg-muted/30 border-border'
                            }`}
                            onClick={() => (assessment.status === 'draft' || assessment.status === 'rejected') && handleEdit(assessment)}
                          >
                            {assessment.has_credential ? (
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span className="font-medium text-sm flex items-center gap-1">
                              {assessment.skill_definitions?.name}
                              {assessment.skill_definitions?.status && SKILL_STATUS_CONFIG[assessment.skill_definitions.status] && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className={SKILL_STATUS_CONFIG[assessment.skill_definitions.status].color}>
                                      {SKILL_STATUS_CONFIG[assessment.skill_definitions.status].icon}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    {SKILL_STATUS_CONFIG[assessment.skill_definitions.status].label} skill
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </span>
                            {getStatusBadge(assessment.status)}
                            {assessment.expiration_date && (
                              <span className="text-xs text-muted-foreground">
                                Exp: {new Date(assessment.expiration_date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      // Proficiency skills - table with levels
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Skill</TableHead>
                            <TableHead className="text-center w-20">Self</TableHead>
                            <TableHead className="text-center w-20">Required</TableHead>
                            <TableHead className="text-center w-36">Gap</TableHead>
                            <TableHead className="w-20">Scope</TableHead>
                            <TableHead className="w-28">Status</TableHead>
                            <TableHead className="w-10"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {categoryAssessments.map((assessment) => (
                            <TableRow key={assessment.id}>
                              <TableCell className="font-medium">
                                <span className="flex items-center gap-1">
                                  {assessment.skill_definitions?.name}
                                  {assessment.skill_definitions?.status && SKILL_STATUS_CONFIG[assessment.skill_definitions.status] && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className={SKILL_STATUS_CONFIG[assessment.skill_definitions.status].color}>
                                          {SKILL_STATUS_CONFIG[assessment.skill_definitions.status].icon}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        {SKILL_STATUS_CONFIG[assessment.skill_definitions.status].label} skill
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium text-sm">{assessment.self_assessment ?? '-'}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-medium text-sm">{assessment.required_level ?? '-'}</span>
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-center">
                                  <BatterySkillIndicator
                                    selfAssessment={assessment.self_assessment ?? 0}
                                    requiredLevel={assessment.required_level ?? 0}
                                    managerAssessment={assessment.manager_assessment ?? undefined}
                                    status={assessment.status === 'pending_approval' ? 'pending' : assessment.status === 'approved' ? 'approved' : undefined}
                                    compact
                                  />
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={assessment.scope === 'individual' ? 'outline' : 'secondary'} className="text-xs">
                                  {assessment.scope === 'individual' ? (
                                    <><User className="h-3 w-3 mr-1" />Personal</>
                                  ) : (
                                    <><Users className="h-3 w-3 mr-1" />Team</>
                                  )}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(assessment.status)}
                              </TableCell>
                              <TableCell>
                                {(assessment.status === 'draft' || assessment.status === 'rejected') && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEdit(assessment)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <SkillAssessmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        userId={user?.id || ""}
        userName={userName}
        existingAssessment={editingAssessment ? {
          id: editingAssessment.id,
          skill_id: editingAssessment.skill_id,
          self_assessment: editingAssessment.self_assessment,
          required_level: editingAssessment.required_level,
          remarks: editingAssessment.remarks,
          expiration_date: editingAssessment.expiration_date,
          scope: editingAssessment.scope,
          has_credential: editingAssessment.has_credential,
        } : null}
        onSuccess={fetchAssessments}
      />
    </div>
  );
}
