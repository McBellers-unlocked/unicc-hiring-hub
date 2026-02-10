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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User } from 'lucide-react';
import { StaffSearchCombobox, StaffMember, parseName } from './StaffSearchCombobox';
import { Badge } from '@/components/ui/badge';
import { HR_FOCAL_POINTS } from '@/lib/hrFocalPoints';

const appointmentSchema = z.object({
  last_name: z.string().min(1, 'Last name is required'),
  first_name: z.string().min(1, 'First name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  operation_type: z.enum(['Appointment', 'Appointment (CB)', 'Direct Appointment']),
  status: z.enum(['Not started', 'In progress', 'Completed', 'Cancelled']),
  tentative_date: z.string().optional().nullable().or(z.literal('')),
  effective_date: z.string().optional().nullable().or(z.literal('')),
  job_title: z.string().optional().nullable().or(z.literal('')),
  grade: z.string().optional().nullable().or(z.literal('')),
  contract_type: z.string().optional().nullable().or(z.literal('')),
  duty_station: z.string().optional().nullable().or(z.literal('')),
  section_unit: z.string().optional().nullable().or(z.literal('')),
  supervisor: z.string().optional().nullable().or(z.literal('')),
  old_po: z.string().optional().nullable().or(z.literal('')),
  new_po: z.string().optional().nullable().or(z.literal('')),
  vacancy_reference: z.string().optional().nullable().or(z.literal('')),
  main_hr_focal_point: z.string().optional().nullable().or(z.literal('')),
  recruitment_type: z.string().optional().nullable().or(z.literal('')),
  is_international: z.boolean().optional().nullable().default(false),
  notice_days_required: z.number().min(0).max(365).optional().nullable().default(0),
  comments: z.string().optional().nullable().or(z.literal('')),
  onboarding_comments: z.string().optional().nullable().or(z.literal('')),
  actions_in_hr_plan: z.string().optional().nullable().or(z.literal('')),
});

export type AppointmentFormData = z.infer<typeof appointmentSchema> & {
  selectedUserId?: string | null;
};

interface AppointmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AppointmentFormData) => Promise<void>;
  initialData?: Partial<AppointmentFormData>;
  isLoading?: boolean;
}

export const AppointmentForm = ({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading,
}: AppointmentFormProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [linkedStaffName, setLinkedStaffName] = useState<string | null>(null);

  const form = useForm<AppointmentFormData>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      last_name: '',
      first_name: '',
      email: '',
      operation_type: 'Appointment',
      status: 'Not started',
      tentative_date: '',
      effective_date: '',
      job_title: '',
      grade: '',
      contract_type: '',
      duty_station: '',
      section_unit: '',
      supervisor: '',
      old_po: '',
      new_po: '',
      vacancy_reference: '',
      main_hr_focal_point: '',
      recruitment_type: 'Newcomer',
      is_international: false,
      notice_days_required: 30,
      comments: '',
      onboarding_comments: '',
      actions_in_hr_plan: '',
    },
  });

  // Reset form when dialog opens with initialData (for edit mode)
  useEffect(() => {
    if (open && initialData) {
      form.reset({
        last_name: initialData.last_name || '',
        first_name: initialData.first_name || '',
        email: initialData.email || '',
        operation_type: initialData.operation_type || 'Appointment',
        status: initialData.status || 'Not started',
        tentative_date: initialData.tentative_date || '',
        effective_date: initialData.effective_date || '',
        job_title: initialData.job_title || '',
        grade: initialData.grade || '',
        contract_type: initialData.contract_type || '',
        duty_station: initialData.duty_station || '',
        section_unit: initialData.section_unit || '',
        supervisor: initialData.supervisor || '',
        old_po: initialData.old_po || '',
        new_po: initialData.new_po || '',
        vacancy_reference: initialData.vacancy_reference || '',
        main_hr_focal_point: initialData.main_hr_focal_point || '',
        recruitment_type: initialData.recruitment_type || 'Newcomer',
        is_international: initialData.is_international ?? false,
        notice_days_required: initialData.notice_days_required ?? 30,
        comments: initialData.comments || '',
        onboarding_comments: initialData.onboarding_comments || '',
        actions_in_hr_plan: initialData.actions_in_hr_plan || '',
      });
      setSelectedUserId(initialData.selectedUserId || null);
      setLinkedStaffName(initialData.first_name && initialData.last_name ? `${initialData.first_name} ${initialData.last_name}` : null);
    } else if (open && !initialData) {
      // Reset to empty for new appointments
      form.reset({
        last_name: '',
        first_name: '',
        email: '',
        operation_type: 'Appointment',
        status: 'Not started',
        tentative_date: '',
        effective_date: '',
        job_title: '',
        grade: '',
        contract_type: '',
        duty_station: '',
        section_unit: '',
        supervisor: '',
        old_po: '',
        new_po: '',
        vacancy_reference: '',
        main_hr_focal_point: '',
        recruitment_type: 'Newcomer',
        is_international: false,
        notice_days_required: 30,
        comments: '',
        onboarding_comments: '',
        actions_in_hr_plan: '',
      });
      setSelectedUserId(null);
      setLinkedStaffName(null);
    }
  }, [open, initialData, form]);

  const handleStaffSelect = (staff: StaffMember) => {
    const { firstName, lastName } = parseName(staff.name);
    
    form.setValue('last_name', lastName);
    form.setValue('first_name', firstName);
    form.setValue('email', staff.email || '');
    form.setValue('grade', staff.grade || '');
    form.setValue('job_title', staff.job_title || '');
    form.setValue('duty_station', staff.duty_station || '');
    form.setValue('section_unit', staff.section_unit || '');
    form.setValue('supervisor', staff.supervisor || '');
    form.setValue('is_international', staff.is_international);
    
    setSelectedUserId(staff.id);
    setLinkedStaffName(staff.name);
  };

  const handleSubmit = async (data: AppointmentFormData) => {
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
            {isEditing ? 'Edit Appointment' : 'Add New Appointment'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="person" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="person">Person</TabsTrigger>
                <TabsTrigger value="position">Position</TabsTrigger>
                <TabsTrigger value="tracking">Tracking</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="person" className="space-y-4 mt-4">
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
                          <Input {...field} placeholder="VILLA SOSPEDRA" />
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
                          <Input {...field} placeholder="Rocio" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="rocio.villa@unicc.org" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="operation_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Operation Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Appointment">Appointment</SelectItem>
                            <SelectItem value="Appointment (CB)">Appointment (CB)</SelectItem>
                            <SelectItem value="Direct Appointment">Direct Appointment</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="recruitment_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Recruitment Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Newcomer">Newcomer</SelectItem>
                            <SelectItem value="Internal">Internal</SelectItem>
                            <SelectItem value="CB Return">CB Return</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_international"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel>International Staff</FormLabel>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
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
                      <FormLabel>Job Title</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Database Systems Technician" />
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
                        <FormLabel>Grade</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="P3" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} placeholder="Temporary" />
                        </FormControl>
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
                        <FormControl>
                          <Input {...field} placeholder="Valencia" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="section_unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section/Unit</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="CSA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="supervisor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supervisor</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="E. Magallo" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="old_po"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Old PO</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="440893" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="new_po"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New PO</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="46013" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="vacancy_reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vacancy Ref</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="ICC/25/VAL/1" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="tracking" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Not started">Not started</SelectItem>
                            <SelectItem value="In progress">In progress</SelectItem>
                            <SelectItem value="Completed">Completed</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="tentative_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tentative Start Date</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="effective_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Effective Date</FormLabel>
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
                  name="notice_days_required"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notice Days Required</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number" 
                          min={0} 
                          max={365}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="notes" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Medical clearance details, other notes..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="onboarding_comments"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Onboarding Comments</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          placeholder="Position linked, TA submitted..."
                          rows={3}
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
                          placeholder="Contract initiated in GSM..."
                          rows={3}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Update' : 'Create'} Appointment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
