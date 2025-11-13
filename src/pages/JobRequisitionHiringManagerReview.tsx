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
import { ArrowLeft, Save, Eye, FileCheck } from "lucide-react";
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
    setAcceptedFields(prev => new Set(prev).add(fieldKey));
  };

  const handleSaveDraft = async () => {
    if (!requisition) return;

    try {
      setSaving(true);

      const { error } = await supabase
        .from('job_requisitions')
        .update({
          ...formData,
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

      const { error } = await supabase
        .from('job_requisitions')
        .update({
          ...formData,
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          hiring_manager_changes: hmChanges,
          status: 'hr_final_review',
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
            <EditableTrackChangesField
              label="Purpose of the Position"
              originalValue={originalData.purpose_of_position || ""}
              currentValue={formData.purpose_of_position || ""}
              onChange={(value) => setFormData({ ...formData, purpose_of_position: value })}
              requisitionId={id}
              fieldName="purpose_of_position"
              currentUserId={user?.id}
              canResolveComments={false}
            />

            <EditableTrackChangesField
              label="Objectives of the Programme"
              originalValue={originalData.objectives_of_programme || ""}
              currentValue={formData.objectives_of_programme || ""}
              onChange={(value) => setFormData({ ...formData, objectives_of_programme: value })}
              requisitionId={id}
              fieldName="objectives_of_programme"
              currentUserId={user?.id}
              canResolveComments={false}
            />

            <EditableTrackChangesField
              label="Main Duties and Responsibilities"
              originalValue={originalData.main_duties_responsibilities || ""}
              currentValue={formData.main_duties_responsibilities || ""}
              onChange={(value) => setFormData({ ...formData, main_duties_responsibilities: value })}
              requisitionId={id}
              fieldName="main_duties_responsibilities"
              currentUserId={user?.id}
              canResolveComments={false}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <EditableTrackChangesField
              label="Essential Experience"
              originalValue={originalData.essential_experience || ""}
              currentValue={formData.essential_experience || ""}
              onChange={(value) => setFormData({ ...formData, essential_experience: value })}
              requisitionId={id}
              fieldName="essential_experience"
              currentUserId={user?.id}
              canResolveComments={false}
            />

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

            <EditableTrackChangesField
              label="Essential Education"
              originalValue={originalData.essential_education || ""}
              currentValue={formData.essential_education || ""}
              onChange={(value) => setFormData({ ...formData, essential_education: value })}
              requisitionId={id}
              fieldName="essential_education"
              currentUserId={user?.id}
              canResolveComments={false}
            />

            <EditableTrackChangesField
              label="Desirable Education"
              originalValue={originalData.desirable_education || ""}
              currentValue={formData.desirable_education || ""}
              onChange={(value) => setFormData({ ...formData, desirable_education: value })}
              requisitionId={id}
              fieldName="desirable_education"
              currentUserId={user?.id}
              canResolveComments={false}
            />
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
