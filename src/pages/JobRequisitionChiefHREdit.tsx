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
import EditableTrackChangesFieldWithHighlight from "@/components/EditableTrackChangesFieldWithHighlight";
import { isValidUUID } from "@/lib/utils";

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
  // Competency groups
  global_competencies?: any;
  core_competencies?: any;
  management_competencies?: any;
  leadership_competencies?: any;
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

  const isChiefHR = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');

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
      let query = supabase
        .from('job_requisitions')
        .select('*');
      
      // Query by id if UUID, otherwise by slug
      if (isValidUUID(id || '')) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      
      const { data, error } = await query.single();

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
      // For showing HR changes inline, we need the original before HR's changes
      const beforeHRChanges = (data.hr_original_data && typeof data.hr_original_data === 'object') 
        ? { 
            ...(data.hr_original_data as any),
            duty_station: formatDutyStation((data.hr_original_data as any).duty_station)
          }
        : formattedData;
      setOriginalData(beforeHRChanges as Partial<JobRequisition>);
      // For detecting Chief HR's changes, use current state as baseline
      setWorkingBaseline(formattedData);
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
    const currentValue = (formData as any)[fieldKey];
    
    setOriginalData(prev => ({
      ...prev,
      [fieldKey]: currentValue
    }));
    
    setWorkingBaseline(prev => ({
      ...prev,
      [fieldKey]: currentValue
    }));
    
    setAcceptedFields(prev => new Set(prev).add(fieldKey));
    
    toast({
      title: "Changes Accepted",
      description: `HR's changes have been accepted for this field`,
    });
  };

  const hasHRChanges = (fieldKey: string) => {
    const hrOriginal = requisition?.hr_original_data?.[fieldKey] || '';
    const currentValue = (formData as any)?.[fieldKey] || '';
    return hrOriginal !== currentValue && !acceptedFields.has(fieldKey);
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
        // IMPORTANT: Preserve hr_original_data so we don't lose HR's change history
        hr_original_data: requisition.hr_original_data || originalData,
        // Preserve HR's changes in the hr_changes field
        hr_changes: requisition.hr_changes || [],
        chief_hr_reviewed: true,
        chief_hr_reviewed_at: new Date().toISOString(),
        chief_hr_reviewed_by: user?.id,
        chief_hr_comments: chiefHRComments,
        hr_internal_status: 'ready_for_manager',
        status: 'hiring_manager_review', // Move workflow to manager confirmation stage
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      // Send email notification to hiring manager
      try {
        const { error: emailError } = await supabase.functions.invoke(
          'send-chief-hr-review-notification',
          {
            body: { requisitionId: requisition.id }
          }
        );

        if (emailError) {
          console.error('Error sending email notification:', emailError);
          toast({
            title: "Success",
            description: "Position description approved. Note: Email notification could not be sent.",
          });
        } else {
          toast({
            title: "Success",
            description: "Position description approved and hiring manager notified",
          });
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        toast({
          title: "Success",
          description: "Position description approved. Note: Email notification could not be sent.",
        });
      }

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
            <div>
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
              <EditableTrackChangesFieldWithHighlight
                label=""
                originalValue={originalData.purpose_of_position || ''}
                currentValue={formData.purpose_of_position || ''}
                onChange={(value) => setFormData({ ...formData, purpose_of_position: value })}
                requisitionId={id}
                fieldName="purpose_of_position"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            </div>
            
            <div>
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
              <EditableTrackChangesFieldWithHighlight
                label=""
                originalValue={originalData.objectives_of_programme || ''}
                currentValue={formData.objectives_of_programme || ''}
                onChange={(value) => setFormData({ ...formData, objectives_of_programme: value })}
                requisitionId={id}
                fieldName="objectives_of_programme"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            </div>
            
            <div>
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
              <EditableTrackChangesFieldWithHighlight
                label=""
                originalValue={originalData.main_duties_responsibilities || ''}
                currentValue={formData.main_duties_responsibilities || ''}
                onChange={(value) => setFormData({ ...formData, main_duties_responsibilities: value })}
                requisitionId={id}
                fieldName="main_duties_responsibilities"
                currentUserId={user?.id}
                canResolveComments={true}
              />
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4">
              <div>
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
                <EditableTrackChangesFieldWithHighlight
                  label=""
                  originalValue={originalData.essential_experience || ''}
                  currentValue={formData.essential_experience || ''}
                  onChange={(value) => setFormData({ ...formData, essential_experience: value })}
                  requisitionId={id}
                  fieldName="essential_experience"
                  currentUserId={user?.id}
                  canResolveComments={true}
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
                <EditableTrackChangesFieldWithHighlight
                  label=""
                  originalValue={originalData.desirable_experience || ''}
                  currentValue={formData.desirable_experience || ''}
                  onChange={(value) => setFormData({ ...formData, desirable_experience: value })}
                  requisitionId={id}
                  fieldName="desirable_experience"
                  currentUserId={user?.id}
                  canResolveComments={true}
                />
              </div>
              
              <div>
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
                <EditableTrackChangesFieldWithHighlight
                  label=""
                  originalValue={originalData.essential_education || ''}
                  currentValue={formData.essential_education || ''}
                  onChange={(value) => setFormData({ ...formData, essential_education: value })}
                  requisitionId={id}
                  fieldName="essential_education"
                  currentUserId={user?.id}
                  canResolveComments={true}
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
                <EditableTrackChangesFieldWithHighlight
                  label=""
                  originalValue={originalData.desirable_education || ''}
                  currentValue={formData.desirable_education || ''}
                  onChange={(value) => setFormData({ ...formData, desirable_education: value })}
                  requisitionId={id}
                  fieldName="desirable_education"
                  currentUserId={user?.id}
                  canResolveComments={true}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Competencies (read-only, same as HR view) */}
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
                  <li>• <strong>Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                  <li>• <strong>Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                  <li>• <strong>Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                  <li>• <strong>Knowing and managing yourself:</strong> Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.</li>
                  <li>• <strong>Producing results:</strong> Produces and delivers quality results. Is action oriented and committed to achieving outcomes.</li>
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

        {/* Languages (read-only, same as HR view) */}
        {requisition.language_requirements && (
          <Card>
            <CardHeader>
              <CardTitle>Languages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* English Language Requirement */}
              {requisition.language_requirements.english && (
                <div>
                  <Label className="text-muted-foreground">English</Label>
                  <p className="text-sm mt-1">{requisition.language_requirements.english}</p>
                </div>
              )}

              {/* Additional Languages */}
              {Array.isArray(requisition.language_requirements.additional_languages) && 
               requisition.language_requirements.additional_languages.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Additional Languages</Label>
                  <ul className="mt-1 space-y-1">
                    {requisition.language_requirements.additional_languages.map((lang: any, index: number) => {
                      if (typeof lang === 'string') {
                        return <li key={index} className="text-sm">• {lang}</li>;
                      } else if ((lang.name || lang.language) && lang.level) {
                        const languageName = lang.name || lang.language;
                        return (
                          <li key={index} className="text-sm">
                            • <strong>{languageName}:</strong> {lang.level}
                          </li>
                        );
                      }
                      return null;
                    })}
                  </ul>
                </div>
              )}

              {/* Local Language Advantage */}
              {requisition.language_requirements.local_language_advantage && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    • Knowledge of the local language of the duty station is an advantage
                  </p>
                </div>
              )}

              {/* UN Language Advantage */}
              {requisition.language_requirements.un_language_advantage && (
                <div>
                  <p className="text-sm text-muted-foreground">
                    • Knowledge of another UN official language is an advantage
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
        requisitionId={id}
      />
    </div>
  );
}
