import React, { useState, useEffect } from 'react';
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
import { AlertCircle, CalendarIcon, Plus, Trash2, Upload, Save, FileText } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

// Schema for PHF data validation
const phfSchema = z.object({
  // Personal Details
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

  // Dependants & Relatives
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

  // Work Preferences
  workPreferences: z.object({
    typesOfWork: z.string().min(1, 'Types of work is required'),
    vacancyReference: z.string().optional(),
    fixedTermAcceptable: z.boolean(),
    shortTermAcceptable: z.boolean(),
  }),

  // Language Knowledge
  languages: z.array(z.object({
    language: z.string().min(1, 'Language is required'),
    isMotherTongue: z.boolean(),
    speakLevel: z.enum(['1', '2', '3']),
    readLevel: z.enum(['1', '2', '3']),
    writeLevel: z.enum(['1', '2', '3']),
  })),

  // Education
  education: z.array(z.object({
    fromDate: z.string().min(1, 'From date is required'),
    toDate: z.string().min(1, 'To date is required'),
    institution: z.string().min(1, 'Institution is required'),
    certificates: z.string().min(1, 'Certificates/Degrees is required'),
    mainCourse: z.string().min(1, 'Main course of study is required'),
  })),

  // Employment Record
  employmentRecord: z.array(z.object({
    fromDate: z.string().min(1, 'From date is required'),
    toDate: z.string().min(1, 'To date is required'),
    exactTitle: z.string().min(1, 'Exact title is required'),
    typeOfBusiness: z.string().min(1, 'Type of business is required'),
    startingIncome: z.string().optional(),
    recentIncome: z.string().optional(),
    allowances: z.string().optional(),
    employeesSupervised: z.string().optional(),
    employerName: z.string().min(1, 'Employer name is required'),
    employerAddress: z.string().min(1, 'Employer address is required'),
    supervisorName: z.string().optional(),
    supervisorTitle: z.string().optional(),
    supervisorContact: z.string().optional(),
    reasonForLeaving: z.string().optional(),
    duties: z.string().min(1, 'Duties and responsibilities are required'),
  })),

  // Additional Info
  additionalInfo: z.object({
    additionalSkills: z.string().optional(),
    fellowships: z.string().optional(),
    lawViolations: z.boolean(),
    lawViolationDetails: z.string().optional(),
  }),

  // Consent for Transmission
  consentTransmission: z.object({
    unOrgs: z.boolean(),
    nationalGovt: z.boolean(),
    other: z.boolean(),
    otherDetails: z.string().optional(),
  }),

  // Mobility/Medical
  mobilityMedical: z.object({
    travelRestrictions: z.string().optional(),
  }),

  // References
  references: z.array(z.object({
    name: z.string().min(1, 'Name is required'),
    address: z.string().min(1, 'Address is required'),
    telephone: z.string().optional(),
    fax: z.string().optional(),
    email: z.string().email().optional(),
    occupation: z.string().min(1, 'Occupation is required'),
  })).length(3, 'Exactly 3 references are required'),

  // Employer Contact & Status
  employerContact: z.object({
    objectionToInquiries: z.boolean(),
    presentlyInGovEmploy: z.boolean(),
  }),

  // Availability
  availability: z.object({
    reportingDate: z.date().optional(),
    noticeDays: z.string().optional(),
  }),

  // Certification & Signature
  certification: z.object({
    certificationDate: z.date(),
    certificationPlace: z.string().min(1, 'Place is required'),
    signatureType: z.enum(['drawn', 'typed']),
    signatureData: z.string().min(1, 'Signature is required'),
    consentCheckbox: z.boolean().refine(val => val === true, 'You must consent to continue'),
  }),
});

type PHFFormData = z.infer<typeof phfSchema>;

interface PHFFormProps {
  initialData?: Partial<PHFFormData>;
  onSave: (data: PHFFormData, isComplete: boolean) => Promise<void>;
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
  'Consent for Transmission',
  'Mobility/Medical',
  'References',
  'Employer Contact & Status',
  'Availability',
  'Certification & Signature'
];

const PROFICIENCY_LEVELS = {
  '1': 'Limited conversation/newsletters/routine correspondence',
  '2': 'Free discussion & write/read more difficult material', 
  '3': 'Near mother tongue proficiency'
};

export function PHFForm({ initialData, onSave, onUploadPhoto }: PHFFormProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [signature, setSignature] = useState('');
  const { toast } = useToast();

  const form = useForm<PHFFormData>({
    resolver: zodResolver(phfSchema),
    defaultValues: {
      personalDetails: {
        nationalityChanged: false,
        usGreenCard: false,
        ...initialData?.personalDetails,
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
      education: initialData?.education || [{}],
      employmentRecord: initialData?.employmentRecord || [{}],
      additionalInfo: {
        lawViolations: false,
        ...initialData?.additionalInfo,
      },
      consentTransmission: {
        unOrgs: false,
        nationalGovt: false,
        other: false,
        ...initialData?.consentTransmission,
      },
      mobilityMedical: initialData?.mobilityMedical || {},
      references: initialData?.references || [{}, {}, {}],
      employerContact: {
        objectionToInquiries: false,
        presentlyInGovEmploy: false,
        ...initialData?.employerContact,
      },
      availability: initialData?.availability || {},
      certification: {
        certificationDate: new Date(),
        signatureType: 'typed',
        consentCheckbox: false,
        ...initialData?.certification,
      },
    },
  });

  const { 
    fields: dependantFields, 
    append: appendDependant, 
    remove: removeDependant 
  } = useFieldArray({
    control: form.control,
    name: 'dependants',
  });

  const { 
    fields: relativeFields, 
    append: appendRelative, 
    remove: removeRelative 
  } = useFieldArray({
    control: form.control,
    name: 'relatives',
  });

  const { 
    fields: languageFields, 
    append: appendLanguage, 
    remove: removeLanguage 
  } = useFieldArray({
    control: form.control,
    name: 'languages',
  });

  const { 
    fields: educationFields, 
    append: appendEducation, 
    remove: removeEducation 
  } = useFieldArray({
    control: form.control,
    name: 'education',
  });

  const { 
    fields: employmentFields, 
    append: appendEmployment, 
    remove: removeEmployment 
  } = useFieldArray({
    control: form.control,
    name: 'employmentRecord',
  });

  const progress = ((currentSection + 1) / SECTIONS.length) * 100;

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && onUploadPhoto) {
      try {
        const photoUrl = await onUploadPhoto(file);
        form.setValue('personalDetails.photoUrl', photoUrl);
        setPhotoFile(file);
        toast({ title: 'Photo uploaded successfully' });
      } catch (error) {
        toast({ title: 'Failed to upload photo', variant: 'destructive' });
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
      await onSave(data, true);
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
                <Input {...field} />
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
                <Input {...field} />
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
              <FormLabel>Maiden Name</FormLabel>
              <FormControl>
                <Input {...field} />
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
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Male" id="male" />
                    <Label htmlFor="male">Male</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Female" id="female" />
                    <Label htmlFor="female">Female</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Other" id="other" />
                    <Label htmlFor="other">Other</Label>
                  </div>
                </RadioGroup>
              </FormControl>
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
                <Input {...field} />
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
              <FormControl>
                <Input {...field} />
              </FormControl>
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
              <FormControl>
                <Input {...field} />
              </FormControl>
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

      <div className="space-y-4">
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
                  Have you ever changed your nationality or obtained a resident permit?
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
                <FormLabel>Please provide details</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="space-y-4">
        <FormField
          control={form.control}
          name="personalDetails.permanentAddress"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Permanent Address *</FormLabel>
              <FormControl>
                <Textarea {...field} />
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
                <Textarea {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="personalDetails.telephone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telephone *</FormLabel>
                <FormControl>
                  <Input {...field} />
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
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      <div className="space-y-4">
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
                  Do you have a US Green Card or other US resident permit?
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
                <FormLabel>Please provide details</FormLabel>
                <FormControl>
                  <Textarea {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

      <div className="space-y-4">
        <Label>Recent Photograph (Optional)</Label>
        <div className="flex items-center space-x-4">
          <Input
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="flex-1"
          />
          {photoFile && (
            <Badge variant="secondary">
              {photoFile.name}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Upload a recent passport-style photograph
        </p>
      </div>
    </div>
  );

  const renderDependantsAndRelatives = () => (
    <div className="space-y-8">
      {/* Dependants */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Dependants</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendDependant({ name: '', dateOfBirth: new Date(), relationship: '' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Dependant
          </Button>
        </div>

        {dependantFields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`dependants.${index}.name`}
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
                  name={`dependants.${index}.dateOfBirth`}
                  render={({ field }) => (
                    <DatePicker field={field} label="Date of Birth *" />
                  )}
                />

                <FormField
                  control={form.control}
                  name={`dependants.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Son, Daughter, Spouse" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeDependant(index)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Separator />

      {/* Near Relatives */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Near Relatives Employed by UNICC or Other International Organizations</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => appendRelative({ name: '', relationship: '', organization: '' })}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Relative
          </Button>
        </div>

        {relativeFields.map((field, index) => (
          <Card key={field.id}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name={`relatives.${index}.name`}
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
                  name={`relatives.${index}.relationship`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Relationship *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Father, Mother, Sibling" />
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
                      <FormLabel>International Organization *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., UNICC, UN, WHO" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="flex justify-end mt-4">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => removeRelative(index)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderWorkPreferences = () => (
    <div className="space-y-6">
      <FormField
        control={form.control}
        name="workPreferences.typesOfWork"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Types of Work to be Considered For *</FormLabel>
            <FormControl>
              <Textarea 
                {...field} 
                placeholder="Describe the types of positions you are interested in..."
                rows={4}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="workPreferences.vacancyReference"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Vacancy Reference Number (if any)</FormLabel>
            <FormControl>
              <Input {...field} placeholder="e.g., UNICC-2024-001" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-4">
        <Label className="text-base font-medium">Acceptable Periods</Label>
        
        <FormField
          control={form.control}
          name="workPreferences.fixedTermAcceptable"
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
                  Fixed-term (&gt;= 1 year)
                </FormLabel>
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workPreferences.shortTermAcceptable"
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
                  Short-term (&lt; 1 year)
                </FormLabel>
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );

  const renderLanguageKnowledge = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Language Knowledge</h3>
          <p className="text-sm text-muted-foreground mt-1">
            * Mark your mother tongue with an asterisk
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => appendLanguage({ 
            language: '', 
            isMotherTongue: false, 
            speakLevel: '1', 
            readLevel: '1', 
            writeLevel: '1' 
          })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Language
        </Button>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Proficiency Levels:</strong><br />
          1 = Limited conversation/newsletters/routine correspondence<br />
          2 = Free discussion & write/read more difficult material<br />
          3 = Near mother tongue proficiency
        </AlertDescription>
      </Alert>

      {languageFields.map((field, index) => (
        <Card key={field.id}>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <FormField
                control={form.control}
                name={`languages.${index}.language`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Language *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`languages.${index}.speakLevel`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speak</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`languages.${index}.readLevel`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Read</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name={`languages.${index}.writeLevel`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Write</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                        <SelectItem value="3">3</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-center space-x-2">
                <FormField
                  control={form.control}
                  name={`languages.${index}.isMotherTongue`}
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <FormLabel className="text-sm">Mother Tongue</FormLabel>
                    </FormItem>
                  )}
                />
                
                {index > 1 && ( // Keep English and French
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => removeLanguage(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Continue with the rest of the render functions...
  // (Due to length constraints, I'll continue in the next part)

  const renderCurrentSection = () => {
    switch (currentSection) {
      case 0: return renderPersonalDetails();
      case 1: return renderDependantsAndRelatives();
      case 2: return renderWorkPreferences();
      case 3: return renderLanguageKnowledge();
      // Add other sections here
      default: return <div>Section not implemented yet</div>;
    }
  };

  return (
    <Form {...form}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Personal History Form (PHF)
            </CardTitle>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Section {currentSection + 1} of {SECTIONS.length}: {SECTIONS[currentSection]}</span>
                <span>{Math.round(progress)}% Complete</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardHeader>
        </Card>

        {/* Section Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {SECTIONS.map((section, index) => (
                <Button
                  key={index}
                  variant={index === currentSection ? "default" : index < currentSection ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setCurrentSection(index)}
                  className="text-xs"
                >
                  {index + 1}. {section}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Current Section */}
        <Card>
          <CardHeader>
            <CardTitle>{SECTIONS[currentSection]}</CardTitle>
          </CardHeader>
          <CardContent>
            {renderCurrentSection()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentSection(Math.max(0, currentSection - 1))}
                disabled={currentSection === 0}
              >
                Previous
              </Button>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndContinue}
                  disabled={isSubmitting}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Progress
                </Button>

                {currentSection === SECTIONS.length - 1 ? (
                  <Button
                    onClick={form.handleSubmit(handleSubmit)}
                    disabled={isSubmitting}
                  >
                    Submit PHF
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={() => setCurrentSection(Math.min(SECTIONS.length - 1, currentSection + 1))}
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Form>
  );
}