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
      // Use HR's version as the baseline for Chief HR review
      const baselineData = (data.hr_original_data && typeof data.hr_original_data === 'object') 
        ? data.hr_original_data 
        : data;
      setOriginalData(baselineData as Partial<JobRequisition>);
      setWorkingBaseline(baselineData as Partial<JobRequisition>);
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
            <div>
              <Label htmlFor="purpose_of_position">Purpose of the Position</Label>
              <Textarea
                id="purpose_of_position"
                value={formData.purpose_of_position || ''}
                onChange={(e) => setFormData({ ...formData, purpose_of_position: e.target.value })}
                className={`min-h-24 ${currentChanges.some(c => c.field === 'purpose_of_position') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              
              {/* Show HR's changes if not accepted yet */}
              {getHRChangeForField('purpose_of_position') && !acceptedFields.has('purpose_of_position') && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        acceptHRChanges('purpose_of_position');
                        setFormData({ ...formData, purpose_of_position: requisition?.purpose_of_position });
                      }}
                      className="h-7 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept HR Changes
                    </Button>
                  </div>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={originalData.purpose_of_position || ''}
                    newValue={requisition?.purpose_of_position || ''}
                    showToggle={false}
                  />
                </div>
              )}
              
              {/* Show accepted indicator */}
              {acceptedFields.has('purpose_of_position') && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700">HR changes accepted</span>
                </div>
              )}
              
              {/* Show Chief HR's own changes if any */}
              {currentChanges.some(c => c.field === 'purpose_of_position') && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={workingBaseline.purpose_of_position || ''}
                    newValue={formData.purpose_of_position || ''}
                    showToggle={false}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="objectives_of_programme">Objectives of the Programme</Label>
              <Textarea
                id="objectives_of_programme"
                value={formData.objectives_of_programme || ''}
                onChange={(e) => setFormData({ ...formData, objectives_of_programme: e.target.value })}
                className={`min-h-24 ${currentChanges.some(c => c.field === 'objectives_of_programme') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              
              {getHRChangeForField('objectives_of_programme') && !acceptedFields.has('objectives_of_programme') && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        acceptHRChanges('objectives_of_programme');
                        setFormData({ ...formData, objectives_of_programme: requisition?.objectives_of_programme });
                      }}
                      className="h-7 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept HR Changes
                    </Button>
                  </div>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={originalData.objectives_of_programme || ''}
                    newValue={requisition?.objectives_of_programme || ''}
                    showToggle={false}
                  />
                </div>
              )}
              
              {acceptedFields.has('objectives_of_programme') && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700">HR changes accepted</span>
                </div>
              )}
              
              {currentChanges.some(c => c.field === 'objectives_of_programme') && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={workingBaseline.objectives_of_programme || ''}
                    newValue={formData.objectives_of_programme || ''}
                    showToggle={false}
                  />
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="main_duties_responsibilities">Main Duties and Responsibilities</Label>
              <Textarea
                id="main_duties_responsibilities"
                value={formData.main_duties_responsibilities || ''}
                onChange={(e) => setFormData({ ...formData, main_duties_responsibilities: e.target.value })}
                className={`min-h-32 ${currentChanges.some(c => c.field === 'main_duties_responsibilities') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              
              {getHRChangeForField('main_duties_responsibilities') && !acceptedFields.has('main_duties_responsibilities') && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => {
                        acceptHRChanges('main_duties_responsibilities');
                        setFormData({ ...formData, main_duties_responsibilities: requisition?.main_duties_responsibilities });
                      }}
                      className="h-7 text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      Accept HR Changes
                    </Button>
                  </div>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={originalData.main_duties_responsibilities || ''}
                    newValue={requisition?.main_duties_responsibilities || ''}
                    showToggle={false}
                  />
                </div>
              )}
              
              {acceptedFields.has('main_duties_responsibilities') && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-green-700">HR changes accepted</span>
                </div>
              )}
              
              {currentChanges.some(c => c.field === 'main_duties_responsibilities') && (
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={workingBaseline.main_duties_responsibilities || ''}
                    newValue={formData.main_duties_responsibilities || ''}
                    showToggle={false}
                  />
                </div>
              )}
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
                <Label htmlFor="essential_experience">Essential Experience</Label>
                <Textarea
                  id="essential_experience"
                  value={formData.essential_experience || ''}
                  onChange={(e) => setFormData({ ...formData, essential_experience: e.target.value })}
                  className={`min-h-24 ${currentChanges.some(c => c.field === 'essential_experience') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
                
                {getHRChangeForField('essential_experience') && !acceptedFields.has('essential_experience') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          acceptHRChanges('essential_experience');
                          setFormData({ ...formData, essential_experience: requisition?.essential_experience });
                        }}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept HR Changes
                      </Button>
                    </div>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={originalData.essential_experience || ''}
                      newValue={requisition?.essential_experience || ''}
                      showToggle={false}
                    />
                  </div>
                )}
                
                {acceptedFields.has('essential_experience') && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700">HR changes accepted</span>
                  </div>
                )}
                
                {currentChanges.some(c => c.field === 'essential_experience') && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={workingBaseline.essential_experience || ''}
                      newValue={formData.essential_experience || ''}
                      showToggle={false}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="desirable_experience">Desirable Experience</Label>
                <Textarea
                  id="desirable_experience"
                  value={formData.desirable_experience || ''}
                  onChange={(e) => setFormData({ ...formData, desirable_experience: e.target.value })}
                  className={`min-h-24 ${currentChanges.some(c => c.field === 'desirable_experience') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
                
                {getHRChangeForField('desirable_experience') && !acceptedFields.has('desirable_experience') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          acceptHRChanges('desirable_experience');
                          setFormData({ ...formData, desirable_experience: requisition?.desirable_experience });
                        }}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept HR Changes
                      </Button>
                    </div>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={originalData.desirable_experience || ''}
                      newValue={requisition?.desirable_experience || ''}
                      showToggle={false}
                    />
                  </div>
                )}
                
                {acceptedFields.has('desirable_experience') && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700">HR changes accepted</span>
                  </div>
                )}
                
                {currentChanges.some(c => c.field === 'desirable_experience') && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={workingBaseline.desirable_experience || ''}
                      newValue={formData.desirable_experience || ''}
                      showToggle={false}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="essential_education">Essential Education</Label>
                <Textarea
                  id="essential_education"
                  value={formData.essential_education || ''}
                  onChange={(e) => setFormData({ ...formData, essential_education: e.target.value })}
                  className={`min-h-24 ${currentChanges.some(c => c.field === 'essential_education') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
                
                {getHRChangeForField('essential_education') && !acceptedFields.has('essential_education') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          acceptHRChanges('essential_education');
                          setFormData({ ...formData, essential_education: requisition?.essential_education });
                        }}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept HR Changes
                      </Button>
                    </div>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={originalData.essential_education || ''}
                      newValue={requisition?.essential_education || ''}
                      showToggle={false}
                    />
                  </div>
                )}
                
                {acceptedFields.has('essential_education') && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700">HR changes accepted</span>
                  </div>
                )}
                
                {currentChanges.some(c => c.field === 'essential_education') && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={workingBaseline.essential_education || ''}
                      newValue={formData.essential_education || ''}
                      showToggle={false}
                    />
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="desirable_education">Desirable Education</Label>
                <Textarea
                  id="desirable_education"
                  value={formData.desirable_education || ''}
                  onChange={(e) => setFormData({ ...formData, desirable_education: e.target.value })}
                  className={`min-h-24 ${currentChanges.some(c => c.field === 'desirable_education') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
                
                {getHRChangeForField('desirable_education') && !acceptedFields.has('desirable_education') && (
                  <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <p className="text-xs text-blue-700 font-medium">HR's changes:</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          acceptHRChanges('desirable_education');
                          setFormData({ ...formData, desirable_education: requisition?.desirable_education });
                        }}
                        className="h-7 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Accept HR Changes
                      </Button>
                    </div>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={originalData.desirable_education || ''}
                      newValue={requisition?.desirable_education || ''}
                      showToggle={false}
                    />
                  </div>
                )}
                
                {acceptedFields.has('desirable_education') && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-700">HR changes accepted</span>
                  </div>
                )}
                
                {currentChanges.some(c => c.field === 'desirable_education') && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-2">Your additional changes:</p>
                    <InlineTrackChanges
                      fieldLabel=""
                      originalValue={workingBaseline.desirable_education || ''}
                      newValue={formData.desirable_education || ''}
                      showToggle={false}
                    />
                  </div>
                )}
              </div>
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
