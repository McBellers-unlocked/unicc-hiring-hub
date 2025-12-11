import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
import { isValidUUID } from '@/lib/utils';
import { ArrowLeft, Save, Send, CheckCircle, XCircle } from 'lucide-react';
import { ConsultancyLevelGuidance } from '@/components/ConsultancyLevelGuidance';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast as sonnerToast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRoles } = useAuth();
  const queryClient = useQueryClient();
  
  // Admins viewing existing requests should always be in view mode
  const isAdmin = userRoles.includes('Admin') || userRoles.includes('HR Assistant') || userRoles.includes('Chief of HR');
  const isChiefOfDivision = userRoles.includes('Chief of Division');
  const viewMode = searchParams.get('view') === 'true' || (id && isAdmin);
  const showChiefActions = viewMode && isChiefOfDivision && id;
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [consultancyLevel, setConsultancyLevel] = useState('');
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    action: 'approve' | 'reject' | null;
    comments: string;
  }>({
    open: false,
    action: null,
    comments: ''
  });
  
  const [formData, setFormData] = useState({
    position_title: '',
    nature_of_position: '',
    staff_contract_type: '',
    temporary_duration: '',
    consultant_duration: '',
    intern_modality: '',
    grade: '',
    unit_section_division: '',
    duty_station: [] as string[],
    remote_region: '',
    brief_outline: '',
    funding_status: '',
    funding_comments: '',
    internal_only: false,
    // STDA-specific fields
    eligible_grades: [] as string[],
    stda_assignment_duration: '',
    stda_reasons: [] as string[],
    stda_other_reason: '',
    stda_working_time: '',
    stda_percentage: '',
    stda_days_per_week: '',
    stda_start_date: '',
  });

  useEffect(() => {
    if (id) {
      loadRequest();
    }
  }, [id]);

  // Clear multiple locations when switching to G grade
  useEffect(() => {
    if (formData.grade?.startsWith('G') && formData.duty_station.length > 1) {
      setFormData(prev => ({
        ...prev,
        duty_station: [prev.duty_station[0]] // Keep only the first selected location
      }));
    }
  }, [formData.grade]);

  const loadRequest = async () => {
    try {
      setLoading(true);
      // Query supports both slug and UUID
      let query = supabase
        .from('job_requisitions')
        .select('*');
      
      if (isValidUUID(id || '')) {
        query = query.eq('id', id);
      } else {
        query = query.eq('slug', id);
      }
      
      const { data, error } = await query.single();

      if (error) throw error;
      
      if (data) {
        // Try to extract remote_region and consultancy_level from comments if it exists
        let remoteRegion = '';
        let consultancy = '';
        let stdaData: any = {};
        if (data.comments && typeof data.comments === 'object') {
          remoteRegion = (data.comments as any).remote_region || '';
          consultancy = (data.comments as any).consultancy_level || '';
          stdaData = (data.comments as any).stda_data || {};
        }
        
        setFormData({
          position_title: data.position_title || '',
          nature_of_position: data.nature_of_position || '',
          staff_contract_type: data.nature_of_position === 'Fixed term' ? 'Fixed term' : 
                               data.nature_of_position === 'Temporary' ? 'Temporary' : '',
          temporary_duration: data.temporary_duration || '',
          consultant_duration: data.consultant_duration || '',
          intern_modality: data.intern_modality || '',
          grade: data.grade || '',
          unit_section_division: data.unit_section_division || '',
          duty_station: data.duty_station ? JSON.parse(data.duty_station) : [],
          remote_region: remoteRegion,
          brief_outline: data.brief_outline || '',
          funding_status: data.funding_status || '',
          funding_comments: data.funding_comments || '',
          internal_only: data.internal_only || false,
          // STDA-specific fields
          eligible_grades: stdaData.eligible_grades || [],
          stda_assignment_duration: stdaData.assignment_duration || '',
          stda_reasons: stdaData.reasons || [],
          stda_other_reason: stdaData.other_reason || '',
          stda_working_time: stdaData.working_time || '',
          stda_percentage: stdaData.percentage || '',
          stda_days_per_week: stdaData.days_per_week || '',
          stda_start_date: stdaData.start_date || '',
        });
        
        if (consultancy) {
          setConsultancyLevel(consultancy);
        }

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
    const isGPosition = formData.grade?.startsWith('G');
    
    setFormData(prev => ({
      ...prev,
      duty_station: isGPosition 
        ? [location] // For G positions, only allow single selection
        : prev.duty_station.includes(location)
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
    if (formData.nature_of_position === 'Individual Consultant' && !consultancyLevel) {
      toast({
        title: "Validation Error",
        description: "Please select a consultancy level",
        variant: "destructive",
      });
      return false;
    }
    if (formData.nature_of_position === 'Intern' && !formData.intern_modality) {
      toast({
        title: "Validation Error",
        description: "Please select Full time or Part time for Intern positions",
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
    if (formData.nature_of_position === 'STDA') {
      if (formData.eligible_grades.length === 0) {
        toast({
          title: "Validation Error",
          description: "At least one eligible grade is required for STDA positions",
          variant: "destructive",
        });
        return false;
      }
      if (!formData.stda_assignment_duration) {
        toast({
          title: "Validation Error",
          description: "Assignment duration is required for STDA positions",
          variant: "destructive",
        });
        return false;
      }
      if (formData.stda_reasons.length === 0) {
        toast({
          title: "Validation Error",
          description: "Please select at least one reason for the opportunity",
          variant: "destructive",
        });
        return false;
      }
      if (formData.stda_reasons.includes('Other') && !formData.stda_other_reason.trim()) {
        toast({
          title: "Validation Error",
          description: "Please specify the other reason",
          variant: "destructive",
        });
        return false;
      }
      if (!formData.stda_working_time) {
        toast({
          title: "Validation Error",
          description: "Working time is required for STDA positions",
          variant: "destructive",
        });
        return false;
      }
      if (formData.stda_working_time === 'Part time') {
        if (!formData.stda_percentage.trim()) {
          toast({
            title: "Validation Error",
            description: "Percentage is required for Part time positions",
            variant: "destructive",
          });
          return false;
        }
        if (!formData.stda_days_per_week.trim()) {
          toast({
            title: "Validation Error",
            description: "Days per week is required for Part time positions",
            variant: "destructive",
          });
          return false;
        }
      }
      if (!formData.stda_start_date) {
        toast({
          title: "Validation Error",
          description: "Targeted start date is required for STDA positions",
          variant: "destructive",
        });
        return false;
      }
    }
    if (formData.duty_station.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one location",
        variant: "destructive",
      });
      return false;
    }
    if (formData.duty_station.includes('Remote') && !formData.remote_region.trim()) {
      toast({
        title: "Validation Error",
        description: "Please specify the remote timezone",
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
      
      // Generate slug from position title
      const generateSlug = (title: string) => {
        return title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      };
      
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
        intern_modality: formData.intern_modality || null,
        grade: formData.grade || null,
        unit_section_division: formData.unit_section_division || null,
        duty_station: JSON.stringify(formData.duty_station),
        brief_outline: formData.brief_outline,
        funding_status: formData.funding_status,
        funding_comments: formData.funding_comments || null,
        internal_only: formData.internal_only,
        comments: {
          ...(formData.remote_region && { remote_region: formData.remote_region }),
          ...(consultancyLevel && formData.nature_of_position === 'Individual Consultant' && { consultancy_level: consultancyLevel }),
          ...(formData.nature_of_position === 'STDA' && {
            stda_data: {
              eligible_grades: formData.eligible_grades,
              assignment_duration: formData.stda_assignment_duration,
              reasons: formData.stda_reasons,
              other_reason: formData.stda_other_reason,
              working_time: formData.stda_working_time,
              percentage: formData.stda_percentage,
              days_per_week: formData.stda_days_per_week,
              start_date: formData.stda_start_date,
            }
          }),
          nature_of_position: finalNatureOfPosition
        },
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
        // Create new with slug
        const baseSlug = generateSlug(formData.position_title);
        const { error } = await supabase
          .from('job_requisitions')
          .insert({
            ...dataToSave,
            slug: baseSlug,
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

  const approveMutation = useMutation({
    mutationFn: async ({ approved, comments }: { approved: boolean; comments?: string }) => {
      if (!id) throw new Error("No requisition ID");
      
      const updateData: any = {
        chief_of_division_approval: approved,
        initial_request_approved: approved,
        initial_request_approved_by: user?.id,
        initial_request_approved_at: new Date().toISOString(),
        chief_of_division_approved_at: new Date().toISOString(),
        chief_of_division_approved_by: user?.id,
        status: approved ? 'initial_request_approved' : 'initial_request_rejected',
      };
      
      if (comments) {
        updateData.comments = JSON.stringify([
          {
            user_id: user?.id,
            comment: comments,
            timestamp: new Date().toISOString(),
            action: approved ? 'approved_initial_request' : 'rejected_initial_request',
          }
        ]);
      }

      const { error } = await supabase
        .from("job_requisitions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions-chief-approval"] });
      sonnerToast.success("Requisition updated successfully");
      navigate('/');
    },
    onError: () => {
      sonnerToast.error("Failed to update requisition");
    },
  });

  const handleApproval = (approved: boolean) => {
    setApprovalDialog({
      open: true,
      action: approved ? 'approve' : 'reject',
      comments: ''
    });
  };

  const confirmApproval = () => {
    if (!approvalDialog.action) return;
    
    if (approvalDialog.action === 'reject' && !approvalDialog.comments.trim()) {
      sonnerToast.error("Comments are required for rejection");
      return;
    }
    
    approveMutation.mutate({
      approved: approvalDialog.action === 'approve',
      comments: approvalDialog.comments
    });
    
    setApprovalDialog({ open: false, action: null, comments: '' });
  };

  const showGradeField = formData.nature_of_position === 'Staff' || formData.nature_of_position === 'STDA';
  const showStaffTypeSelection = formData.nature_of_position === 'Staff';
  const showTemporaryDuration = formData.staff_contract_type === 'Temporary';
  const showConsultantDuration = formData.nature_of_position === 'Individual Consultant';
  const showInternModality = formData.nature_of_position === 'Intern';

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
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
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
                disabled={viewMode}
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
                    disabled={viewMode}
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
                      disabled={viewMode}
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
                disabled={viewMode}
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
                  disabled={viewMode}
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
                  disabled={viewMode}
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
                  disabled={viewMode}
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

            {/* Intern Modality */}
            {showInternModality && (
              <div className="space-y-2">
                <Label>Modality *</Label>
                <RadioGroup 
                  value={formData.intern_modality} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, intern_modality: value }))}
                  disabled={viewMode}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Full time" id="fulltime" />
                    <Label htmlFor="fulltime" className="font-normal">Full time</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Part time" id="parttime" />
                    <Label htmlFor="parttime" className="font-normal">Part time</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Consultancy Level */}
            {showConsultantDuration && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Consultancy Level *</Label>
                  <ConsultancyLevelGuidance />
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-3 text-sm">International consultancy</h4>
                  <div className="space-y-2">
                    {['Band level A', 'Band level B', 'Band level C', 'Band level D'].map((level) => (
                      <div key={level} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={level}
                          checked={consultancyLevel === level}
                          onChange={() => setConsultancyLevel(level)}
                          className="rounded border-input"
                          disabled={viewMode}
                        />
                        <label htmlFor={level} className="text-sm cursor-pointer">
                          {level}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Grade */}
            {showGradeField && (
              <div className="space-y-2">
                <Label htmlFor="grade">
                  {formData.nature_of_position === 'STDA' ? 'Proposed Grade *' : 'Grade *'}
                </Label>
                <Select 
                  value={formData.grade} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                  disabled={viewMode}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="P1">P1</SelectItem>
                    <SelectItem value="P2">P2</SelectItem>
                    <SelectItem value="P3">P3</SelectItem>
                    <SelectItem value="P4">P4</SelectItem>
                    <SelectItem value="P5">P5</SelectItem>
                    <SelectItem value="D1">D1</SelectItem>
                    <SelectItem value="D2">D2</SelectItem>
                    <SelectItem value="G3">G3</SelectItem>
                    <SelectItem value="G4">G4</SelectItem>
                    <SelectItem value="G5">G5</SelectItem>
                    <SelectItem value="G6">G6</SelectItem>
                    <SelectItem value="G7">G7</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* STDA-specific fields */}
            {formData.nature_of_position === 'STDA' && (
              <>
                {/* Eligible Grades */}
                <div className="space-y-3">
                  <Label>Eligible Grades *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['P1', 'P2', 'P3', 'P4', 'P5', 'D1', 'D2', 'G3', 'G4', 'G5', 'G6', 'G7'].map((grade) => (
                      <div key={grade} className="flex items-center space-x-2">
                        <Checkbox
                          id={`eligible-${grade}`}
                          checked={formData.eligible_grades.includes(grade)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              eligible_grades: checked
                                ? [...prev.eligible_grades, grade]
                                : prev.eligible_grades.filter(g => g !== grade)
                            }));
                          }}
                          disabled={viewMode}
                        />
                        <Label htmlFor={`eligible-${grade}`} className="font-normal">
                          {grade}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assignment Duration */}
                <div className="space-y-2">
                  <Label>Assignment Duration *</Label>
                  <RadioGroup 
                    value={formData.stda_assignment_duration} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, stda_assignment_duration: value }))}
                    disabled={viewMode}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3 months" id="stda3" />
                      <Label htmlFor="stda3" className="font-normal">3 months</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="6 months" id="stda6" />
                      <Label htmlFor="stda6" className="font-normal">6 months</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Reason for the opportunity */}
                <div className="space-y-3">
                  <Label>Reason for the opportunity *</Label>
                  <div className="space-y-2">
                    {[
                      'Vacant position',
                      'Surge in workload',
                      'Project work',
                      'Support staff in their development',
                      'Replacement (extended sick leave/maternity leave)',
                      'Other'
                    ].map((reason) => (
                      <div key={reason} className="flex items-start space-x-2">
                        <Checkbox
                          id={`reason-${reason}`}
                          checked={formData.stda_reasons.includes(reason)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              stda_reasons: checked
                                ? [...prev.stda_reasons, reason]
                                : prev.stda_reasons.filter(r => r !== reason)
                            }));
                          }}
                          disabled={viewMode}
                        />
                        <Label htmlFor={`reason-${reason}`} className="font-normal">
                          {reason}
                        </Label>
                      </div>
                    ))}
                    {formData.stda_reasons.includes('Other') && (
                      <Input
                        value={formData.stda_other_reason}
                        onChange={(e) => setFormData(prev => ({ ...prev, stda_other_reason: e.target.value }))}
                        placeholder="Please specify..."
                        className="ml-6 mt-2"
                        disabled={viewMode}
                      />
                    )}
                  </div>
                </div>

                {/* Working Time */}
                <div className="space-y-3">
                  <Label>Percentage working time *</Label>
                  <RadioGroup 
                    value={formData.stda_working_time} 
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      stda_working_time: value,
                      stda_percentage: value === 'Full time' ? '' : prev.stda_percentage,
                      stda_days_per_week: value === 'Full time' ? '' : prev.stda_days_per_week,
                    }))}
                    disabled={viewMode}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Full time" id="fulltime-stda" />
                      <Label htmlFor="fulltime-stda" className="font-normal">Full time</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Part time" id="parttime-stda" />
                      <Label htmlFor="parttime-stda" className="font-normal">Part time</Label>
                    </div>
                  </RadioGroup>

                  {formData.stda_working_time === 'Part time' && (
                    <div className="ml-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={formData.stda_percentage}
                          onChange={(e) => setFormData(prev => ({ ...prev, stda_percentage: e.target.value }))}
                          placeholder="0"
                          className="w-20"
                          min="1"
                          max="99"
                          disabled={viewMode}
                        />
                        <span className="text-sm">%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={formData.stda_days_per_week}
                          onChange={(e) => setFormData(prev => ({ ...prev, stda_days_per_week: e.target.value }))}
                          placeholder="0"
                          className="w-20"
                          min="1"
                          max="5"
                          disabled={viewMode}
                        />
                        <span className="text-sm">days/week</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Targeted Start Date */}
                <div className="space-y-2">
                  <Label htmlFor="start-date">Targeted start date *</Label>
                  {viewMode && formData.stda_start_date ? (
                    <Input
                      id="start-date"
                      value={format(new Date(formData.stda_start_date), 'dd/MM/yy')}
                      disabled={true}
                    />
                  ) : (
                    <Input
                      type="date"
                      id="start-date"
                      value={formData.stda_start_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, stda_start_date: e.target.value }))}
                      disabled={viewMode}
                    />
                  )}
                </div>
              </>
            )}

            {/* Location */}
            <div className="space-y-2">
              <Label>
                Location (Duty Station) *
                {formData.grade?.startsWith('G') && (
                  <span className="text-xs text-muted-foreground ml-2">
                    (Single location only for G positions)
                  </span>
                )}
              </Label>
              <div className="space-y-2">
                {LOCATIONS.filter(location => {
                  // Only show Remote for Consultant or Intern
                  if (location === 'Remote') {
                    return formData.nature_of_position === 'Individual Consultant' || 
                           formData.nature_of_position === 'Intern';
                  }
                  return true;
                }).map((location) => {
                  const isGPosition = formData.grade?.startsWith('G');
                  
                  return (
                    <div key={location} className="flex items-center space-x-2">
                      {isGPosition ? (
                        <>
                          <input
                            type="radio"
                            id={`location-${location}`}
                            name="duty_station"
                            checked={formData.duty_station.includes(location)}
                            onChange={() => handleLocationToggle(location)}
                            className="h-4 w-4"
                            disabled={viewMode}
                          />
                          <Label htmlFor={`location-${location}`} className="font-normal">
                            {location}
                          </Label>
                        </>
                      ) : (
                        <>
                          <Checkbox
                            id={`location-${location}`}
                            checked={formData.duty_station.includes(location)}
                            onCheckedChange={() => handleLocationToggle(location)}
                            disabled={viewMode}
                          />
                          <Label htmlFor={`location-${location}`} className="font-normal">
                            {location}
                          </Label>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Remote Timezone Text Box */}
              {formData.duty_station.includes('Remote') && (
                <div className="mt-3">
                  <Label htmlFor="remote-region">Remote Timezone *</Label>
                  <Input
                    id="remote-region"
                    value={formData.remote_region}
                    onChange={(e) => setFormData(prev => ({ ...prev, remote_region: e.target.value }))}
                    placeholder="e.g., Europe, Asia-Pacific, Americas"
                    className="mt-1"
                    disabled={viewMode}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Specify the timezone for remote work
                  </p>
                </div>
              )}
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
                disabled={viewMode}
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
                disabled={viewMode}
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
                disabled={viewMode}
              />
            </div>

            {/* Internal Only */}
            <div className="space-y-2 border-t pt-4">
              <div className="flex items-start space-x-3">
                <Checkbox
                  id="internal-only"
                  checked={formData.internal_only}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, internal_only: !!checked }))}
                  disabled={viewMode}
                />
                <div className="space-y-1">
                  <Label htmlFor="internal-only" className="font-medium cursor-pointer">
                    Restrict to internal staff only
                  </Label>
            <p className="text-xs text-muted-foreground">
              This position will only be visible to UNICC staff. External candidates will not be able to see or apply for this position.
            </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            {!viewMode && (
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
            )}

            {/* Chief of Division Approval Buttons */}
            {showChiefActions && (
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  onClick={() => handleApproval(true)}
                  disabled={approveMutation.isPending}
                  size="sm"
                >
                  Approve Initial Request
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleApproval(false)}
                  disabled={approveMutation.isPending}
                  size="sm"
                >
                  Reject
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => setApprovalDialog(prev => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.action === 'approve' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.action === 'approve' 
                ? 'Add any comments about your approval (optional).'
                : 'Please provide a reason for rejection (required).'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="comments">Comments {approvalDialog.action === 'reject' && '*'}</Label>
              <Textarea
                id="comments"
                value={approvalDialog.comments}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, comments: e.target.value }))}
                placeholder="Enter your comments..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setApprovalDialog({ open: false, action: null, comments: '' })}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending}
              variant={approvalDialog.action === 'reject' ? 'destructive' : 'default'}
            >
              {approveMutation.isPending ? 'Processing...' : `Confirm ${approvalDialog.action === 'approve' ? 'Approval' : 'Rejection'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
