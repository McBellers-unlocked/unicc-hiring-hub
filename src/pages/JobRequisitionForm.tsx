import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Send, FileText, Briefcase, ChevronDown } from "lucide-react";

// Organizational structure
const DIVISIONS = {
  "CS": "Cybersecurity division (CS)",
  "DD": "Digital Delivery division (DD)", 
  "DS": "Digital Solutions Centre (DS)",
  "DO": "Director (DO)",
  "MS": "Management and Strategy (MS)",
  "OP": "Operations (OP)"
};

const DIVISION_UNITS = {
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

const requisitionSchema = z.object({
  position_title: z.string().min(1, "Position title is required"),
  grade: z.string().min(1, "Grade is required"),
  unit_section_division: z.string().min(1, "Unit/Section/Division is required"),
  duty_station: z.array(z.string()).min(1, "At least one duty station is required"),
  nature_of_position: z.string().min(1, "Nature of position is required"),
  start_date: z.string().optional(),
  positions_available: z.number().min(1, "At least 1 position required"),
  purpose_of_position: z.string().min(1, "Purpose of position is required"),
  objectives_of_programme: z.string().optional(),
  main_duties_responsibilities: z.string().min(1, "Main duties are required"),
  essential_experience: z.string().min(1, "Essential experience is required"),
  desirable_experience: z.string().optional(),
  essential_education: z.string().min(1, "Essential education is required"),
  desirable_education: z.string().optional(),
  core_competencies: z.array(z.string()).optional(),
  management_competencies: z.array(z.string()).optional(),
  leadership_competencies: z.array(z.string()).optional(),
  confirmChiefApproval: z.boolean().refine(val => val === true, {
    message: "You must confirm Chief of Division approval"
  }),
  confirmFinanceApproval: z.boolean().refine(val => val === true, {
    message: "You must confirm Finance Controller approval"
  }),
  confirmDeputyApproval: z.boolean().refine(val => val === true, {
    message: "You must confirm Deputy Director approval"
  }),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;

export default function JobRequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      position_title: "",
      grade: "",
      unit_section_division: "",
      duty_station: [],
      nature_of_position: "",
      start_date: "",
      positions_available: 1,
      purpose_of_position: "",
      objectives_of_programme: "",
      main_duties_responsibilities: "",
      essential_experience: "",
      desirable_experience: "",
      essential_education: "",
      desirable_education: "",
      core_competencies: [],
      management_competencies: [],
      leadership_competencies: [],
      confirmChiefApproval: false,
      confirmFinanceApproval: false,
      confirmDeputyApproval: false,
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchRequisition();
    }
  }, [id]);

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (data) {
        // Parse existing unit_section_division to set division and unit
        const existingUnit = data.unit_section_division || "";
        const divisionKey = Object.keys(DIVISION_UNITS).find(key => 
          DIVISION_UNITS[key].includes(existingUnit)
        );
        if (divisionKey) {
          setSelectedDivision(divisionKey);
          setSelectedUnit(existingUnit);
        }

        form.reset({
          position_title: data.position_title || "",
          grade: data.grade || "",
          unit_section_division: data.unit_section_division || "",
          duty_station: Array.isArray(data.duty_station) ? data.duty_station : (data.duty_station ? JSON.parse(data.duty_station) : []),
          nature_of_position: data.nature_of_position || "",
          start_date: data.start_date || "",
          positions_available: data.positions_available || 1,
          purpose_of_position: data.purpose_of_position || "",
          objectives_of_programme: data.objectives_of_programme || "",
          main_duties_responsibilities: data.main_duties_responsibilities || "",
          essential_experience: data.essential_experience || "",
          desirable_experience: data.desirable_experience || "",
          essential_education: data.essential_education || "",
          desirable_education: data.desirable_education || "",
          core_competencies: Array.isArray(data.core_competencies) ? data.core_competencies as string[] : [],
          management_competencies: Array.isArray(data.management_competencies) ? data.management_competencies as string[] : [],
          leadership_competencies: Array.isArray(data.leadership_competencies) ? data.leadership_competencies as string[] : [],
          confirmChiefApproval: true,
          confirmFinanceApproval: true,
          confirmDeputyApproval: true,
        });
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: RequisitionFormData, submit = false) => {
    try {
      setSaving(true);
      const formData = { ...data };
      // Remove confirmation fields before saving
      delete formData.confirmChiefApproval;
      delete formData.confirmFinanceApproval;
      delete formData.confirmDeputyApproval;

      if (id && id !== 'new') {
        // Get current requisition to check status
        const { data: currentReq, error: fetchError } = await supabase
          .from('job_requisitions')
          .select('status, hr_reviewed')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        let newStatus = 'draft';
        if (submit) {
          // Determine next status based on current workflow state
          if (currentReq.status === 'hr_amendments') {
            // If HR sent it back for amendments, next step is hiring manager confirmation
            newStatus = 'hiring_manager_review';
          } else if (currentReq.hr_reviewed && currentReq.status === 'hiring_manager_review') {
            // If HR already reviewed and manager is reconfirming, stay in manager review
            newStatus = 'hiring_manager_review';
          } else {
            // Initial submission goes to HR review
            newStatus = 'hr_review';
          }
        }

        // Update existing requisition
        const { error } = await supabase
          .from('job_requisitions')
          .update({
            ...formData,
            duty_station: JSON.stringify(formData.duty_station),
            status: newStatus,
          })
          .eq('id', id);

        if (error) throw error;
      } else {
        // Create new requisition
        const { data: newRequisition, error } = await supabase
          .from('job_requisitions')
          .insert({
            ...formData,
            duty_station: JSON.stringify(formData.duty_station),
            created_by: user?.id,
            status: submit ? 'hr_review' : 'draft',
          })
          .select()
          .single();

        if (error) throw error;

        // Generate reference number
        const { data: refData, error: refError } = await supabase
          .rpc('generate_requisition_reference');

        if (!refError && refData) {
          await supabase
            .from('job_requisitions')
            .update({ reference_number: refData })
            .eq('id', newRequisition.id);
        }

        navigate(`/requisitions/${newRequisition.id}`);
      }

      toast({
        title: "Success",
        description: submit ? "Requisition submitted successfully" : "Requisition saved as draft",
      });

      if (submit) {
        navigate('/requisitions');
      }
    } catch (error) {
      console.error('Error saving requisition:', error);
      toast({
        title: "Error",
        description: "Failed to save requisition",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generatePDF = async () => {
    if (!id || id === 'new') {
      toast({
        title: "Error",
        description: "Please save the requisition first",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-requisition-pdf', {
        body: { requisitionId: id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const convertToJob = async () => {
    if (!id || id === 'new') {
      toast({
        title: "Error",
        description: "Please save the requisition first",
        variant: "destructive",
      });
      return;
    }

    navigate(`/admin/jobs/new?from_requisition=${id}`);
  };

  if (!user || !userRoles.some(role => ['Admin', 'HR Assistant', 'Hiring Manager'].includes(role))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground">You don't have permission to create job requisitions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/requisitions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisitions
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {id === 'new' ? 'New Job Requisition' : 'Edit Job Requisition'}
          </h1>
          <p className="text-muted-foreground">Create a position description request</p>
        </div>
      </div>

      <Form {...form}>
        <form className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Position Information</CardTitle>
              <CardDescription>Basic details about the position you're requesting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="position_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position Title *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Senior ICT Analyst" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="grade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade *</FormLabel>
                      <Select onValueChange={(value) => {
                        field.onChange(value);
                        // Auto-populate minimum experience requirements
                        const experienceMap = {
                          'P1': 'At least 1 year of experience in relevant field',
                          'P2': 'At least 2 years of experience in relevant field',
                          'P3': 'At least 5 years of experience in relevant field',
                          'P4': 'At least 7 years of experience in relevant field',
                          'P5': 'At least 10 years of experience in relevant field'
                        };
                        if (experienceMap[value]) {
                          const currentExperience = form.getValues('essential_experience');
                          if (!currentExperience) {
                            form.setValue('essential_experience', experienceMap[value] + ' (minimum requirement - please expand as needed)');
                          }
                        }
                      }} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select grade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                          <SelectItem value="P3">P3</SelectItem>
                          <SelectItem value="P4">P4</SelectItem>
                          <SelectItem value="P5">P5</SelectItem>
                          <SelectItem value="D1">D1</SelectItem>
                          <SelectItem value="D2">D2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Selecting a grade will auto-populate minimum experience requirements
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="unit_section_division"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit/Section/Division *</FormLabel>
                    <div className="space-y-3">
                      <div>
                        <FormLabel className="text-sm text-muted-foreground">Division</FormLabel>
                        <Select 
                          value={selectedDivision} 
                          onValueChange={(value) => {
                            setSelectedDivision(value);
                            setSelectedUnit("");
                            field.onChange("");
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select division..." />
                          </SelectTrigger>
                          <SelectContent>
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
                          <FormLabel className="text-sm text-muted-foreground">Unit/Section</FormLabel>
                          <Select 
                            value={selectedUnit} 
                            onValueChange={(value) => {
                              setSelectedUnit(value);
                              field.onChange(value);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select unit/section..." />
                            </SelectTrigger>
                            <SelectContent>
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
                    <FormDescription>
                      Choose the division first, then select the specific unit/section within that division.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="duty_station"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duty Station *</FormLabel>
                    <FormDescription>
                      Select all applicable duty stations (multiple selection allowed)
                    </FormDescription>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {['Brindisi', 'Geneva', 'New York', 'Rome', 'Valencia'].map((station) => (
                        <div key={station} className="flex items-center space-x-2">
                          <Checkbox
                            id={station}
                            checked={field.value?.includes(station) || false}
                            onCheckedChange={(checked) => {
                              const current = field.value || [];
                              if (checked) {
                                field.onChange([...current, station]);
                              } else {
                                field.onChange(current.filter(s => s !== station));
                              }
                            }}
                          />
                          <label htmlFor={station} className="text-sm">{station}</label>
                        </div>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nature_of_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nature of Position *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select nature" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fixed Term">Fixed Term</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                        <SelectItem value="Consultant">Consultant</SelectItem>
                        <SelectItem value="Permanent">Permanent</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="positions_available"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Number of Positions *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1" 
                          {...field} 
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Position Description</CardTitle>
              <CardDescription>Detailed description of the role and responsibilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="purpose_of_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose of the Position *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe briefly the context and main purpose of the position..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      If the position is dependent on specific client/project funding, please specify it.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="objectives_of_programme"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Objectives of the Programme</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the programme objectives and how this position contributes..."
                        className="min-h-[100px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="main_duties_responsibilities"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main Duties and Responsibilities *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="List the main duties and responsibilities. Use WHAT, WHY, HOW structure for each duty..."
                        className="min-h-[200px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Structure each duty to answer: WHAT (active verb), WHY (purpose and scope), HOW (process and tasks).
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
              <CardDescription>Qualifications and experience needed for this position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="essential_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Experience *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., At least 5 years of experience in ICT systems..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desirable_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desirable Experience</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional experience that would be beneficial..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="essential_education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Education *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="e.g., Advanced university degree in Computer Science..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="desirable_education"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desirable Education</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional qualifications that would be beneficial..."
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competencies</CardTitle>
              <CardDescription>
                Select a maximum of five core, management and leadership competencies in order of priority. 
                It is recommended not to select more than 6 competencies in total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Mandatory Competencies</h4>
                <p className="text-sm text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                <ul className="text-sm space-y-1">
                  <li>• Teamwork: Develops and promotes effective relationships with colleagues and team members</li>
                  <li>• Communicating: Expresses oneself clearly in conversations and interactions with others</li>
                  <li>• Respecting and promoting individual and cultural differences</li>
                  <li>• Creating an empowering and motivating environment (for Supervisory positions only)</li>
                </ul>
              </div>

              <FormField
                control={form.control}
                name="core_competencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Core Competencies</FormLabel>
                    <FormDescription>Select up to 3 core competencies</FormDescription>
                    <div className="space-y-2">
                      {[
                        'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way',
                        'Producing results: Produces and delivers quality results',
                        'Moving forward in a changing environment: Is open to and proposes new approaches',
                        'Setting an example: Acts within UNICC/WHO professional, ethical and legal boundaries'
                      ].map((competency) => {
                        const key = competency.split(':')[0];
                        return (
                          <div key={key} className="flex items-start space-x-2">
                            <Checkbox
                              id={key}
                              checked={field.value?.includes(key) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked && current.length < 3) {
                                  field.onChange([...current, key]);
                                } else if (!checked) {
                                  field.onChange(current.filter(c => c !== key));
                                }
                              }}
                              disabled={!field.value?.includes(key) && (field.value?.length || 0) >= 3}
                            />
                            <label htmlFor={key} className="text-sm leading-relaxed">{competency}</label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="management_competencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Management Competencies</FormLabel>
                    <FormDescription>Select up to 2 management competencies</FormDescription>
                    <div className="space-y-2">
                      {[
                        'Ensuring effective use of resources: Identifies priorities in accordance with UNICC strategic directions',
                        'Building and promoting partnerships: Develops and strengthens internal and external partnerships'
                      ].map((competency) => {
                        const key = competency.split(':')[0];
                        return (
                          <div key={key} className="flex items-start space-x-2">
                            <Checkbox
                              id={key}
                              checked={field.value?.includes(key) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked && current.length < 2) {
                                  field.onChange([...current, key]);
                                } else if (!checked) {
                                  field.onChange(current.filter(c => c !== key));
                                }
                              }}
                              disabled={!field.value?.includes(key) && (field.value?.length || 0) >= 2}
                            />
                            <label htmlFor={key} className="text-sm leading-relaxed">{competency}</label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="leadership_competencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leadership Competencies</FormLabel>
                    <FormDescription>Select up to 2 leadership competencies</FormDescription>
                    <div className="space-y-2">
                      {[
                        'Driving UNICC to a successful future: Demonstrates broad-based understanding of growing ICT complexities',
                        'Promoting innovation and Organizational learning: Invigorates the Organization by building learning culture',
                        'Promoting UNICC position: Positions UNICC as a leader in ICT services'
                      ].map((competency) => {
                        const key = competency.split(':')[0];
                        return (
                          <div key={key} className="flex items-start space-x-2">
                            <Checkbox
                              id={key}
                              checked={field.value?.includes(key) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked && current.length < 2) {
                                  field.onChange([...current, key]);
                                } else if (!checked) {
                                  field.onChange(current.filter(c => c !== key));
                                }
                              }}
                              disabled={!field.value?.includes(key) && (field.value?.length || 0) >= 2}
                            />
                            <label htmlFor={key} className="text-sm leading-relaxed">{competency}</label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Approval Confirmation</CardTitle>
              <CardDescription>Confirm that you have the necessary approvals before submitting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="confirmChiefApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I confirm that I have obtained approval from the Chief of Division
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmFinanceApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I confirm that I have obtained approval from the Finance Controller
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmDeputyApproval"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I confirm that I have obtained approval from the Deputy Director
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between items-center pt-6">
            <div className="flex gap-2">
              {id && id !== 'new' && (
                <>
                  <Button type="button" variant="outline" onClick={generatePDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate PDF
                  </Button>
                  <Button type="button" variant="outline" onClick={convertToJob}>
                    <Briefcase className="h-4 w-4 mr-2" />
                    Convert to Job
                  </Button>
                </>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onSubmit(form.getValues(), false)}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <Button
                type="button"
                onClick={() => onSubmit(form.getValues(), true)}
                disabled={saving || !(form.getValues('confirmChiefApproval') && form.getValues('confirmFinanceApproval') && form.getValues('confirmDeputyApproval'))}
              >
                <Send className="h-4 w-4 mr-2" />
                Submit for Approval
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}