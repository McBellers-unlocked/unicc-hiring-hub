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
  global_competencies: any;
  core_competencies: any;
  management_competencies: any;
  leadership_competencies: any;
  language_requirements: any;
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
      const original: any = data.hr_original_data || {};
      // Ensure competencies and languages are included
      if (!original.global_competencies && data.global_competencies) {
        original.global_competencies = data.global_competencies;
      }
      if (!original.core_competencies && data.core_competencies) {
        original.core_competencies = data.core_competencies;
      }
      if (!original.management_competencies && data.management_competencies) {
        original.management_competencies = data.management_competencies;
      }
      if (!original.leadership_competencies && data.leadership_competencies) {
        original.leadership_competencies = data.leadership_competencies;
      }
      if (!original.language_requirements && data.language_requirements) {
        original.language_requirements = data.language_requirements;
      }
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
        global_competencies: data.global_competencies || [],
        core_competencies: data.core_competencies || [],
        management_competencies: data.management_competencies || [],
        leadership_competencies: data.leadership_competencies || [],
        language_requirements: data.language_requirements || {},
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
        { field: 'global_competencies', label: 'Global Competencies' },
        { field: 'core_competencies', label: 'Core Competencies' },
        { field: 'management_competencies', label: 'Management Competencies' },
        { field: 'leadership_competencies', label: 'Leadership Competencies' },
        { field: 'language_requirements', label: 'Language Requirements' },
      ];

      for (const { field, label } of fields) {
        const currentVal = JSON.stringify(formData[field] || '');
        const hrVal = JSON.stringify(hrData[field] || '');
        if (currentVal !== hrVal) {
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

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium">Desirable Experience</Label>
                {hasHRChanges('desirable_experience') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => acceptHRChanges('desirable_experience')}
                    className="h-8 gap-1"
                  >
                    <Check className="h-3 w-3" />
                    Accept Changes
                  </Button>
                )}
              </div>
              <EditableTrackChangesField
                label=""
                originalValue={originalData.desirable_experience || ""}
                currentValue={formData.desirable_experience || ""}
                onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
                requisitionId={id}
                fieldName="desirable_experience"
                currentUserId={user?.id}
                canResolveComments={false}
              />
            </div>

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

        {/* Competencies */}
        {((Array.isArray(requisition.global_competencies) && requisition.global_competencies.length > 0) ||
          (Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0) ||
          (Array.isArray(requisition.leadership_competencies) && requisition.leadership_competencies.length > 0) ||
          (Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0)) && (
          <Card>
            <CardHeader>
              <CardTitle>Competencies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Mandatory Competencies */}
              <div>
                <label className="text-sm font-medium text-muted-foreground">Mandatory Competencies</label>
                <p className="text-xs text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li>• <span className="font-bold">Teamwork:</span> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                  <li>• <span className="font-bold">Communicating:</span> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                  <li>• <span className="font-bold">Respecting and promoting individual and cultural differences:</span> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                  <li>• <span className="font-bold">Creating an empowering and motivating environment</span> (for Supervisory positions only): Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                </ul>
              </div>

              {Array.isArray(requisition.global_competencies) && requisition.global_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Global Competencies</label>
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

              {Array.isArray(requisition.core_competencies) && requisition.core_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Core Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.core_competencies.map((comp: any, index: number) => {
                      const getCoreCompetencyDefinition = (compName: string) => {
                        const coreCompetencies = [
                          'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                          'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                          'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                          "Setting an example: Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values."
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

              {Array.isArray(requisition.leadership_competencies) && requisition.leadership_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Leadership Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.leadership_competencies.map((comp: any, index: number) => {
                      const getLeadershipCompetencyDefinition = (compName: string) => {
                        const leadershipCompetencies = [
                          'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                          "Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.",
                          "Promoting UNICC's position: Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences."
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

              {Array.isArray(requisition.management_competencies) && requisition.management_competencies.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Management Competencies</label>
                  <ul className="mt-1 space-y-1">
                    {requisition.management_competencies.map((comp: any, index: number) => {
                      const getManagementCompetencyDefinition = (compName: string) => {
                        const managementCompetencies = [
                          "Ensuring effective use of resources: Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.",
                          "Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners."
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
        )}


        <Card>
          <CardHeader>
            <CardTitle>Language Requirements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {requisition.language_requirements && typeof requisition.language_requirements === 'object' ? (
              <div className="space-y-3 text-sm">
                {Object.entries(requisition.language_requirements).map(([lang, level]) => {
                  // Skip technical fields
                  if (lang === 'un_language_advantage' || lang === 'local_language_advantage' || lang === 'additional_languages') {
                    return null;
                  }
                  return (
                    <div key={lang}>
                      • <strong className="capitalize">{lang.replace(/_/g, ' ')}:</strong> {String(level)}
                    </div>
                  );
                })}
                {requisition.language_requirements.additional_languages && 
                 Array.isArray(requisition.language_requirements.additional_languages) &&
                 requisition.language_requirements.additional_languages.length > 0 && (
                  <div className="mt-4 pt-3 border-t">
                    <div className="font-semibold mb-2">Additional Languages:</div>
                    {requisition.language_requirements.additional_languages.map((lang: any, idx: number) => (
                      <div key={idx} className="pl-4">
                        • <strong>{lang.name}:</strong> {lang.level}
                      </div>
                    ))}
                  </div>
                )}
                {requisition.language_requirements.un_language_advantage && (
                  <div className="mt-3 text-muted-foreground italic">
                    Knowledge of another UN official language is an advantage
                  </div>
                )}
                {requisition.language_requirements.local_language_advantage && (
                  <div className="mt-2 text-muted-foreground italic">
                    Knowledge of the local language is an advantage
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No language requirements specified</p>
            )}
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
          global_competencies: formData.global_competencies || requisition.global_competencies || [],
          core_competencies: formData.core_competencies || requisition.core_competencies || [],
          management_competencies: formData.management_competencies || requisition.management_competencies || [],
          leadership_competencies: formData.leadership_competencies || requisition.leadership_competencies || [],
          language_requirements: formData.language_requirements || requisition.language_requirements || {},
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
