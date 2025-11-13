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
import { ArrowLeft, AlertTriangle, Eye, CheckCircle2, Check } from "lucide-react";
import { format } from "date-fns";
import { InlineTrackChanges, InlineTrackChangesSummary } from "@/components/InlineTrackChanges";
import { FinalDocumentReviewDialog } from "@/components/FinalDocumentReviewDialog";
import EditableTrackChangesField from "@/components/EditableTrackChangesField";

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
  chief_hr_comments: string;
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

export default function JobRequisitionChiefHREdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [formData, setFormData] = useState<Partial<JobRequisition>>({});
  const [originalData, setOriginalData] = useState<Partial<JobRequisition>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [chiefHRComments, setChiefHRComments] = useState("");
  const [acceptedFields, setAcceptedFields] = useState<Set<string>>(new Set());
  const [workingBaseline, setWorkingBaseline] = useState<Partial<JobRequisition>>({});
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  const isChiefHR = userRoles.includes('Admin') || userRoles.includes('HR Assistant');

  useEffect(() => {
    if (!isChiefHR) {
      navigate('/admin/requisitions');
      return;
    }
    if (id) {
      fetchRequisition();
    }
  }, [id, isChiefHR, navigate]);

  const fetchRequisition = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setRequisition(data);
      setFormData(data);
      // For Chief HR, the baseline should be the current state (with HR changes already applied)
      // not the original before HR changes
      setOriginalData(data);
      setWorkingBaseline(data);
      setChiefHRComments(data.chief_hr_comments || "");
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
      const baselineValue = String(workingBaseline[field.key as keyof JobRequisition] || '');
      const newValue = String(formData[field.key as keyof JobRequisition] || '');
      
      if (baselineValue !== newValue) {
        const baselineWords = baselineValue.trim().split(/\s+/).filter(word => word.length > 0);
        const newWords = newValue.trim().split(/\s+/).filter(word => word.length > 0);
        const wordsAdded = Math.max(0, newWords.length - baselineWords.length);
        const wordsRemoved = Math.max(0, baselineWords.length - newWords.length);
        
        changes.push({
          field: field.key,
          label: field.label,
          originalValue: baselineValue,
          newValue,
          diffStats: {
            wordsAdded,
            wordsRemoved,
            wordsModified: Math.min(baselineWords.length, newWords.length)
          }
        });
      }
    });

    return changes;
  };

  const acceptHRChanges = (fieldKey: string) => {
    // Update accepted fields set
    setAcceptedFields(prev => new Set([...prev, fieldKey]));
    
    // Update working baseline to HR's version for this field
    setWorkingBaseline(prev => ({
      ...prev,
      [fieldKey]: formData[fieldKey as keyof JobRequisition]
    }));

    toast({
      title: "Changes Accepted",
      description: `HR's changes to ${fieldKey.replace(/_/g, ' ')} have been accepted`,
    });
  };

  const getHRChangeForField = (fieldKey: string) => {
    const hrChanges = requisition?.hr_changes || [];
    return hrChanges.find((change: FieldChange) => change.field === fieldKey);
  };

  const handleApprove = async () => {
    if (!requisition) return;

    const changes = detectChanges();

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        chief_hr_reviewed: true,
        chief_hr_reviewed_at: new Date().toISOString(),
        chief_hr_reviewed_by: user?.id,
        chief_hr_comments: chiefHRComments,
        hr_internal_status: 'ready_for_manager',
        // If Chief HR made additional changes, track them
        ...(changes.length > 0 && {
          hr_changes: [...(requisition.hr_changes || []), ...changes] as any,
        })
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position description approved by Chief HR",
      });

      navigate('/admin/chief-hr-review');
    } catch (error) {
      console.error('Error approving requisition:', error);
      toast({
        title: "Error",
        description: "Failed to approve requisition",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReturnToHR = async () => {
    if (!requisition) return;

    if (!chiefHRComments.trim()) {
      toast({
        title: "Comments Required",
        description: "Please provide comments when returning to HR",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        chief_hr_reviewed: true,
        chief_hr_reviewed_at: new Date().toISOString(),
        chief_hr_reviewed_by: user?.id,
        chief_hr_comments: chiefHRComments,
        hr_internal_status: 'pending_initial_review',
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Position description returned to HR with comments",
      });

      navigate('/admin/chief-hr-review');
    } catch (error) {
      console.error('Error returning requisition:', error);
      toast({
        title: "Error",
        description: "Failed to return requisition",
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

  const currentChanges = detectChanges();
  const hrChanges = requisition.hr_changes || [];

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/admin/chief-hr-review')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Chief HR Review
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Chief HR Review & Edit</h1>
          </div>
          <p className="text-muted-foreground">
            Review and approve changes • Ref: {requisition.reference_number} • Created {format(new Date(requisition.created_at), 'dd MMM yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/requisitions/${requisition.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Only
          </Button>
        </div>
      </div>

      {/* HR's Changes Summary */}
      {hrChanges.length > 0 && (
        <div className="mb-6">
          <InlineTrackChangesSummary
            changes={hrChanges}
            title="HR Made Changes"
            description={requisition.hr_change_summary || "HR has modified the following fields. Click to expand and view detailed changes."}
          />
        </div>
      )}

      {/* Current Changes by Chief HR */}
      {currentChanges.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Your Changes ({currentChanges.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              You have made the following additional modifications:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {currentChanges.map((change, index) => (
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
                  className={currentChanges.some(c => c.field === 'position_title') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className={currentChanges.some(c => c.field === 'grade') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="unit_section_division">Unit/Section/Division</Label>
                <Input
                  id="unit_section_division"
                  value={formData.unit_section_division || ''}
                  onChange={(e) => setFormData({ ...formData, unit_section_division: e.target.value })}
                  className={currentChanges.some(c => c.field === 'unit_section_division') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="duty_station">Duty Station</Label>
                <Input
                  id="duty_station"
                  value={formData.duty_station || ''}
                  onChange={(e) => setFormData({ ...formData, duty_station: e.target.value })}
                  className={currentChanges.some(c => c.field === 'duty_station') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="nature_of_position">Nature of Position</Label>
                <Input
                  id="nature_of_position"
                  value={formData.nature_of_position || ''}
                  onChange={(e) => setFormData({ ...formData, nature_of_position: e.target.value })}
                  className={currentChanges.some(c => c.field === 'nature_of_position') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
              <div>
                <Label htmlFor="positions_available">Number of Positions</Label>
                <Input
                  id="positions_available"
                  type="number"
                  value={formData.positions_available || 1}
                  onChange={(e) => setFormData({ ...formData, positions_available: parseInt(e.target.value) || 1 })}
                  className={currentChanges.some(c => c.field === 'positions_available') ? 'border-amber-400 bg-amber-50' : ''}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Description */}
        <Card>
          <CardHeader>
            <CardTitle>Position Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <EditableTrackChangesField
              label="Purpose of the Position"
              originalValue={originalData.purpose_of_position || ''}
              hrValue={requisition?.purpose_of_position || ''}
              currentValue={formData.purpose_of_position || ''}
              onChange={(value) => setFormData({ ...formData, purpose_of_position: value })}
              hrChangesAccepted={acceptedFields.has('purpose_of_position')}
              onAcceptHRChanges={() => {
                acceptHRChanges('purpose_of_position');
                setFormData({ ...formData, purpose_of_position: requisition?.purpose_of_position });
              }}
            />
            
            <EditableTrackChangesField
              label="Objectives of the Programme"
              originalValue={originalData.objectives_of_programme || ''}
              hrValue={requisition?.objectives_of_programme || ''}
              currentValue={formData.objectives_of_programme || ''}
              onChange={(value) => setFormData({ ...formData, objectives_of_programme: value })}
              hrChangesAccepted={acceptedFields.has('objectives_of_programme')}
              onAcceptHRChanges={() => {
                acceptHRChanges('objectives_of_programme');
                setFormData({ ...formData, objectives_of_programme: requisition?.objectives_of_programme });
              }}
            />
            
            <EditableTrackChangesField
              label="Main Duties and Responsibilities"
              originalValue={originalData.main_duties_responsibilities || ''}
              hrValue={requisition?.main_duties_responsibilities || ''}
              currentValue={formData.main_duties_responsibilities || ''}
              onChange={(value) => setFormData({ ...formData, main_duties_responsibilities: value })}
              hrChangesAccepted={acceptedFields.has('main_duties_responsibilities')}
              onAcceptHRChanges={() => {
                acceptHRChanges('main_duties_responsibilities');
                setFormData({ ...formData, main_duties_responsibilities: requisition?.main_duties_responsibilities });
              }}
            />
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <EditableTrackChangesField
                label="Essential Experience"
                originalValue={originalData.essential_experience || ''}
                hrValue={requisition?.essential_experience || ''}
                currentValue={formData.essential_experience || ''}
                onChange={(value) => setFormData({ ...formData, essential_experience: value })}
                hrChangesAccepted={acceptedFields.has('essential_experience')}
                onAcceptHRChanges={() => {
                  acceptHRChanges('essential_experience');
                  setFormData({ ...formData, essential_experience: requisition?.essential_experience });
                }}
              />
              
              <EditableTrackChangesField
                label="Desirable Experience"
                originalValue={originalData.desirable_experience || ''}
                hrValue={requisition?.desirable_experience || ''}
                currentValue={formData.desirable_experience || ''}
                onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
                hrChangesAccepted={acceptedFields.has('desirable_experience')}
                onAcceptHRChanges={() => {
                  acceptHRChanges('desirable_experience');
                  setFormData({ ...formData, desirable_experience: requisition?.desirable_experience });
                }}
              />
              
              <EditableTrackChangesField
                label="Essential Education"
                originalValue={originalData.essential_education || ''}
                hrValue={requisition?.essential_education || ''}
                currentValue={formData.essential_education || ''}
                onChange={(value) => setFormData({ ...formData, essential_education: value })}
                hrChangesAccepted={acceptedFields.has('essential_education')}
                onAcceptHRChanges={() => {
                  acceptHRChanges('essential_education');
                  setFormData({ ...formData, essential_education: requisition?.essential_education });
                }}
              />
              
              <EditableTrackChangesField
                label="Desirable Education"
                originalValue={originalData.desirable_education || ''}
                hrValue={requisition?.desirable_education || ''}
                currentValue={formData.desirable_education || ''}
                onChange={(value) => setFormData({ ...formData, desirable_education: value })}
                hrChangesAccepted={acceptedFields.has('desirable_education')}
                onAcceptHRChanges={() => {
                  acceptHRChanges('desirable_education');
                  setFormData({ ...formData, desirable_education: requisition?.desirable_education });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Chief HR Comments */}
        <Card>
          <CardHeader>
            <CardTitle>Chief HR Comments</CardTitle>
            <CardDescription>
              Add any comments or feedback. Required if returning to HR.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={chiefHRComments}
              onChange={(e) => setChiefHRComments(e.target.value)}
              placeholder="Add your comments here..."
              className="min-h-32"
            />
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-between">
              <Button 
                variant="outline" 
                onClick={() => setShowReviewDialog(true)}
                className="gap-2"
              >
                <Eye className="h-4 w-4" />
                Review Final Document
              </Button>
              
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleReturnToHR}
                  disabled={saving}
                >
                  Return to HR
                </Button>
                <Button
                  onClick={handleApprove}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {saving ? 'Approving...' : 'Approve & Finalize'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Final Document Review Dialog */}
      <FinalDocumentReviewDialog
        open={showReviewDialog}
        onOpenChange={setShowReviewDialog}
        formData={formData}
        onProceed={() => {
          // User has reviewed and is ready to proceed
          toast({
            title: "Ready to Submit",
            description: "Click 'Approve & Finalize' or 'Return to HR' to complete your review",
          });
        }}
      />
    </div>
  );
}
