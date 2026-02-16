import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Info, Upload, Users, User, Award, Brain, Cpu, ClipboardList, Sparkles, TrendingUp, Clock, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import SkillLevelSelector from "./SkillLevelSelector";

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  skill_type: 'proficiency' | 'credential';
  status: string | null;
  is_open_source: boolean;
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
    has_credential?: boolean | null;
  } | null;
  onSuccess: () => void;
  isManager?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  'Behavioral': <Brain className="h-4 w-4" />,
  'Technical & Domain': <Cpu className="h-4 w-4" />,
  'Methods & Processes': <ClipboardList className="h-4 w-4" />,
  'Certifications & Licenses': <Award className="h-4 w-4" />,
};

const CATEGORY_ORDER = ['Behavioral', 'Technical & Domain', 'Methods & Processes', 'Certifications & Licenses'];

const STATUS_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  new: { icon: <Sparkles className="h-3 w-3" />, color: 'text-blue-500' },
  emerging: { icon: <TrendingUp className="h-3 w-3" />, color: 'text-green-500' },
  legacy: { icon: <Clock className="h-3 w-3" />, color: 'text-amber-500' },
};

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
  const [hasCredential, setHasCredential] = useState<boolean>(false);

  const selectedSkill = skills.find(s => s.id === skillId);
  const isCredentialSkill = selectedSkill?.skill_type === 'credential';

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
        setHasCredential(existingAssessment.has_credential || false);
      } else {
        resetForm();
      }
    }
  }, [open, existingAssessment]);

  const fetchSkills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, status, is_open_source')
      .eq('is_active', true)
      .neq('status', 'retired') // Filter out retired skills
      .order('category')
      .order('name');
    
    if (error) {
      toast.error("Failed to load skills");
    } else {
      setSkills((data || []) as SkillDefinition[]);
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
    setHasCredential(false);
  };

  const handleSubmit = async (submitForApproval: boolean = false) => {
    if (!skillId) {
      toast.error("Please select a skill");
      return;
    }
    
    // For proficiency skills, require a level
    if (!isCredentialSkill && !selfAssessment && !isManager) {
      toast.error("Please select an assessment level");
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
        scope: isManager ? 'team' : scope,
      };

      // Handle credential vs proficiency differently
      if (isCredentialSkill) {
        assessmentData.has_credential = hasCredential;
        assessmentData.self_assessment = hasCredential ? 5 : null; // Full level if has credential
        assessmentData.required_level = 5; // Credentials are always required at max
      } else {
        assessmentData.has_credential = null;
        if (isManager) {
          assessmentData.required_level = requiredLevel;
          assessmentData.status = 'approved';
        } else {
          assessmentData.self_assessment = selfAssessment;
          assessmentData.status = submitForApproval ? 'pending_approval' : 'draft';
        }
      }

      if (!isManager && !isCredentialSkill) {
        assessmentData.status = submitForApproval ? 'pending_approval' : 'draft';
      } else if (isCredentialSkill) {
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
      if (selectedSkill) {
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

        // Also sync to candidates table
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

      // Send OSS notification email (fire-and-forget, only for new assessments)
      if (selectedSkill?.is_open_source && !existingAssessment) {
        const staffEmail = (await supabase.from('users').select('email').eq('id', userId).single()).data?.email;
        supabase.functions.invoke('notify-oss-skill-added', {
          body: {
            staffName: userName,
            staffEmail: staffEmail || '',
            skillName: selectedSkill.name,
            skillCategory: selectedSkill.category,
            userId,
          },
        }).catch(err => console.error('OSS notification failed:', err));
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

  // Group skills by category in the defined order
  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, SkillDefinition[]>);

  // Sort categories by defined order
  const sortedCategories = Object.keys(groupedSkills).sort((a, b) => {
    const aIndex = CATEGORY_ORDER.indexOf(a);
    const bIndex = CATEGORY_ORDER.indexOf(b);
    if (aIndex === -1 && bIndex === -1) return a.localeCompare(b);
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });

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
                {sortedCategories.map(category => (
                  <div key={category}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted flex items-center gap-2">
                      {CATEGORY_ICONS[category]}
                      {category}
                    </div>
                    {groupedSkills[category].map(skill => (
                      <SelectItem key={skill.id} value={skill.id}>
                        <span className="flex items-center gap-2">
                          {skill.name}
                          {skill.is_open_source && (
                            <Globe className="h-3 w-3 text-emerald-600" />
                          )}
                          {skill.skill_type === 'credential' && (
                            <Award className="h-3 w-3 text-amber-500" />
                          )}
                          {skill.status && STATUS_ICONS[skill.status] && (
                            <span className={STATUS_ICONS[skill.status].color}>
                              {STATUS_ICONS[skill.status].icon}
                            </span>
                          )}
                        </span>
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

          {/* Level selector - different UI for credentials vs proficiency */}
          {isCredentialSkill ? (
            <div className="space-y-3 p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-950/20">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-600" />
                <Label className="text-amber-800 dark:text-amber-200">Certification Status</Label>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Do you have this certification?</p>
                  <p className="text-xs text-muted-foreground">Credentials are tracked as Yes/No</p>
                </div>
                <Switch
                  checked={hasCredential}
                  onCheckedChange={setHasCredential}
                />
              </div>
              {hasCredential && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  ✓ You have this certification
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label>{isManager ? "Required Level *" : "Self Assessment Level *"}</Label>
              <SkillLevelSelector
                value={isManager ? requiredLevel : selfAssessment}
                onChange={isManager ? setRequiredLevel : setSelfAssessment}
              />
            </div>
          )}

          {/* Expiration date - more prominent for certifications */}
          <div className="space-y-2">
            <Label>
              {isCredentialSkill ? "Certification Expiry Date" : "Expiration Date (Optional)"}
            </Label>
            <Input
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
            />
            {isCredentialSkill && (
              <p className="text-xs text-muted-foreground">
                When does this certification expire? Leave blank if it doesn't expire.
              </p>
            )}
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isCredentialSkill ? "Add certification ID, issuing body, etc..." : "Add any relevant notes..."}
              rows={3}
            />
          </div>

          {/* Attachments placeholder */}
          <div className="space-y-2">
            <Label>Attachments</Label>
            <div className="border-2 border-dashed rounded-lg p-4 text-center text-muted-foreground">
              <Upload className="h-6 w-6 mx-auto mb-2" />
              <p className="text-sm">Drag & drop or click to upload</p>
              <p className="text-xs">{isCredentialSkill ? "Upload certificate copy" : "Certificates, training records, etc."}</p>
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
