import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Info, Upload, Users, User } from "lucide-react";
import SkillLevelSelector from "./SkillLevelSelector";

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
}

interface SkillAssessmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  existingAssessment?: {
    id: string;
    skill_id: string;
    self_assessment: number | null;
    required_level: number | null;
    remarks: string | null;
    expiration_date: string | null;
    scope?: 'team' | 'individual';
  } | null;
  onSuccess: () => void;
  isManager?: boolean;
}

export default function SkillAssessmentDialog({
  open,
  onOpenChange,
  userId,
  userName,
  existingAssessment,
  onSuccess,
  isManager = false
}: SkillAssessmentDialogProps) {
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [skillId, setSkillId] = useState<string>("");
  const [selfAssessment, setSelfAssessment] = useState<number | null>(null);
  const [requiredLevel, setRequiredLevel] = useState<number | null>(null);
  const [remarks, setRemarks] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [scope, setScope] = useState<'team' | 'individual'>('team');

  useEffect(() => {
    if (open) {
      fetchSkills();
      if (existingAssessment) {
        setSkillId(existingAssessment.skill_id);
        setSelfAssessment(existingAssessment.self_assessment);
        setRequiredLevel(existingAssessment.required_level);
        setRemarks(existingAssessment.remarks || "");
        setExpirationDate(existingAssessment.expiration_date || "");
        setScope(existingAssessment.scope || 'team');
      } else {
        resetForm();
      }
    }
  }, [open, existingAssessment]);

  const fetchSkills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('skill_definitions')
      .select('id, name, category')
      .eq('is_active', true)
      .order('category')
      .order('name');
    
    if (error) {
      toast.error("Failed to load skills");
    } else {
      setSkills(data || []);
    }
    setLoading(false);
  };

  const resetForm = () => {
    setSkillId("");
    setSelfAssessment(null);
    setRequiredLevel(null);
    setRemarks("");
    setExpirationDate("");
    setScope('team');
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!skillId || (!selfAssessment && !isManager)) {
      toast.error("Please select a skill and assessment level");
      return;
    }

    setSaving(true);
    try {
      const assessmentData: any = {
        user_id: userId,
        skill_id: skillId,
        remarks: remarks || null,
        expiration_date: expirationDate || null,
        assessed_at: new Date().toISOString(),
        scope: isManager ? 'team' : scope, // Managers always set team skills
      };

      if (isManager) {
        assessmentData.required_level = requiredLevel;
        assessmentData.status = 'approved';
      } else {
        assessmentData.self_assessment = selfAssessment;
        assessmentData.status = submitForApproval ? 'pending_approval' : 'draft';
      }

      if (existingAssessment?.id) {
        const { error } = await supabase
          .from('skill_assessments')
          .update(assessmentData)
          .eq('id', existingAssessment.id);
        
        if (error) throw error;
        toast.success("Assessment updated");
      } else {
        const { error } = await supabase
          .from('skill_assessments')
          .insert(assessmentData);
        
        if (error) throw error;
        toast.success(submitForApproval ? "Assessment submitted for approval" : "Assessment saved as draft");
      }

      // Sync skill to user's profile skills array
      const selectedSkill = skills.find(s => s.id === skillId);
      if (selectedSkill) {
        // Sync to users table
        const { data: userData } = await supabase
          .from('users')
          .select('skills, email')
          .eq('id', userId)
          .single();
        
        const currentSkills: string[] = Array.isArray(userData?.skills) 
          ? (userData.skills as (string | { name?: string })[]).map(s => typeof s === 'string' ? s : s?.name || '').filter(Boolean)
          : [];
        const skillExists = currentSkills.some(
          s => s.toLowerCase() === selectedSkill.name.toLowerCase()
        );
        
        if (!skillExists) {
          await supabase
            .from('users')
            .update({ skills: [...currentSkills, selectedSkill.name] })
            .eq('id', userId);
        }

        // Also sync to candidates table (bidirectional sync)
        if (userData?.email) {
          const { data: candidateData } = await supabase
            .from('candidates')
            .select('id, skills')
            .eq('email', userData.email)
            .single();
          
          if (candidateData) {
            const currentCandidateSkills: string[] = Array.isArray(candidateData.skills)
              ? (candidateData.skills as (string | { name?: string })[]).map(s => typeof s === 'string' ? s : (s as any)?.name || '').filter(Boolean)
              : [];
            const skillExistsInCandidate = currentCandidateSkills.some(
              s => s.toLowerCase() === selectedSkill.name.toLowerCase()
            );
            
            if (!skillExistsInCandidate) {
              await supabase
                .from('candidates')
                .update({ skills: [...currentCandidateSkills, selectedSkill.name] })
                .eq('id', candidateData.id);
            }
          }
        }
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving assessment:', error);
      toast.error(error.message || "Failed to save assessment");
    } finally {
      setSaving(false);
    }
  };

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillDefinition[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existingAssessment ? "Edit" : "Add"} Skill Assessment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Employee name */}
          <div className="p-3 bg-muted rounded-lg">
            <Label className="text-muted-foreground text-xs">Employee</Label>
            <p className="font-medium">{userName}</p>
          </div>

          {!isManager && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Your assessment will be submitted for manager approval.
              </AlertDescription>
            </Alert>
          )}

          {/* Skill selector */}
          <div className="space-y-2">
            <Label>Skill *</Label>
            <Select 
              value={skillId} 
              onValueChange={setSkillId}
              disabled={!!existingAssessment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a skill..." />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {Object.entries(groupedSkills).map(([category, categorySkills]) => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                      {category}
                    </div>
                    {categorySkills.map(skill => (
                      <SelectItem key={skill.id} value={skill.id}>
                        {skill.name}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Scope selector - only for non-managers */}
          {!isManager && (
            <div className="space-y-2">
              <Label>Skill Purpose</Label>
              <RadioGroup value={scope} onValueChange={(v) => setScope(v as 'team' | 'individual')} className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex items-center gap-1.5 cursor-pointer font-normal">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Role/Team Skill
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex items-center gap-1.5 cursor-pointer font-normal">
                    <User className="h-4 w-4 text-muted-foreground" />
                    Personal Development
                  </Label>
                </div>
              </RadioGroup>
              <p className="text-xs text-muted-foreground">
                {scope === 'team' 
                  ? "This skill is required for your role and will appear in team metrics." 
                  : "Personal skills won't affect team gap metrics."}
              </p>
            </div>
          )}

          {/* Level selector */}
          <div className="space-y-2">
            <Label>{isManager ? "Required Level *" : "Self Assessment Level *"}</Label>
            <SkillLevelSelector
              value={isManager ? requiredLevel : selfAssessment}
              onChange={isManager ? setRequiredLevel : setSelfAssessment}
            />
          </div>

          {/* Expiration date */}
          <div className="space-y-2">
            <Label>Expiration Date (Optional)</Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any relevant notes..."
              rows={3}
            />
          </div>

          {/* Attachments placeholder */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
              <Upload className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">Drag & drop or click to upload</p>
              <p className="text-xs">Certificates, training records, etc.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            {!isManager && (
              <Button 
                variant="secondary" 
                onClick={() => handleSubmit(false)} 
                disabled={saving}
                className="flex-1"
              >
                Save Draft
              </Button>
            )}
            <Button 
              onClick={() => handleSubmit(true)} 
              disabled={saving}
              className="flex-1"
            >
              {isManager ? "Save" : "Submit for Approval"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
