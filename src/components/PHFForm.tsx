import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { AlertCircle, CalendarIcon, Plus, Trash2, Save, FileText, ChevronLeft, ChevronRight, User, Accessibility, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import MDEditor from '@uiw/react-md-editor';
import PHFLanguageSection from './PHFLanguageSection';
import PHFEducationSection from './PHFEducationSection';
import PHFWorkExperienceSection from './PHFWorkExperienceSection';

// Complete schema for UNICC PHF requirements
const phfSchema = z.object({
  // Personal Details
  personalDetails: z.object({
    familyName: z.string().min(1, 'Family name is required'),
    firstNames: z.string().min(1, 'First/other names are required'),
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']),
    maidenName: z.string().optional(),
    sex: z.enum(['Male', 'Female']).refine((val) => val !== undefined, {
      message: 'Sex selection is required',
    }),
    dateOfBirth: z.union([z.date(), z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Date must be in DD/MM/YYYY format')]),
    placeOfBirth: z.string().min(1, 'Place of birth is required'),
    countryOfBirth: z.string().min(1, 'Country of birth is required'),
    presentNationality: z.string().min(1, 'Present nationality is required'),
    nationalityChanged: z.boolean(),
    nationalityChangeDetails: z.string().optional(),
    maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed', 'Separated']),
    permanentAddress: z.string().min(1, 'Permanent address is required'),
    presentAddress: z.string().min(1, 'Present address is required'),
    telephone: z.string().min(1, 'Telephone is required'),
    email: z.string().email('Valid email is required'),
    usGreenCard: z.boolean(),
    usGreenCardDetails: z.string().optional(),
    photoUrl: z.string().optional(),
  }),

  // Dependants & Relatives
  dependants: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    dateOfBirth: z.date(),
  })),
  relatives: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    organization: z.string().min(1, 'Organization is required'),
    position: z.string().min(1, 'Position is required'),
  })),

  // Work Preferences
  workPreferences: z.object({
    preferred_locations: z.string().optional(),
    remote_work_preference: z.string().optional(),
    travel_availability: z.string().optional(),
    contract_type_preference: z.string().optional(),
    notice_period: z.string().optional(),
  }),

  // Language Proficiency
  languages: z.object({
    un_languages: z.record(z.string()).optional(),
    other_languages: z.array(z.object({
      language: z.string(),
      proficiency: z.string()
    })).optional()
  }),

  // Education
  education: z.array(z.object({
    from_month: z.string().min(1, 'From month is required'),
    from_year: z.string().min(4, 'From year is required'),
    to_month: z.string().optional(),
    to_year: z.string().optional(),
    is_present: z.boolean(),
    institution_name: z.string().min(1, 'Institution name is required'),
    institution_place: z.string(),
    institution_country: z.string(),
    degree_type: z.enum([
      'High School Diploma',
      'Secondary Education Certificate',
      'A-Levels',
      'International Baccalaureate',
      'Bachelor\'s Degree',
      'Bachelor\'s Degree (Honors)',
      'Master\'s Degree',
      'PhD',
      'Post-Doctoral',
      'Professional Certificate',
      'Technical Diploma',
      'Professional License',
      'Other'
    ]),
    degree_or_certificate_title: z.string(),
    main_course_of_study: z.string(),
    is_completed: z.boolean(),
    certificate_url: z.string().optional(),
  })).min(1, 'At least one education entry is required'),

  // Employment Record
  employment: z.array(z.object({
    period_from_month: z.string().min(1, 'From month is required'),
    period_from_year: z.string().min(4, 'From year is required'),
    period_to_month: z.string(),
    period_to_year: z.string(),
    is_present: z.boolean(),
    exact_title_of_post: z.string().min(1, 'Post title is required'),
    type_of_business: z.string(),
    is_un_system_post: z.boolean(),
    un_grade: z.string().optional(),
    annual_income_starting: z.number().optional(),
    annual_income_most_recent: z.number().optional(),
    allowances_or_benefits: z.string(),
    employees_supervised_number: z.number().optional(),
    employees_supervised_type: z.string(),
    employer_name: z.string().min(1, 'Employer name is required'),
    employer_address: z.string(),
    supervisor_name: z.string(),
    supervisor_title: z.string(),
    supervisor_phone: z.string(),
    supervisor_email: z.string().email().optional().or(z.literal('')),
    reason_for_change: z.string(),
    duties_and_responsibilities: z.string().min(1, 'Duties are required'),
    attestations: z.array(z.string()).optional(),
  }).refine((data) => {
    // For current positions, period_to fields are not required
    if (data.is_present) {
      return true;
    }
    // For past positions, both period_to fields are required
    return data.period_to_month.length > 0 && data.period_to_year.length >= 4;
  }, {
    message: "End date is required for past positions",
    path: ["period_to_year"],
  })).min(1, 'At least one employment entry is required'),

  unemploymentPeriods: z.array(z.object({
    from_month: z.string(),
    from_year: z.string(),
    to_month: z.string(),
    to_year: z.string(),
    reason: z.string().optional(),
  })),

  // Additional Information
  additionalInformation: z.object({
    additional_skills: z.string(),
    fellowships: z.array(z.object({
      place: z.string(),
      date_from: z.string(),
      date_to: z.string(),
      duration_text: z.string(),
      awarded_by: z.string(),
    })),
    law_violations_disclosed: z.boolean(),
    law_violations_details: z.string().optional(),
  }),

  // Consent to Send
  consentToSend: z.object({
    consent_other_un_orgs: z.boolean(),
    consent_national_government: z.boolean(),
    consent_other: z.boolean(),
    consent_other_text: z.string().optional(),
  }),

  // Mobility/Medical
  mobilityMedical: z.object({
    mobility_medical_reservations: z.string(),
    assessment_accommodations_needed: z.boolean(),
    accommodation_extended_time: z.boolean().optional(),
    accommodation_alternative_format: z.boolean().optional(),
    accommodation_accessible_location: z.boolean().optional(),
    accommodation_interpreter: z.boolean().optional(),
    accommodation_breaks: z.boolean().optional(),
    accommodation_alternative_interview: z.boolean().optional(),
    accommodation_assistive_technology: z.boolean().optional(),
    accommodation_other: z.boolean().optional(),
    accommodation_details: z.string().optional(),
    accommodation_contact_preference: z.string().optional(),
  }),

  // References
  references: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    full_address: z.string().min(1, 'Full address is required'),
    occupation_title: z.string().min(1, 'Occupation is required'),
  })).length(3, 'Exactly 3 references are required'),

  // Employer Contact & Status
  employerContact: z.object({
    objection_to_contact_present_employer: z.boolean(),
    presently_in_government_employ: z.boolean(),
  }),

  // Availability
  availability: z.object({
    availability_date: z.date().optional(),
    notice_period_days: z.number().optional(),
    availability_mode: z.enum(['date', 'notice_period']),
  }),

  // Motivation Letter
  motivationLetter: z.object({
    motivation_letter_content: z.string()
      .min(1, 'Motivation letter is required')
      .max(4000, 'Motivation letter must not exceed 4,000 characters'),
  }),

  // Certification & Signature
  certification: z.object({
    certify_true_complete_correct: z.boolean().refine((val) => val === true, {
      message: 'You must certify that the information is true and complete',
    }),
    signature_type: z.enum(['typed', 'drawn']),
    typed_full_name: z.string().optional(),
    signature_image_url: z.string().optional(),
    signature_place: z.string().min(1, 'Signature place is required'),
    signature_date: z.date(),
    signed_at_utc: z.date().optional(),
  }),
});

export type PHFFormData = z.infer<typeof phfSchema>;

interface PHFFormProps {
  initialData?: Partial<PHFFormData>;
  onSave: (data: any, isComplete: boolean) => Promise<void>;
  onUploadPhoto?: (file: File) => Promise<string>;
  killerQuestions?: any[];
  killerAnswers?: Record<string, any>;
  onKillerAnswerChange?: (questionId: string, answer: any) => void;
  disqualified?: boolean;
  completedTabs?: Set<number>;
  onTabCompleted?: (tabIndex: number) => void;
  initialTab?: number;
  candidateProfile?: any;
}

const SECTIONS = [
  'Eligibility Questions',
  'Personal Details',
  'Dependants & Relatives',
  'Work Preferences', 
  'Language Proficiency',
  'Education',
  'Employment Record', 
  'Additional Information',
  'Consent to Send',
  'Mobility/Medical',
  'References',
  'Employer Contact & Status',
  'Availability',
  'Motivation Letter',
  'Certification & Signature'
];

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const COUNTRIES = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria', 'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan', 'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cabo Verde', 'Cambodia', 'Cameroon', 'Canada', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica', 'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Democratic Republic of the Congo', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'Ecuador', 'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Eswatini', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon', 'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana', 'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel', 'Italy', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kuwait', 'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius', 'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia', 'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'North Macedonia', 'Norway', 'Oman', 'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal', 'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe', 'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia', 'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Sweden', 'Switzerland', 'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Timor-Leste', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey', 'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu', 'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

const DEGREE_TYPES = [
  { value: 'High School Diploma', label: 'High School Diploma' },
  { value: 'Secondary Education Certificate', label: 'Secondary Education Certificate' },
  { value: 'A-Levels', label: 'A-Levels' },
  { value: 'International Baccalaureate', label: 'International Baccalaureate' },
  { value: 'Bachelor\'s Degree', label: 'Bachelor\'s Degree' },
  { value: 'Bachelor\'s Degree (Honors)', label: 'Bachelor\'s Degree (Honors)' },
  { value: 'Master\'s Degree', label: 'Master\'s Degree' },
  { value: 'PhD', label: 'PhD' },
  { value: 'Post-Doctoral', label: 'Post-Doctoral' },
  { value: 'Professional Certificate', label: 'Professional Certificate' },
  { value: 'Technical Diploma', label: 'Technical Diploma' },
  { value: 'Professional License', label: 'Professional License' },
  { value: 'Other', label: 'Other' },
];

const CERTIFICATION_TEXT = `I certify that the statements made by me in answer to the foregoing questions are true, complete and correct to the best of my knowledge and belief. I understand that any false statement may lead to the rejection of my application or cancellation of any appointment offered to me.

I agree that if I am appointed, my appointment will be subject to the Personnel Rules and Regulations of the organization and to such medical examination as the organization may require. I also agree that, if any statements made by me prove to be false, incomplete or incorrect, I may be dismissed.

I acknowledge that my application and all supporting documents will be held in confidence by the organization. I understand that if I am not selected for this particular post, my application may be considered for other suitable vacancies during the following 12 months.

I confirm that I have read and agree to the Privacy Notice for Applicants and understand how my personal data will be processed.`;

export function PHFForm({ initialData, onSave, onUploadPhoto, killerQuestions = [], killerAnswers = {}, onKillerAnswerChange, disqualified = false, completedTabs = new Set([0]), onTabCompleted, initialTab = 0, candidateProfile }: PHFFormProps) {
  const [currentSection, setCurrentSection] = useState(initialTab);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editedWorkExperiences, setEditedWorkExperiences] = useState<any[]>([]);
  const [applicationSkills, setApplicationSkills] = useState<string[]>([]);
  const [applicationCertifications, setApplicationCertifications] = useState<any[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [isAddCertDialogOpen, setIsAddCertDialogOpen] = useState(false);
  const [newCertification, setNewCertification] = useState({
    name: '',
    issuing_organization: '',
    issue_date: null as Date | null,
    expiry_date: null as Date | null,
    credential_id: '',
    description: ''
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  // Update current section when initialTab changes (e.g., when loading saved progress)
  useEffect(() => {
    setCurrentSection(initialTab);
  }, [initialTab]);

  // Validation status helper function
  const getSectionValidationStatus = (sectionIndex: number) => {
    const formValues = form.getValues();
    const formErrors = form.formState.errors;
    
    switch (sectionIndex) {
      case 0: // Eligibility Questions
        // Check killer question answers
        if (killerQuestions.length > 0) {
          const hasUnanswered = killerQuestions.some(q => 
            killerAnswers[q.id] === undefined || killerAnswers[q.id] === null || killerAnswers[q.id] === ''
          );
          return hasUnanswered || disqualified ? 'warning' : 'valid';
        }
        return 'valid';
        
      case 1: // Personal Details
        const personalRequired = ['familyName', 'firstNames', 'sex', 'dateOfBirth', 'placeOfBirth', 'countryOfBirth', 'presentNationality', 'maritalStatus', 'permanentAddress', 'presentAddress', 'telephone', 'email'];
        const personalMissing = personalRequired.some(field => 
          !formValues.personalDetails?.[field] || formValues.personalDetails?.[field] === ''
        );
        return personalMissing || formErrors.personalDetails ? 'warning' : 'valid';
        
      case 2: // Dependants & Relatives
        return 'valid'; // Optional section
        
      case 3: // Work Preferences
        return 'valid'; // Optional section
        
      case 4: // Language Proficiency
        return 'valid'; // Optional section
        
      case 5: // Education
        // Check if we have education data either in form or from candidate profile
        const hasEducationInForm = formValues.education && formValues.education.length > 0;
        const hasEducationInProfile = candidateProfile?.education && candidateProfile.education.length > 0;
        
        if (!hasEducationInForm && !hasEducationInProfile) return 'warning';
        
        // If we have form data, validate it; otherwise check profile data
        if (hasEducationInForm) {
          const educationIncomplete = formValues.education.some(edu => {
            const eduAny = edu as any;
            const hasInstitution = edu.institution_name || eduAny.institution;
            const hasDegree = edu.degree_type || eduAny.degree;
            const hasDate = (edu.from_month && edu.from_year) || eduAny.startDate;
            return !hasInstitution || !hasDegree || !hasDate;
          });
          return educationIncomplete || formErrors.education ? 'warning' : 'valid';
        }
        
        // If only profile data exists, validate that
        if (hasEducationInProfile) {
          const profileEducationIncomplete = candidateProfile.education.some((edu: any) => 
            !edu.institution || !edu.degree || !edu.startDate
          );
          return profileEducationIncomplete ? 'warning' : 'valid';
        }
        
        return 'valid';
        
      case 6: // Employment Record
        // Check if we have employment data either in form or from candidate profile
        const hasEmploymentInForm = formValues.employment && formValues.employment.length > 0;
        const hasEmploymentInProfile = candidateProfile?.work_experience && candidateProfile.work_experience.length > 0;
        const hasPHFEmploymentInProfile = candidateProfile?.phf_work_experience && candidateProfile.phf_work_experience.length > 0;
        
        // Debug logging to see what employment data we have
        console.log('PHF Employment Validation Debug:', {
          hasEmploymentInForm,
          hasEmploymentInProfile,
          hasPHFEmploymentInProfile,
          formEmployment: formValues.employment,
          profileWorkExp: candidateProfile?.work_experience,
          profilePHFWorkExp: candidateProfile?.phf_work_experience
        });
        
        if (!hasEmploymentInForm && !hasEmploymentInProfile && !hasPHFEmploymentInProfile) return 'warning';
        
        // If we have form data, validate it; otherwise check profile data
        if (hasEmploymentInForm) {
          const employmentIncomplete = formValues.employment.some(emp => {
            const empAny = emp as any;
            const hasEmployer = emp.employer_name || empAny.company;
            const hasTitle = emp.exact_title_of_post || empAny.position;
            
            // For dates, check if it's a current position
            const isCurrentPosition = emp.is_present === true || empAny.isCurrent === true;
            const hasStartDate = (emp.period_from_month && emp.period_from_year) || empAny.startDate;
            const hasEndDate = isCurrentPosition || (emp.period_to_month && emp.period_to_year) || empAny.endDate;
            const hasValidDate = hasStartDate && hasEndDate;
            
            const hasDuties = emp.duties_and_responsibilities || empAny.description;
            
            console.log('Employment validation for:', emp.employer_name || empAny.company, {
              hasEmployer,
              hasTitle,
              hasStartDate,
              isCurrentPosition,
              hasEndDate,
              hasValidDate,
              hasDuties,
              incomplete: !hasEmployer || !hasTitle || !hasValidDate || !hasDuties
            });
            
            return !hasEmployer || !hasTitle || !hasValidDate || !hasDuties;
          });
          
          console.log('Final employment validation result:', {
            employmentIncomplete,
            formErrors: formErrors.employment,
            finalResult: employmentIncomplete || formErrors.employment ? 'warning' : 'valid'
          });
          
          return employmentIncomplete || formErrors.employment ? 'warning' : 'valid';
        }
        
        // If only profile data exists, validate that
        if (hasEmploymentInProfile) {
          const profileEmploymentIncomplete = candidateProfile.work_experience.some((emp: any) => 
            !emp.company || !emp.position || !emp.startDate || !emp.description
          );
          return profileEmploymentIncomplete ? 'warning' : 'valid';
        }
        
        // If only PHF employment data exists, validate that
        if (hasPHFEmploymentInProfile) {
          const phfEmploymentIncomplete = candidateProfile.phf_work_experience.some((emp: any) => 
            !emp.employer_name || !emp.exact_title_of_post || !emp.period_from_year || !emp.duties_and_responsibilities
          );
          return phfEmploymentIncomplete ? 'warning' : 'valid';
        }
        
        return 'valid';
        
      case 7: // Additional Information
        return 'valid'; // Optional section
        
      case 8: // Consent to Send
        return 'valid'; // Optional section
        
      case 9: // Mobility/Medical
        return 'valid'; // Optional section
        
      case 10: // References
        const hasThreeRefs = formValues.references && formValues.references.length === 3;
        if (!hasThreeRefs) return 'warning';
        const refsIncomplete = formValues.references.some(ref => 
          !ref.name || !ref.full_address || !ref.occupation_title
        );
        return refsIncomplete || formErrors.references ? 'warning' : 'valid';
        
      case 11: // Employer Contact & Status
        const employerContactMissing = formValues.employerContact?.objection_to_contact_present_employer === undefined || 
                                      formValues.employerContact?.presently_in_government_employ === undefined;
        return employerContactMissing || formErrors.employerContact ? 'warning' : 'valid';
        
      case 12: // Availability
        return 'valid'; // Optional section
        
      case 13: // Motivation Letter
        const motivationMissing = !formValues.motivationLetter?.motivation_letter_content || 
                                 formValues.motivationLetter?.motivation_letter_content?.trim() === '';
        return motivationMissing || formErrors.motivationLetter ? 'warning' : 'valid';
        
      case 14: // Certification & Signature
        const certificationMissing = !formValues.certification?.certify_true_complete_correct || 
                                    !formValues.certification?.signature_place ||
                                    !formValues.certification?.signature_date;
        return certificationMissing || formErrors.certification ? 'warning' : 'valid';
        
      default:
        return 'valid';
    }
  };

  const form = useForm<PHFFormData>({
    resolver: zodResolver(phfSchema),
    defaultValues: {
      personalDetails: {
        familyName: initialData?.personalDetails?.familyName || '',
        firstNames: initialData?.personalDetails?.firstNames || '',
        title: initialData?.personalDetails?.title || 'Mr',
        maidenName: initialData?.personalDetails?.maidenName || '',
        sex: initialData?.personalDetails?.sex || 'Male',
        dateOfBirth: initialData?.personalDetails?.dateOfBirth ? 
          (typeof initialData.personalDetails.dateOfBirth === 'string' ? 
            new Date(initialData.personalDetails.dateOfBirth) : 
            initialData.personalDetails.dateOfBirth) : 
          new Date(),
        placeOfBirth: initialData?.personalDetails?.placeOfBirth || '',
        countryOfBirth: initialData?.personalDetails?.countryOfBirth || '',
        presentNationality: initialData?.personalDetails?.presentNationality || '',
        nationalityChanged: initialData?.personalDetails?.nationalityChanged || false,
        nationalityChangeDetails: initialData?.personalDetails?.nationalityChangeDetails || '',
        maritalStatus: initialData?.personalDetails?.maritalStatus || 'Single',
        permanentAddress: initialData?.personalDetails?.permanentAddress || '',
        presentAddress: initialData?.personalDetails?.presentAddress || '',
        telephone: initialData?.personalDetails?.telephone || '',
        email: initialData?.personalDetails?.email || '',
        usGreenCard: initialData?.personalDetails?.usGreenCard || false,
        usGreenCardDetails: initialData?.personalDetails?.usGreenCardDetails || '',
        photoUrl: initialData?.personalDetails?.photoUrl || '',
      },
      dependants: initialData?.dependants || [],
      relatives: initialData?.relatives || [],
      workPreferences: {
        preferred_locations: initialData?.workPreferences?.preferred_locations || '',
        remote_work_preference: initialData?.workPreferences?.remote_work_preference || '',
        travel_availability: initialData?.workPreferences?.travel_availability || '',
        contract_type_preference: initialData?.workPreferences?.contract_type_preference || '',
        notice_period: initialData?.workPreferences?.notice_period || '',
      },
      languages: initialData?.languages || { un_languages: {}, other_languages: [] },
      education: initialData?.education || [],
      employment: initialData?.employment || [],
      unemploymentPeriods: initialData?.unemploymentPeriods || [],
      additionalInformation: {
        additional_skills: initialData?.additionalInformation?.additional_skills || '',
        fellowships: initialData?.additionalInformation?.fellowships || [],
        law_violations_disclosed: initialData?.additionalInformation?.law_violations_disclosed || false,
        law_violations_details: initialData?.additionalInformation?.law_violations_details || '',
      },
      consentToSend: {
        consent_other_un_orgs: initialData?.consentToSend?.consent_other_un_orgs || false,
        consent_national_government: initialData?.consentToSend?.consent_national_government || false,
        consent_other: initialData?.consentToSend?.consent_other || false,
        consent_other_text: initialData?.consentToSend?.consent_other_text || '',
      },
      mobilityMedical: {
        mobility_medical_reservations: initialData?.mobilityMedical?.mobility_medical_reservations || '',
        assessment_accommodations_needed: initialData?.mobilityMedical?.assessment_accommodations_needed || false,
        accommodation_extended_time: initialData?.mobilityMedical?.accommodation_extended_time || false,
        accommodation_alternative_format: initialData?.mobilityMedical?.accommodation_alternative_format || false,
        accommodation_accessible_location: initialData?.mobilityMedical?.accommodation_accessible_location || false,
        accommodation_interpreter: initialData?.mobilityMedical?.accommodation_interpreter || false,
        accommodation_breaks: initialData?.mobilityMedical?.accommodation_breaks || false,
        accommodation_alternative_interview: initialData?.mobilityMedical?.accommodation_alternative_interview || false,
        accommodation_assistive_technology: initialData?.mobilityMedical?.accommodation_assistive_technology || false,
        accommodation_other: initialData?.mobilityMedical?.accommodation_other || false,
        accommodation_details: initialData?.mobilityMedical?.accommodation_details || '',
        accommodation_contact_preference: initialData?.mobilityMedical?.accommodation_contact_preference || '',
      },
      references: initialData?.references || [
        { name: '', full_address: '', occupation_title: '' },
        { name: '', full_address: '', occupation_title: '' },
        { name: '', full_address: '', occupation_title: '' }
      ],
      employerContact: {
        objection_to_contact_present_employer: initialData?.employerContact?.objection_to_contact_present_employer || false,
        presently_in_government_employ: initialData?.employerContact?.presently_in_government_employ || false,
      },
      availability: {
        availability_date: initialData?.availability?.availability_date,
        notice_period_days: initialData?.availability?.notice_period_days,
        availability_mode: initialData?.availability?.availability_mode || 'date',
      },
      motivationLetter: {
        motivation_letter_content: initialData?.motivationLetter?.motivation_letter_content || '',
      },
      certification: {
        certify_true_complete_correct: initialData?.certification?.certify_true_complete_correct || false,
        signature_type: initialData?.certification?.signature_type || 'typed',
        typed_full_name: initialData?.certification?.typed_full_name || '',
        signature_image_url: initialData?.certification?.signature_image_url || '',
        signature_place: initialData?.certification?.signature_place || '',
        signature_date: initialData?.certification?.signature_date || new Date(),
        signed_at_utc: initialData?.certification?.signed_at_utc,
      },
    },
  });

  // Update form values when initialData changes
  useEffect(() => {
    if (initialData && Object.keys(initialData).length > 0) {
      console.log('Resetting form with initialData:', initialData);
      form.reset(initialData);
    }
  }, [initialData, form]);

  const { fields: dependantFields, append: appendDependant, remove: removeDependant } = useFieldArray({
    control: form.control,
    name: 'dependants',
  });

  const { fields: relativeFields, append: appendRelative, remove: removeRelative } = useFieldArray({
    control: form.control,
    name: 'relatives',
  });


  const { fields: educationFields, append: appendEducation, remove: removeEducation } = useFieldArray({
    control: form.control,
    name: 'education',
  });

  const { fields: employmentFields, append: appendEmployment, remove: removeEmployment } = useFieldArray({
    control: form.control,
    name: 'employment',
  });

  const { fields: unemploymentFields, append: appendUnemployment, remove: removeUnemployment } = useFieldArray({
    control: form.control,
    name: 'unemploymentPeriods',
  });

  const { fields: fellowshipFields, append: appendFellowship, remove: removeFellowship } = useFieldArray({
    control: form.control,
    name: 'additionalInformation.fellowships',
  });

  const handleSubmit = async (data: PHFFormData) => {
    console.log("🚀 PHF handleSubmit function called!");
    console.log("PHF Submit - Submitting PHF data:", data);
    console.log("PHF Submit - Candidate Profile:", candidateProfile);
    console.log("PHF Submit - Employment data checks:");
    console.log("- data.employment.length:", data.employment.length);
    console.log("- candidateProfile?.work_experience?.length:", candidateProfile?.work_experience?.length);
    console.log("- candidateProfile?.phf_work_experience?.length:", candidateProfile?.phf_work_experience?.length);
    
    setIsSubmitting(true);
    try {
      // Validate mandatory fields before submission
      const mandatoryErrors = [];
      
      if (!data.personalDetails.familyName) mandatoryErrors.push("Family Name");
      if (!data.personalDetails.firstNames) mandatoryErrors.push("First Names");
      if (!data.personalDetails.email) mandatoryErrors.push("Email");
      if (!data.personalDetails.telephone) mandatoryErrors.push("Phone");
      if (!data.personalDetails.presentAddress) mandatoryErrors.push("Present Address");
      if (data.education.length === 0 && (!candidateProfile?.education || candidateProfile.education.length === 0)) mandatoryErrors.push("At least one Education entry");
      
      // Check if employment data exists in any location
      const hasFormEmployment = data.employment.length > 0;
      const hasProfileWorkExperience = candidateProfile?.work_experience && candidateProfile.work_experience.length > 0;
      const hasPHFWorkExperience = candidateProfile?.phf_work_experience && candidateProfile.phf_work_experience.length > 0;
      const hasAnyEmployment = hasFormEmployment || hasProfileWorkExperience || hasPHFWorkExperience;
      
      console.log("PHF Submit - Employment validation:");
      console.log("- hasFormEmployment:", hasFormEmployment);
      console.log("- hasProfileWorkExperience:", hasProfileWorkExperience);
      console.log("- hasPHFWorkExperience:", hasPHFWorkExperience);
      console.log("- hasAnyEmployment:", hasAnyEmployment);
      
      if (!hasAnyEmployment) mandatoryErrors.push("At least one Employment entry");
      if (!data.motivationLetter.motivation_letter_content) mandatoryErrors.push("Motivation Letter");
      if (!data.certification.certify_true_complete_correct) mandatoryErrors.push("Certification checkbox");
      
      if (mandatoryErrors.length > 0) {
        console.log('PHF Submit - Mandatory errors found:', mandatoryErrors);
        toast({
          title: 'Missing Required Fields',
          description: `Please complete: ${mandatoryErrors.join(', ')}`,
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }
      
      await onSave(data, true);
      toast({
        title: 'PHF Submitted',
        description: 'Your Personal History Form has been submitted successfully.',
      });
    } catch (error) {
      toast({
        title: 'Submission Failed',
        description: 'There was an error submitting your PHF. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveAndContinue = async () => {
    setIsSubmitting(true);
    try {
      const formData = form.getValues();
      await onSave(formData, false);
      toast({
        title: 'Progress Saved',
        description: 'Your progress has been saved.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your progress.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNextSection = async () => {
    // If we're on the eligibility questions section (0) and user is disqualified, prevent progression
    if (currentSection === 0 && disqualified) {
      toast({
        title: 'Cannot proceed',
        description: 'Based on your answers to the eligibility questions, you are not eligible for this position.',
        variant: 'destructive',
      });
      return;
    }

    // Check if eligibility questions are answered before proceeding from section 0
    if (currentSection === 0 && killerQuestions.length > 0) {
      const unansweredQuestions = killerQuestions.filter(q => 
        killerAnswers[q.id] === undefined || killerAnswers[q.id] === null || killerAnswers[q.id] === ''
      );

      if (unansweredQuestions.length > 0) {
        toast({
          title: 'Please answer all questions',
          description: 'All eligibility questions must be answered before proceeding.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate Personal Details section (section 1) before proceeding
    if (currentSection === 1) {
      // Trigger validation for personal details fields
      const isValid = await form.trigger([
        'personalDetails.familyName',
        'personalDetails.firstNames', 
        'personalDetails.title',
        'personalDetails.sex',
        'personalDetails.dateOfBirth',
        'personalDetails.placeOfBirth',
        'personalDetails.countryOfBirth',
        'personalDetails.presentNationality',
        'personalDetails.maritalStatus',
        'personalDetails.permanentAddress',
        'personalDetails.presentAddress',
        'personalDetails.telephone',
        'personalDetails.email'
      ] as const);
      
      if (!isValid) {
        toast({
          title: 'Please complete all required fields',
          description: 'All fields in Personal Details must be completed before proceeding.',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const formData = form.getValues();
      await onSave(formData, false);
      
      // Mark current tab as completed and move to next
      onTabCompleted?.(currentSection);
      setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1));
      
      toast({
        title: 'Progress Saved',
        description: 'Moving to next section. Progress saved.',
      });
    } catch (error) {
      toast({
        title: 'Save Failed',
        description: 'There was an error saving your progress.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTabChange = (value: string) => {
    const targetTab = parseInt(value);
    // Only allow access to completed tabs or the next available tab
    if (completedTabs.has(targetTab)) {
      setCurrentSection(targetTab);
    }
  };

  const DatePicker = ({ field, label, disabled }: any) => {
    // Helper function to parse date value
    const parseDate = (value: any): Date => {
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        // Handle ISO strings from localStorage
        if (value.includes('T') || value.includes('Z')) {
          return new Date(value);
        }
        // Handle DD/MM/YYYY format
        const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
        const match = value.match(dateRegex);
        if (match) {
          const [, day, month, year] = match;
          return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
      }
      return new Date();
    };

    const [currentDate, setCurrentDate] = useState(() => parseDate(field.value));
    const [inputValue, setInputValue] = useState(() => {
      const date = parseDate(field.value);
      return format(date, "dd/MM/yyyy");
    });
    
    const navigateYear = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      newDate.setFullYear(newDate.getFullYear() + (direction === 'next' ? 1 : -1));
      setCurrentDate(newDate);
    };

    const navigateMonth = (direction: 'prev' | 'next') => {
      const newDate = new Date(currentDate);
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
      setCurrentDate(newDate);
    };

    const parseAndNavigateToDate = (value: string) => {
      const dateRegex = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
      const match = value.match(dateRegex);
      if (match) {
        const [, day, month, year] = match;
        const dayNum = parseInt(day);
        const monthNum = parseInt(month) - 1; // JS months are 0-indexed
        const yearNum = parseInt(year);
        
        if (dayNum >= 1 && dayNum <= 31 && monthNum >= 0 && monthNum <= 11 && yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
          const date = new Date(yearNum, monthNum, dayNum);
          // Verify the date is valid (handles cases like Feb 30)
          if (date.getDate() === dayNum && date.getMonth() === monthNum && date.getFullYear() === yearNum) {
            setCurrentDate(date);
            field.onChange(date);
            return true;
          }
        }
      }
      return false;
    };

    const handleInputChange = (value: string) => {
      setInputValue(value);
      
      // Try to parse and navigate to the date as user types
      if (parseAndNavigateToDate(value)) {
        // Valid date parsed and set
      } else if (value === '') {
        field.onChange('');
      }
    };

    const handleInputBlur = () => {
      // On blur, validate the final input
      if (!parseAndNavigateToDate(inputValue) && inputValue !== '') {
        // Invalid date, reset to current field value or empty
        if (field.value instanceof Date) {
          setInputValue(format(field.value, "dd/MM/yyyy"));
        } else {
          setInputValue('');
          field.onChange('');
        }
      }
    };

    return (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <div className="relative">
                <Input
                  placeholder="DD/MM/YYYY"
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={handleInputBlur}
                  disabled={disabled}
                  maxLength={10}
                  className="pr-10"
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 opacity-50 pointer-events-none" />
              </div>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <div className="flex items-center justify-between p-2 border-b">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateYear('prev')}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('prev')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-3 w-3" />
                </Button>
                <span className="text-sm font-medium min-w-[120px] text-center">
                  {format(currentDate, "MMMM yyyy")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateMonth('next')}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateYear('next')}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={field.value instanceof Date ? field.value : currentDate}
              onSelect={(date) => {
                if (date) {
                  field.onChange(date);
                  setCurrentDate(date);
                  setInputValue(format(date, "dd/MM/yyyy"));
                }
              }}
              disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
              month={currentDate}
              onMonthChange={setCurrentDate}
              initialFocus
              className="p-3 pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
        <FormMessage />
      </FormItem>
    );
  };

  // Personal Details Section
  const renderPersonalDetails = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="personalDetails.familyName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Family Name *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Family name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personalDetails.firstNames"
          render={({ field }) => (
            <FormItem>
              <FormLabel>First/Other Names *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="First and other names" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personalDetails.title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select title" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Mr">Mr</SelectItem>
                  <SelectItem value="Mrs">Mrs</SelectItem>
                  <SelectItem value="Ms">Ms</SelectItem>
                  <SelectItem value="Miss">Miss</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="personalDetails.maidenName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maiden Name (if applicable)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Maiden name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.sex"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sex *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sex" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.dateOfBirth"
          render={({ field }) => (
            <DatePicker field={field} label="Date of Birth *" />
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.placeOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place of Birth *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City, State/Province" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.countryOfBirth"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Country of Birth *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.presentNationality"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Present Nationality *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {COUNTRIES.map((country) => (
                    <SelectItem key={country} value={country}>
                      {country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.maritalStatus"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Marital Status *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Single">Single</SelectItem>
                  <SelectItem value="Married">Married</SelectItem>
                  <SelectItem value="Divorced">Divorced</SelectItem>
                  <SelectItem value="Widowed">Widowed</SelectItem>
                  <SelectItem value="Separated">Separated</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="personalDetails.nationalityChanged"
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
                Have you ever changed your nationality?
              </FormLabel>
            </div>
          </FormItem>
        )}
      />

      {form.watch('personalDetails.nationalityChanged') && (
        <FormField
          control={form.control}
          name="personalDetails.nationalityChangeDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nationality Change Details</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Please provide details about your nationality change" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-1 gap-4">
        <FormField
          control={form.control}
          name="personalDetails.permanentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permanent Address *</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Full permanent address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Checkbox to copy permanent address to present address */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="same-address"
            onCheckedChange={(checked) => {
              if (checked) {
                const permanentAddress = form.getValues('personalDetails.permanentAddress');
                form.setValue('personalDetails.presentAddress', permanentAddress);
              }
            }}
          />
          <Label htmlFor="same-address">Present address is same as permanent address</Label>
        </div>

        <FormField
          control={form.control}
          name="personalDetails.presentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Present Address *</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Full present address" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="personalDetails.telephone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telephone *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Phone number with country code" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="personalDetails.email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email *</FormLabel>
              <FormControl>
                <Input {...field} type="email" placeholder="email@example.com" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name="personalDetails.usGreenCard"
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
                Do you hold a US Green Card or equivalent?
              </FormLabel>
            </div>
          </FormItem>
        )}
      />

      {form.watch('personalDetails.usGreenCard') && (
        <FormField
          control={form.control}
          name="personalDetails.usGreenCardDetails"
          render={({ field }) => (
            <FormItem>
              <FormLabel>US Green Card Details</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Please provide details about your US Green Card or equivalent" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  // Dependants & Relatives Section
  const renderDependantsAndRelatives = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Dependants</h3>
        <FormDescription className="mb-4">
          Spouse and children under 18 or other dependants financially supported by you
        </FormDescription>
        
        {dependantFields.map((field, index) => (
          <Card key={field.id} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Dependant {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeDependant(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`dependants.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dependants.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select relationship" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Child">Child</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`dependants.${index}.dateOfBirth`}
                  render={({ field }) => (
                    <DatePicker field={field} label="Date of Birth *" />
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={() => appendDependant({ name: '', relationship: 'Spouse', dateOfBirth: new Date() })}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Dependant
        </Button>
      </div>

      <Separator />

      <div>
        <h3 className="text-lg font-medium mb-4">Relatives in UN Organizations</h3>
        <FormDescription className="mb-4">
          List any relatives working in UN organizations or international organizations
        </FormDescription>
        
        {relativeFields.map((field, index) => (
          <Card key={field.id} className="mb-4">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium">Relative {index + 1}</h4>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeRelative(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name={`relatives.${index}.name`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Full name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`relatives.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Brother, Sister, Parent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`relatives.${index}.organization`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Organization *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="UN organization or international body" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name={`relatives.${index}.position`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Position *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Job title/position" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>
        ))}
        
        <Button
          type="button"
          variant="outline"
          onClick={() => appendRelative({ name: '', relationship: '', organization: '', position: '' })}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Relative
        </Button>
      </div>
    </div>
  );

  // Work Preferences Section
  const renderWorkPreferences = () => (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="workPreferences.preferred_locations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Preferred Work Locations</FormLabel>
            <FormDescription>
              List countries/regions where you would prefer to work
            </FormDescription>
            <FormControl>
              <Textarea {...field} placeholder="e.g., Europe, Asia, Africa, specific countries..." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workPreferences.remote_work_preference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Remote Work Preference</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="office_only">Office only</SelectItem>
                <SelectItem value="hybrid">Hybrid (office + remote)</SelectItem>
                <SelectItem value="remote_only">Remote only</SelectItem>
                <SelectItem value="no_preference">No preference</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workPreferences.travel_availability"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Travel Availability</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select availability" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="no_travel">No travel</SelectItem>
                <SelectItem value="limited_travel">Limited travel (up to 25%)</SelectItem>
                <SelectItem value="moderate_travel">Moderate travel (25-50%)</SelectItem>
                <SelectItem value="extensive_travel">Extensive travel (50%+)</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workPreferences.contract_type_preference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contract Type Preference</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select preference" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="permanent">Permanent</SelectItem>
                <SelectItem value="fixed_term">Fixed term</SelectItem>
                <SelectItem value="consultancy">Consultancy</SelectItem>
                <SelectItem value="no_preference">No preference</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workPreferences.notice_period"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Notice Period Required</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g., 30 days, 3 months" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Language Proficiency Section
  const renderLanguageKnowledge = () => {
    const currentLanguages = form.watch('languages') || { un_languages: {}, other_languages: [] };
    
    return (
      <div className="space-y-4">
        <FormDescription>
          Select your proficiency level for UN official languages and add any additional languages you speak.
        </FormDescription>
        
        <PHFLanguageSection 
          languages={{
            un_languages: currentLanguages.un_languages || {},
            other_languages: currentLanguages.other_languages || []
          }}
          onChange={(languages) => {
            form.setValue('languages', languages);
          }}
        />
      </div>
    );
  };

  const renderEducation = () => (
    <div className="space-y-6">
      <PHFEducationSection profileEducation={candidateProfile?.education || []} />
    </div>
  );

  const handleAddWorkExperience = (experience: any) => {
    const newExperiences = [...(editedWorkExperiences.length > 0 ? editedWorkExperiences : candidateProfile?.work_experience || []), experience];
    setEditedWorkExperiences(newExperiences);
  };

  const handleEditWorkExperience = (index: number, experience: any) => {
    const experiences = editedWorkExperiences.length > 0 ? [...editedWorkExperiences] : [...(candidateProfile?.work_experience || [])];
    experiences[index] = experience;
    setEditedWorkExperiences(experiences);
  };

  const renderEmploymentRecord = () => (
    <div className="space-y-6">
      <PHFWorkExperienceSection 
        profileWorkExperience={candidateProfile?.work_experience || []} 
        onAddExperience={handleAddWorkExperience}
        onEditExperience={handleEditWorkExperience}
        editedExperiences={editedWorkExperiences.length > 0 ? editedWorkExperiences : undefined}
      />
    </div>
  );

  const handleAddSkill = () => {
    if (newSkill.trim() && !getAllSkills().includes(newSkill.trim())) {
      setApplicationSkills([...applicationSkills, newSkill.trim()]);
      setNewSkill('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string, isFromProfile: boolean) => {
    if (isFromProfile) {
      // Don't allow removing profile skills, but we could handle this differently if needed
      return;
    } else {
      setApplicationSkills(applicationSkills.filter(skill => skill !== skillToRemove));
    }
  };

  const getAllSkills = () => {
    const profileSkills = candidateProfile?.skills || [];
    return [...profileSkills, ...applicationSkills];
  };

  const handleAddCertification = () => {
    if (newCertification.name && newCertification.issuing_organization) {
      setApplicationCertifications([...applicationCertifications, { ...newCertification }]);
      setNewCertification({
        name: '',
        issuing_organization: '',
        issue_date: null,
        expiry_date: null,
        credential_id: '',
        description: ''
      });
      setIsAddCertDialogOpen(false);
    }
  };

  const getAllCertifications = () => {
    const profileCertifications = candidateProfile?.certifications || [];
    return [...profileCertifications, ...applicationCertifications];
  };

  const renderAdditionalInformation = () => (
    <div className="space-y-6">
      {/* Skills Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 text-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2L13.09 8.26L22 9L13.09 9.74L12 16L10.91 9.74L2 9L10.91 8.26L12 2Z"/>
              </svg>
            </div>
            Skills
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add Skill Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
              className="flex-1"
            />
            <Button
              type="button"
              onClick={handleAddSkill}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3"
              disabled={!newSkill.trim()}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Skills Display */}
          {getAllSkills().length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {/* Profile Skills */}
              {(candidateProfile?.skills || []).map((skill: string, index: number) => (
                <Badge key={`profile-${index}`} variant="secondary" className="text-sm">
                  {skill}
                </Badge>
              ))}
              {/* Application-specific Skills */}
              {applicationSkills.map((skill: string, index: number) => (
                <Badge key={`app-${index}`} variant="secondary" className="text-sm group">
                  {skill}
                  <button
                    type="button"
                    onClick={() => handleRemoveSkill(skill, false)}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">No skills added yet</p>
          )}
        </CardContent>
      </Card>

      {/* Certifications Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="h-5 w-5 text-primary">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"/>
              </svg>
            </div>
            Certifications & Licenses
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Existing Certifications */}
          {getAllCertifications().length > 0 && (
            <div className="space-y-3">
              {getAllCertifications().map((cert: any, index: number) => (
                <div key={index} className="border rounded-lg p-4 bg-card">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-medium text-lg">{cert.name}</h4>
                      <p className="text-muted-foreground font-medium">{cert.issuing_organization}</p>
                      <div className="text-sm text-muted-foreground">
                        {cert.issue_date && (
                          <span>
                            Issued: {cert.issue_date instanceof Date 
                              ? cert.issue_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' })
                              : new Date(cert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' })
                            }
                          </span>
                        )}
                        {cert.expiry_date && (
                          <>
                            <span className="mx-2">•</span>
                            <span>
                              Expires: {cert.expiry_date instanceof Date 
                                ? cert.expiry_date.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' })
                                : new Date(cert.expiry_date).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' })
                              }
                            </span>
                          </>
                        )}
                      </div>
                      {cert.credential_id && (
                        <p className="text-sm text-muted-foreground">
                          Credential ID: {cert.credential_id}
                        </p>
                      )}
                      {cert.description && (
                        <p className="text-sm text-muted-foreground mt-2">
                          {cert.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add Certification Button */}
          <div className="border-2 border-dashed border-muted rounded-lg p-8">
            <div className="text-center">
              <Dialog open={isAddCertDialogOpen} onOpenChange={setIsAddCertDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    Add Certification
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add Certification</DialogTitle>
                  </DialogHeader>
                  
                  <div className="space-y-6 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="cert-name">Certification Name *</Label>
                        <Input
                          id="cert-name"
                          placeholder="PMP, AWS Solutions Architect, etc."
                          value={newCertification.name}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cert-org">Issuing Organization *</Label>
                        <Input
                          id="cert-org"
                          placeholder="PMI, Amazon, Microsoft, etc."
                          value={newCertification.issuing_organization}
                          onChange={(e) => setNewCertification(prev => ({ ...prev, issuing_organization: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Issue Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newCertification.issue_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCertification.issue_date ? format(newCertification.issue_date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newCertification.issue_date}
                              onSelect={(date) => setNewCertification(prev => ({ ...prev, issue_date: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Expiry Date (optional)</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newCertification.expiry_date && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newCertification.expiry_date ? format(newCertification.expiry_date, "PPP") : <span>Pick a date</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={newCertification.expiry_date}
                              onSelect={(date) => setNewCertification(prev => ({ ...prev, expiry_date: date }))}
                              initialFocus
                              className="p-3 pointer-events-auto"
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-credential">Credential ID/URL</Label>
                      <Input
                        id="cert-credential"
                        placeholder="Certificate number or verification URL"
                        value={newCertification.credential_id}
                        onChange={(e) => setNewCertification(prev => ({ ...prev, credential_id: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cert-description">Description</Label>
                      <Textarea
                        id="cert-description"
                        placeholder="Brief description of the certification..."
                        rows={4}
                        value={newCertification.description}
                        onChange={(e) => setNewCertification(prev => ({ ...prev, description: e.target.value }))}
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" onClick={() => setIsAddCertDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleAddCertification} 
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        disabled={!newCertification.name || !newCertification.issuing_organization}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Certification
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Law Violations */}
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Legal Disclosure:</strong> Have you ever been charged with, convicted of, or pleaded guilty to any criminal offense? Include all instances, regardless of whether the case was dismissed, expunged, or resulted in a deferred prosecution.
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="additionalInformation.law_violations_disclosed"
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
                  Yes, I have legal matters to disclose
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        {form.watch('additionalInformation.law_violations_disclosed') && (
          <FormField
            control={form.control}
            name="additionalInformation.law_violations_details"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Legal Disclosure Details *</FormLabel>
                <FormDescription>
                  Please provide full details of all legal matters, including dates, charges, outcomes, and current status. Failure to disclose may result in disqualification.
                </FormDescription>
                <FormControl>
                  <Textarea {...field} rows={4} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );

  const renderConsentToSend = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">Consent for Transmission of PHF</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Please indicate your consent for the transmission of your Personal History Form to:
        </p>

        <div className="space-y-4">
          <FormField
            control={form.control}
            name="consentToSend.consent_other_un_orgs"
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
                    Other UN Organizations
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consentToSend.consent_national_government"
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
                    National Government
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="consentToSend.consent_other"
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
                    Other Organizations
                  </FormLabel>
                </div>
              </FormItem>
            )}
          />

          {form.watch('consentToSend.consent_other') && (
            <FormField
              control={form.control}
              name="consentToSend.consent_other_text"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Please specify other organizations</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Privacy Notice:</strong> Please review our{' '}
          <a 
            href="https://www.unicc.org/unicc-privacy-notice-for-applicants/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary underline"
          >
            Privacy Notice for Applicants
          </a>
          {' '}for information about how your personal data will be processed.
        </AlertDescription>
      </Alert>
    </div>
  );

  const renderMobilityMedical = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Assignment and Travel:</strong> Assignment and travel may be required to any area. If you have any disabilities or reservations that may restrict your activities, provide details. Employment is subject to medical examination.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="mobilityMedical.mobility_medical_reservations"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mobility/Medical Reservations</FormLabel>
            <FormDescription>
              Please describe any disabilities, medical conditions, or other reservations that may restrict your activities or availability for assignment
            </FormDescription>
            <FormControl>
              <Textarea {...field} rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Assessment Process Accommodations Section */}
      <div className="border-t pt-6 space-y-6">
        <div className="flex items-center gap-2">
          <Accessibility className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Assessment Process Accommodations</h3>
        </div>
        
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            We are committed to ensuring equal opportunities for all candidates. This information is confidential and will only be shared with relevant staff to facilitate your assessment process.
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="mobilityMedical.assessment_accommodations_needed"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Would you like to request accommodations for the assessment process?</FormLabel>
              <FormDescription>
                This is optional and relates specifically to the interview and assessment process, not general work requirements.
              </FormDescription>
              <FormControl>
                <RadioGroup
                  onValueChange={(value) => field.onChange(value === 'true')}
                  value={field.value ? 'true' : 'false'}
                  className="flex flex-row space-x-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id="no-accommodations" />
                    <Label htmlFor="no-accommodations">No, I do not require accommodations</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id="yes-accommodations" />
                    <Label htmlFor="yes-accommodations">Yes, I would like to request accommodations</Label>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {form.watch('mobilityMedical.assessment_accommodations_needed') && (
          <div className="space-y-4 p-4 bg-muted/30 rounded-lg border-l-4 border-primary">
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              Please select the types of accommodations you would like to request:
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_extended_time"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Extended time for written assessments</FormLabel>
                      <FormDescription className="text-xs">
                        Additional time for completing written tests or assignments
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_alternative_format"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Alternative format materials</FormLabel>
                      <FormDescription className="text-xs">
                        Large print, digital screen reader compatible, or other formats
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_accessible_location"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Accessible interview location</FormLabel>
                      <FormDescription className="text-xs">
                        Wheelchair accessible, ground floor, or other location needs
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_interpreter"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Sign language interpreter or communication support</FormLabel>
                      <FormDescription className="text-xs">
                        ASL, BSL, or other communication assistance
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_breaks"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Breaks during long assessment sessions</FormLabel>
                      <FormDescription className="text-xs">
                        Regular breaks for medical or accessibility needs
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_alternative_interview"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Alternative interview format</FormLabel>
                      <FormDescription className="text-xs">
                        Phone/video instead of in-person, or vice versa
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_assistive_technology"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Assistive technology compatibility</FormLabel>
                      <FormDescription className="text-xs">
                        Screen readers, voice recognition, or other assistive tools
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mobilityMedical.accommodation_other"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Other accommodations</FormLabel>
                      <FormDescription className="text-xs">
                        Please specify in the details section below
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="mobilityMedical.accommodation_details"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional details about your accommodation needs (optional)</FormLabel>
                  <FormDescription>
                    Please provide any additional information that would help us better accommodate your needs during the assessment process.
                  </FormDescription>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      rows={3}
                      placeholder="Please describe any specific requirements or additional accommodations needed..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mobilityMedical.accommodation_contact_preference"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How would you prefer to be contacted to discuss these accommodations?</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="email" id="contact-email" />
                        <Label htmlFor="contact-email">Email</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="phone" id="contact-phone" />
                        <Label htmlFor="contact-phone">Phone</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="either" id="contact-either" />
                        <Label htmlFor="contact-either">Either email or phone</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderReferences = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>References:</strong> Provide exactly 3 references who are not related to you and are not supervisors already listed in your employment record. Do not repeat supervisors; no relatives.
        </AlertDescription>
      </Alert>

      {[0, 1, 2].map((index) => (
        <Card key={index} className="p-4">
          <h4 className="font-medium mb-4">Reference {index + 1}</h4>

          <div className="space-y-4">
            <FormField
              control={form.control}
              name={`references.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`references.${index}.full_address`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address (including telephone/email if known) *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`references.${index}.occupation_title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Occupation/Title *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>
      ))}
    </div>
  );

  const renderEmployerContact = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Employer Contact & Status</h3>

      <FormField
        control={form.control}
        name="employerContact.objection_to_contact_present_employer"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Do you object to our making inquiries of your present employer?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => field.onChange(value === 'true')}
                value={field.value?.toString()}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="objection-yes" />
                  <Label htmlFor="objection-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="objection-no" />
                  <Label htmlFor="objection-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="employerContact.presently_in_government_employ"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Are you presently in government employ?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={(value) => field.onChange(value === 'true')}
                value={field.value?.toString()}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id="gov-yes" />
                  <Label htmlFor="gov-yes">Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id="gov-no" />
                  <Label htmlFor="gov-no">No</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const renderAvailability = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Availability</h3>

      <FormField
        control={form.control}
        name="availability.availability_mode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>How would you like to specify your availability?</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="date" id="specific-date" />
                  <Label htmlFor="specific-date">Specific Date</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="notice_period" id="notice-period" />
                  <Label htmlFor="notice-period">Notice Period (days)</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('availability.availability_mode') === 'date' && (
        <FormField
          control={form.control}
          name="availability.availability_date"
          render={({ field }) => (
            <DatePicker field={field} label="Availability Date" />
          )}
        />
      )}

      {form.watch('availability.availability_mode') === 'notice_period' && (
        <FormField
          control={form.control}
          name="availability.notice_period_days"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notice Period (days)</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  placeholder="e.g., 30"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );

  // Signature canvas handling
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const ctx = canvasRef.current.getContext('2d');
    if (ctx) {
      ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      const dataUrl = canvasRef.current.toDataURL();
      form.setValue('certification.signature_image_url', dataUrl);
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        form.setValue('certification.signature_image_url', '');
      }
    }
  };

  const renderMotivationLetter = () => {
    const motivationContent = form.watch('motivationLetter.motivation_letter_content') || '';
    const characterCount = motivationContent.length;
    const remainingChars = 4000 - characterCount;
    
    return (
      <div className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p><strong>Guidance:</strong> Please write a short letter to share your motivation for this role. This is your chance to tell us why you're interested, what makes you a strong fit, and what you can contribute.</p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>We recommend keeping it 250–400 words (3–4 short paragraphs)</li>
                <li>Please avoid repeating your CV in full</li>
                <li>Focus on your motivation, relevant skills, and achievements</li>
                <li>Maximum length: 4,000 characters (about one typed page)</li>
              </ul>
            </div>
          </AlertDescription>
        </Alert>

        <FormField
          control={form.control}
          name="motivationLetter.motivation_letter_content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Personal Statement / Motivation Letter *</FormLabel>
              <FormControl>
                <div className="space-y-2">
                  <MDEditor
                    value={field.value}
                    onChange={(value) => field.onChange(value || '')}
                    preview="edit"
                    hideToolbar
                    data-color-mode="light"
                    style={{ backgroundColor: 'white' }}
                  />
                  <div className="flex justify-between items-center text-sm">
                    <span className={cn(
                      "text-muted-foreground",
                      characterCount > 4000 && "text-destructive font-medium"
                    )}>
                      {characterCount.toLocaleString()} / 4,000 characters
                    </span>
                    <span className={cn(
                      "text-muted-foreground",
                      remainingChars < 0 && "text-destructive font-medium"
                    )}>
                      {remainingChars < 0 ? `${Math.abs(remainingChars)} over limit` : `${remainingChars} remaining`}
                    </span>
                  </div>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    );
  };

  const renderCertificationSignature = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Certification & Signature</h3>

      {/* Certification text */}
      <Card className="p-4">
        <div className="text-sm space-y-4">
          {CERTIFICATION_TEXT.split('\n\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </Card>

      <FormField
        control={form.control}
        name="certification.certify_true_complete_correct"
        render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
            <div className="space-y-1 leading-none">
              <FormLabel className="text-sm font-medium">
                I certify that the information provided is true, complete and correct *
              </FormLabel>
              <FormDescription>
                You must acknowledge this certification to submit the form
              </FormDescription>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="certification.signature_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Signature Type</FormLabel>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                value={field.value}
                className="flex flex-row space-x-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="typed" id="typed-sig" />
                  <Label htmlFor="typed-sig">Typed Name</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="drawn" id="drawn-sig" />
                  <Label htmlFor="drawn-sig">Draw Signature</Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {form.watch('certification.signature_type') === 'typed' && (
        <FormField
          control={form.control}
          name="certification.typed_full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type Your Full Name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Enter your full name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {form.watch('certification.signature_type') === 'drawn' && (
        <div className="space-y-4">
          <Label>Draw Your Signature</Label>
          <div className="border border-input rounded-md">
            <canvas
              ref={canvasRef}
              width={400}
              height={150}
              className="w-full cursor-crosshair"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
          <Button type="button" variant="outline" onClick={clearSignature}>
            Clear Signature
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="certification.signature_place"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Place *</FormLabel>
              <FormControl>
                <Input {...field} placeholder="City, Country" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="certification.signature_date"
          render={({ field }) => (
            <DatePicker field={field} label="Date *" />
          )}
        />
      </div>
    </div>
  );

  const renderEligibilityQuestions = () => {
    if (killerQuestions.length === 0) {
      return (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No eligibility questions have been set for this position.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Eligibility Requirements</h3>
          <p className="text-muted-foreground">
            Please answer these questions to determine your eligibility for this position. All questions must be answered to proceed.
          </p>
        </div>

        {disqualified && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Based on your answers to the eligibility questions, you are not eligible for this position.
            </AlertDescription>
          </Alert>
        )}

        {killerQuestions.map((question) => (
          <div key={question.id} className="space-y-3 p-4 border rounded-lg">
            <Label className="text-base font-medium">{question.label}</Label>
            
            {question.input_type === 'boolean' && (
              <RadioGroup
                value={killerAnswers[question.id]?.toString() || ''}
                onValueChange={(value) => 
                  onKillerAnswerChange?.(question.id, value === 'true')
                }
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="true" id={`${question.id}-yes`} />
                  <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="false" id={`${question.id}-no`} />
                  <Label htmlFor={`${question.id}-no`}>No</Label>
                </div>
              </RadioGroup>
            )}

            {question.input_type === 'text' && (
              <Input
                value={killerAnswers[question.id] || ''}
                onChange={(e) => onKillerAnswerChange?.(question.id, e.target.value)}
                placeholder="Enter your answer..."
              />
            )}

            {question.input_type === 'select' && question.options && (
              <Select
                value={killerAnswers[question.id] || ''}
                onValueChange={(value) => onKillerAnswerChange?.(question.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an option..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(question.options).map(([key, value]) => (
                    <SelectItem key={key} value={key}>
                      {value as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderEligibilityQuestions();
      case 1:
        return renderPersonalDetails();
      case 2:
        return renderDependantsAndRelatives();
      case 3:
        return renderWorkPreferences();
      case 4:
        return renderLanguageKnowledge();
      case 5:
        return renderEducation();
      case 6:
        return renderEmploymentRecord();
      case 7:
        return renderAdditionalInformation();
      case 8:
        return renderConsentToSend();
      case 9:
        return renderMobilityMedical();
      case 10:
        return renderReferences();
      case 11:
        return renderEmployerContact();
      case 12:
        return renderAvailability();
      case 13:
        return renderMotivationLetter();
      case 14:
        return renderCertificationSignature();
      default:
        return <div>Section not found</div>;
    }
  };


  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-muted-foreground">
            {currentSection + 1} of {SECTIONS.length}
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="mt-2">
          <Badge variant="secondary">{SECTIONS[currentSection]}</Badge>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => {
          console.log('Form submit event triggered!', e);
          form.handleSubmit(handleSubmit)(e);
        }} className="space-y-8">
          <Tabs value={currentSection.toString()} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1">
               {SECTIONS.slice(0, 5).map((section, index) => {
                  // Allow free navigation to all tabs
                  const isAccessible = true;
                  const validationStatus = getSectionValidationStatus(index);
                  const hasWarning = validationStatus === 'warning';
                  const isCompleted = completedTabs.has(index) && index !== currentSection;
                  return (
                    <TabsTrigger 
                      key={index} 
                      value={index.toString()}
                      disabled={false}
                     className={cn(
                       "text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1",
                       !isAccessible && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                       isCompleted && !hasWarning && "bg-green-100 text-green-700",
                       hasWarning && "bg-amber-50 text-amber-700 border-amber-200"
                     )}
                     title={section}
                   >
                     <span>{index + 1}. {section}</span>
                     {!isAccessible && <span>🔒</span>}
                     {isCompleted && !hasWarning && <span>✓</span>}
                     {hasWarning && <AlertTriangle className="h-3 w-3" />}
                   </TabsTrigger>
                 );
               })}
            </TabsList>
            
            <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1 mt-1">
               {SECTIONS.slice(5, 10).map((section, index) => {
                 const tabIndex = index + 5;
                  // Allow free navigation to all tabs
                  const isAccessible = true;
                  const validationStatus = getSectionValidationStatus(tabIndex);
                  const hasWarning = validationStatus === 'warning';
                  const isCompleted = completedTabs.has(tabIndex) && tabIndex !== currentSection;
                  return (
                    <TabsTrigger 
                      key={tabIndex} 
                      value={tabIndex.toString()}
                      disabled={false}
                     className={cn(
                       "text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1",
                       !isAccessible && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                       isCompleted && !hasWarning && "bg-green-100 text-green-700",
                       hasWarning && "bg-amber-50 text-amber-700 border-amber-200"
                     )}
                     title={section}
                   >
                     <span>{tabIndex + 1}. {section}</span>
                     {!isAccessible && <span>🔒</span>}
                     {isCompleted && !hasWarning && <span>✓</span>}
                     {hasWarning && <AlertTriangle className="h-3 w-3" />}
                   </TabsTrigger>
                 );
               })}
            </TabsList>
            
            <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1 mt-1">
               {SECTIONS.slice(10, 15).map((section, index) => {
                 const tabIndex = index + 10;
                  // Allow free navigation to all tabs
                  const isAccessible = true;
                  const validationStatus = getSectionValidationStatus(tabIndex);
                  const hasWarning = validationStatus === 'warning';
                  const isCompleted = completedTabs.has(tabIndex) && tabIndex !== currentSection;
                  return (
                    <TabsTrigger 
                      key={tabIndex} 
                      value={tabIndex.toString()}
                      disabled={false}
                     className={cn(
                       "text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground flex items-center gap-1",
                       !isAccessible && "opacity-50 cursor-not-allowed bg-muted text-muted-foreground",
                       isCompleted && !hasWarning && "bg-green-100 text-green-700",
                       hasWarning && "bg-amber-50 text-amber-700 border-amber-200"
                     )}
                     title={section}
                   >
                     <span>{tabIndex + 1}. {section}</span>
                     {!isAccessible && <span>🔒</span>}
                     {isCompleted && !hasWarning && <span>✓</span>}
                     {hasWarning && <AlertTriangle className="h-3 w-3" />}
                   </TabsTrigger>
                 );
               })}
            </TabsList>

            {SECTIONS.map((section, index) => (
              <TabsContent key={index} value={index.toString()}>
                <Card>
                  <CardHeader>
                    <CardTitle>{section}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {index === currentSection && renderCurrentSection()}
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Navigation buttons */}
          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
              disabled={currentSection === 0}
            >
              Previous
            </Button>

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSaveAndContinue}
                disabled={isSubmitting}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Progress
              </Button>

              {currentSection < SECTIONS.length - 1 ? (
                <Button
                  type="button"
                  onClick={handleNextSection}
                  disabled={isSubmitting}
                >
                  Next
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  disabled={isSubmitting}
                  onClick={() => {
                    console.log('PHF Submit Button Clicked!');
                    console.log('Current section:', currentSection);
                    console.log('Total sections:', SECTIONS.length);
                    console.log('Form valid?', form.formState.isValid);
                    console.log('Form errors:', form.formState.errors);
                  }}
                >
                  {isSubmitting ? 'Submitting...' : 'Submit PHF'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
