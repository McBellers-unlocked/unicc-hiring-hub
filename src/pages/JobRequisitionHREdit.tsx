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
import { InlineTrackChanges } from "@/components/InlineTrackChanges";

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
      
      setRequisition(data);
      setFormData(data);
      setOriginalData(data);
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

  const handleSaveChanges = async () => {
    if (!requisition) return;

    const changes = detectChanges();
    
    if (changes.length === 0 && !changeSummary.trim()) {
      toast({
        title: "No Changes",
        description: "No changes detected to save",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        ...formData,
        hr_original_data: originalData as any,
        hr_changes: changes as any,
        hr_change_summary: changeSummary,
        hr_reviewed: true,
        hr_reviewed_at: new Date().toISOString(),
        hr_reviewed_by: user?.id,
        hr_internal_status: 'pending_chief_review'
      };

      const { error } = await supabase
        .from('job_requisitions')
        .update(updateData)
        .eq('id', requisition.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Changes saved and sent to Chief HR for review",
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
            <h1 className="text-3xl font-bold">Edit Position Description</h1>
          </div>
          <p className="text-muted-foreground">
            Making changes as HR • Ref: {requisition.reference_number} • Created {format(new Date(requisition.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(`/requisitions/${requisition.id}`)}>
            <Eye className="h-4 w-4 mr-2" />
            View Only
          </Button>
          <Button onClick={handleSaveChanges} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save & Send to Chief HR'}
          </Button>
        </div>
      </div>

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
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade || ''}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  className={changes.some(c => c.field === 'grade') ? 'border-amber-400 bg-amber-50' : ''}
                />
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
                  value={formData.duty_station || ''}
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
                className={`min-h-24 ${changes.some(c => c.field === 'purpose_of_position') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              {changes.some(c => c.field === 'purpose_of_position') && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium mb-2">Preview of tracked changes:</p>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={originalData.purpose_of_position || ''}
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
                className={`min-h-24 ${changes.some(c => c.field === 'objectives_of_programme') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
            </div>
            
            <div>
              <Label htmlFor="main_duties_responsibilities">Main Duties and Responsibilities</Label>
              <Textarea
                id="main_duties_responsibilities"
                value={formData.main_duties_responsibilities || ''}
                onChange={(e) => setFormData({ ...formData, main_duties_responsibilities: e.target.value })}
                className={`min-h-32 ${changes.some(c => c.field === 'main_duties_responsibilities') ? 'border-amber-400 bg-amber-50' : ''}`}
              />
              {changes.some(c => c.field === 'main_duties_responsibilities') && (
                <div className="mt-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium mb-2">Preview of tracked changes:</p>
                  <InlineTrackChanges
                    fieldLabel=""
                    originalValue={originalData.main_duties_responsibilities || ''}
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
                  className={`min-h-24 ${changes.some(c => c.field === 'essential_experience') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
              </div>
              <div>
                <Label htmlFor="desirable_experience">Desirable Experience</Label>
                <Textarea
                  id="desirable_experience"
                  value={formData.desirable_experience || ''}
                  onChange={(e) => setFormData({ ...formData, desirable_experience: e.target.value })}
                  className={`min-h-24 ${changes.some(c => c.field === 'desirable_experience') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
              </div>
              <div>
                <Label htmlFor="essential_education">Essential Education</Label>
                <Textarea
                  id="essential_education"
                  value={formData.essential_education || ''}
                  onChange={(e) => setFormData({ ...formData, essential_education: e.target.value })}
                  className={`min-h-24 ${changes.some(c => c.field === 'essential_education') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
              </div>
              <div>
                <Label htmlFor="desirable_education">Desirable Education</Label>
                <Textarea
                  id="desirable_education"
                  value={formData.desirable_education || ''}
                  onChange={(e) => setFormData({ ...formData, desirable_education: e.target.value })}
                  className={`min-h-24 ${changes.some(c => c.field === 'desirable_education') ? 'border-amber-400 bg-amber-50' : ''}`}
                />
              </div>
            </div>
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
    </div>
  );
}