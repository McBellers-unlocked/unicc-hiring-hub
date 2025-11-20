import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Eye, FileCheck, Check } from "lucide-react";
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
  status: string;
  created_by: string;
  hr_original_data: any;
}

export default function JobRequisitionHiringManagerReview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  
  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [originalData, setOriginalData] = useState<any>({});
  const [hrData, setHrData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (id && user) {
      fetchRequisition();
    }
  }, [id, user]);

  const fetchRequisition = async () => {
    try {
      let query = supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id);

      // Hiring managers can only access their own requisitions
      if (!userRoles.includes('Admin') && !userRoles.includes('HR Assistant')) {
        query = query.eq('created_by', user?.id);
      }

      const { data, error } = await query.single();

      if (error) throw error;
      
      setRequisition(data);
      
      // Set original data (before HR changes)
      const original = data.hr_original_data || {};
      setOriginalData(original);
      
      // Set HR data (after HR changes)
      const hrVersion = {
        purpose_of_position: data.purpose_of_position,
        objectives_of_programme: data.objectives_of_programme,
        main_duties_responsibilities: data.main_duties_responsibilities,
        essential_experience: data.essential_experience,
        desirable_experience: data.desirable_experience,
        essential_education: data.essential_education,
        desirable_education: data.desirable_education,
      };
      setHrData(hrVersion);
      
      // Initialize form data with current values
      setFormData(hrVersion);
      
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition details",
        variant: "destructive",
      });
      navigate('/requisitions');
    } finally {
      setLoading(false);
    }
  };

  const acceptHRChanges = (fieldKey: string) => {
    const currentValue = (formData as any)[fieldKey];
    
    setOriginalData((prev: any) => ({
      ...prev,
      [fieldKey]: currentValue
    }));
    
    setAcceptedFields(prev => new Set(prev).add(fieldKey));
    
    toast({
      title: "Changes Accepted",
      description: "HR's changes have been accepted for this field",
    });
  };

  const hasHRChanges = (fieldKey: string) => {
    const hrOriginal = originalData?.[fieldKey] || '';
    const hrValue = hrData?.[fieldKey] || '';
    // Only show accept button if HR actually made changes (comparing original to HR version)
    // Don't show for manager's own edits
    return hrOriginal !== hrValue && !acceptedFields.has(fieldKey);
  };

  const validateRequiredFields = () => {
    const errors = new Set<string>();
    const requiredFields = [
      'purpose_of_position',
      'objectives_of_programme',
      'main_duties_responsibilities',
      'essential_experience',
      'essential_education'
    ];

    for (const field of requiredFields) {
      if (!formData[field]?.trim()) {
        errors.add(field);
      }
    }

    setValidationErrors(errors);
    return errors.size === 0;
  };

  const handleSaveDraft = async () => {
    if (!requisition) return;

    try {
      setSaving(true);

      // Clean data: convert empty strings to null for date fields
      const cleanedData = { ...formData };
      if (cleanedData.start_date === '') cleanedData.start_date = null;
      if (cleanedData.temporary_duration === '') cleanedData.temporary_duration = null;
      if (cleanedData.consultant_duration === '') cleanedData.consultant_duration = null;

      const { error } = await supabase
        .from('job_requisitions')
        .update({
          ...cleanedData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });
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

  const handleReturnToHR = async () => {
    if (!requisition) return;

    // Validate required fields
    if (!validateRequiredFields()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (marked with red border)",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      // Detect changes made by hiring manager
      const hmChanges = [];
      const fields = [
        { field: 'purpose_of_position', label: 'Purpose of the Position' },
        { field: 'objectives_of_programme', label: 'Objectives of the Programme' },
        { field: 'main_duties_responsibilities', label: 'Main Duties and Responsibilities' },
        { field: 'essential_experience', label: 'Essential Experience' },
        { field: 'desirable_experience', label: 'Desirable Experience' },
        { field: 'essential_education', label: 'Essential Education' },
        { field: 'desirable_education', label: 'Desirable Education' },
      ];

      for (const { field, label } of fields) {
        if (formData[field] !== hrData[field]) {
          hmChanges.push({
            field,
            label,
            originalValue: hrData[field] || '',
            newValue: formData[field] || '',
          });
        }
      }

      // Clean data: convert empty strings to null for date fields
      const cleanedData = { ...formData };
      if (cleanedData.start_date === '') cleanedData.start_date = null;
      if (cleanedData.temporary_duration === '') cleanedData.temporary_duration = null;
      if (cleanedData.consultant_duration === '') cleanedData.consultant_duration = null;

      const { error } = await supabase
        .from('job_requisitions')
        .update({
          ...cleanedData,
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          hiring_manager_changes: hmChanges,
          status: 'hr_review',
          hr_internal_status: 'pending_final_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position description returned to HR for conversion to job posting",
      });

      navigate(`/requisitions/${requisition.id}`);
    } catch (error) {
      console.error('Error returning to HR:', error);
      toast({
        title: "Error",
        description: "Failed to return to HR",
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
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate(`/requisitions/${id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Review HR Changes</h1>
            <p className="text-muted-foreground">
              {requisition.position_title} • {requisition.reference_number}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowReviewDialog(true)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View Final Version
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            Save Draft
          </Button>
          <Button onClick={handleReturnToHR} disabled={saving}>
            <FileCheck className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save & Return to HR"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Position Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Position Title</Label>
                <Input value={requisition.position_title} disabled />
              </div>
              <div>
                <Label>Grade</Label>
                <Input value={requisition.grade} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Position Description</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Review HR changes below. You can accept them or make your own edits.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={validationErrors.has('purpose_of_position') ? 'border-2 border-destructive rounded-lg p-4' : ''}>
              {validationErrors.has('purpose_of_position') && (
                <p className="text-sm text-destructive font-semibold mb-2">⚠️ This field is required</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Purpose of the Position</Label>
                {hasHRChanges('purpose_of_position') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('purpose_of_position')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.purpose_of_position || ""}
                currentValue={formData.purpose_of_position || ""}
                onChange={(value) => {
                  setFormData({ ...formData, purpose_of_position: value });
                  if (value?.trim()) {
                    setValidationErrors(prev => {
                      const next = new Set(prev);
                      next.delete('purpose_of_position');
                      return next;
                    });
                  }
                }}
                requisitionId={id}
                fieldName="purpose_of_position"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>

            <div className={validationErrors.has('objectives_of_programme') ? 'border-2 border-destructive rounded-lg p-4' : ''}>
              {validationErrors.has('objectives_of_programme') && (
                <p className="text-sm text-destructive font-semibold mb-2">⚠️ This field is required</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Objectives of the Programme</Label>
                {hasHRChanges('objectives_of_programme') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('objectives_of_programme')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.objectives_of_programme || ""}
                currentValue={formData.objectives_of_programme || ""}
                onChange={(value) => {
                  setFormData({ ...formData, objectives_of_programme: value });
                  if (value?.trim()) {
                    setValidationErrors(prev => {
                      const next = new Set(prev);
                      next.delete('objectives_of_programme');
                      return next;
                    });
                  }
                }}
                requisitionId={id}
              fieldName="objectives_of_programme"
              currentUserId={user?.id}
              canResolveComments={false}
            />
            </div>

            <div className={validationErrors.has('main_duties_responsibilities') ? 'border-2 border-destructive rounded-lg p-4' : ''}>
              {validationErrors.has('main_duties_responsibilities') && (
                <p className="text-sm text-destructive font-semibold mb-2">⚠️ This field is required</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Main Duties and Responsibilities</Label>
                {hasHRChanges('main_duties_responsibilities') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('main_duties_responsibilities')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.main_duties_responsibilities || ""}
                currentValue={formData.main_duties_responsibilities || ""}
                onChange={(value) => {
                  setFormData({ ...formData, main_duties_responsibilities: value });
                  if (value?.trim()) {
                    setValidationErrors(prev => {
                      const next = new Set(prev);
                      next.delete('main_duties_responsibilities');
                      return next;
                    });
                  }
                }}
                requisitionId={id}
                fieldName="main_duties_responsibilities"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className={validationErrors.has('essential_experience') ? 'border-2 border-destructive rounded-lg p-4' : ''}>
              {validationErrors.has('essential_experience') && (
                <p className="text-sm text-destructive font-semibold mb-2">⚠️ This field is required</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Essential Experience</Label>
                {hasHRChanges('essential_experience') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('essential_experience')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.essential_experience || ""}
                currentValue={formData.essential_experience || ""}
                onChange={(value) => {
                  setFormData({ ...formData, essential_experience: value });
                  if (value?.trim()) {
                    setValidationErrors(prev => {
                      const next = new Set(prev);
                      next.delete('essential_experience');
                      return next;
                    });
                  }
                }}
                requisitionId={id}
                fieldName="essential_experience"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>

            <EditableTrackChangesField
              label="Desirable Experience"
              originalValue={originalData.desirable_experience || ""}
              currentValue={formData.desirable_experience || ""}
              onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
              requisitionId={id}
              fieldName="desirable_experience"
              currentUserId={user?.id}
              canResolveComments={false}
            />

            <div className={validationErrors.has('essential_education') ? 'border-2 border-destructive rounded-lg p-4' : ''}>
              {validationErrors.has('essential_education') && (
                <p className="text-sm text-destructive font-semibold mb-2">⚠️ This field is required</p>
              )}
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Essential Education</Label>
                {hasHRChanges('essential_education') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('essential_education')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.essential_education || ""}
                currentValue={formData.essential_education || ""}
                onChange={(value) => {
                  setFormData({ ...formData, essential_education: value });
                  if (value?.trim()) {
                    setValidationErrors(prev => {
                      const next = new Set(prev);
                      next.delete('essential_education');
                      return next;
                    });
                  }
                }}
                requisitionId={id}
                fieldName="essential_education"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Desirable Education</Label>
                {hasHRChanges('desirable_education') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('desirable_education')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.desirable_education || ""}
                currentValue={formData.desirable_education || ""}
                onChange={(value) => setFormData({ ...formData, desirable_education: value })}
                requisitionId={id}
                fieldName="desirable_education"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Document Review Dialog */}
      <FinalDocumentReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        formData={{
          position_title: requisition.position_title,
          grade: requisition.grade,
          unit_section_division: requisition.unit_section_division,
          duty_station: requisition.duty_station,
          nature_of_position: requisition.nature_of_position,
          positions_available: requisition.positions_available,
          ...formData
        }}
        onProceed={() => {
          toast({
            title: "Ready to Submit",
            description: "Click 'Save & Return to HR' when you're ready to send for job conversion",
          });
        }}
      />
    </div>
  );
}
