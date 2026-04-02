import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StaffSearchCombobox } from '@/components/operations/StaffSearchCombobox';
import { Loader2, User, Calendar, Briefcase } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const affiliateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  affiliate_type: z.string().min(1, 'Affiliate type is required'),
  division: z.string().optional(),
  unit: z.string().optional(),
  job_title: z.string().optional(),
  line_manager: z.string().optional(),
  duty_station: z.string().optional(),
  contract_start_date: z.string().optional(),
  contract_end_date: z.string().optional(),
  current_grade: z.string().optional(),
  staff_number: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  first_incumbency_date: z.string().optional(),
  samsaran_pr: z.string().optional(),
  days_worked: z.coerce.number().optional(),
});

export type AffiliateFormData = z.infer<typeof affiliateSchema>;

interface AffiliateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AffiliateFormData, existingUserId?: string) => Promise<void>;
  initialData?: Partial<AffiliateFormData> & { id?: string };
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

interface StaffMember {
  id: string;
  name: string;
  email: string;
  job_title?: string;
  duty_station?: string;
  grade?: string;
  supervisor?: string;
  division?: string;
  unit?: string;
  staff_number?: string;
}

export function AffiliateForm({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isLoading = false,
  mode,
}: AffiliateFormProps) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    initialData?.id || null
  );
  const [activeTab, setActiveTab] = useState('personal');

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<AffiliateFormData>({
    resolver: zodResolver(affiliateSchema),
    defaultValues: {
      name: '',
      email: '',
      affiliate_type: '',
      division: '',
      unit: '',
      job_title: '',
      line_manager: '',
      duty_station: '',
      contract_start_date: '',
      contract_end_date: '',
      current_grade: '',
      staff_number: '',
      nationality: '',
      gender: '',
      first_incumbency_date: '',
      samsaran_pr: '',
      days_worked: undefined,
    },
  });

  // Reset form when dialog opens/closes or initialData changes
  useEffect(() => {
    if (open) {
      if (initialData) {
        reset({
          name: initialData.name || '',
          email: initialData.email || '',
          affiliate_type: initialData.affiliate_type || '',
          division: initialData.division || '',
          unit: initialData.unit || '',
          job_title: initialData.job_title || '',
          line_manager: initialData.line_manager || '',
          duty_station: initialData.duty_station || '',
          contract_start_date: initialData.contract_start_date || '',
          contract_end_date: initialData.contract_end_date || '',
          current_grade: initialData.current_grade || '',
          staff_number: initialData.staff_number || '',
          nationality: initialData.nationality || '',
          gender: initialData.gender || '',
          first_incumbency_date: initialData.first_incumbency_date || '',
           samsaran_pr: (initialData as any).samsaran_pr || '',
           days_worked: (initialData as any).days_worked ?? undefined,
        });
        setSelectedUserId(initialData.id || null);
      } else {
        reset({
          name: '',
          email: '',
          affiliate_type: '',
          division: '',
          unit: '',
          job_title: '',
          line_manager: '',
          duty_station: '',
          contract_start_date: '',
          contract_end_date: '',
          current_grade: '',
          staff_number: '',
          nationality: '',
          gender: '',
          first_incumbency_date: '',
          samsaran_pr: '',
          days_worked: undefined,
        });
        setSelectedUserId(null);
      }
      setActiveTab('personal');
    }
  }, [open, initialData, reset]);

  const handleStaffSelect = (staff: StaffMember) => {
    setValue('name', staff.name);
    setValue('email', staff.email);
    setValue('job_title', staff.job_title || '');
    setValue('duty_station', staff.duty_station || '');
    setValue('current_grade', staff.grade || '');
    setValue('line_manager', staff.supervisor || '');
    setValue('division', staff.division || '');
    setValue('unit', staff.unit || '');
    setValue('staff_number', staff.staff_number || '');
    setSelectedUserId(staff.id);
  };

  const handleFormSubmit = async (data: AffiliateFormData) => {
    await onSubmit(data, selectedUserId || undefined);
  };

  const handleNext = async () => {
    if (activeTab === 'personal') {
      const valid = await trigger(['name', 'affiliate_type']);
      if (valid) setActiveTab('contract');
    } else if (activeTab === 'contract') {
      setActiveTab('assignment');
    }
  };

  const handleFinalSubmit = () => {
    handleSubmit(handleFormSubmit)();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && activeTab !== 'assignment') {
      e.preventDefault();
      handleNext();
    }
  };

  const contractStartDate = watch('contract_start_date');
  const contractEndDate = watch('contract_end_date');
  const firstIncumbencyDate = watch('first_incumbency_date');
  const affiliateType = watch('affiliate_type');
  const gender = watch('gender');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Affiliate' : 'Edit Affiliate'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyDown} className="space-y-4">
          {mode === 'create' && (
            <div className="space-y-2">
              <Label>Search Existing Staff (Optional)</Label>
              <StaffSearchCombobox onSelect={handleStaffSelect} />
              <p className="text-xs text-muted-foreground">
                Search for an existing person to auto-populate fields, or enter details manually below.
              </p>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal" className="flex items-center gap-2 pointer-events-none">
                <User className="h-4 w-4" />
                Personal
              </TabsTrigger>
              <TabsTrigger value="contract" className="flex items-center gap-2 pointer-events-none">
                <Calendar className="h-4 w-4" />
                Contract
              </TabsTrigger>
              <TabsTrigger value="assignment" className="flex items-center gap-2 pointer-events-none">
                <Briefcase className="h-4 w-4" />
                Assignment
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    {...register('name')}
                    placeholder="Full name"
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email {mode === 'edit' && <span className="text-destructive">*</span>}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="email@example.com"
                    disabled={mode === 'edit'}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="affiliate_type">
                    Affiliate Type <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={affiliateType}
                    onValueChange={(value) => setValue('affiliate_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IC">Individual Consultant (IC)</SelectItem>
                      <SelectItem value="Intern">Intern</SelectItem>
                      <SelectItem value="UNV">UN Volunteer (UNV)</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.affiliate_type && (
                    <p className="text-xs text-destructive">{errors.affiliate_type.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="staff_number">Staff Number</Label>
                  <Input
                    id="staff_number"
                    {...register('staff_number')}
                    placeholder="Employee ID"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    {...register('nationality')}
                    placeholder="Country of citizenship"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={gender}
                    onValueChange={(value) => setValue('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contract" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="samsaran_pr">Samsaran PR</Label>
                  <Input
                    id="samsaran_pr"
                    {...register('samsaran_pr')}
                    placeholder="e.g. PR-2026-001"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract Start Date</Label>
                  <DatePicker
                    selected={contractStartDate ? parseISO(contractStartDate) : null}
                    onChange={(date: Date | null) =>
                      setValue('contract_start_date', date ? format(date, 'yyyy-MM-dd') : '')
                    }
                    dateFormat="dd MMM yyyy"
                    className="w-full h-10 px-3 border rounded-md text-sm"
                    placeholderText="Select start date"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Contract End Date</Label>
                  <DatePicker
                    selected={contractEndDate ? parseISO(contractEndDate) : null}
                    onChange={(date: Date | null) =>
                      setValue('contract_end_date', date ? format(date, 'yyyy-MM-dd') : '')
                    }
                    dateFormat="dd MMM yyyy"
                    className="w-full h-10 px-3 border rounded-md text-sm"
                    placeholderText="Select end date"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="days_worked">Days Worked</Label>
                  <Input
                    id="days_worked"
                    type="number"
                    {...register('days_worked')}
                    placeholder="e.g. 220"
                  />
                </div>

                <div className="space-y-2 col-span-2">
                  <Label>First Incumbency Date</Label>
                  <DatePicker
                    selected={firstIncumbencyDate ? parseISO(firstIncumbencyDate) : null}
                    onChange={(date: Date | null) =>
                      setValue('first_incumbency_date', date ? format(date, 'yyyy-MM-dd') : '')
                    }
                    dateFormat="dd MMM yyyy"
                    className="w-full h-10 px-3 border rounded-md text-sm"
                    placeholderText="Original start date with organization"
                  />
                  <p className="text-xs text-muted-foreground">
                    The original start date when this person first joined (used for tenure calculations).
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="assignment" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="division">Division</Label>
                  <Input
                    id="division"
                    {...register('division')}
                    placeholder="Organizational division"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    {...register('unit')}
                    placeholder="Sub-unit or team"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job_title">Job Title</Label>
                  <Input
                    id="job_title"
                    {...register('job_title')}
                    placeholder="Current role"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="current_grade">Grade</Label>
                  <Input
                    id="current_grade"
                    {...register('current_grade')}
                    placeholder="Pay grade"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="line_manager">Line Manager</Label>
                  <Input
                    id="line_manager"
                    {...register('line_manager')}
                    placeholder="Supervisor name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duty_station">Duty Station</Label>
                  <Input
                    id="duty_station"
                    {...register('duty_station')}
                    placeholder="Work location"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            {activeTab !== 'personal' && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'assignment' ? 'contract' : 'personal')}
                disabled={isLoading}
              >
                Back
              </Button>
            )}
            {activeTab === 'assignment' ? (
              <Button type="button" disabled={isLoading} onClick={handleFinalSubmit}>
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Add Affiliate' : 'Save Changes'}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
              >
                Next
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
