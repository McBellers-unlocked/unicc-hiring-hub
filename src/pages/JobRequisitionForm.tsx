import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Send, FileText, Briefcase, ChevronDown, CheckCircle2, CalendarIcon, Plus } from "lucide-react";
import MDEditor, { commands, ICommand } from '@uiw/react-md-editor';
import '@uiw/react-md-editor/markdown-editor.css';
import { MainDutiesTemplateModal } from '@/components/MainDutiesTemplateModal';
import { EssentialEducationTemplateModal } from '@/components/EssentialEducationTemplateModal';
import TurndownService from 'turndown';
import { Label } from "@/components/ui/label";

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
  nature_of_position: z.string().min(1, "Nature of position is required"),
  grade: z.string().optional(),
  eligible_grades: z.string().optional(),
  unit_section_division: z.string().min(1, "Unit/Section/Division is required"),
  duty_station: z.array(z.string()).min(1, "At least one duty station is required"),
  temporary_duration: z.string().optional(),
  intern_modality: z.string().optional(),
  start_date: z.string().min(1, "Start date is required"),
  positions_available: z.number().min(1, "At least 1 position required"),
  purpose_of_position: z.string().min(1, "Purpose of position is required"),
  objectives_of_programme: z.string().optional(),
  main_duties_responsibilities: z.string().min(1, "Main duties are required"),
  essential_experience: z.string().min(1, "Essential experience is required"),
  desirable_experience: z.string().optional(),
  essential_education: z.string().min(1, "Essential education is required"),
  essential_education_level: z.string().optional(),
  desirable_education: z.string().optional(),
  core_competencies: z.array(z.string()).optional(),
  management_competencies: z.array(z.string()).optional(),
  leadership_competencies: z.array(z.string()).optional(),
  un_language_advantage: z.boolean().optional(),
  local_language_advantage: z.boolean().optional(),
  additional_languages: z.array(z.object({
    name: z.string(),
    level: z.string()
  })).optional(),
  is_supervisor_role: z.boolean().optional(),
  confirmChiefApproval: z.boolean().refine(val => val === true, {
    message: "You must confirm Chief of Division approval"
  }),
});

type RequisitionFormData = z.infer<typeof requisitionSchema>;


// Initialize turndown service for HTML to Markdown conversion
const turndownService = new TurndownService({
  bulletListMarker: '-',
  emDelimiter: '*',
  strongDelimiter: '**',
});

// Add rule to handle list items with spacing
turndownService.addRule('listItemSpacing', {
  filter: 'li',
  replacement: function (content) {
    return '- ' + content.trim() + '\n\n';
  }
});

// Fix common markdown formatting issues
const fixMarkdownFormatting = (text: string): string => {
  if (!text) return text;

  // Fix bold formatting with spaces before closing markers
  // **text ** -> **text**
  let fixed = text.replace(/(\*\*[^*]+?)\s+(\*\*)/g, "$1$2");

  // Ensure exactly one blank line between bullet items
  // "- a\n- b" or "- a\n\n\n- b" -> "- a\n\n- b"
  fixed = fixed.replace(/(^\s*-\s+.*?)(\n+)(?=\s*-\s+)/gm, "$1\n\n");

  return fixed;
};

// Handle paste events to convert HTML to Markdown
const handlePaste = (event: React.ClipboardEvent, onChange: (value: string) => void, currentValue: string) => {
  const clipboardData = event.clipboardData;
  const htmlData = clipboardData.getData('text/html');
  
  if (htmlData) {
    event.preventDefault();
    const markdown = turndownService.turndown(htmlData);
    
    // Get current selection/cursor position from the textarea
    const textarea = event.target as HTMLTextAreaElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    // Insert markdown at cursor position
    const newValue = currentValue.substring(0, start) + markdown + currentValue.substring(end);
    onChange(fixMarkdownFormatting(newValue));
  }
};

// Custom bullet list command that removes empty lines and adds spacing
const customUnorderedListCommand: ICommand = {
  ...commands.unorderedListCommand,
  execute: (state, api) => {
    const { selection, text } = state;

    // If nothing is selected, insert a single bullet at the cursor without selecting it
    if (selection.start === selection.end) {
      const before = text.substring(0, selection.start);
      const after = text.substring(selection.end);

      // Respect existing spacing: if we're in the middle of a line, just insert "- "
      const insert = "- ";
      api.replaceSelection(insert);

      const cursor = selection.start + insert.length;
      if (typeof api.setSelectionRange === "function") {
        api.setSelectionRange({ start: cursor, end: cursor });
      }
      return;
    }

    const selectedText = text.substring(selection.start, selection.end);

    // Remove empty lines and format with bullets
    const lines = selectedText.split('\n');
    const formattedLines = lines.reduce<string[]>((acc, line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        // Skip empty lines; spacing comes from the join("\n\n") below
        return acc;
      }
      if (trimmed.startsWith('- ')) {
        acc.push(trimmed);
      } else if (trimmed.startsWith('-')) {
        acc.push(`- ${trimmed.slice(1).trimStart()}`);
      } else {
        acc.push(`- ${trimmed}`);
      }
      return acc;
    }, []);

    if (!formattedLines.length) return;

    // Add blank line between each bullet point for spacing
    api.replaceSelection(formattedLines.join('\n\n'));
  }
};

export default function JobRequisitionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedDivision, setSelectedDivision] = useState<string>("");
  const [selectedUnit, setSelectedUnit] = useState<string>("");
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [currentRequisition, setCurrentRequisition] = useState<any>(null);
  const [showTemporaryDuration, setShowTemporaryDuration] = useState<boolean>(false);
  const [showGrade, setShowGrade] = useState<boolean>(false);
  const [showEligibleGrades, setShowEligibleGrades] = useState<boolean>(false);
  const [remoteTimezone, setRemoteTimezone] = useState<string>("");
  const [consultancyLevel, setConsultancyLevel] = useState<string>("");
  const [initialNatureOfPosition, setInitialNatureOfPosition] = useState<string>("");
  const [selectedCoreCompetencies, setSelectedCoreCompetencies] = useState<string[]>([]);
  const [selectedManagementCompetencies, setSelectedManagementCompetencies] = useState<string[]>([]);
  const [selectedLeadershipCompetencies, setSelectedLeadershipCompetencies] = useState<string[]>([]);
  const [additionalLanguages, setAdditionalLanguages] = useState<Array<{ name: string; level: string }>>([]);
  const [isSupervisorRole, setIsSupervisorRole] = useState<boolean>(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState<boolean>(false);
  const [showEssentialEducationModal, setShowEssentialEducationModal] = useState(false);

  const form = useForm<RequisitionFormData>({
    resolver: zodResolver(requisitionSchema),
    defaultValues: {
      position_title: "",
      nature_of_position: "",
      grade: "",
      eligible_grades: "",
      unit_section_division: "",
      duty_station: [],
      temporary_duration: "",
      intern_modality: "",
      start_date: "",
      positions_available: 1,
      purpose_of_position: "",
      objectives_of_programme: "UNICC provides the digital foundations that support the digital transformation and future of the UN system and other international organizations.",
      main_duties_responsibilities: "",
      essential_experience: "",
      desirable_experience: "",
      essential_education: "",
      essential_education_level: "",
      desirable_education: "",
      core_competencies: [],
      management_competencies: [],
      leadership_competencies: [],
      un_language_advantage: false,
      local_language_advantage: false,
      additional_languages: [],
      is_supervisor_role: false,
      confirmChiefApproval: false,
    },
  });

  useEffect(() => {
    if (id && id !== 'new') {
      fetchRequisition();
    }
  }, [id]);

  // Auto-check language advantages based on grade
  const watchedGrade = form.watch('grade');
  useEffect(() => {
    if (watchedGrade) {
      if (watchedGrade.startsWith('P') || watchedGrade.startsWith('D')) {
        form.setValue('un_language_advantage', true);
      } else if (watchedGrade.startsWith('G')) {
        form.setValue('local_language_advantage', true);
      }
    }
  }, [watchedGrade, form]);

  const watchedNatureOfPosition = form.watch('nature_of_position');
  const watchedDutyStations = form.watch('duty_station');
  const showInternModality = watchedNatureOfPosition === 'Intern';
  const showRemoteTimezone =
    (watchedNatureOfPosition === 'Intern' || watchedNatureOfPosition === 'Individual Consultant') &&
    Array.isArray(watchedDutyStations) &&
    watchedDutyStations.includes('Remote');

  // Update main duties template when nature of position changes
  useEffect(() => {
    const currentMainDuties = form.getValues('main_duties_responsibilities');
    const currentEssentialExperience = form.getValues('essential_experience');
    const currentEssentialEducation = form.getValues('essential_education');
    
    // Only update if the field is empty or contains the default template
    const isDefaultTemplate = !currentMainDuties || 
      currentMainDuties.includes('[SUPERVISOR TITLE]') || 
      currentMainDuties.includes('[title of the supervisor]');
    
    if (isDefaultTemplate) {
      if (watchedNatureOfPosition === 'Intern') {
        form.setValue('main_duties_responsibilities', 
          "The incumbent(s) will work [number of days] days per week for [number of hours] hours under the supervision of the [title of the supervisor], and will receive the guidance and support necessary to carry out the responsibilities outlined below.\n\n"
        );
      } else if (watchedNatureOfPosition && watchedNatureOfPosition !== 'Intern') {
        form.setValue('main_duties_responsibilities', 
          "The incumbent will work under the direct supervision and guidance of the [SUPERVISOR TITLE] within the [DIVISION NAME] and in close collaboration with the [SECTION NAME] team members. The incumbent will perform the following duties:\n\n"
        );
      }
    }

    // Update essential experience for interns
    const isDefaultExperience = !currentEssentialExperience || 
      currentEssentialExperience.includes('At least') ||
      currentEssentialExperience.includes('Applicants are not required to have professional work experience');
    
    if (isDefaultExperience) {
      if (watchedNatureOfPosition === 'Intern') {
        form.setValue('essential_experience', 
          "Applicants are not required to have professional work experience to participate in the UNICC's internship program, but applicants should have the following functional and technical skills:\n\n"
        );
      } else if (watchedNatureOfPosition && watchedNatureOfPosition !== 'Intern') {
        form.setValue('essential_experience', '');
      }
    }

    // Update essential education for interns
    const isDefaultEducation = !currentEssentialEducation || 
      currentEssentialEducation.includes('Be currently enrolled in a University programme');
    
    if (isDefaultEducation) {
      if (watchedNatureOfPosition === 'Intern') {
        form.setValue('essential_education', 
          "Be currently enrolled in a University programme (final year of a bachelor's degree, master's degree or equivalent) specializing in areas that are relevant to UNICC's line of business such as [areas of expertise].\n\nApplicants that have graduated in the last 6 months in one of the areas of expertise described above will also be considered."
        );
      } else if (watchedNatureOfPosition && watchedNatureOfPosition !== 'Intern') {
        form.setValue('essential_education', '');
      }
    }
  }, [watchedNatureOfPosition, form]);

  const addLanguage = () => {
    const newLanguage = { name: '', level: '' };
    const updatedLanguages = [...additionalLanguages, newLanguage];
    setAdditionalLanguages(updatedLanguages);
    form.setValue('additional_languages', updatedLanguages);
  };

  const updateLanguage = (index: number, field: 'name' | 'level', value: string) => {
    const updatedLanguages = [...additionalLanguages];
    updatedLanguages[index] = { ...updatedLanguages[index], [field]: value };
    setAdditionalLanguages(updatedLanguages);
    form.setValue('additional_languages', updatedLanguages);
  };

  const removeLanguage = (index: number) => {
    const updatedLanguages = additionalLanguages.filter((_, i) => i !== index);
    setAdditionalLanguages(updatedLanguages);
    form.setValue('additional_languages', updatedLanguages);
  };

  const fetchRequisition = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      setCurrentRequisition(data);

      if (data) {
        // Check access control: Hiring managers need initial request approval
        // BUT only if the requisition went through the initial request workflow
        const isHiringManager = userRoles.includes('Hiring Manager') && 
                                !userRoles.includes('Admin') && 
                                !userRoles.includes('HR Assistant') && 
                                !userRoles.includes('Chief of HR');
        
        // Block access only if initial request was submitted but not yet approved
        const needsApproval = data.initial_request_submitted === true && !data.initial_request_approved;
        
        if (isHiringManager && needsApproval) {
          toast({
            title: "Access Denied",
            description: "Initial request must be approved before creating full position description",
            variant: "destructive",
          });
          navigate('/requisitions');
          return;
        }

        // Parse existing unit_section_division to set division and unit
        const existingUnit = data.unit_section_division || "";
        const divisionKey = Object.keys(DIVISION_UNITS).find(key => 
          DIVISION_UNITS[key].includes(existingUnit)
        );
        if (divisionKey) {
          setSelectedDivision(divisionKey);
          setSelectedUnit(existingUnit);
        }

        // Set temporary duration visibility
        if (data.nature_of_position === "Temporary") {
          setShowTemporaryDuration(true);
        }
        
        // Set grade visibility
        if (data.nature_of_position && data.nature_of_position !== "Individual Consultant" && data.nature_of_position !== "Intern") {
          setShowGrade(true);
        }
        
        // Set eligible grades visibility for STDA
        if (data.nature_of_position === "STDA") {
          setShowEligibleGrades(true);
        }
        
        // Set competencies selections
        setSelectedCoreCompetencies(Array.isArray(data.core_competencies) ? data.core_competencies as string[] : []);
        setSelectedManagementCompetencies(Array.isArray(data.management_competencies) ? data.management_competencies as string[] : []);
        setSelectedLeadershipCompetencies(Array.isArray(data.leadership_competencies) ? data.leadership_competencies as string[] : []);

        // Load remote timezone from comments if available
        const comments = data.comments as any;
        if (comments && typeof comments === 'object') {
          if (comments.remote_region) {
            setRemoteTimezone(comments.remote_region);
          }
          if (comments.consultancy_level) {
            setConsultancyLevel(comments.consultancy_level);
          }
          if (comments.nature_of_position) {
            setInitialNatureOfPosition(comments.nature_of_position);
          }
        }

        // Set appropriate main duties template based on nature of position
        let defaultMainDuties = "";
        let defaultEssentialExperience = "";
        let defaultEssentialEducation = "";
        
        if (!data.main_duties_responsibilities) {
          if (data.nature_of_position === 'Intern') {
            defaultMainDuties = "The incumbent(s) will work [number of days] days per week for [number of hours] hours under the supervision of the [title of the supervisor], and will receive the guidance and support necessary to carry out the responsibilities outlined below.\n\n";
          } else {
            defaultMainDuties = "The incumbent will work under the direct supervision and guidance of the [SUPERVISOR TITLE] within the [DIVISION NAME] and in close collaboration with the [SECTION NAME] team members. The incumbent will perform the following duties:\n\n";
          }
        }

        if (!data.essential_experience && data.nature_of_position === 'Intern') {
          defaultEssentialExperience = "Applicants are not required to have professional work experience to participate in the UNICC's internship program, but applicants should have the following functional and technical skills:\n\n";
        }

        if (!data.essential_education && data.nature_of_position === 'Intern') {
          defaultEssentialEducation = "Be currently enrolled in a University programme (final year of a bachelor's degree, master's degree or equivalent) specializing in areas that are relevant to UNICC's line of business such as [areas of expertise].\n\nApplicants that have graduated in the last 6 months in one of the areas of expertise described above will also be considered.";
        }

        form.reset({
          position_title: data.position_title || "",
          nature_of_position: data.nature_of_position || "",
          grade: data.grade || "",
          eligible_grades: (data as any).eligible_grades || "",
          unit_section_division: data.unit_section_division || "",
          duty_station: Array.isArray(data.duty_station) ? data.duty_station : (data.duty_station ? JSON.parse(data.duty_station) : []),
          temporary_duration: (data as any).temporary_duration || "",
          intern_modality: data.intern_modality || "",
          start_date: data.start_date || "",
          positions_available: data.positions_available || 1,
          purpose_of_position: data.purpose_of_position || data.brief_outline || "",
          objectives_of_programme: data.objectives_of_programme || "UNICC provides the digital foundations that support the digital transformation and future of the UN system and other international organizations.",
          main_duties_responsibilities: data.main_duties_responsibilities || defaultMainDuties,
          essential_experience: data.essential_experience || defaultEssentialExperience,
          desirable_experience: data.desirable_experience || "",
          essential_education: data.essential_education || defaultEssentialEducation,
          essential_education_level: (data as any).essential_education_level || "",
          desirable_education: data.desirable_education || "",
          core_competencies: Array.isArray(data.core_competencies) ? data.core_competencies as string[] : [],
          management_competencies: Array.isArray(data.management_competencies) ? data.management_competencies as string[] : [],
          leadership_competencies: Array.isArray(data.leadership_competencies) ? data.leadership_competencies as string[] : [],
          confirmChiefApproval: true,
        });
        
        // Set language requirements separately
        form.setValue("un_language_advantage", (data.language_requirements as any)?.un_language_advantage || false);
        form.setValue("local_language_advantage", (data.language_requirements as any)?.local_language_advantage || false);
        
        // Set additional languages
        const languages = (data.language_requirements as any)?.additional_languages || [];
        setAdditionalLanguages(languages);
        form.setValue("additional_languages", languages);
      }
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch position description data",
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

      const existingComments = (currentRequisition?.comments as any) || {};
      const updatedComments = { ...existingComments };

      if (remoteTimezone && remoteTimezone.trim()) {
        updatedComments.remote_region = remoteTimezone.trim();
      }

      let currentRequisitionId = id;

      if (id && id !== 'new') {
        // Get current requisition to check status
        const { data: currentReq, error: fetchError } = await supabase
          .from('job_requisitions')
          .select('status, hr_reviewed, reference_number')
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
        const { un_language_advantage, local_language_advantage, additional_languages, is_supervisor_role, ...cleanFormData } = formData as any;
        const updatedLanguageRequirements = {
          english: "Expert knowledge is required",
          un_language_advantage: un_language_advantage || false,
          local_language_advantage: local_language_advantage || false,
          additional_languages: additional_languages || []
        };
        
        const { error } = await supabase
          .from('job_requisitions')
          .update({
            ...cleanFormData,
            duty_station: JSON.stringify(formData.duty_station),
            language_requirements: updatedLanguageRequirements,
            comments: updatedComments,
            status: newStatus,
          })
          .eq('id', id);

        if (error) throw error;

        // Generate reference number when submitting full PD for HR review (if not already generated)
        if (submit && newStatus === 'hr_review' && !currentReq.reference_number) {
          const { data: refData, error: refError } = await supabase
            .rpc('generate_position_description_reference', {
              p_nature_of_position: formData.nature_of_position,
              p_duty_station: JSON.stringify(formData.duty_station)
            });

          if (!refError && refData) {
            await supabase
              .from('job_requisitions')
              .update({ reference_number: refData })
              .eq('id', id);
          }
        }

        currentRequisitionId = id;
      } else {
        // Create new requisition
        const { un_language_advantage, local_language_advantage, additional_languages, is_supervisor_role, ...cleanFormData } = formData as any;
        const updatedLanguageRequirements = {
          english: "Expert knowledge is required",
          un_language_advantage: un_language_advantage || false,
          local_language_advantage: local_language_advantage || false,
          additional_languages: additional_languages || []
        };
        
        const { data: newRequisition, error } = await supabase
          .from('job_requisitions')
          .insert({
            ...cleanFormData,
            duty_station: JSON.stringify(formData.duty_station),
            language_requirements: updatedLanguageRequirements,
            comments: updatedComments,
            created_by: user?.id,
            status: submit ? 'hr_review' : 'draft',
          })
          .select()
          .single();

        if (error) throw error;

        currentRequisitionId = newRequisition.id;

        // Generate reference number
        const { data: refData, error: refError } = await supabase
          .rpc('generate_position_description_reference', {
            p_nature_of_position: formData.nature_of_position,
            p_duty_station: JSON.stringify(formData.duty_station)
          });

        if (!refError && refData) {
          await supabase
            .from('job_requisitions')
            .update({ reference_number: refData })
            .eq('id', newRequisition.id);
        }

        navigate(`/requisitions/${newRequisition.id}`);
      }

      // Send email notification if submitting for approval
      if (submit) {
        try {
          await supabase.functions.invoke('send-requisition-notification', {
            body: {
              requisitionId: currentRequisitionId,
              title: formData.position_title,
              requestedBy: user?.email || 'Unknown',
              referenceNumber: '', // Will be generated after submission
              natureOfPosition: formData.nature_of_position,
              unitSection: formData.unit_section_division
            }
          });
        } catch (emailError) {
          console.error('Error sending notification email:', emailError);
          // Don't fail the submission if email fails
        }
      }

      toast({
        title: "Success",
        description: submit ? "Position description submitted successfully" : "Position description saved as draft",
      });

      if (submit) {
        navigate('/requisitions');
      }
    } catch (error) {
      console.error('Error saving requisition:', error);
      toast({
        title: "Error",
        description: "Failed to save position description",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptChanges = async () => {
    try {
      setSaving(true);
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          status: 'hiring_manager_review'
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Changes accepted. HR can now send for chief approval.",
      });

      // Refresh the requisition data
      fetchRequisition();
    } catch (error) {
      console.error('Error accepting changes:', error);
      toast({
        title: "Error",
        description: "Failed to accept changes",
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
        description: "Please save the position description first",
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
        description: "Please save the position description first",
        variant: "destructive",
      });
      return;
    }

    navigate(`/admin/jobs/new?from_requisition=${id}`);
  };

  if (!user || !userRoles.some(role => ['Admin', 'HR Assistant', 'Chief of HR', 'Hiring Manager'].includes(role))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground">You don't have permission to create position descriptions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if hiring manager trying to create new PD without approval
  const isHiringManagerOnly = userRoles.includes('Hiring Manager') && 
                               !userRoles.includes('Admin') && 
                               !userRoles.includes('HR Assistant') && 
                               !userRoles.includes('Chief of HR');
  
  if (isHiringManagerOnly && (!id || id === 'new')) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">Initial Request Required</p>
              <p className="text-muted-foreground mb-4">
                You need to submit an initial request first and get approval before creating a full position description.
              </p>
              <Button onClick={() => navigate('/requisitions/initial/new')}>
                Create Initial Request
              </Button>
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
          Back to PD Pipeline
        </Button>
        <div>
          <h1 className="text-3xl font-bold">
            {id === 'new' ? 'New Position Description' : 'Edit Position Description'}
          </h1>
          <p className="text-muted-foreground">Create a position description</p>
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
                name="nature_of_position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nature of Position *</FormLabel>
                    <Select onValueChange={(value) => {
                      field.onChange(value);
                      // Show/hide grade based on nature
                      if (value === "Individual Consultant" || value === "Intern") {
                        setShowGrade(false);
                        form.setValue('grade', '');
                      } else {
                        setShowGrade(true);
                      }
                      // Show/hide STDA eligible grades
                      setShowEligibleGrades(value === "STDA");
                      // Show/hide temporary duration
                      setShowTemporaryDuration(value === "Temporary");
                      if (value !== "Temporary") {
                        form.setValue('temporary_duration', '');
                      }
                    }} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger disabled={!!initialNatureOfPosition}>
                          <SelectValue placeholder="Select nature of position" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Fixed term">Fixed term</SelectItem>
                        <SelectItem value="Temporary">Temporary</SelectItem>
                        <SelectItem value="Individual Consultant">Individual Consultant</SelectItem>
                        <SelectItem value="STDA">STDA</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                      </SelectContent>
                    </Select>
                    {initialNatureOfPosition && (
                      <p className="text-xs text-muted-foreground">
                        This was set in the initial request and cannot be changed.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {showTemporaryDuration && (
                <FormField
                  control={form.control}
                  name="temporary_duration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duration</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="6 months">6 months</SelectItem>
                          <SelectItem value="12 months">12 months</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {showGrade && (
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
                          <SelectItem value="G3">G3</SelectItem>
                          <SelectItem value="G4">G4</SelectItem>
                          <SelectItem value="G5">G5</SelectItem>
                          <SelectItem value="G6">G6</SelectItem>
                          <SelectItem value="G7">G7</SelectItem>
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
              )}

              {showEligibleGrades && (
                <FormField
                  control={form.control}
                  name="eligible_grades"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Eligible Grades</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select eligible grades" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="G3">G3</SelectItem>
                          <SelectItem value="G4">G4</SelectItem>
                          <SelectItem value="G5">G5</SelectItem>
                          <SelectItem value="G6">G6</SelectItem>
                          <SelectItem value="G7">G7</SelectItem>
                          <SelectItem value="P1">P1</SelectItem>
                          <SelectItem value="P2">P2</SelectItem>
                          <SelectItem value="P3">P3</SelectItem>
                          <SelectItem value="P4">P4</SelectItem>
                          <SelectItem value="P5">P5</SelectItem>
                          <SelectItem value="D1">D1</SelectItem>
                          <SelectItem value="D2">D2</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

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
                    <FormDescription>
                      Choose the division first, then select the specific unit/section within that division.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {consultancyLevel && watchedNatureOfPosition === 'Individual Consultant' && (
                <div className="space-y-2">
                  <Label>Consultancy Band Level</Label>
                  <Input
                    value={consultancyLevel}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    This band level was set in the initial request and cannot be changed here.
                  </p>
                </div>
              )}

              <FormField
                control={form.control}
                name="duty_station"
                render={({ field }) => {
                  const natureOfPosition = form.watch("nature_of_position");
                  const baseStations = ['Brindisi', 'Geneva', 'New York', 'Rome', 'Valencia'];
                  const availableStations = (natureOfPosition === 'Intern' || natureOfPosition === 'Individual Consultant') 
                    ? [...baseStations, 'Remote'] 
                    : baseStations;
                  
                  return (
                    <FormItem>
                      <FormLabel>Duty Station *</FormLabel>
                      <FormDescription>
                        Select all applicable duty stations (multiple selection allowed)
                      </FormDescription>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {availableStations.map((station) => (
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
                  );
                }}
              />

              {showRemoteTimezone && (
                <div className="mt-4 space-y-2">
                  <Label>Remote timezone</Label>
                  <Input
                    placeholder="e.g., Europe / Central European Time"
                    value={remoteTimezone}
                    onChange={(e) => setRemoteTimezone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Specify the primary timezone for remote work.
                  </p>
                </div>
              )}

              {showInternModality && (
                <FormField
                  control={form.control}
                  name="intern_modality"
                  render={({ field }) => (
                    <FormItem className="mt-4">
                      <FormLabel>Modality</FormLabel>
                      <FormDescription>
                        Select whether the internship is full time or part time.
                      </FormDescription>
                      <FormControl>
                        <RadioGroup
                          className="flex flex-wrap gap-4 mt-2"
                          onValueChange={field.onChange}
                          value={field.value || ""}
                        >
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="Full time" />
                            </FormControl>
                            <FormLabel className="font-normal">Full time</FormLabel>
                          </FormItem>
                          <FormItem className="flex items-center space-x-2">
                            <FormControl>
                              <RadioGroupItem value="Part time" />
                            </FormControl>
                            <FormLabel className="font-normal">Part time</FormLabel>
                          </FormItem>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="start_date"
                  render={({ field, fieldState }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground",
                                fieldState.error && "border-destructive focus-visible:ring-destructive"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => {
                              if (date) {
                                // Format date in local timezone to avoid timezone shifts
                                const year = date.getFullYear();
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const day = String(date.getDate()).padStart(2, '0');
                                field.onChange(`${year}-${month}-${day}`);
                              } else {
                                field.onChange('');
                              }
                              setIsDatePickerOpen(false);
                            }}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
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
                    <div className="flex items-center justify-between">
                      <FormLabel>Main Duties and Responsibilities *</FormLabel>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowTemplateModal(true)}
                        className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Fill Template
                      </Button>
                    </div>
                    <FormControl>
                      <div className="relative">
                        <MDEditor
                          value={field.value}
                          onChange={(val) => field.onChange(fixMarkdownFormatting(val || ""))}
                          preview="edit"
                          hideToolbar={false}
                          data-color-mode="light"
                          className="[&_.w-md-editor-text]:placeholder-shown:bg-muted/20"
                          visibleDragbar={false}
                          textareaProps={{
                            onPaste: (e) => handlePaste(e, field.onChange, field.value)
                          }}
                          commands={[
                            commands.group([commands.title1, commands.title2, commands.title3], {
                              name: 'title',
                              groupName: 'title',
                              buttonProps: { 'aria-label': 'Insert title'}
                            }),
                            commands.divider,
                            commands.bold,
                            commands.italic,
                            commands.divider,
                            customUnorderedListCommand,
                            commands.orderedListCommand,
                            commands.divider,
                            commands.link,
                          ]}
                        />
                        {field.value.includes('[SUPERVISOR TITLE]') && (
                          <div className="absolute top-2 right-2 z-10">
                            <div className="flex gap-1 text-xs">
                              <span className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                                Template blanks detected
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormDescription>
                      Use the "Fill Template" button to easily fill in supervisor, division, and section details. 
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
              <div className={watchedNatureOfPosition === 'Intern' ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
                <FormField
                  control={form.control}
                  name="essential_experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essential Experience *</FormLabel>
                      <FormControl>
                        <MDEditor
                          value={field.value}
                          onChange={(val) => field.onChange(fixMarkdownFormatting(val || ""))}
                          preview="edit"
                          hideToolbar={false}
                          data-color-mode="light"
                           textareaProps={{
                             onPaste: (e) => handlePaste(e, field.onChange, field.value)
                           }}
                          commands={[
                            commands.group([commands.title1, commands.title2, commands.title3], {
                              name: 'title',
                              groupName: 'title',
                              buttonProps: { 'aria-label': 'Insert title'}
                            }),
                            commands.divider,
                            commands.bold,
                            commands.italic,
                            commands.divider,
                            customUnorderedListCommand,
                            commands.orderedListCommand,
                            commands.divider,
                            commands.link,
                          ]}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Tip: Remove empty lines before clicking the bullet button
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedNatureOfPosition !== 'Intern' && (
                  <FormField
                    control={form.control}
                    name="desirable_experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desirable Experience</FormLabel>
                        <FormControl>
                          <MDEditor
                            value={field.value}
                            onChange={(val) => field.onChange(fixMarkdownFormatting(val || ""))}
                            preview="edit"
                            hideToolbar={false}
                            data-color-mode="light"
                            textareaProps={{
                              onPaste: (e) => handlePaste(e, field.onChange, field.value)
                            }}
                            commands={[
                              commands.group([commands.title1, commands.title2, commands.title3], {
                                name: 'title',
                                groupName: 'title',
                                buttonProps: { 'aria-label': 'Insert title'}
                              }),
                              commands.divider,
                              commands.bold,
                              commands.italic,
                              commands.divider,
                              customUnorderedListCommand,
                              commands.orderedListCommand,
                              commands.divider,
                              commands.link,
                            ]}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Tip: Remove empty lines before clicking the bullet button
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <div className={watchedNatureOfPosition === 'Intern' ? 'space-y-4' : 'grid grid-cols-2 gap-4'}>
                {watchedNatureOfPosition !== 'Intern' && (
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name="essential_education_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Essential Education Level *</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="bg-background">
                                <SelectValue placeholder="Select required education level" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Secondary">Secondary Education</SelectItem>
                              <SelectItem value="First Level University">First Level University Degree (Bachelor's or equivalent)</SelectItem>
                              <SelectItem value="Advanced University">Advanced University Degree (Master's, PhD, or equivalent)</SelectItem>
                              <SelectItem value="Professional">Professional Certification</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-xs">
                            This structured requirement will automatically check candidate eligibility
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="essential_education"
                  render={({ field }) => (
                    <FormItem className={watchedNatureOfPosition === 'Intern' ? '' : 'col-span-1'}>
                      <div className="flex items-center justify-between mb-2">
                        <FormLabel>Essential Education Details *</FormLabel>
                        {watchedNatureOfPosition === 'Intern' && field.value?.includes('[areas of expertise]') && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setShowEssentialEducationModal(true)}
                            className="bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary"
                          >
                            <FileText className="h-3 w-3 mr-1" />
                            Fill Template
                          </Button>
                        )}
                      </div>
                      <FormControl>
                        <MDEditor
                          value={field.value}
                          onChange={(val) => field.onChange(fixMarkdownFormatting(val || ""))}
                          preview="edit"
                          hideToolbar={false}
                          data-color-mode="light"
                          textareaProps={{
                            onPaste: (e) => handlePaste(e, field.onChange, field.value)
                          }}
                          commands={[
                            commands.group([commands.title1, commands.title2, commands.title3], {
                              name: 'title',
                              groupName: 'title',
                              buttonProps: { 'aria-label': 'Insert title'}
                            }),
                            commands.divider,
                            commands.bold,
                            commands.italic,
                            commands.divider,
                            customUnorderedListCommand,
                            commands.orderedListCommand,
                            commands.divider,
                            commands.link,
                          ]}
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Provide additional details about the required education (field of study, specialization, etc.)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedNatureOfPosition !== 'Intern' && (
                  <FormField
                    control={form.control}
                    name="desirable_education"
                    render={({ field }) => (
                      <FormItem className="col-span-1">
                        <FormLabel>Desirable Education</FormLabel>
                        <FormControl>
                          <MDEditor
                            value={field.value}
                            onChange={(val) => field.onChange(fixMarkdownFormatting(val || ""))}
                            preview="edit"
                            hideToolbar={false}
                            data-color-mode="light"
                            textareaProps={{
                              onPaste: (e) => handlePaste(e, field.onChange, field.value)
                            }}
                            commands={[
                              commands.group([commands.title1, commands.title2, commands.title3], {
                                name: 'title',
                                groupName: 'title',
                                buttonProps: { 'aria-label': 'Insert title'}
                              }),
                              commands.divider,
                              commands.bold,
                              commands.italic,
                              commands.divider,
                              customUnorderedListCommand,
                              commands.orderedListCommand,
                              commands.divider,
                              commands.link,
                            ]}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Tip: Remove empty lines before clicking the bullet button
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Language Requirements</CardTitle>
              <CardDescription>Specify language requirements for this position</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Required Language Skills</h4>
                  <div className="p-3 bg-muted/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="text-sm font-medium">English: Expert knowledge is required</span>
                    </div>
                  </div>
                </div>
                
                {/* Conditional Language Advantages */}
                {form.watch('grade') && (form.watch('grade')?.startsWith('P') || form.watch('grade')?.startsWith('D')) && (
                  <div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="un_language_advantage"
                        checked={form.watch('un_language_advantage') || false}
                        onCheckedChange={(checked) => form.setValue('un_language_advantage', !!checked)}
                      />
                      <label htmlFor="un_language_advantage" className="text-sm">
                        Knowledge of another UN language would be an advantage
                      </label>
                    </div>
                  </div>
                )}
                
                 {form.watch('grade') && form.watch('grade')?.startsWith('G') && (
                   <div>
                     <div className="flex items-center space-x-2">
                       <Checkbox
                         id="local_language_advantage"
                         checked={form.watch('local_language_advantage') || false}
                         onCheckedChange={(checked) => form.setValue('local_language_advantage', !!checked)}
                       />
                       <label htmlFor="local_language_advantage" className="text-sm">
                         Knowledge of the local language of the Duty Station would be an advantage
                       </label>
                     </div>
                   </div>
                 )}
                
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Additional Language Skills</h4>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addLanguage}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Language
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {additionalLanguages.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-4 border border-dashed border-muted rounded-lg">
                        Click "Add Language" to specify additional language requirements
                      </div>
                    )}
                    
                    {additionalLanguages.map((language, index) => (
                      <div key={index} className="space-y-2 p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Input
                            placeholder="Language name (e.g., French, Spanish, Arabic)"
                            value={language.name}
                            onChange={(e) => updateLanguage(index, 'name', e.target.value)}
                            className="flex-1 mr-2"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLanguage(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            Remove
                          </Button>
                        </div>
                        
                        {language.name.trim() && (
                          <div className="flex items-center space-x-4 mt-2">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}_beginner`}
                                checked={language.level === "beginner"}
                                onCheckedChange={(checked) => updateLanguage(index, 'level', checked ? "beginner" : "")}
                              />
                              <label htmlFor={`${index}_beginner`} className="text-sm">Beginner</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}_intermediate`}
                                checked={language.level === "intermediate"}
                                onCheckedChange={(checked) => updateLanguage(index, 'level', checked ? "intermediate" : "")}
                              />
                              <label htmlFor={`${index}_intermediate`} className="text-sm">Intermediate</label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id={`${index}_expert`}
                                checked={language.level === "expert"}
                                onCheckedChange={(checked) => updateLanguage(index, 'level', checked ? "expert" : "")}
                              />
                              <label htmlFor={`${index}_expert`} className="text-sm">Expert</label>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competencies</CardTitle>
              <CardDescription>
                Select competencies for this position. Mandatory competencies ({isSupervisorRole ? '4' : '3'}) plus your selection (3) = {isSupervisorRole ? '7' : '6'} total.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {watchedNatureOfPosition !== 'Intern' && (
                <div>
                  <h4 className="font-medium mb-3">Role Type</h4>
                  <FormField
                    control={form.control}
                    name="is_supervisor_role"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              setIsSupervisorRole(!!checked);
                            }}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>
                            This is a supervisor role
                          </FormLabel>
                          <FormDescription>
                            Check this if the position involves supervising staff members
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              )}

              <div>
                <h4 className="font-medium mb-3">Mandatory Competencies</h4>
                <p className="text-sm text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                <ul className="text-sm space-y-1">
                  {watchedNatureOfPosition === 'Intern' ? (
                    <>
                      <li>• <span className="font-bold">Teamwork:</span> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                      <li>• <span className="font-bold">Communicating:</span> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                      <li>• <span className="font-bold">Respecting and promoting individual and cultural differences:</span> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                      <li>• <span className="font-bold">Overall attitude at work:</span> Maintains integrity and takes a clear ethical approach and stance; demonstrates commitment to the Organization's mandate and promotes the values of the Organization in daily work and behaviour; is accountable for work carried out in line with own role and responsibilities; is respectful towards, and trusted by, colleagues and counterparts.</li>
                    </>
                  ) : (
                    <>
                      <li>• <span className="font-bold">Teamwork:</span> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                      <li>• <span className="font-bold">Communicating:</span> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                      <li>• <span className="font-bold">Respecting and promoting individual and cultural differences:</span> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                      {(form.watch('is_supervisor_role') || isSupervisorRole) && (
                        <li>• <span className="font-bold">Creating an empowering and motivating environment:</span> Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                      )}
                    </>
                  )}
                </ul>
              </div>

              <FormField
                control={form.control}
                name="core_competencies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Core Competencies</FormLabel>
                    <FormDescription>
                      {watchedNatureOfPosition === 'Intern' 
                        ? `Select core competencies (remaining slots: ${Math.max(0, 2 - selectedCoreCompetencies.length)})`
                        : `Select core competencies (remaining slots: ${Math.max(0, 3 - (selectedCoreCompetencies.length + selectedManagementCompetencies.length + selectedLeadershipCompetencies.length))})`
                      }
                    </FormDescription>
                    <div className="space-y-2">
                      {[
                        'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                        'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                        'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                        'Setting an example: Acts within UNICC\'s / WHO\'s professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.'
                      ].map((competency) => {
                        const key = competency.split(':')[0];
                        const totalSelected = watchedNatureOfPosition === 'Intern' 
                          ? selectedCoreCompetencies.length 
                          : (selectedCoreCompetencies.length + selectedManagementCompetencies.length + selectedLeadershipCompetencies.length);
                        const maxSelectable = watchedNatureOfPosition === 'Intern' ? 2 : 3;
                        const isDisabled = !field.value?.includes(key) && totalSelected >= maxSelectable;
                        return (
                          <div key={key} className="flex items-start space-x-2">
                            <Checkbox
                              id={key}
                              checked={field.value?.includes(key) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  const newValue = [...current, key];
                                  field.onChange(newValue);
                                  setSelectedCoreCompetencies(newValue);
                                } else {
                                  const newValue = current.filter(c => c !== key);
                                  field.onChange(newValue);
                                  setSelectedCoreCompetencies(newValue);
                                }
                              }}
                              disabled={isDisabled}
                              className={isDisabled ? "opacity-50" : ""}
                            />
                            <label htmlFor={key} className={`text-sm leading-relaxed ${isDisabled ? "text-muted-foreground" : ""}`}>
                              <span className="font-bold">{competency.split(':')[0]}:</span> {competency.split(':').slice(1).join(':').trim()}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedNatureOfPosition !== 'Intern' && (
                <FormField
                  control={form.control}
                  name="management_competencies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Management Competencies</FormLabel>
                      <FormDescription>Select management competencies</FormDescription>
                      <div className="space-y-2">
                        {[
                          'Ensuring effective use of resources: Identifies priorities in accordance with UNICC\'s strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.',
                          'Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.'
                        ].map((competency) => {
                          const key = competency.split(':')[0];
                          const totalSelected = (selectedCoreCompetencies.length + selectedManagementCompetencies.length + selectedLeadershipCompetencies.length);
                          const maxSelectable = 3;
                          const isDisabled = !field.value?.includes(key) && totalSelected >= maxSelectable;
                          return (
                            <div key={key} className="flex items-start space-x-2">
                              <Checkbox
                                id={key}
                                checked={field.value?.includes(key) || false}
                                onCheckedChange={(checked) => {
                                  const current = field.value || [];
                                  if (checked) {
                                    const newValue = [...current, key];
                                    field.onChange(newValue);
                                    setSelectedManagementCompetencies(newValue);
                                  } else {
                                    const newValue = current.filter(c => c !== key);
                                    field.onChange(newValue);
                                    setSelectedManagementCompetencies(newValue);
                                  }
                                }}
                                disabled={isDisabled}
                                className={isDisabled ? "opacity-50" : ""}
                              />
                              <label htmlFor={key} className={`text-sm leading-relaxed ${isDisabled ? "text-muted-foreground" : ""}`}>
                                <span className="font-bold">{competency.split(':')[0]}:</span> {competency.split(':').slice(1).join(':').trim()}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {watchedNatureOfPosition !== 'Intern' && (
                <FormField
                  control={form.control}
                  name="leadership_competencies"
                  render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leadership Competencies</FormLabel>
                    <FormDescription>Select leadership competencies</FormDescription>
                    <div className="space-y-2">
                      {[
                        'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                        'Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.',
                        'Promoting UNICC\'s position: Positions UNICC as a leader in ICT services. Gains support for UNICC\'s mission. Coordinates plans and communicates in a way that attracts support from intended audiences.'
                      ].map((competency) => {
                        const key = competency.split(':')[0];
                        const totalSelected = (selectedCoreCompetencies.length + selectedManagementCompetencies.length + selectedLeadershipCompetencies.length);
                        const maxSelectable = 3;
                        const isDisabled = !field.value?.includes(key) && totalSelected >= maxSelectable;
                        return (
                          <div key={key} className="flex items-start space-x-2">
                            <Checkbox
                              id={key}
                              checked={field.value?.includes(key) || false}
                              onCheckedChange={(checked) => {
                                const current = field.value || [];
                                if (checked) {
                                  const newValue = [...current, key];
                                  field.onChange(newValue);
                                  setSelectedLeadershipCompetencies(newValue);
                                } else {
                                  const newValue = current.filter(c => c !== key);
                                  field.onChange(newValue);
                                  setSelectedLeadershipCompetencies(newValue);
                                }
                              }}
                              disabled={isDisabled}
                              className={isDisabled ? "opacity-50" : ""}
                            />
                            <label htmlFor={key} className={`text-sm leading-relaxed ${isDisabled ? "text-muted-foreground" : ""}`}>
                              <span className="font-bold">{competency.split(':')[0]}:</span> {competency.split(':').slice(1).join(':').trim()}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              )}
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
              {/* Show Accept Changes button if status is hr_amendments */}
              {currentRequisition?.status === 'hr_amendments' && (
                <Button
                  type="button"
                  onClick={handleAcceptChanges}
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Accept Changes
                </Button>
              )}
              
              <Button
                type="button"
                variant="outline"
                onClick={async () => {
                  const isValid = await form.trigger();
                  if (!isValid) {
                    const errors = form.formState.errors;
                    const missingFields = Object.entries(errors)
                      .map(([field, error]) => {
                        if (field === 'start_date') return 'Start Date';
                        if (field === 'position_title') return 'Position Title';
                        if (field === 'nature_of_position') return 'Nature of Position';
                        if (field === 'unit_section_division') return 'Unit/Section/Division';
                        if (field === 'duty_station') return 'Duty Station';
                        if (field === 'purpose_of_position') return 'Purpose of Position';
                        if (field === 'main_duties_responsibilities') return 'Main Duties';
                        if (field === 'essential_experience') return 'Essential Experience';
                        if (field === 'essential_education') return 'Essential Education';
                        if (field === 'essential_education_level') return 'Essential Education Level';
                        return field;
                      })
                      .filter(Boolean);
                    
                    toast({
                      title: "Required Fields Missing",
                      description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
                      variant: "destructive",
                    });
                    return;
                  }
                  onSubmit(form.getValues(), false);
                }}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              
              {/* Only show Submit for Approval if not in hr_amendments status */}
              {currentRequisition?.status !== 'hr_amendments' && (
                <Button
                  type="button"
                  onClick={async () => {
                    const isValid = await form.trigger();
                    if (!isValid) {
                      const errors = form.formState.errors;
                      const missingFields = Object.entries(errors)
                        .map(([field, error]) => {
                          if (field === 'start_date') return 'Start Date';
                          if (field === 'position_title') return 'Position Title';
                          if (field === 'nature_of_position') return 'Nature of Position';
                          if (field === 'unit_section_division') return 'Unit/Section/Division';
                          if (field === 'duty_station') return 'Duty Station';
                          if (field === 'purpose_of_position') return 'Purpose of Position';
                          if (field === 'main_duties_responsibilities') return 'Main Duties';
                          if (field === 'essential_experience') return 'Essential Experience';
                          if (field === 'essential_education') return 'Essential Education';
                          if (field === 'essential_education_level') return 'Essential Education Level';
                          return field;
                        })
                        .filter(Boolean);
                      
                      toast({
                        title: "Required Fields Missing",
                        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
                        variant: "destructive",
                      });
                      return;
                    }
                    onSubmit(form.getValues(), true);
                  }}
                  disabled={saving || !form.getValues('confirmChiefApproval')}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit for Approval
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
      
      <MainDutiesTemplateModal
        open={showTemplateModal}
        onClose={() => setShowTemplateModal(false)}
        onApply={(filledTemplate) => {
          form.setValue('main_duties_responsibilities', filledTemplate);
        }}
        currentContent={form.getValues('main_duties_responsibilities')}
        natureOfPosition={watchedNatureOfPosition}
      />
      
      <EssentialEducationTemplateModal
        open={showEssentialEducationModal}
        onClose={() => setShowEssentialEducationModal(false)}
        onApply={(areasOfExpertise) => {
          const currentValue = form.getValues('essential_education');
          const updatedValue = currentValue.replace('[areas of expertise]', areasOfExpertise);
          form.setValue('essential_education', updatedValue);
        }}
      />
    </div>
  );
}