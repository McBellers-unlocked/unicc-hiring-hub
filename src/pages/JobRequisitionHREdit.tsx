import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, AlertTriangle, Eye } from "lucide-react";
import { format } from "date-fns";
import EditableTrackChangesFieldWithHighlight from "@/components/EditableTrackChangesFieldWithHighlight";
import EditableTrackChangesField from "@/components/EditableTrackChangesField";
import { FinalDocumentReviewDialog } from "@/components/FinalDocumentReviewDialog";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  duty_station: string;
  nature_of_position: string;
  start_date: string;
  positions_available: number;
  purpose_of_position: string;
  objectives_of_programme: string;
  main_duties_responsibilities: string;
  essential_experience: string;
  desirable_experience: string;
  essential_education: string;
  desirable_education: string;
  language_requirements: any;
  status: string;
  created_at: string;
  hr_original_data: any;
  hr_changes: any;
  hr_change_summary: string;
  hr_comments: string;
  chief_hr_reviewed: boolean;
  chief_hr_comments: string;
  hr_internal_status: string;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_changes: any;
  hr_final_review_completed: boolean;
  final_clean_version: any;
  comments: any;
  core_competencies: any;
  management_competencies: any;
  leadership_competencies: any;
  global_competencies: any;
}

interface FieldChange {
  field: string;
  label: string;
  originalValue: string;
  newValue: string;
  diffStats?: {
    wordsAdded: number;
    wordsRemoved: number;
    wordsModified: number;
  };
}

export default function JobRequisitionHREdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [formData, setFormData] = useState<Partial<JobRequisition>>({});
  const [originalData, setOriginalData] = useState<Partial<JobRequisition>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changeSummary, setChangeSummary] = useState("");
  const [acceptedChiefHRFields, setAcceptedChiefHRFields] = useState<Set<string>>(new Set());
  const [hrVersion, setHrVersion] = useState<Partial<JobRequisition>>({});
  const [showFinalReviewDialog, setShowFinalReviewDialog] = useState(false);

  const isHR = userRoles.includes('HR Assistant') || userRoles.includes('Admin');

  useEffect(() => {
    if (!isHR) {
      navigate('/admin/requisitions');
      return;
    }
    if (id) {
      fetchRequisition();
    }
  }, [id, isHR, navigate]);

  const fetchRequisition = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Format duty_station if it's a JSON array string
      const formatDutyStation = (station: any) => {
        if (!station) return '';
        if (typeof station === 'string') {
          try {
            const parsed = JSON.parse(station);
            if (Array.isArray(parsed)) {
              return parsed.join(', ');
            }
            return station;
          } catch {
            return station;
          }
        }
        if (Array.isArray(station)) {
          return station.join(', ');
        }
        return station;
      };

      const formattedData = {
        ...data,
        duty_station: formatDutyStation(data.duty_station)
      };
      
      setRequisition(formattedData);
      setFormData(formattedData);
      
      // Determine the review stage
      const isFinalCleanup = data.status === 'hr_final_review' && data.hiring_manager_confirmed_hr_changes;
      const isSecondReview = data.chief_hr_reviewed && !isFinalCleanup;
      
      if (isFinalCleanup) {
        // Final cleanup stage: start with current (HM modified) version
        // HR will create a clean version for Division Chief
        setOriginalData(formattedData);
      } else if (isSecondReview) {
        // Second review: show Chief HR's changes compared to HR's version
        const hrVersionData = (typeof data.hr_original_data === 'object' && data.hr_original_data !== null) 
          ? {
              ...(data.hr_original_data as any),
              duty_station: formatDutyStation((data.hr_original_data as any).duty_station)
            }
          : formattedData;
        setHrVersion(hrVersionData as Partial<JobRequisition>);
        setOriginalData(hrVersionData as Partial<JobRequisition>); // HR's version is the baseline
      } else {
        // Initial review: show manager's original version
        setOriginalData(formattedData);
      }
      
      setChangeSummary(data.hr_change_summary || "");
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // HR can finalize when manager has confirmed changes
  const isFinalCleanup = requisition?.hiring_manager_confirmed_hr_changes && 
    (requisition?.status === 'hr_final_review' || requisition?.status === 'hr_review');
  const isSecondReview = requisition?.chief_hr_reviewed && !isFinalCleanup || false;
  
  const acceptChiefHRChanges = (fieldKey: string) => {
    setAcceptedChiefHRFields(prev => new Set([...prev, fieldKey]));
  };

  const detectChanges = (): FieldChange[] => {
    const changes: FieldChange[] = [];
    const fieldsToTrack = [
      { key: 'position_title', label: 'Position Title' },
      { key: 'grade', label: 'Grade' },
      { key: 'unit_section_division', label: 'Unit/Section/Division' },
      { key: 'duty_station', label: 'Duty Station' },
      { key: 'nature_of_position', label: 'Nature of Position' },
      { key: 'purpose_of_position', label: 'Purpose of Position' },
      { key: 'objectives_of_programme', label: 'Objectives of Programme' },
      { key: 'main_duties_responsibilities', label: 'Main Duties and Responsibilities' },
      { key: 'essential_experience', label: 'Essential Experience' },
      { key: 'desirable_experience', label: 'Desirable Experience' },
      { key: 'essential_education', label: 'Essential Education' },
      { key: 'desirable_education', label: 'Desirable Education' },
      { key: 'positions_available', label: 'Number of Positions' },
    ];

    fieldsToTrack.forEach(field => {
      const originalValue = String(originalData[field.key as keyof JobRequisition] || '');
      const newValue = String(formData[field.key as keyof JobRequisition] || '');
      
      if (originalValue !== newValue) {
        // Calculate basic diff statistics
        const originalWords = originalValue.trim().split(/\s+/).filter(word => word.length > 0);
        const newWords = newValue.trim().split(/\s+/).filter(word => word.length > 0);
        const wordsAdded = Math.max(0, newWords.length - originalWords.length);
        const wordsRemoved = Math.max(0, originalWords.length - newWords.length);
        
        changes.push({
          field: field.key,
          label: field.label,
          originalValue,
          newValue,
          diffStats: {
            wordsAdded,
            wordsRemoved,
            wordsModified: Math.min(originalWords.length, newWords.length)
          }
        });
      }
    });

    return changes;
  };

  const handleSaveDraft = async () => {
    if (!requisition) return;

    setSaving(true);
    try {
      // Save draft without changing status or sending to Chief HR
      const updateData = {
        ...formData,
        hr_change_summary: changeSummary,
        // Keep existing status and don't mark as reviewed
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Draft Saved",
        description: "Your changes have been saved as a draft",
      });

      navigate('/admin/requisitions');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!requisition) return;

    const changes = detectChanges();
    
    if (changes.length === 0 && !changeSummary.trim() && !isFinalCleanup) {
      toast({
        title: "No Changes",
        description: "No changes detected to save",
        variant: "destructive",
      });
      return;
    }

    // If final cleanup, show preview dialog first
    if (isFinalCleanup) {
      setShowFinalReviewDialog(true);
      return;
    }

    setSaving(true);
    try {
      let updateData;
      
      if (isSecondReview) {
        // Second review: send to manager for confirmation
        updateData = {
          ...formData,
          hr_change_summary: changeSummary,
          hr_internal_status: 'pending_manager_confirmation',
        };
      } else {
        // Initial review: send to Chief HR
        updateData = {
          ...formData,
          hr_original_data: originalData as any,
          hr_changes: changes as any,
          hr_change_summary: changeSummary,
          hr_reviewed: true,
          hr_reviewed_at: new Date().toISOString(),
          hr_reviewed_by: user?.id,
          hr_internal_status: 'pending_chief_review'
        };
      }

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: isSecondReview 
          ? "Changes saved and sent to Manager for confirmation" 
          : "Changes saved and sent to Chief HR for review",
      });

      navigate('/admin/requisitions');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast({
        title: "Error",
        description: "Failed to save changes",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSendToChief = async () => {
    if (!requisition) return;

    setSaving(true);
    try {
      // Final cleanup: create clean version for Division Chief
      const cleanVersion = {
        purpose_of_position: formData.purpose_of_position,
        objectives_of_programme: formData.objectives_of_programme,
        main_duties_responsibilities: formData.main_duties_responsibilities,
        essential_experience: formData.essential_experience,
        desirable_experience: formData.desirable_experience,
        essential_education: formData.essential_education,
        desirable_education: formData.desirable_education,
      };
      
      const updateData = {
        ...formData,
        final_clean_version: cleanVersion,
        hr_final_review_completed: true,
        hr_final_review_at: new Date().toISOString(),
        hr_final_review_by: user?.id,
        status: 'chief_of_division_review', // Ready for Division Chief
        // Reset chief approval status when sending for new review
        chief_of_division_approval: false,
        chief_of_division_approved_at: null,
        chief_of_division_approved_by: null,
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Clean version created and sent to Division Chief",
      });

      setShowFinalReviewDialog(false);
      navigate('/admin/requisitions');
    } catch (error) {
      console.error('Error sending to chief:', error);
      toast({
        title: "Error",
        description: "Failed to send to Division Chief",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Requisition Not Found</p>
              <p className="text-muted-foreground">The requested job requisition could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const changes = detectChanges();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/requisitions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisitions
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {isFinalCleanup 
                ? 'Create Clean Version for Division Chief'
                : isSecondReview 
                ? 'Review Chief HR Changes' 
                : 'Edit Position Description'}
            </h1>
          </div>
          <p className="text-muted-foreground">
            {isFinalCleanup
              ? `Review hiring manager changes and finalize • Ref: ${requisition.reference_number}`
              : isSecondReview 
              ? `Reviewing Chief HR changes • Ref: ${requisition.reference_number}`
              : `Making changes as HR • Ref: ${requisition.reference_number} • Created ${format(new Date(requisition.created_at), 'MMM dd, yyyy')}`
            }
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/requisitions/${requisition.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Only
          </Button>
          {!isFinalCleanup && !isSecondReview && (
            <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}
          <Button onClick={handleSaveChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving 
              ? 'Saving...' 
              : isFinalCleanup
              ? 'Finalize & Send to Division Chief'
              : isSecondReview 
              ? 'Save & Send to Manager' 
              : 'Save & Send to Chief HR'}
          </Button>
        </div>
      </div>

      {isSecondReview && requisition?.chief_hr_comments && (
        <Card className="mb-6 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <AlertTriangle className="h-5 w-5" />
              Chief HR Comments
            </CardTitle>
            <CardDescription className="text-blue-700">
              Review these comments from Chief of HR before making any changes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{requisition.chief_hr_comments}</p>
          </CardContent>
        </Card>
      )}

      {changes.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Changes Detected ({changes.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              The following fields have been modified and will be highlighted to the hiring manager:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {changes.map((change, index) => (
                <div key={index} className="text-sm">
                  <span className="font-medium">{change.label}</span>
                  <span className="text-amber-700"> - Modified</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6">
        {/* Position Information */}
        <Card>
          <CardHeader>
            <CardTitle>Position Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="position_title">Position Title</Label>
                <Input
                  id="position_title"
                  value={formData.position_title || ''}
                  onChange={(e) => setFormData({ ...formData, position_title: e.target.value })}
                  className={changes.some(c => c.field === 'position_title') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                {requisition.nature_of_position === 'Individual Consultant' ? (
                  <>
                    <Label className="text-muted-foreground">Band</Label>
                    <p className="text-sm font-medium mt-1 p-2 bg-muted rounded-md">
                      {requisition.comments?.consultancy_level || 'Not specified'}
                    </p>
                  </>
                ) : (
                  <>
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      value={formData.grade || ''}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className={changes.some(c => c.field === 'grade') ? 'border-amber-400 bg-amber-50' : ''}
                    />
                  </>
                )}
              </div>
              <div>
                <Label htmlFor="unit_section_division">Unit/Section/Division</Label>
                <Input
                  id="unit_section_division"
                  value={formData.unit_section_division || ''}
                  onChange={(e) => setFormData({ ...formData, unit_section_division: e.target.value })}
                  className={changes.some(c => c.field === 'unit_section_division') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="duty_station">Duty Station</Label>
                <Input
                  id="duty_station"
                  value={
                    formData.duty_station === 'Remote' && requisition.comments?.remote_region
                      ? `Remote (${requisition.comments.remote_region})`
                      : formData.duty_station || ''
                  }
                  onChange={(e) => setFormData({ ...formData, duty_station: e.target.value })}
                  className={changes.some(c => c.field === 'duty_station') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="nature_of_position">Nature of Position</Label>
                <Input
                  id="nature_of_position"
                  value={formData.nature_of_position || ''}
                  onChange={(e) => setFormData({ ...formData, nature_of_position: e.target.value })}
                  className={changes.some(c => c.field === 'nature_of_position') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="positions_available">Number of Positions</Label>
                <Input
                  id="positions_available"
                  type="number"
                  value={formData.positions_available || 1}
                  onChange={(e) => setFormData({ ...formData, positions_available: parseInt(e.target.value) || 1 })}
                  className={changes.some(c => c.field === 'positions_available') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
            </div>
            
            {/* Display remote timezone if applicable and not already in duty station */}
            {requisition.comments?.remote_region && formData.duty_station !== 'Remote' && (
              <div className="mt-4 pt-4 border-t">
                <div>
                  <Label className="text-muted-foreground">Remote Timezone</Label>
                  <p className="text-sm font-medium mt-1">{requisition.comments.remote_region}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Position Description */}
        <Card>
          <CardHeader>
            <CardTitle>Position Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isSecondReview || isFinalCleanup ? (
              <EditableTrackChangesFieldWithHighlight
                label="Purpose of the Position"
                originalValue={originalData.purpose_of_position || ''}
                currentValue={formData.purpose_of_position || ''}
                onChange={(value) => setFormData({ ...formData, purpose_of_position: value })}
                requisitionId={id}
                fieldName="purpose_of_position"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            ) : (
              <EditableTrackChangesField
                label="Purpose of the Position"
                originalValue={originalData.purpose_of_position || ''}
                currentValue={formData.purpose_of_position || ''}
                onChange={(value) => setFormData({ ...formData, purpose_of_position: value })}
              />
            )}
            
            {isSecondReview || isFinalCleanup ? (
              <EditableTrackChangesFieldWithHighlight
                label="Objectives of the Programme"
                originalValue={originalData.objectives_of_programme || ''}
                currentValue={formData.objectives_of_programme || ''}
                onChange={(value) => setFormData({ ...formData, objectives_of_programme: value })}
                requisitionId={id}
                fieldName="objectives_of_programme"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            ) : (
              <EditableTrackChangesField
                label="Objectives of the Programme"
                originalValue={originalData.objectives_of_programme || ''}
                currentValue={formData.objectives_of_programme || ''}
                onChange={(value) => setFormData({ ...formData, objectives_of_programme: value })}
              />
            )}
            
            {isSecondReview || isFinalCleanup ? (
              <EditableTrackChangesFieldWithHighlight
                label="Main Duties and Responsibilities"
                originalValue={originalData.main_duties_responsibilities || ''}
                currentValue={formData.main_duties_responsibilities || ''}
                onChange={(value) => setFormData({ ...formData, main_duties_responsibilities: value })}
                requisitionId={id}
                fieldName="main_duties_responsibilities"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            ) : (
              <EditableTrackChangesField
                label="Main Duties and Responsibilities"
                originalValue={originalData.main_duties_responsibilities || ''}
                currentValue={formData.main_duties_responsibilities || ''}
                onChange={(value) => setFormData({ ...formData, main_duties_responsibilities: value })}
              />
            )}
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              {isSecondReview || isFinalCleanup ? (
                <EditableTrackChangesFieldWithHighlight
                  label="Essential Experience"
                  originalValue={originalData.essential_experience || ''}
                  currentValue={formData.essential_experience || ''}
                  onChange={(value) => setFormData({ ...formData, essential_experience: value })}
                  requisitionId={id}
                  fieldName="essential_experience"
                  currentUserId={user?.id}
                  canResolveComments={true}
                />
                ) : (
                  <EditableTrackChangesField
                    label="Essential Experience"
                    originalValue={originalData.essential_experience || ''}
                    currentValue={formData.essential_experience || ''}
                    onChange={(value) => setFormData({ ...formData, essential_experience: value })}
                  />
                )}
              
              {/* Only show desirable experience for non-intern positions */}
              {requisition.nature_of_position !== 'Intern' && (
                <>
                  {isSecondReview || isFinalCleanup ? (
                    <EditableTrackChangesFieldWithHighlight
                      label="Desirable Experience"
                      originalValue={originalData.desirable_experience || ''}
                      currentValue={formData.desirable_experience || ''}
                      onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
                      requisitionId={id}
                      fieldName="desirable_experience"
                      currentUserId={user?.id}
                      canResolveComments={true}
                    />
                  ) : (
                    <EditableTrackChangesField
                      label="Desirable Experience"
                      originalValue={originalData.desirable_experience || ''}
                      currentValue={formData.desirable_experience || ''}
                      onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
                    />
                  )}
                </>
              )}
              
              {isSecondReview || isFinalCleanup ? (
                <EditableTrackChangesFieldWithHighlight
                  label="Essential Education"
                  originalValue={originalData.essential_education || ''}
                  currentValue={formData.essential_education || ''}
                  onChange={(value) => setFormData({ ...formData, essential_education: value })}
                  requisitionId={id}
                  fieldName="essential_education"
                  currentUserId={user?.id}
                  canResolveComments={true}
                />
                ) : (
                  <EditableTrackChangesField
                    label="Essential Education"
                    originalValue={originalData.essential_education || ''}
                    currentValue={formData.essential_education || ''}
                    onChange={(value) => setFormData({ ...formData, essential_education: value })}
                  />
                )}
              
              {/* Only show desirable education for non-intern positions */}
              {requisition.nature_of_position !== 'Intern' && (
                <>
                  {isSecondReview || isFinalCleanup ? (
                    <EditableTrackChangesFieldWithHighlight
                      label="Desirable Education"
                      originalValue={originalData.desirable_education || ''}
                      currentValue={formData.desirable_education || ''}
                      onChange={(value) => setFormData({ ...formData, desirable_education: value })}
                      requisitionId={id}
                      fieldName="desirable_education"
                      currentUserId={user?.id}
                      canResolveComments={true}
                    />
                  ) : (
                    <EditableTrackChangesField
                      label="Desirable Education"
                      originalValue={originalData.desirable_education || ''}
                      currentValue={formData.desirable_education || ''}
                      onChange={(value) => setFormData({ ...formData, desirable_education: value })}
                    />
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Competencies */}
        <Card>
          <CardHeader>
            <CardTitle>Competencies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Consultant Standard Competencies */}
            {requisition.nature_of_position === 'Individual Consultant' && (
              <div>
                <Label className="text-muted-foreground">Standard Competencies for Consultants</Label>
                <p className="text-xs text-muted-foreground mb-2">These competencies are automatically included for all consultant positions:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>• <strong>Integrity:</strong> Acts in accordance with organizational values. Takes responsibility for actions and decisions.</li>
                  <li>• <strong>Customer orientation:</strong> Provides excellent service in a professional and caring manner.</li>
                  <li>• <strong>Knowing and managing yourself:</strong> Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.</li>
                  <li>• <strong>Producing results:</strong> Produces and delivers quality results. Is action oriented and committed to achieving outcomes.</li>
                  <li>• <strong>Moving forward in a changing environment:</strong> Is open to and proposes new approaches and ideas. Adapts and responds positively to change.</li>
                </ul>
              </div>
            )}
            
            {/* Mandatory Competencies - For non-consultant positions */}
            {requisition.nature_of_position !== 'Individual Consultant' && (
              <div>
                <Label className="text-muted-foreground">Mandatory Competencies</Label>
                <p className="text-xs text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>• <strong>Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                  <li>• <strong>Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                  <li>• <strong>Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                  <li>• <strong>Creating an empowering and motivating environment</strong> (for Supervisory positions only): Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                </ul>
              </div>
            )}

            {/* Global Competencies */}
            {Array.isArray(requisition.global_competencies) && requisition.global_competencies.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Global Competencies</Label>
                <ul className="mt-1 space-y-1">
                  {requisition.global_competencies.map((comp: any, index: number) => {
                    const getCompetencyDefinition = (compName: string) => {
                      const globalCompetencies = [
                        'Integrity: Acts in accordance with organizational values. Takes responsibility for actions and decisions',
                        'Customer orientation: Provides excellent service in a professional and caring manner'
                      ];
                      return globalCompetencies.find(def => def.startsWith(compName)) || compName;
                    };
                    
                    const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                    const definition = getCompetencyDefinition(competencyName);
                    const [name, ...description] = definition.split(':');
                    
                    return (
                      <li key={index} className="text-sm">
                        • <strong>{name}:</strong> {description.join(':').trim()}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {/* Core Competencies */}
            {Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Core Competencies</Label>
                <ul className="mt-1 space-y-1">
                  {requisition.core_competencies.map((comp: any, index: number) => {
                    const getCoreCompetencyDefinition = (compName: string) => {
                      const coreCompetencies = [
                        'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                        'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                        'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                        'Setting an example: Acts within UNICC\'s / WHO\'s professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.'
                      ];
                      return coreCompetencies.find(def => def.startsWith(compName)) || compName;
                    };
                    
                    const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                    const definition = getCoreCompetencyDefinition(competencyName);
                    const [name, ...description] = definition.split(':');
                    
                    return (
                      <li key={index} className="text-sm">
                        • <strong>{name}:</strong> {description.join(':').trim()}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {/* Leadership Competencies */}
            {Array.isArray(requisition.leadership_competencies) && requisition.leadership_competencies.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Leadership Competencies</Label>
                <ul className="mt-1 space-y-1">
                  {requisition.leadership_competencies.map((comp: any, index: number) => {
                    const getLeadershipCompetencyDefinition = (compName: string) => {
                      const leadershipCompetencies = [
                        'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                        'Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.',
                        'Promoting UNICC\'s position: Positions UNICC as a leader in ICT services. Gains support for UNICC\'s mission. Coordinates plans and communicates in a way that attracts support from intended audiences.'
                      ];
                      return leadershipCompetencies.find(def => def.startsWith(compName)) || compName;
                    };
                    
                    const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                    const definition = getLeadershipCompetencyDefinition(competencyName);
                    const [name, ...description] = definition.split(':');
                    
                    return (
                      <li key={index} className="text-sm">
                        • <span className="font-bold">{name}:</span> {description.join(':').trim()}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            
            {/* Management Competencies */}
            {Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Management Competencies</Label>
                <ul className="mt-1 space-y-1">
                  {requisition.management_competencies.map((comp: any, index: number) => {
                    const getManagementCompetencyDefinition = (compName: string) => {
                      const managementCompetencies = [
                        'Ensuring effective use of resources: Identifies priorities in accordance with UNICC\'s strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.',
                        'Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.',
                        'Empowering others: Creates an enabling environment where staff can contribute their best and develop their potential.',
                        'Building trust: Promotes shared values and creates an atmosphere of trust and honesty.',
                        'Managing performance: Delegates appropriate responsibility, accountability and decision-making authority. Makes sure that roles, responsibilities and reporting lines are clear to each staff member.'
                      ];
                      return managementCompetencies.find(def => def.startsWith(compName)) || compName;
                    };
                    
                    const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                    const definition = getManagementCompetencyDefinition(competencyName);
                    const [name, ...description] = definition.split(':');
                    
                    return (
                      <li key={index} className="text-sm">
                        • <strong>{name}:</strong> {description.join(':').trim()}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

        {/* HR Change Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Summary of Changes</CardTitle>
            <CardDescription>
              Provide a summary of the changes made and the reason for these modifications. This will be shown to the hiring manager.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              placeholder="Describe the changes you've made and why they were necessary..."
              className="min-h-32"
            />
          </CardContent>
        </Card>
      </div>

      <FinalDocumentReviewDialog
        open={showFinalReviewDialog}
        onOpenChange={setShowFinalReviewDialog}
        formData={formData}
        onProceed={handleSendToChief}
        requisitionId={id}
      />
    </div>
  );
}