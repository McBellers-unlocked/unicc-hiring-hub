import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User } from 'lucide-react';
import { StaffSearchCombobox, StaffMember, parseName } from './StaffSearchCombobox';
import { Badge } from '@/components/ui/badge';
import { HR_FOCAL_POINTS } from '@/lib/hrFocalPoints';
import { GRADES, CONTRACT_TYPES, LOCATIONS, DIVISIONS, DIVISION_UNITS, detectDivisionFromUnit } from '@/lib/organizationConstants';

const stdaSchema = z.object({
  last_name: z.string().min(1, 'Last name is required'),
  first_name: z.string().min(1, 'First name is required'),
  email: z.string().email('Invalid email').optional().nullable().or(z.literal('')),
  staff_number: z.string().optional().nullable().or(z.literal('')),
  operation_type: z.enum(['STDA', 'OIC', 'Reassignment']),
  status: z.enum(['Not started', 'In progress', 'Completed', 'Cancelled']),
  start_date: z.string().optional().nullable().or(z.literal('')),
  end_date: z.string().optional().nullable().or(z.literal('')),
  job_title: z.string().optional().nullable().or(z.literal('')),
  grade: z.string().optional().nullable().or(z.literal('')),
  contract_type: z.string().optional().nullable().or(z.literal('')),
  duty_station: z.string().optional().nullable().or(z.literal('')),
  section_unit: z.string().optional().nullable().or(z.literal('')),
  supervisor: z.string().optional().nullable().or(z.literal('')),
  old_pd: z.string().optional().nullable().or(z.literal('')),
  new_pd: z.string().optional().nullable().or(z.literal('')),
  vacancy_reference: z.string().optional().nullable().or(z.literal('')),
  main_hr_focal_point: z.string().optional().nullable().or(z.literal('')),
  comments: z.string().optional().nullable().or(z.literal('')),
  actions_in_hr_plan: z.string().optional().nullable().or(z.literal('')),
  original_job_title: z.string().optional().nullable().or(z.literal('')),
  original_grade: z.string().optional().nullable().or(z.literal('')),
  original_unit: z.string().optional().nullable().or(z.literal('')),
});

export type STDAFormData = z.infer<typeof stdaSchema> & {
  selectedUserId?: string | null;
};

interface STDAFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: STDAFormData) => Promise<void>;
  initialData?: Partial<STDAFormData>;
  isLoading?: boolean;
}

export const STDAForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: STDAFormProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [linkedStaffName, setLinkedStaffName] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [supervisorStaffName, setSupervisorStaffName] = useState<string | null>(null);

  const form = useForm<STDAFormData>({
    resolver: zodResolver(stdaSchema),
    defaultValues: {
      last_name: '',
      first_name: '',
      email: '',
      staff_number: '',
      operation_type: 'STDA',
      status: 'Not started',
      start_date: '',
      end_date: '',
      job_title: '',
      grade: '',
      contract_type: '',
      duty_station: '',
      section_unit: '',
      supervisor: '',
      old_pd: '',
      new_pd: '',
      vacancy_reference: '',
      main_hr_focal_point: '',
      comments: '',
      actions_in_hr_plan: '',
      original_job_title: '',
      original_grade: '',
      original_unit: '',
    },
  });

  // Reset form when dialog opens with initialData (for edit mode)
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        last_name: initialData.last_name || '',
        first_name: initialData.first_name || '',
        email: initialData.email || '',
        staff_number: initialData.staff_number || '',
        operation_type: initialData.operation_type || 'STDA',
        status: initialData.status || 'Not started',
        start_date: initialData.start_date || '',
        end_date: initialData.end_date || '',
        job_title: initialData.job_title || '',
        grade: initialData.grade || '',
        contract_type: initialData.contract_type || '',
        duty_station: initialData.duty_station || '',
        section_unit: initialData.section_unit || '',
        supervisor: initialData.supervisor || '',
        old_pd: initialData.old_pd || '',
        new_pd: initialData.new_pd || '',
        vacancy_reference: initialData.vacancy_reference || '',
        main_hr_focal_point: initialData.main_hr_focal_point || '',
        comments: initialData.comments || '',
        actions_in_hr_plan: initialData.actions_in_hr_plan || '',
        original_job_title: initialData.original_job_title || '',
        original_grade: initialData.original_grade || '',
        original_unit: initialData.original_unit || '',
      });
      setSelectedUserId(initialData.selectedUserId || null);
      setLinkedStaffName(initialData.first_name && initialData.last_name 
        ? `${initialData.first_name} ${initialData.last_name}` 
        : null);
      setSelectedDivision(detectDivisionFromUnit(initialData.section_unit || '') || '');
      setSupervisorStaffName(initialData.supervisor || null);
    } else if (open && !initialData) {
      form.reset({
        last_name: '',
        first_name: '',
        email: '',
        staff_number: '',
        operation_type: 'STDA',
        status: 'Not started',
        start_date: '',
        end_date: '',
        job_title: '',
        grade: '',
        contract_type: '',
        duty_station: '',
        section_unit: '',
        supervisor: '',
        old_pd: '',
        new_pd: '',
        vacancy_reference: '',
        main_hr_focal_point: '',
        comments: '',
        actions_in_hr_plan: '',
        original_job_title: '',
        original_grade: '',
        original_unit: '',
      });
      setSelectedUserId(null);
      setLinkedStaffName(null);
      setSelectedDivision('');
      setSupervisorStaffName(null);
    }
  }, [open, initialData, form]);

  const handleStaffSelect = (staff: StaffMember) => {
    const { firstName, lastName } = parseName(staff.name);
    
    // Set form values
    form.setValue('last_name', lastName);
    form.setValue('first_name', firstName);
    form.setValue('email', staff.email || '');
    form.setValue('staff_number', staff.staff_number || '');
    
    // Store original position data
    form.setValue('original_job_title', staff.job_title || '');
    form.setValue('original_grade', staff.grade || '');
    form.setValue('original_unit', staff.section_unit || '');
    
    // Pre-fill duty station from their current position
    form.setValue('duty_station', staff.duty_station || '');
    
    setSelectedUserId(staff.id);
    setLinkedStaffName(staff.name);
    setSelectedDivision(detectDivisionFromUnit(staff.section_unit || '') || '');
  };

  const handleSupervisorSelect = (staff: StaffMember) => {
    form.setValue('supervisor', staff.name);
    setSupervisorStaffName(staff.name);
    if (staff.section_unit) {
      form.setValue('section_unit', staff.section_unit);
      const div = detectDivisionFromUnit(staff.section_unit);
      if (div) setSelectedDivision(div);
    }
    if (staff.duty_station) {
      form.setValue('duty_station', staff.duty_station);
    }
  };

  const handleSubmit = async (data: STDAFormData) => {
    await onSubmit({ ...data, selectedUserId });
    form.reset();
    setSelectedUserId(null);
    setLinkedStaffName(null);
  };

  const isEditing = !!initialData?.last_name;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit STDA' : 'Add New STDA'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="staff" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="staff">Staff</TabsTrigger>
                <TabsTrigger value="assignment">Assignment</TabsTrigger>
                <TabsTrigger value="position">Position</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
              </TabsList>

              <TabsContent value="staff" className="space-y-4 mt-4">
                {/* Staff Search */}
                {!isEditing && (
                  <div className="space-y-2">
                    <FormLabel>Search Existing Staff</FormLabel>
                    <StaffSearchCombobox
                      onSelect={handleStaffSelect}
                      selectedStaffId={selectedUserId}
                    />
                    {linkedStaffName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Linked to: <Badge variant="outline">{linkedStaffName}</Badge></span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Search by name or email to auto-fill fields, or enter details manually below
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="BAHILO" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Paloma" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" placeholder="bahilo@unicc.org" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="staff_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Staff Number</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="S123456" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Original Position (read-only display) */}
                {(form.watch('original_job_title') || form.watch('original_grade')) && (
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-medium">Original Position</p>
                    <div className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="text-xs">Title:</span>
                        <p>{form.watch('original_job_title') || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs">Grade:</span>
                        <p>{form.watch('original_grade') || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs">Unit:</span>
                        <p>{form.watch('original_unit') || '—'}</p>
                      </div>
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="assignment" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operation_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operation Type *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="STDA">STDA</SelectItem>
                            <SelectItem value="OIC">OIC (Officer-in-Charge)</SelectItem>
                            <SelectItem value="Reassignment">Reassignment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not started">Not Started</SelectItem>
                            <SelectItem value="In progress">In Progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="start_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="end_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vacancy_reference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacancy Reference</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="STDA-25-VAL-3" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="position" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="job_title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Business Relationship Officer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="grade"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Grade</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select grade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {GRADES.map((g) => (
                              <SelectItem key={g} value={g}>{g}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contract_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contract Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select contract type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {CONTRACT_TYPES.map((ct) => (
                              <SelectItem key={ct} value={ct}>{ct}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="duty_station"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duty Station</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select duty station" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {LOCATIONS.map((loc) => (
                              <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-4">
                    <FormItem>
                      <FormLabel>Division</FormLabel>
                      <Select
                        value={selectedDivision}
                        onValueChange={(val) => {
                          setSelectedDivision(val);
                          form.setValue('section_unit', '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select division" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DIVISIONS).map(([code, label]) => (
                            <SelectItem key={code} value={code}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormItem>
                    <FormField
                      control={form.control}
                      name="section_unit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section/Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''} disabled={!selectedDivision}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder={selectedDivision ? "Select section/unit" : "Select division first"} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {(DIVISION_UNITS[selectedDivision] || []).map((unit) => (
                                <SelectItem key={unit} value={unit}>{unit}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <FormLabel>New Supervisor</FormLabel>
                  <StaffSearchCombobox
                    onSelect={handleSupervisorSelect}
                    selectedStaffId={null}
                    disabled={false}
                  />
                  {supervisorStaffName && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <Badge variant="outline">{supervisorStaffName}</Badge>
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="old_pd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Old PD</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="417395" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="new_pd"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New PD</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="423004" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="main_hr_focal_point"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>HR Focal Point</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select HR focal point" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {HR_FOCAL_POINTS.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Add any relevant notes..."
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="actions_in_hr_plan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Actions in HR Plan</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Administrative actions required..."
                          className="min-h-[80px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update STDA' : 'Create STDA'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
