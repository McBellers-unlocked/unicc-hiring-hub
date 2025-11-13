import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeft, Save, Send } from 'lucide-react';

const LOCATIONS = [
  'Valencia',
  'Brindisi',
  'New York',
  'Geneva',
  'Rome',
  'Remote',
];

// Organizational structure
const DIVISIONS = {
  "CS": "Cybersecurity division (CS)",
  "DD": "Digital Delivery division (DD)", 
  "DS": "Digital Solutions Centre (DS)",
  "DO": "Director (DO)",
  "MS": "Management and Strategy (MS)",
  "OP": "Operations (OP)"
};

const DIVISION_UNITS: Record<string, string[]> = {
  "CS": [
    "CISO Section (CISO)",
    "Investigative Support Unit (CSI)", 
    "Cybersecurity Solutions & Strategy Unit (CSS)",
    "Cybersecurity Assurance & Architecture Section (CSA)",
    "Cybersecurity Engineering Unit (CSE)",
    "Cybersecurity Networking Unit (CSN)",
    "Cybersecurity Operations Section (CSO)",
    "Organizational Resilience Unit (CSR)"
  ],
  "DD": [
    "Data and Artificial Intelligence Section (DDA)",
    "Digital Development Center Section (DDC)",
    "Digital Business Solutions Section (DDD)",
    "Artificial Intelligence and Machine Learning Unit (DDAI)",
    "Data Management Unit (DDAM)",
    "Enterprise Service Management Unit (DDES)",
    "Enterprise Solutions Section (DDE)",
    "Hyperautomation Solutions Unit (DDHA)",
    "MS Dynamics Unit (DDMS)",
    "Projects & Programmes Section (DDP)",
    "Programme Portfolio Unit (DDPG)",
    "Project Portfolio Unit (DDPM)",
    "Governance PMO Unit (DDPO)"
  ],
  "DS": [
    "Digital Products Unit (DSDP)",
    "Business Solutions Unit (DSB)",
    "Digital Customer Services Unit (DSCS)",
    "Unite Digital Workspace Services Unit (DSDW)",
    "Learning Services Unit (DSL)",
    "Digital Public Solutions Unit (DSPS)"
  ],
  "DO": [
    "UNICC Directorate (DOD)",
    "External Relations and Strategic Partnerships Section (DOE)",
    "Digital ID Programme (DOP)",
    "Business Relationship Management Section (DBR)"
  ],
  "MS": [
    "Policy (Legal) Unit (MSL)",
    "Business Control Section (MSB)",
    "Process and Change Unit (MSBP)",
    "Finance and Accounting Section (MSF)",
    "GRC & QA Unit (MSG)",
    "Human Resources Section (MSH)",
    "Talent Unit (MSHT)",
    "Procurement Section (MSP)"
  ],
  "OP": [
    "Infrastructure and Platform Operations Unit (OPBO)",
    "Customer IT Resilience Team (OPBR)",
    "Data Center Support Unit (OPBS)",
    "Customer Services Centre (OPC)",
    "Service Desk Unit (OPCS)",
    "Cloud Services Section (OPD)",
    "Cloud Operations and Platform Service Unit (OPDA)",
    "Digital Workplace Service Unit (OPDM)",
    "Infrastructure and Operations Business Section (OPM)",
    "Service Excellence Unit (OPMX)",
    "On-premise Services (OPO)",
    "Platform Architecture and Service Automation Unit (OPOA)",
    "Oracle Unit (OPOU)",
    "SAP Unit (OPOS)"
  ]
};

const FUNDING_OPTIONS = [
  'This request is totally funded by a current agreement with client',
  'This request is critical for service continuity (non-chargeable)',
  'This request is partially funded by a current agreement',
  'This request will be funded by an upcoming agreement, not yet executed',
];

export default function InitialRequestForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  
  const [formData, setFormData] = useState({
    position_title: '',
    nature_of_position: '',
    staff_contract_type: '',
    temporary_duration: '',
    consultant_duration: '',
    grade: '',
    unit_section_division: '',
    duty_station: [] as string[],
    brief_outline: '',
    funding_status: '',
    funding_comments: '',
  });

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        setFormData({
          position_title: data.position_title || '',
          nature_of_position: data.nature_of_position || '',
          staff_contract_type: data.nature_of_position === 'Fixed term' ? 'Fixed term' : 
                               data.nature_of_position === 'Temporary' ? 'Temporary' : '',
          temporary_duration: data.temporary_duration || '',
          consultant_duration: data.consultant_duration || '',
          grade: data.grade || '',
          unit_section_division: data.unit_section_division || '',
          duty_station: data.duty_station ? JSON.parse(data.duty_station) : [],
          brief_outline: data.brief_outline || '',
          funding_status: data.funding_status || '',
          funding_comments: data.funding_comments || '',
        });

        // Parse existing unit_section_division to set division/unit dropdowns
        if (data.unit_section_division) {
          // Try to find which division this unit belongs to
          for (const [divKey, divName] of Object.entries(DIVISIONS)) {
            if (data.unit_section_division === divName || DIVISION_UNITS[divKey].includes(data.unit_section_division)) {
              setSelectedDivision(divKey);
              setSelectedUnit(data.unit_section_division);
              break;
            }
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error loading request",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationToggle = (location: string) => {
    setFormData(prev => ({
      ...prev,
      duty_station: prev.duty_station.includes(location)
        ? prev.duty_station.filter(l => l !== location)
        : [...prev.duty_station, location]
    }));
  };

  const validateForm = () => {
    if (!formData.position_title.trim()) {
      toast({
        title: "Validation Error",
        description: "Position title is required",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.nature_of_position) {
      toast({
        title: "Validation Error",
        description: "Contract type is required",
        variant: "destructive",
      });
      return false;
    }
    if (formData.nature_of_position === 'Staff' && !formData.staff_contract_type) {
      toast({
        title: "Validation Error",
        description: "Please select Fixed term or Temporary for Staff positions",
        variant: "destructive",
      });
      return false;
    }
    if (formData.staff_contract_type === 'Temporary' && !formData.temporary_duration) {
      toast({
        title: "Validation Error",
        description: "Please select duration for Temporary positions",
        variant: "destructive",
      });
      return false;
    }
    if (formData.nature_of_position === 'Individual Consultant' && !formData.consultant_duration) {
      toast({
        title: "Validation Error",
        description: "Please select duration for Consultant contracts",
        variant: "destructive",
      });
      return false;
    }
    if ((formData.nature_of_position === 'Staff' || formData.nature_of_position === 'STDA') && !formData.grade.trim()) {
      toast({
        title: "Validation Error",
        description: "Grade is required for Staff and STDA positions",
        variant: "destructive",
      });
      return false;
    }
    if (formData.duty_station.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one location",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.brief_outline.trim()) {
      toast({
        title: "Validation Error",
        description: "Brief outline of role is required",
        variant: "destructive",
      });
      return false;
    }
    if (!formData.funding_status) {
      toast({
        title: "Validation Error",
        description: "Please select funding status",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSave = async (submit: boolean = false) => {
    if (submit && !validateForm()) return;

    try {
      setSaving(true);
      
      // Determine the final nature_of_position value
      let finalNatureOfPosition = formData.nature_of_position;
      if (formData.nature_of_position === 'Staff') {
        finalNatureOfPosition = formData.staff_contract_type;
      }

      const dataToSave = {
        position_title: formData.position_title,
        nature_of_position: finalNatureOfPosition,
        temporary_duration: formData.temporary_duration || null,
        consultant_duration: formData.consultant_duration || null,
        grade: formData.grade || null,
        unit_section_division: formData.unit_section_division || null,
        duty_station: JSON.stringify(formData.duty_station),
        brief_outline: formData.brief_outline,
        funding_status: formData.funding_status,
        funding_comments: formData.funding_comments || null,
        initial_request_submitted: submit,
        status: submit ? 'initial_request_submitted' : 'initial_request_draft',
        updated_at: new Date().toISOString(),
      };

      if (id) {
        // Update existing
        const { error } = await supabase
          .from('job_requisitions')
          .update(dataToSave)
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('job_requisitions')
          .insert({
            ...dataToSave,
            created_by: user?.id,
          });

        if (error) throw error;
      }

      toast({
        title: submit ? "Initial Request Submitted" : "Draft Saved",
        description: submit 
          ? "Your initial request has been submitted for Chief of Division review"
          : "Your draft has been saved successfully",
      });

      navigate('/requisitions');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const showGradeField = formData.nature_of_position === 'Staff' || formData.nature_of_position === 'STDA';
  const showStaffTypeSelection = formData.nature_of_position === 'Staff';
  const showTemporaryDuration = formData.staff_contract_type === 'Temporary';
  const showConsultantDuration = formData.nature_of_position === 'Individual Consultant';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate('/requisitions')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Requisitions
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Initial Position Request</CardTitle>
            <p className="text-sm text-muted-foreground">
              Submit basic details for approval before creating the full position description
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Position Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Position Title *</Label>
              <Input
                id="title"
                value={formData.position_title}
                onChange={(e) => setFormData(prev => ({ ...prev, position_title: e.target.value }))}
                placeholder="e.g., Senior Software Developer"
              />
            </div>

            {/* Unit/Section/Division */}
            <div className="space-y-3">
              <Label>Unit/Section/Division</Label>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="division" className="text-sm text-muted-foreground">Division</Label>
                  <Select 
                    value={selectedDivision} 
                    onValueChange={(value) => {
                      setSelectedDivision(value);
                      setSelectedUnit("");
                      setFormData(prev => ({ ...prev, unit_section_division: "" }));
                    }}
                  >
                    <SelectTrigger id="division">
                      <SelectValue placeholder="Select division..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      {Object.entries(DIVISIONS).map(([key, name]) => (
                        <SelectItem key={key} value={key}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedDivision && (
                  <div>
                    <Label htmlFor="unit-section" className="text-sm text-muted-foreground">Unit/Section</Label>
                    <Select 
                      value={selectedUnit} 
                      onValueChange={(value) => {
                        setSelectedUnit(value);
                        setFormData(prev => ({ ...prev, unit_section_division: value }));
                      }}
                    >
                      <SelectTrigger id="unit-section">
                        <SelectValue placeholder="Select unit/section..." />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        {/* Main Division Option */}
                        <SelectItem key={selectedDivision} value={DIVISIONS[selectedDivision]}>
                          {DIVISIONS[selectedDivision]} (Main Division)
                        </SelectItem>
                        {/* Individual Units/Sections */}
                        {DIVISION_UNITS[selectedDivision].map((unit) => (
                          <SelectItem key={unit} value={unit}>
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Choose the division first, then select the specific unit/section within that division.
              </p>
            </div>

            {/* Contract Type */}
            <div className="space-y-2">
              <Label>Type of Contract *</Label>
              <Select 
                value={formData.nature_of_position} 
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  nature_of_position: value,
                  staff_contract_type: '',
                  temporary_duration: '',
                  consultant_duration: '',
                  grade: value === 'Staff' || value === 'STDA' ? prev.grade : '',
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select contract type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Staff">Staff</SelectItem>
                  <SelectItem value="Individual Consultant">Consultant</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="STDA">STDA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Staff Type Selection */}
            {showStaffTypeSelection && (
              <div className="space-y-2">
                <Label>Staff Contract Type *</Label>
                <RadioGroup 
                  value={formData.staff_contract_type} 
                  onValueChange={(value) => setFormData(prev => ({ 
                    ...prev, 
                    staff_contract_type: value,
                    temporary_duration: value === 'Temporary' ? prev.temporary_duration : '',
                  }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Fixed term" id="fixed" />
                    <Label htmlFor="fixed" className="font-normal">Fixed term</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Temporary" id="temporary" />
                    <Label htmlFor="temporary" className="font-normal">Temporary</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Temporary Duration */}
            {showTemporaryDuration && (
              <div className="space-y-2">
                <Label>Contract Duration *</Label>
                <RadioGroup 
                  value={formData.temporary_duration} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, temporary_duration: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="6 months" id="temp6" />
                    <Label htmlFor="temp6" className="font-normal">6 months</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="12 months" id="temp12" />
                    <Label htmlFor="temp12" className="font-normal">12 months</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Consultant Duration */}
            {showConsultantDuration && (
              <div className="space-y-2">
                <Label>Contract Duration *</Label>
                <RadioGroup 
                  value={formData.consultant_duration} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, consultant_duration: value }))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="6 months" id="cons6" />
                    <Label htmlFor="cons6" className="font-normal">6 months</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="11 months" id="cons11" />
                    <Label htmlFor="cons11" className="font-normal">11 months</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Grade */}
            {showGradeField && (
              <div className="space-y-2">
                <Label htmlFor="grade">Grade *</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                  placeholder="e.g., P3, G6"
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label>Location (Duty Station) *</Label>
              <div className="space-y-2">
                {LOCATIONS.filter(location => {
                  // Only show Remote for Consultant or Intern
                  if (location === 'Remote') {
                    return formData.nature_of_position === 'Individual Consultant' || 
                           formData.nature_of_position === 'Intern';
                  }
                  return true;
                }).map((location) => (
                  <div key={location} className="flex items-center space-x-2">
                    <Checkbox
                      id={`location-${location}`}
                      checked={formData.duty_station.includes(location)}
                      onCheckedChange={() => handleLocationToggle(location)}
                    />
                    <Label htmlFor={`location-${location}`} className="font-normal">
                      {location}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Brief Outline */}
            <div className="space-y-2">
              <Label htmlFor="outline">Brief Outline of Role *</Label>
              <Textarea
                id="outline"
                value={formData.brief_outline}
                onChange={(e) => setFormData(prev => ({ ...prev, brief_outline: e.target.value }))}
                placeholder="Provide a brief description of the role and its main responsibilities..."
                rows={5}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {formData.brief_outline.length}/1000 characters
              </p>
            </div>

            {/* Funding Status */}
            <div className="space-y-2">
              <Label>Funding Status *</Label>
              <Select 
                value={formData.funding_status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, funding_status: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select funding status" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDING_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Funding Comments */}
            <div className="space-y-2">
              <Label htmlFor="funding-comments">Funding Comments (Optional)</Label>
              <Textarea
                id="funding-comments"
                value={formData.funding_comments}
                onChange={(e) => setFormData(prev => ({ ...prev, funding_comments: e.target.value }))}
                placeholder="Add any additional details about funding..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <Button
                variant="outline"
                onClick={() => handleSave(false)}
                disabled={saving}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
              >
                <Send className="w-4 h-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
