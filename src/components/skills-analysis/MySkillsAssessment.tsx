import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Plus, Edit2, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
  skill_definitions: {
    name: string;
    category: string;
  };
}

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
        skill_definitions (name, category)
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

  // Group by category
  const groupedAssessments = assessments.reduce((acc, a) => {
    const category = a.skill_definitions?.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(a);
    return acc;
  }, {} as Record<string, Assessment[]>);

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
          {assessments.length > 0 && (
            <div className="mb-6">
              <SkillGapSummary assessments={assessments} />
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
              {Object.entries(groupedAssessments).map(([category, categoryAssessments]) => (
                <div key={category}>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">{category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead className="text-center">Self</TableHead>
                        <TableHead className="text-center">Required</TableHead>
                        <TableHead className="w-32">Gap</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categoryAssessments.map((assessment) => (
                        <TableRow key={assessment.id}>
                          <TableCell className="font-medium">
                            {assessment.skill_definitions?.name}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-sm">{assessment.self_assessment ?? '-'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-medium text-sm">{assessment.required_level ?? '-'}</span>
                          </TableCell>
                          <TableCell>
                            <BatterySkillIndicator
                              selfAssessment={assessment.self_assessment ?? 0}
                              requiredLevel={assessment.required_level ?? 0}
                              managerAssessment={assessment.manager_assessment ?? undefined}
                              status={assessment.status === 'pending_approval' ? 'pending' : assessment.status === 'approved' ? 'approved' : undefined}
                              compact
                            />
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
                </div>
              ))}
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
        } : null}
        onSuccess={fetchAssessments}
      />
    </div>
  );
}
