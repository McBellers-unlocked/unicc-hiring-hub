import React, { useState, useRef } from 'react';
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
import { AlertCircle, CalendarIcon, Plus, Trash2, Save, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

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
    dateOfBirth: z.date(),
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

  // Language Knowledge
  languages: z.array(z.object({
    language: z.string().min(1, 'Language is required'),
    speaking: z.string().min(1, 'Speaking level is required'),
    reading: z.string().min(1, 'Reading level is required'),
    writing: z.string().min(1, 'Writing level is required'),
  })),

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
    degree_or_certificate_title: z.string(),
    main_course_of_study: z.string(),
    is_completed: z.boolean(),
    certificate_url: z.string().optional(),
  })).min(1, 'At least one education entry is required'),

  // Employment Record
  employment: z.array(z.object({
    period_from_month: z.string().min(1, 'From month is required'),
    period_from_year: z.string().min(4, 'From year is required'),
    period_to_month: z.string().optional(),
    period_to_year: z.string().optional(),
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
    supervisor_name: z.string().min(1, 'Supervisor name is required'),
    supervisor_title: z.string(),
    supervisor_phone: z.string(),
    supervisor_email: z.string().email().optional().or(z.literal('')),
    reason_for_change: z.string(),
    duties_and_responsibilities: z.string().min(1, 'Duties are required'),
    attestations: z.array(z.string()).optional(),
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
    motivation_letter_url: z.string().min(1, 'Motivation letter is required'),
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
}

const SECTIONS = [
  'Personal Details',
  'Dependants & Relatives',
  'Work Preferences', 
  'Language Knowledge',
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

const CERTIFICATION_TEXT = `I certify that the statements made by me in answer to the foregoing questions are true, complete and correct to the best of my knowledge and belief. I understand that any false statement may lead to the rejection of my application or cancellation of any appointment offered to me.

I agree that if I am appointed, my appointment will be subject to the Personnel Rules and Regulations of the organization and to such medical examination as the organization may require. I also agree that, if any statements made by me prove to be false, incomplete or incorrect, I may be dismissed.

I acknowledge that my application and all supporting documents will be held in confidence by the organization. I understand that if I am not selected for this particular post, my application may be considered for other suitable vacancies during the following 12 months.

I confirm that I have read and agree to the Privacy Notice for Applicants and understand how my personal data will be processed.`;

export function PHFForm({ initialData, onSave, onUploadPhoto }: PHFFormProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const { toast } = useToast();

  const form = useForm<PHFFormData>({
    resolver: zodResolver(phfSchema),
    defaultValues: {
      personalDetails: {
        familyName: initialData?.personalDetails?.familyName || '',
        firstNames: initialData?.personalDetails?.firstNames || '',
        title: initialData?.personalDetails?.title || 'Mr',
        maidenName: initialData?.personalDetails?.maidenName || '',
        sex: initialData?.personalDetails?.sex || 'Male',
        dateOfBirth: initialData?.personalDetails?.dateOfBirth || new Date(),
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
      languages: initialData?.languages || [],
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
        motivation_letter_url: initialData?.motivationLetter?.motivation_letter_url || '',
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

  const { fields: dependantFields, append: appendDependant, remove: removeDependant } = useFieldArray({
    control: form.control,
    name: 'dependants',
  });

  const { fields: relativeFields, append: appendRelative, remove: removeRelative } = useFieldArray({
    control: form.control,
    name: 'relatives',
  });

  const { fields: languageFields, append: appendLanguage, remove: removeLanguage } = useFieldArray({
    control: form.control,
    name: 'languages',
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
    setIsSubmitting(true);
    try {
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

  const DatePicker = ({ field, label, disabled }: any) => {
    const [currentDate, setCurrentDate] = useState(field.value || new Date());
    
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

    return (
      <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                className={cn(
                  "w-full pl-3 text-left font-normal",
                  !field.value && "text-muted-foreground"
                )}
                disabled={disabled}
              >
                {field.value ? (
                  format(field.value, "dd/MM/yyyy")
                ) : (
                  <span>Pick a date</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
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
              selected={field.value}
              onSelect={field.onChange}
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

  // Language Knowledge Section
  const renderLanguageKnowledge = () => (
    <div className="space-y-4">
      <FormDescription>
        Rate your proficiency in each language: Elementary, Intermediate, Advanced, Expert
      </FormDescription>
      
      {languageFields.map((field, index) => (
        <Card key={field.id} className="mb-4">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-medium">Language {index + 1}</h4>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeLanguage(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name={`languages.${index}.language`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g., English, French" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`languages.${index}.speaking`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speaking *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`languages.${index}.reading`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reading *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`languages.${index}.writing`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Writing *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Level" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Elementary">Elementary</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Advanced">Advanced</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
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
        onClick={() => appendLanguage({ language: '', speaking: 'Elementary', reading: 'Elementary', writing: 'Elementary' })}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Language
      </Button>
    </div>
  );

  const renderEducation = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Guidance:</strong> Exclude primary/secondary education if you have a university degree or equivalent. Include postgraduate/professional courses.
        </AlertDescription>
      </Alert>

      {educationFields.map((field, index) => (
        <Card key={field.id} className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">Education Entry {index + 1}</h4>
            {educationFields.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeEducation(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormField
              control={form.control}
              name={`education.${index}.from_month`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Month *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
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
              name={`education.${index}.from_year`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Year *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="YYYY" maxLength={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`education.${index}.to_month`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Month</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
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
              name={`education.${index}.to_year`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Year</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="YYYY" maxLength={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <FormField
              control={form.control}
              name={`education.${index}.institution_name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`education.${index}.institution_place`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Place (City/Town)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`education.${index}.institution_country`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Institution Country</FormLabel>
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
              name={`education.${index}.degree_or_certificate_title`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Degree or Certificate Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name={`education.${index}.main_course_of_study`}
            render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Main Course of Study</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="mt-4 space-y-4">
            <FormField
              control={form.control}
              name={`education.${index}.is_completed`}
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
                      This qualification is completed
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />

            {form.watch(`education.${index}.is_completed`) && (
              <FormField
                control={form.control}
                name={`education.${index}.certificate_url`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Upload Certificate *</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            // Handle file upload - you'll need to implement this
                            field.onChange(file.name); // Placeholder
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => appendEducation({
          from_month: '',
          from_year: '',
          to_month: '',
          to_year: '',
          is_present: false,
          institution_name: '',
          institution_place: '',
          institution_country: '',
          degree_or_certificate_title: '',
          main_course_of_study: '',
          is_completed: false,
          certificate_url: '',
        })}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Education Entry
      </Button>
    </div>
  );

  const renderEmploymentRecord = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Employment Record (reverse chronological):</strong> Include military service. Note periods not gainfully employed separately. Last 5 years require attestations.
        </AlertDescription>
      </Alert>

      {employmentFields.map((field, index) => (
        <Card key={field.id} className="p-4">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-medium">
              {index === 0 ? "Present or Most Recent Employment" : `Employment Entry ${index + 1}`}
            </h4>
            {employmentFields.length > 1 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeEmployment(index)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Period dates */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <FormField
              control={form.control}
              name={`employment.${index}.period_from_month`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Month *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
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
              name={`employment.${index}.period_from_year`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>From Year *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="YYYY" maxLength={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`employment.${index}.period_to_month`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Month</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Month" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="present">Present</SelectItem>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
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
              name={`employment.${index}.period_to_year`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Year</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="YYYY" maxLength={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Job details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormField
              control={form.control}
              name={`employment.${index}.exact_title_of_post`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exact Title of Post *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`employment.${index}.type_of_business`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type of Business</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* UN System checkbox */}
          <FormField
            control={form.control}
            name={`employment.${index}.is_un_system_post`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    UN System Post
                  </FormLabel>
                  <FormDescription>
                    Check if this was a United Nations system position
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {/* Conditional fields based on UN system */}
          {form.watch(`employment.${index}.is_un_system_post`) ? (
            <FormField
              control={form.control}
              name={`employment.${index}.un_grade`}
              render={({ field }) => (
                <FormItem className="mb-4">
                  <FormLabel>UN Grade</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <FormField
                control={form.control}
                name={`employment.${index}.annual_income_starting`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Income Starting</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`employment.${index}.annual_income_most_recent`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Annual Income Most Recent</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        {...field} 
                        onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* Rest of employment fields */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name={`employment.${index}.employer_name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employer Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`employment.${index}.supervisor_name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supervisor Name *</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`employment.${index}.duties_and_responsibilities`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duties and Responsibilities *</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </Card>
      ))}

      <Button
        type="button"
        variant="outline"
        onClick={() => appendEmployment({
          period_from_month: '',
          period_from_year: '',
          period_to_month: '',
          period_to_year: '',
          is_present: false,
          exact_title_of_post: '',
          type_of_business: '',
          is_un_system_post: false,
          un_grade: '',
          annual_income_starting: undefined,
          annual_income_most_recent: undefined,
          allowances_or_benefits: '',
          employees_supervised_number: undefined,
          employees_supervised_type: '',
          employer_name: '',
          employer_address: '',
          supervisor_name: '',
          supervisor_title: '',
          supervisor_phone: '',
          supervisor_email: '',
          reason_for_change: '',
          duties_and_responsibilities: '',
          attestations: [],
        })}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Employment Entry
      </Button>
    </div>
  );

  const renderAdditionalInformation = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="additionalInformation.additional_skills"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Skills</FormLabel>
            <FormDescription>
              Please describe any additional skills, particularly computing skills
            </FormDescription>
            <FormControl>
              <Textarea {...field} rows={4} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
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
                  Law Violations Disclosed
                </FormLabel>
                <FormDescription>
                  Check if you need to disclose any law violations
                </FormDescription>
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
                <FormLabel>Law Violations Details</FormLabel>
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

  const renderMotivationLetter = () => (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Guidance:</strong> Please upload your motivation letter explaining your interest in this position and how your experience makes you suitable for the role.
        </AlertDescription>
      </Alert>

      <FormField
        control={form.control}
        name="motivationLetter.motivation_letter_url"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Motivation Letter *</FormLabel>
            <FormControl>
              <Input
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle file upload - you'll need to implement this
                    field.onChange(file.name); // Placeholder
                  }
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

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

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return renderPersonalDetails();
      case 1:
        return renderDependantsAndRelatives();
      case 2:
        return renderWorkPreferences();
      case 3:
        return renderLanguageKnowledge();
      case 4:
        return renderEducation();
      case 5:
        return renderEmploymentRecord();
      case 6:
        return renderAdditionalInformation();
      case 7:
        return renderConsentToSend();
      case 8:
        return renderMobilityMedical();
      case 9:
        return renderReferences();
      case 10:
        return renderEmployerContact();
      case 11:
        return renderAvailability();
      case 12:
        return renderMotivationLetter();
      case 13:
        return renderCertificationSignature();
      default:
        return <div>Section not found</div>;
    }
  };

  const handleTabChange = (value: string) => {
    setCurrentSection(parseInt(value));
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
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
          <Tabs value={currentSection.toString()} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1">
              {SECTIONS.slice(0, 5).map((section, index) => (
                <TabsTrigger 
                  key={index} 
                  value={index.toString()}
                  className="text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  title={section}
                >
                  {index + 1}. {section}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsList className="grid w-full grid-cols-5 gap-1 h-auto p-1 mt-1">
              {SECTIONS.slice(5, 10).map((section, index) => (
                <TabsTrigger 
                  key={index + 5} 
                  value={(index + 5).toString()}
                  className="text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  title={section}
                >
                  {index + 6}. {section}
                </TabsTrigger>
              ))}
            </TabsList>
            
            <TabsList className="grid w-full grid-cols-4 gap-1 h-auto p-1 mt-1 max-w-lg mx-auto">
              {SECTIONS.slice(10, 14).map((section, index) => (
                <TabsTrigger 
                  key={index + 10} 
                  value={(index + 10).toString()}
                  className="text-xs px-2 py-2 h-auto data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  title={section}
                >
                  {index + 11}. {section}
                </TabsTrigger>
              ))}
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
                  onClick={() => setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1))}
                >
                  Next
                </Button>
              ) : (
                <Button type="submit" disabled={isSubmitting}>
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
