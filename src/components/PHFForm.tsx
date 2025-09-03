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
import { AlertCircle, CalendarIcon, Plus, Trash2, Save, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Complete schema for UNICC PHF requirements (simplified structure for the new sections)
const phfSchema = z.object({
  // Personal Details (existing)
  personalDetails: z.object({
    familyName: z.string().min(1, 'Family name is required'),
    firstNames: z.string().min(1, 'First/other names are required'),
    title: z.enum(['Mr', 'Mrs', 'Ms', 'Miss']),
    maidenName: z.string().optional(),
    sex: z.enum(['Male', 'Female', 'Other']),
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

  // Dependants & Relatives (existing)
  dependants: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    dateOfBirth: z.date(),
    relationship: z.string().min(1, 'Relationship is required'),
  })).optional(),
  
  relatives: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    organization: z.string().min(1, 'Organization is required'),
  })).optional(),

  // Work Preferences (existing)
  workPreferences: z.object({
    typesOfWork: z.string().min(1, 'Types of work is required'),
    vacancyReference: z.string().optional(),
    fixedTermAcceptable: z.boolean(),
    shortTermAcceptable: z.boolean(),
  }),

  // Language Knowledge (existing)
  languages: z.array(z.object({
    language: z.string().min(1, 'Language is required'),
    isMotherTongue: z.boolean(),
    speakLevel: z.enum(['1', '2', '3']),
    readLevel: z.enum(['1', '2', '3']),
    writeLevel: z.enum(['1', '2', '3']),
  })),

  // NEW: Education (chronological)
  education: z.array(z.object({
    from_month: z.string().min(1, 'From month is required'),
    from_year: z.string().min(4, 'From year is required'),
    to_month: z.string().min(1, 'To month is required'),
    to_year: z.string().min(4, 'To year is required'),
    is_present: z.boolean().default(false),
    institution_name: z.string().min(1, 'Institution name is required'),
    institution_place: z.string().optional(),
    institution_country: z.string().optional(),
    degree_or_certificate_title: z.string().optional(),
    main_course_of_study: z.string().optional(),
  })).min(1, 'At least one education entry is required'),

  // NEW: Employment Record (reverse chronological)
  employment_record: z.array(z.object({
    period_from_month: z.string().min(1, 'From month is required'),
    period_from_year: z.string().min(4, 'From year is required'),
    period_to_month: z.string().min(1, 'To month is required'),
    period_to_year: z.string().min(4, 'To year is required'),
    is_present: z.boolean().default(false),
    exact_title_of_post: z.string().min(1, 'Exact title of post is required'),
    type_of_business: z.string().optional(),
    is_un_system_post: z.boolean().default(false),
    un_grade: z.string().optional(),
    annual_income_starting: z.number().optional(),
    annual_income_most_recent: z.number().optional(),
    allowances_or_benefits: z.string().optional(),
    employees_supervised_number: z.number().optional(),
    employees_supervised_type: z.string().optional(),
    employer_name: z.string().min(1, 'Employer name is required'),
    employer_address: z.string().optional(),
    supervisor_name: z.string().min(1, 'Supervisor name is required'),
    supervisor_title: z.string().optional(),
    supervisor_phone: z.string().optional(),
    supervisor_email: z.string().email().optional(),
    reason_for_change: z.string().optional(),
    duties_and_responsibilities: z.string().min(1, 'Duties and responsibilities are required'),
    attestations: z.array(z.string()).optional(),
  })).min(1, 'At least one employment entry is required'),

  // NEW: Not employed periods
  not_employed_periods: z.array(z.object({
    from_month: z.string().min(1, 'From month is required'),
    from_year: z.string().min(4, 'From year is required'),
    to_month: z.string().min(1, 'To month is required'),
    to_year: z.string().min(4, 'To year is required'),
    reason: z.string().optional(),
  })).optional(),

  // NEW: Additional Information
  additional_information: z.object({
    additional_skills: z.string().optional(),
    fellowships: z.array(z.object({
      place: z.string().optional(),
      date_from: z.string().optional(),
      date_to: z.string().optional(),
      duration_text: z.string().optional(),
      awarded_by: z.string().optional(),
    })).optional(),
    law_violations_disclosed: z.boolean().default(false),
    law_violations_details: z.string().optional(),
  }),

  // NEW: Consent to Send
  consent_to_send: z.object({
    consent_other_un_orgs: z.boolean().default(false),
    consent_national_government: z.boolean().default(false),
    consent_other: z.boolean().default(false),
    consent_other_text: z.string().optional(),
  }),

  // NEW: Mobility/Medical
  mobility_medical: z.object({
    mobility_medical_reservations: z.string().optional(),
  }),

  // NEW: References (exactly 3)
  references: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    full_address: z.string().min(1, 'Full address is required'),
    occupation_title: z.string().min(1, 'Occupation/title is required'),
  })).length(3, 'Exactly 3 references are required'),

  // NEW: Employer Contact & Status
  employer_contact_status: z.object({
    objection_to_contact_present_employer: z.boolean().default(false),
    presently_in_government_employ: z.boolean().default(false),
  }),

  // NEW: Availability
  availability: z.object({
    availability_mode: z.enum(['specific_date', 'notice_period']).default('notice_period'),
    availability_date: z.string().optional(), // Store as string for JSON serialization
    notice_period_days: z.number().optional(),
  }),

  // NEW: Certification & Signature
  certification_signature: z.object({
    certify_true_complete_correct: z.boolean().refine(val => val === true, 'You must certify that the information is true, complete and correct'),
    signature_type: z.enum(['typed', 'drawn']).default('typed'),
    typed_full_name: z.string().optional(),
    signature_image_url: z.string().optional(),
    signature_place: z.string().min(1, 'Signature place is required'),
    signature_date: z.string().optional(), // Store as string for JSON serialization
    signed_at_utc: z.string().optional(),
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
        fixedTermAcceptable: false,
        shortTermAcceptable: false,
        ...initialData?.workPreferences,
      },
      languages: initialData?.languages || [
        { language: 'English', isMotherTongue: false, speakLevel: '1', readLevel: '1', writeLevel: '1' },
        { language: 'French', isMotherTongue: false, speakLevel: '1', readLevel: '1', writeLevel: '1' },
      ],
      education: initialData?.education || [
        {
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
        }
      ],
      employment_record: initialData?.employment_record || [
        {
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
        }
      ],
      not_employed_periods: initialData?.not_employed_periods || [],
      additional_information: {
        additional_skills: '',
        fellowships: [],
        law_violations_disclosed: false,
        law_violations_details: '',
        ...initialData?.additional_information,
      },
      consent_to_send: {
        consent_other_un_orgs: false,
        consent_national_government: false,
        consent_other: false,
        consent_other_text: '',
        ...initialData?.consent_to_send,
      },
      mobility_medical: {
        mobility_medical_reservations: '',
        ...initialData?.mobility_medical,
      },
      references: initialData?.references || [
        { name: '', full_address: '', occupation_title: '' },
        { name: '', full_address: '', occupation_title: '' },
        { name: '', full_address: '', occupation_title: '' },
      ],
      employer_contact_status: {
        objection_to_contact_present_employer: false,
        presently_in_government_employ: false,
        ...initialData?.employer_contact_status,
      },
      availability: {
        availability_mode: 'notice_period',
        availability_date: undefined,
        notice_period_days: undefined,
        ...initialData?.availability,
      },
      certification_signature: {
        certify_true_complete_correct: false,
        signature_type: 'typed',
        typed_full_name: '',
        signature_image_url: '',
        signature_place: '',
        signature_date: new Date().toISOString(),
        signed_at_utc: undefined,
        ...initialData?.certification_signature,
      },
    },
  });

  // Field arrays
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
    name: 'employment_record',
  });

  const { fields: notEmployedFields, append: appendNotEmployed, remove: removeNotEmployed } = useFieldArray({
    control: form.control,
    name: 'not_employed_periods',
  });

  const { fields: fellowshipFields, append: appendFellowship, remove: removeFellowship } = useFieldArray({
    control: form.control,
    name: 'additional_information.fellowships',
  });

  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

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
      form.setValue('certification_signature.signature_image_url', dataUrl);
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        form.setValue('certification_signature.signature_image_url', '');
      }
    }
  };

  const handleSaveAndContinue = async () => {
    try {
      setIsSubmitting(true);
      const data = form.getValues();
      await onSave(data, false);
      toast({ title: 'Progress saved' });
    } catch (error) {
      toast({ title: 'Failed to save progress', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (data: PHFFormData) => {
    try {
      setIsSubmitting(true);
      // Set signed timestamp
      const updatedData = {
        ...data,
        certification_signature: {
          ...data.certification_signature,
          signed_at_utc: new Date().toISOString(),
        }
      };
      await onSave(updatedData, true);
      toast({ title: 'PHF completed successfully!' });
    } catch (error) {
      toast({ title: 'Failed to submit PHF', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const DatePicker = ({ field, label, disabled }: any) => (
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
                format(field.value, "PPP")
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
            selected={field.value}
            onSelect={field.onChange}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0:
        return <div className="text-center py-8">Personal Details section - Original implementation needed</div>;
      case 1:
        return <div className="text-center py-8">Dependants & Relatives section - Original implementation needed</div>;
      case 2:
        return <div className="text-center py-8">Work Preferences section - Original implementation needed</div>;
      case 3:
        return <div className="text-center py-8">Language Knowledge section - Original implementation needed</div>;
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
        return renderEmployerContactStatus();
      case 11:
        return renderAvailability();
      case 12:
        return renderCertificationSignature();
      default:
        return null;
    }
  };

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
                  <FormLabel>To Month *</FormLabel>
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
                  <FormLabel>To Year *</FormLabel>
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
              name={`employment_record.${index}.period_from_month`}
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
              name={`employment_record.${index}.period_from_year`}
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
              name={`employment_record.${index}.period_to_month`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Month *</FormLabel>
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
              name={`employment_record.${index}.period_to_year`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>To Year *</FormLabel>
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
              name={`employment_record.${index}.exact_title_of_post`}
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
              name={`employment_record.${index}.type_of_business`}
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
            name={`employment_record.${index}.is_un_system_post`}
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
          {form.watch(`employment_record.${index}.is_un_system_post`) ? (
            <FormField
              control={form.control}
              name={`employment_record.${index}.un_grade`}
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
                name={`employment_record.${index}.annual_income_starting`}
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
                name={`employment_record.${index}.annual_income_most_recent`}
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

          {/* Rest of employment fields... */}
          <div className="space-y-4">
            <FormField
              control={form.control}
              name={`employment_record.${index}.employer_name`}
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
              name={`employment_record.${index}.supervisor_name`}
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
              name={`employment_record.${index}.duties_and_responsibilities`}
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
        name="additional_information.additional_skills"
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
          name="additional_information.law_violations_disclosed"
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

        {form.watch('additional_information.law_violations_disclosed') && (
          <FormField
            control={form.control}
            name="additional_information.law_violations_details"
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
            name="consent_to_send.consent_other_un_orgs"
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
            name="consent_to_send.consent_national_government"
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
            name="consent_to_send.consent_other"
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

          {form.watch('consent_to_send.consent_other') && (
            <FormField
              control={form.control}
              name="consent_to_send.consent_other_text"
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
        name="mobility_medical.mobility_medical_reservations"
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

  const renderEmployerContactStatus = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium mb-4">Employer Contact & Status</h3>

      <FormField
        control={form.control}
        name="employer_contact_status.objection_to_contact_present_employer"
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
        name="employer_contact_status.presently_in_government_employ"
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
                  <RadioGroupItem value="specific_date" id="specific-date" />
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

      {form.watch('availability.availability_mode') === 'specific_date' && (
        <FormField
          control={form.control}
          name="availability.availability_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Availability Date</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
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
        name="certification_signature.certify_true_complete_correct"
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
        name="certification_signature.signature_type"
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

      {form.watch('certification_signature.signature_type') === 'typed' && (
        <FormField
          control={form.control}
          name="certification_signature.typed_full_name"
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

      {form.watch('certification_signature.signature_type') === 'drawn' && (
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
          name="certification_signature.signature_place"
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
          name="certification_signature.signature_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date *</FormLabel>
              <FormControl>
                <Input {...field} type="date" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Personal History Form</h1>
        <p className="text-muted-foreground">
          Please complete all sections of the UNICC Personal History Form
        </p>
      </div>

      {/* Progress indicator */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
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
          <Card>
            <CardHeader>
              <CardTitle>{SECTIONS[currentSection]}</CardTitle>
            </CardHeader>
            <CardContent>
              {renderCurrentSection()}
            </CardContent>
          </Card>

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