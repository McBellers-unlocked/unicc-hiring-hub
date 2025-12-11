import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Calculator, 
  GraduationCap, 
  Briefcase, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Send,
  Edit2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { 
  calculateStep, 
  parseExperienceYears, 
  calculateTotalExperienceYears,
  getEducationLevelDisplay,
  type StepCalculationInput,
  type StepCalculationResult
} from '@/lib/stepDetermination';
import { getEducationLevel, type EducationLevel } from '@/lib/educationUtils';
import StepDeterminationBreakdown from './StepDeterminationBreakdown';

interface Props {
  applicationId: string;
  jobId: string;
  onSaved?: () => void;
}

interface JobData {
  id: string;
  title: string;
  grade: string | null;
  essential_education_level: string | null;
  requirements_md: string | null;
}

interface CandidateData {
  id: string;
  name: string;
  education: any[];
  phf_education: any[];
  work_experience: any[];
  phf_work_experience: any[];
}

interface ExistingDetermination {
  id: string;
  status: string;
  calculated_step: number;
  final_step: number | null;
  whed_verified: boolean;
  override_justification: string | null;
  education_step: number;
  experience_steps: number;
  approved_by: string | null;
  approved_at: string | null;
}

export default function StepDeterminationCalculator({ applicationId, jobId, onSaved }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [job, setJob] = useState<JobData | null>(null);
  const [candidate, setCandidate] = useState<CandidateData | null>(null);
  const [existing, setExisting] = useState<ExistingDetermination | null>(null);
  
  // Form state
  const [whedVerified, setWhedVerified] = useState(false);
  const [whedNotes, setWhedNotes] = useState('');
  const [overrideStep, setOverrideStep] = useState<number | null>(null);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [essentialYearsOverride, setEssentialYearsOverride] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, [applicationId, jobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load job, application with candidate, and existing determination in parallel
      const [jobRes, appRes, detRes] = await Promise.all([
        supabase.from('jobs').select('id, title, grade, essential_education_level, requirements_md').eq('id', jobId).single(),
        supabase.from('applications').select('candidate_id, candidates(*)').eq('id', applicationId).single(),
        supabase.from('offer_determinations').select('*').eq('application_id', applicationId).maybeSingle()
      ]);

      if (jobRes.data) setJob(jobRes.data);
      if (appRes.data?.candidates) {
        const c = appRes.data.candidates as any;
        setCandidate({
          id: c.id,
          name: c.name,
          education: c.education || [],
          phf_education: c.phf_education || [],
          work_experience: c.work_experience || [],
          phf_work_experience: c.phf_work_experience || []
        });
      }
      if (detRes.data) {
        setExisting(detRes.data as ExistingDetermination);
        setWhedVerified(detRes.data.whed_verified || false);
        setWhedNotes(detRes.data.whed_verification_notes || '');
        if (detRes.data.final_step && detRes.data.final_step !== detRes.data.calculated_step) {
          setOverrideStep(detRes.data.final_step);
          setOverrideJustification(detRes.data.override_justification || '');
        }
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Parse essential experience from job requirements
  const essentialExperienceYears = useMemo(() => {
    if (essentialYearsOverride !== null) return essentialYearsOverride;
    if (!job?.requirements_md) return 0;
    return parseExperienceYears(job.requirements_md);
  }, [job?.requirements_md, essentialYearsOverride]);

  // Get education level
  const essentialEducationLevel = useMemo((): EducationLevel => {
    if (!job?.essential_education_level) return 'First Level University';
    // Map from job field to EducationLevel type
    const mapping: Record<string, EducationLevel> = {
      'Secondary': 'Secondary',
      'First Level University': 'First Level University',
      'Advanced University': 'Advanced University',
      'Professional': 'Professional'
    };
    return mapping[job.essential_education_level] || 'First Level University';
  }, [job?.essential_education_level]);

  // Combine education from profile and PHF
  const candidateEducation = useMemo(() => {
    if (!candidate) return [];
    const combined = [...(candidate.education || []), ...(candidate.phf_education || [])];
    // Add WHED verified flag based on current checkbox
    return combined.map(edu => ({
      ...edu,
      whed_verified: whedVerified
    }));
  }, [candidate, whedVerified]);

  // Combine work experience
  const candidateExperience = useMemo(() => {
    if (!candidate) return [];
    return [...(candidate.work_experience || []), ...(candidate.phf_work_experience || [])];
  }, [candidate]);

  // Calculate step
  const calculation = useMemo((): StepCalculationResult | null => {
    if (!candidate) return null;
    
    const input: StepCalculationInput = {
      essentialEducationLevel,
      essentialExperienceYears,
      essentialExperienceText: job?.requirements_md || undefined,
      candidateEducation,
      candidateExperience
    };
    
    return calculateStep(input);
  }, [essentialEducationLevel, essentialExperienceYears, candidateEducation, candidateExperience, job?.requirements_md]);

  const totalExperience = useMemo(() => {
    return calculateTotalExperienceYears(candidateExperience);
  }, [candidateExperience]);

  const finalStep = overrideStep ?? calculation?.calculatedStep ?? 1;

  const handleSave = async (submitForApproval: boolean = false) => {
    if (!calculation || !user) return;
    
    setSaving(true);
    try {
      const data = {
        application_id: applicationId,
        job_id: jobId,
        job_grade: job?.grade,
        essential_education_level: essentialEducationLevel,
        essential_experience_years: essentialExperienceYears,
        essential_experience_text: job?.requirements_md?.substring(0, 500),
        candidate_highest_education: candidateEducation[0]?.degree_type || null,
        candidate_education_level: candidateEducation.length > 0 
          ? getEducationLevel(candidateEducation[0]?.degree_type || '') 
          : null,
        candidate_total_experience_years: totalExperience,
        candidate_relevant_experience_years: totalExperience, // Could be refined
        base_step: calculation.baseStep,
        education_step: calculation.educationStep,
        education_step_justification: calculation.educationStepJustification,
        experience_steps: calculation.experienceSteps,
        experience_steps_justification: calculation.experienceStepsJustification,
        additional_years_counted: calculation.additionalYearsCounted,
        calculated_step: calculation.calculatedStep,
        final_step: finalStep,
        override_justification: overrideStep ? overrideJustification : null,
        whed_verified: whedVerified,
        whed_verification_notes: whedNotes || null,
        status: submitForApproval ? 'pending_approval' : 'draft',
        calculated_by: user.id
      };

      if (existing) {
        const { error } = await supabase
          .from('offer_determinations')
          .update(data)
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('offer_determinations')
          .insert(data);
        if (error) throw error;
      }

      toast.success(submitForApproval ? 'Submitted for approval' : 'Draft saved');
      loadData();
      onSaved?.();
    } catch (error: any) {
      console.error('Error saving:', error);
      toast.error(error.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!existing || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('offer_determinations')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      toast.success('Step determination approved');
      loadData();
      onSaved?.();
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async (reason: string) => {
    if (!existing || !user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('offer_determinations')
        .update({
          status: 'rejected',
          rejection_reason: reason
        })
        .eq('id', existing.id);
      
      if (error) throw error;
      toast.success('Step determination returned for revision');
      loadData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 animate-spin" />
            Loading step determination...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!job || !candidate) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load job or candidate data.</AlertDescription>
      </Alert>
    );
  }

  const isReadOnly = existing?.status === 'approved';
  const isPendingApproval = existing?.status === 'pending_approval';

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      {existing && (
        <Alert className={
          existing.status === 'approved' ? 'border-green-500 bg-green-50 dark:bg-green-950' :
          existing.status === 'pending_approval' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950' :
          existing.status === 'rejected' ? 'border-red-500 bg-red-50 dark:bg-red-950' :
          ''
        }>
          <AlertDescription className="flex items-center gap-2">
            {existing.status === 'approved' && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {existing.status === 'pending_approval' && <Clock className="h-4 w-4 text-amber-600" />}
            {existing.status === 'rejected' && <AlertTriangle className="h-4 w-4 text-red-600" />}
            <span className="font-medium">
              {existing.status === 'approved' && `Step ${existing.final_step || existing.calculated_step} approved`}
              {existing.status === 'pending_approval' && 'Pending Chief HR approval'}
              {existing.status === 'rejected' && 'Returned for revision'}
              {existing.status === 'draft' && 'Draft - not yet submitted'}
            </span>
          </AlertDescription>
        </Alert>
      )}

      {/* Job Requirements */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Requirements
          </CardTitle>
          <CardDescription>Essential minimum requirements for {job.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Grade</Label>
              <p className="font-medium">{job.grade || 'Not specified'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Essential Education</Label>
              <p className="font-medium">{getEducationLevelDisplay(essentialEducationLevel)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Essential Experience</Label>
              <div className="flex items-center gap-2">
                <p className="font-medium">{essentialExperienceYears} years</p>
                {!isReadOnly && (
                  <Select
                    value={essentialYearsOverride?.toString() || ''}
                    onValueChange={(v) => setEssentialYearsOverride(v ? parseInt(v) : null)}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue placeholder="Edit" />
                    </SelectTrigger>
                    <SelectContent>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15].map(y => (
                        <SelectItem key={y} value={y.toString()}>{y} yrs</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Candidate Qualifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Candidate Qualifications
          </CardTitle>
          <CardDescription>{candidate.name}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground text-xs">Education</Label>
              {candidateEducation.length > 0 ? (
                <ul className="space-y-1 mt-1">
                  {candidateEducation.slice(0, 3).map((edu, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-medium">{edu.degree_type}</span>
                      {edu.field_of_study && <span className="text-muted-foreground"> in {edu.field_of_study}</span>}
                      {edu.is_completed && <Badge variant="outline" className="ml-2 text-xs">Completed</Badge>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-sm">No education records</p>
              )}
            </div>
            <div>
              <Label className="text-muted-foreground text-xs">Total Experience</Label>
              <p className="font-medium">{totalExperience.toFixed(1)} years</p>
              <p className="text-xs text-muted-foreground mt-1">
                From {candidateExperience.length} position(s)
              </p>
            </div>
          </div>

          {/* WHED Verification */}
          <Separator />
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="whed"
                checked={whedVerified}
                onCheckedChange={(checked) => setWhedVerified(checked === true)}
                disabled={isReadOnly}
              />
              <div className="space-y-1">
                <Label htmlFor="whed" className="font-medium cursor-pointer">
                  WHED Verification Completed
                </Label>
                <p className="text-xs text-muted-foreground">
                  Higher education must be verified in the World Higher Education Database (WHED) to award additional education step.
                </p>
              </div>
            </div>
            {whedVerified && !isReadOnly && (
              <Textarea
                placeholder="WHED verification notes (optional)..."
                value={whedNotes}
                onChange={(e) => setWhedNotes(e.target.value)}
                className="text-sm"
                rows={2}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step Calculation */}
      {calculation && (
        <StepDeterminationBreakdown
          calculation={calculation}
          essentialEducationLevel={essentialEducationLevel}
          essentialExperienceYears={essentialExperienceYears}
          totalExperience={totalExperience}
        />
      )}

      {/* Override Section */}
      {!isReadOnly && calculation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Edit2 className="h-5 w-5" />
              Override (Optional)
            </CardTitle>
            <CardDescription>
              Adjust the final step if there are exceptional circumstances
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Label>Final Step:</Label>
              <Select
                value={overrideStep?.toString() || 'calculated'}
                onValueChange={(v) => setOverrideStep(v === 'calculated' ? null : parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder={`${calculation.calculatedStep} (calculated)`} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="calculated">Use calculated ({calculation.calculatedStep})</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(s => (
                    <SelectItem key={s} value={s.toString()}>Step {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {overrideStep && overrideStep !== calculation.calculatedStep && (
              <div className="space-y-2">
                <Label className="text-destructive">Override Justification (Required)</Label>
                <Textarea
                  placeholder="Explain why the calculated step is being overridden..."
                  value={overrideJustification}
                  onChange={(e) => setOverrideJustification(e.target.value)}
                  className="min-h-[80px]"
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Warnings */}
      {calculation?.warnings && calculation.warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <ul className="list-disc list-inside space-y-1">
              {calculation.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Final Step Display */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Recommended Step</p>
              <p className="text-4xl font-bold text-primary">Step {finalStep}</p>
              {overrideStep && overrideStep !== calculation?.calculatedStep && (
                <p className="text-xs text-muted-foreground mt-1">
                  (Overridden from calculated step {calculation?.calculatedStep})
                </p>
              )}
            </div>
            <Calculator className="h-12 w-12 text-primary/20" />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      {!isReadOnly && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={saving}
          >
            Save Draft
          </Button>
          <Button
            onClick={() => handleSave(true)}
            disabled={saving || (overrideStep !== null && !overrideJustification)}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit for Approval
          </Button>
        </div>
      )}

      {/* Approval Actions (for Chief HR) */}
      {isPendingApproval && user?.role === 'Chief of HR' && (
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              const reason = prompt('Reason for returning this determination:');
              if (reason) handleReject(reason);
            }}
            disabled={saving}
          >
            Return for Revision
          </Button>
          <Button
            onClick={handleApprove}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Approve Step {finalStep}
          </Button>
        </div>
      )}
    </div>
  );
}
