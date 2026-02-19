import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, User, ArrowRight } from 'lucide-react';
import { StaffSearchCombobox, StaffMember, parseName } from './StaffSearchCombobox';
import { Badge } from '@/components/ui/badge';
import { HR_FOCAL_POINTS } from '@/lib/hrFocalPoints';
import { GRADES, CONTRACT_TYPES, LOCATIONS, DIVISIONS, DIVISION_UNITS, detectDivisionFromUnit } from '@/lib/organizationConstants';

const transferSchema = z.object({
  last_name: z.string().min(1, 'Last name is required'),
  first_name: z.string().min(1, 'First name is required'),
  email: z.string().optional().nullable().or(z.literal('')),
  staff_number: z.string().optional().nullable().or(z.literal('')),
  operation_type: z.string().min(1, 'Operation type is required'),
  status: z.string().min(1, 'Status is required'),
  start_date: z.string().optional().nullable().or(z.literal('')),
  end_date: z.string().optional().nullable().or(z.literal('')),
  job_title: z.string().optional().nullable().or(z.literal('')),
  grade: z.string().optional().nullable().or(z.literal('')),
  contract_type: z.string().optional().nullable().or(z.literal('')),
  duty_station: z.string().optional().nullable().or(z.literal('')),
  section_unit: z.string().optional().nullable().or(z.literal('')),
  supervisor: z.string().optional().nullable().or(z.literal('')),
  main_hr_focal_point: z.string().optional().nullable().or(z.literal('')),
  comments: z.string().optional().nullable().or(z.literal('')),
  change_types: z.array(z.string()).optional().nullable(),
  new_duty_station: z.string().optional().nullable().or(z.literal('')),
  new_section_unit: z.string().optional().nullable().or(z.literal('')),
  new_supervisor: z.string().optional().nullable().or(z.literal('')),
  new_job_title: z.string().optional().nullable().or(z.literal('')),
  new_grade: z.string().optional().nullable().or(z.literal('')),
  new_contract_type: z.string().optional().nullable().or(z.literal('')),
});

export type TransferFormData = z.infer<typeof transferSchema> & {
  selectedUserId?: string | null;
};

interface TransferFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TransferFormData) => Promise<void>;
  initialData?: Partial<TransferFormData>;
  isLoading?: boolean;
}

const OPERATION_TYPES = ['Reassignment', 'STDA', 'STDA Extension', 'OIC', 'OIC Extension', 'Transfer'];
const STATUSES = ['Not started', 'In progress', 'Pending action (UNICC)', 'Pending Action (External)', 'Cancelled', 'Completed', 'Follow up'];

const CHANGE_TYPE_OPTIONS = [
  { value: 'unit_division', label: 'Unit / Division Change' },
  { value: 'supervisor', label: 'Supervisor Change' },
  { value: 'duty_station', label: 'Duty Station Change' },
  { value: 'job_title', label: 'Job Title Change' },
  { value: 'grade', label: 'Grade Change' },
  { value: 'contract_type', label: 'Contract Type Change' },
] as const;

export const TransferForm = ({ open, onOpenChange, onSubmit, initialData, isLoading }: TransferFormProps) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [linkedStaffName, setLinkedStaffName] = useState<string | null>(null);
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [supervisorStaffName, setSupervisorStaffName] = useState<string | null>(null);
  const [newDivision, setNewDivision] = useState<string>('');
  const [newSupervisorName, setNewSupervisorName] = useState<string | null>(null);

  const defaults = {
    last_name: '', first_name: '', email: '', staff_number: '',
    operation_type: 'Reassignment', status: 'Not started',
    start_date: '', end_date: '', job_title: '', grade: '',
    contract_type: '', duty_station: '', section_unit: '',
    supervisor: '', main_hr_focal_point: '', comments: '',
    change_types: [] as string[], new_duty_station: '', new_section_unit: '', new_supervisor: '',
    new_job_title: '', new_grade: '', new_contract_type: '',
  };

  const form = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: defaults,
  });

  const operationType = form.watch('operation_type');
  const changeTypes = form.watch('change_types') || [];
  const isTransferOrReassignment = operationType === 'Transfer' || operationType === 'Reassignment';

  useEffect(() => {
    if (open && initialData) {
      form.reset({ ...defaults, ...Object.fromEntries(Object.entries(initialData).map(([k, v]) => [k, v || (k === 'change_types' ? [] : '')])) });
      setSelectedUserId(initialData.selectedUserId || null);
      setLinkedStaffName(initialData.first_name && initialData.last_name ? `${initialData.first_name} ${initialData.last_name}` : null);
      setSelectedDivision(detectDivisionFromUnit(initialData.section_unit || '') || '');
      setSupervisorStaffName(initialData.supervisor || null);
      setNewDivision(detectDivisionFromUnit(initialData.new_section_unit || '') || '');
      setNewSupervisorName(initialData.new_supervisor || null);
    } else if (open && !initialData) {
      form.reset(defaults);
      setSelectedUserId(null);
      setLinkedStaffName(null);
      setSelectedDivision('');
      setSupervisorStaffName(null);
      setNewDivision('');
      setNewSupervisorName(null);
    }
  }, [open, initialData, form]);

  const handleStaffSelect = (staff: StaffMember) => {
    const { firstName, lastName } = parseName(staff.name);
    form.setValue('last_name', lastName);
    form.setValue('first_name', firstName);
    form.setValue('email', staff.email || '');
    form.setValue('staff_number', staff.staff_number || '');
    form.setValue('job_title', staff.job_title || '');
    form.setValue('grade', staff.grade || '');
    form.setValue('duty_station', staff.duty_station || '');
    form.setValue('section_unit', staff.section_unit || '');
    form.setValue('supervisor', staff.supervisor || '');
    setSelectedUserId(staff.id);
    setLinkedStaffName(staff.name);
    setSelectedDivision(detectDivisionFromUnit(staff.section_unit || '') || '');
    setSupervisorStaffName(staff.supervisor || null);
  };

  const handleSupervisorSelect = (staff: StaffMember) => {
    form.setValue('supervisor', staff.name);
    setSupervisorStaffName(staff.name);
    if (staff.section_unit) {
      form.setValue('section_unit', staff.section_unit);
      const div = detectDivisionFromUnit(staff.section_unit);
      if (div) setSelectedDivision(div);
    }
    if (staff.duty_station) form.setValue('duty_station', staff.duty_station);
  };

  const handleNewSupervisorSelect = (staff: StaffMember) => {
    form.setValue('new_supervisor', staff.name);
    setNewSupervisorName(staff.name);
  };

  const toggleChangeType = (value: string) => {
    const current = form.getValues('change_types') || [];
    const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
    form.setValue('change_types', updated);
    // Clear new values when unchecked
    if (!updated.includes('unit_division')) {
      form.setValue('new_section_unit', '');
      setNewDivision('');
    }
    if (!updated.includes('supervisor')) {
      form.setValue('new_supervisor', '');
      setNewSupervisorName(null);
    }
    if (!updated.includes('duty_station')) {
      form.setValue('new_duty_station', '');
    }
    if (!updated.includes('job_title')) {
      form.setValue('new_job_title', '');
    }
    if (!updated.includes('grade')) {
      form.setValue('new_grade', '');
    }
    if (!updated.includes('contract_type')) {
      form.setValue('new_contract_type', '');
    }
  };

  const handleSubmit = async (data: TransferFormData) => {
    // Clear change type fields if not Transfer/Reassignment
    if (data.operation_type !== 'Transfer' && data.operation_type !== 'Reassignment') {
      data.change_types = null;
      data.new_duty_station = null;
      data.new_section_unit = null;
      data.new_supervisor = null;
      data.new_job_title = null;
      data.new_grade = null;
      data.new_contract_type = null;
    }
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
          <DialogTitle>{isEditing ? 'Edit Transfer' : 'Add New Transfer'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <Tabs defaultValue="person" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="person">Person</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="person" className="space-y-4 mt-4">
                {!isEditing && (
                  <div className="space-y-2">
                    <FormLabel>Search Existing Staff</FormLabel>
                    <StaffSearchCombobox onSelect={handleStaffSelect} selectedStaffId={selectedUserId} />
                    {linkedStaffName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="h-4 w-4" />
                        <span>Linked to: <Badge variant="outline">{linkedStaffName}</Badge></span>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">Search by name or email to auto-fill fields</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="last_name" render={({ field }) => (
                    <FormItem><FormLabel>Last Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="first_name" render={({ field }) => (
                    <FormItem><FormLabel>First Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="staff_number" render={({ field }) => (
                    <FormItem><FormLabel>Staff Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="operation_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Operation Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {OPERATION_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4 mt-4">
                <FormField control={form.control} name="job_title" render={({ field }) => (
                  <FormItem><FormLabel>Job Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="grade" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Grade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger></FormControl>
                        <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="contract_type" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ''}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>{CONTRACT_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                {/* Transfer/Reassignment: Change Type Section */}
                {isTransferOrReassignment ? (
                  <>
                    {/* Current Details (read-only) */}
                    <div className="rounded-md border p-4 bg-muted/30 space-y-2">
                      <h4 className="text-sm font-semibold text-muted-foreground">Current Details</h4>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                        <div><span className="text-muted-foreground">Duty Station:</span> {form.getValues('duty_station') || '—'}</div>
                        <div><span className="text-muted-foreground">Supervisor:</span> {form.getValues('supervisor') || '—'}</div>
                        <div><span className="text-muted-foreground">Division:</span> {selectedDivision ? DIVISIONS[selectedDivision] || selectedDivision : '—'}</div>
                        <div><span className="text-muted-foreground">Unit:</span> {form.getValues('section_unit') || '—'}</div>
                      </div>
                    </div>

                    {/* What is changing? */}
                    <div className="space-y-3">
                      <FormLabel>What is changing?</FormLabel>
                      <div className="flex flex-wrap gap-4">
                        {CHANGE_TYPE_OPTIONS.map(opt => (
                          <div key={opt.value} className="flex items-center space-x-2">
                            <Checkbox
                              id={`change-${opt.value}`}
                              checked={changeTypes.includes(opt.value)}
                              onCheckedChange={() => toggleChangeType(opt.value)}
                            />
                            <label htmlFor={`change-${opt.value}`} className="text-sm cursor-pointer">{opt.label}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* New Unit/Division */}
                    {changeTypes.includes('unit_division') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Unit / Division Change</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <FormLabel>New Division</FormLabel>
                            <Select value={newDivision} onValueChange={(v) => {
                              setNewDivision(v);
                              form.setValue('new_section_unit', '');
                            }}>
                              <SelectTrigger><SelectValue placeholder="Select new division" /></SelectTrigger>
                              <SelectContent>
                                {Object.entries(DIVISIONS).map(([code, name]) => (
                                  <SelectItem key={code} value={code}>{name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {newDivision && (
                            <FormField control={form.control} name="new_section_unit" render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Unit</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ''}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Select new unit" /></SelectTrigger></FormControl>
                                  <SelectContent>
                                    {(DIVISION_UNITS[newDivision] || []).map(u => (
                                      <SelectItem key={u} value={u}>{u}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )} />
                          )}
                        </div>
                        {form.getValues('section_unit') && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {form.getValues('section_unit')} <ArrowRight className="h-3 w-3" /> {form.getValues('new_section_unit') || '(not selected)'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* New Supervisor */}
                    {changeTypes.includes('supervisor') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Supervisor Change</Badge>
                        </div>
                        <div className="space-y-2">
                          <FormLabel>New Supervisor</FormLabel>
                          <StaffSearchCombobox onSelect={handleNewSupervisorSelect} selectedStaffId={null} />
                          {newSupervisorName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              {form.getValues('supervisor') || '(none)'} <ArrowRight className="h-3 w-3" /> {newSupervisorName}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* New Duty Station */}
                    {changeTypes.includes('duty_station') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Duty Station Change</Badge>
                        </div>
                        <FormField control={form.control} name="new_duty_station" render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Duty Station</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select new duty station" /></SelectTrigger></FormControl>
                              <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {form.getValues('duty_station') && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {form.getValues('duty_station')} <ArrowRight className="h-3 w-3" /> {form.getValues('new_duty_station') || '(not selected)'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* New Job Title */}
                    {changeTypes.includes('job_title') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Job Title Change</Badge>
                        </div>
                        <FormField control={form.control} name="new_job_title" render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Job Title / Function</FormLabel>
                            <FormControl><Input {...field} placeholder="Enter new job title" /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {form.getValues('job_title') && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {form.getValues('job_title')} <ArrowRight className="h-3 w-3" /> {form.getValues('new_job_title') || '(not entered)'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* New Grade */}
                    {changeTypes.includes('grade') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Grade Change</Badge>
                        </div>
                        <FormField control={form.control} name="new_grade" render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Grade</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select new grade" /></SelectTrigger></FormControl>
                              <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {form.getValues('grade') && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {form.getValues('grade')} <ArrowRight className="h-3 w-3" /> {form.getValues('new_grade') || '(not selected)'}
                          </p>
                        )}
                      </div>
                    )}

                    {/* New Contract Type */}
                    {changeTypes.includes('contract_type') && (
                      <div className="rounded-md border p-4 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Badge variant="outline">Contract Type Change</Badge>
                        </div>
                        <FormField control={form.control} name="new_contract_type" render={({ field }) => (
                          <FormItem>
                            <FormLabel>New Contract Type</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value || ''}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Select new contract type" /></SelectTrigger></FormControl>
                              <SelectContent>{CONTRACT_TYPES.map(ct => <SelectItem key={ct} value={ct}>{ct}</SelectItem>)}</SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )} />
                        {form.getValues('contract_type') && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {form.getValues('contract_type')} <ArrowRight className="h-3 w-3" /> {form.getValues('new_contract_type') || '(not selected)'}
                          </p>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  /* Non-Transfer/Reassignment: existing editable fields */
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="duty_station" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duty Station</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select location" /></SelectTrigger></FormControl>
                            <SelectContent>{LOCATIONS.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <div className="space-y-2">
                        <FormLabel>Division</FormLabel>
                        <Select value={selectedDivision} onValueChange={(v) => {
                          setSelectedDivision(v);
                          form.setValue('section_unit', '');
                        }}>
                          <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(DIVISIONS).map(([code, name]) => (
                              <SelectItem key={code} value={code}>{name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {selectedDivision && (
                      <FormField control={form.control} name="section_unit" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section / Unit</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ''}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {(DIVISION_UNITS[selectedDivision] || []).map(u => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    )}
                    <div className="space-y-2">
                      <FormLabel>Supervisor</FormLabel>
                      <StaffSearchCombobox onSelect={handleSupervisorSelect} selectedStaffId={null} />
                      {supervisorStaffName && (
                        <p className="text-xs text-muted-foreground">Selected: {supervisorStaffName}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="start_date" render={({ field }) => (
                    <FormItem><FormLabel>Start Date</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="end_date" render={({ field }) => (
                    <FormItem><FormLabel>End Date</FormLabel><FormControl><Input {...field} type="date" /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="main_hr_focal_point" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main HR Focal Point</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select HR focal point" /></SelectTrigger></FormControl>
                      <SelectContent>{HR_FOCAL_POINTS.map(fp => <SelectItem key={fp} value={fp}>{fp}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="comments" render={({ field }) => (
                  <FormItem><FormLabel>Comments</FormLabel><FormControl><Textarea {...field} rows={3} /></FormControl><FormMessage /></FormItem>
                )} />
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {isEditing ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
