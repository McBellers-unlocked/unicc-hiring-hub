import { useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import {
  DIVISIONS,
  GRADES,
  LOCATIONS,
} from '@/lib/organizationConstants';

interface AddUserbaseRowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormState {
  // Step 1
  source: 'GSM' | 'Samsaran' | 'Manual';
  gsm_email_address: string;
  samsaran_email_address: string;
  full_name: string;
  first_name: string;
  last_name: string;
  gsm_staff_number: string;
  samsaran_staff_number: string;
  search_name: string;
  // Step 2
  worker_type: string;
  unit: string;
  division: string;
  job_name: string;
  job_title: string;
  position_name: string;
  category: string;
  appointment_type: string;
  current_grade: string;
  current_step: string;
  line_manager: string;
  reporting_lines: string;
  intern: boolean;
  // Step 3
  official_duty_station: string;
  office_location: string;
  gsm_gender: string;
  nationality: string;
  date_of_birth: string;
  // Step 4
  apa_start_date: string;
  first_incumbency_start_date: string;
  entry_on_duty_date_who: string;
  contract_start_date: string;
  contract_end_date: string;
  service_time_current_org: string;
}

const initialState: FormState = {
  source: 'Manual',
  gsm_email_address: '',
  samsaran_email_address: '',
  full_name: '',
  first_name: '',
  last_name: '',
  gsm_staff_number: '',
  samsaran_staff_number: '',
  search_name: '',
  worker_type: '',
  unit: '',
  division: '',
  job_name: '',
  job_title: '',
  position_name: '',
  category: '',
  appointment_type: '',
  current_grade: '',
  current_step: '',
  line_manager: '',
  reporting_lines: '',
  intern: false,
  official_duty_station: '',
  office_location: '',
  gsm_gender: '',
  nationality: '',
  date_of_birth: '',
  apa_start_date: '',
  first_incumbency_start_date: '',
  entry_on_duty_date_who: '',
  contract_start_date: '',
  contract_end_date: '',
  service_time_current_org: '',
};

const WORKER_TYPES = ['Staff', 'IC', 'UNV', 'Intern', 'Affiliate', 'Other'];
const GENDERS = ['Male', 'Female', 'Other'];

const emailSchema = z.string().trim().email();
const dateSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD')
  .or(z.literal(''));

const STEPS = ['Identity & Contact', 'Employment', 'Location & Personal', 'Dates & Service'];

export function AddUserbaseRowDialog({ open, onOpenChange }: AddUserbaseRowDialogProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialState);
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setStep(0);
    setForm(initialState);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((s) => ({ ...s, [key]: value }));

  // Validation per step
  const step1Valid = (() => {
    const gsm = form.gsm_email_address.trim();
    const sam = form.samsaran_email_address.trim();
    if (!gsm && !sam) return false;
    if (gsm && !emailSchema.safeParse(gsm).success) return false;
    if (sam && !emailSchema.safeParse(sam).success) return false;
    return true;
  })();

  const step2Valid =
    form.worker_type.trim() !== '' &&
    form.unit.trim() !== '' &&
    Object.keys(DIVISIONS).includes(form.division);

  const step3Valid = !form.date_of_birth || dateSchema.safeParse(form.date_of_birth).success;

  const step4Valid = (
    [
      'apa_start_date',
      'first_incumbency_start_date',
      'entry_on_duty_date_who',
      'contract_start_date',
      'contract_end_date',
    ] as (keyof FormState)[]
  ).every((k) => {
    const v = form[k] as string;
    return !v || dateSchema.safeParse(v).success;
  });

  const stepValid = [step1Valid, step2Valid, step3Valid, step4Valid][step];
  const allValid = step1Valid && step2Valid && step3Valid && step4Valid;

  const handleSave = async () => {
    if (!allValid) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        source: form.source ? form.source.toLowerCase() : 'manual',
      };
      const stringFields: (keyof FormState)[] = [
        'gsm_email_address',
        'samsaran_email_address',
        'full_name',
        'first_name',
        'last_name',
        'gsm_staff_number',
        'samsaran_staff_number',
        'search_name',
        'worker_type',
        'unit',
        'division',
        'job_name',
        'job_title',
        'position_name',
        'category',
        'appointment_type',
        'current_grade',
        'current_step',
        'line_manager',
        'reporting_lines',
        'official_duty_station',
        'office_location',
        'gsm_gender',
        'nationality',
        'date_of_birth',
        'apa_start_date',
        'first_incumbency_start_date',
        'entry_on_duty_date_who',
        'contract_start_date',
        'contract_end_date',
        'service_time_current_org',
      ];
      for (const k of stringFields) {
        const v = (form[k] as string).trim();
        if (v) payload[k] = v;
      }
      if (form.intern) payload.intern = true;

      const { error } = await supabase.from('users_clean').insert(payload as any).select().single();
      if (error) throw error;

      toast.success('Row added');
      queryClient.invalidateQueries({ queryKey: ['users_clean'] });
      queryClient.invalidateQueries({ queryKey: ['users_clean:meta'] });
      queryClient.invalidateQueries({ queryKey: ['users_clean:missing'] });
      handleClose(false);
    } catch (e: any) {
      toast.error(e?.message ?? 'Failed to add row');
    } finally {
      setSaving(false);
    }
  };

  const Field = ({
    label,
    required,
    children,
  }: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
  }) => (
    <div className="space-y-1.5">
      <Label className="text-xs">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Add row to Userbase</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {STEPS.length} — {STEPS[step]}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium border',
                  i < step && 'bg-primary text-primary-foreground border-primary',
                  i === step && 'bg-primary/10 border-primary text-primary',
                  i > step && 'bg-muted text-muted-foreground',
                )}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && <div className="flex-1 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {step === 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Field label="Source">
                  <RadioGroup
                    value={form.source}
                    onValueChange={(v) => update('source', v as FormState['source'])}
                    className="flex gap-4"
                  >
                    {(['GSM', 'Samsaran', 'Manual'] as const).map((opt) => (
                      <div key={opt} className="flex items-center gap-2">
                        <RadioGroupItem value={opt} id={`src-${opt}`} />
                        <Label htmlFor={`src-${opt}`} className="font-normal">
                          {opt}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </Field>
              </div>
              <Field label="GSM Email Address" required>
                <Input
                  type="email"
                  value={form.gsm_email_address}
                  onChange={(e) => update('gsm_email_address', e.target.value)}
                  placeholder="name@unicc.org"
                />
              </Field>
              <Field label="Samsaran Email address" required>
                <Input
                  type="email"
                  value={form.samsaran_email_address}
                  onChange={(e) => update('samsaran_email_address', e.target.value)}
                  placeholder="name@samsaran.org"
                />
              </Field>
              <div className="col-span-2 text-xs text-muted-foreground -mt-2">
                At least one email address is required.
              </div>
              <Field label="Full Name">
                <Input value={form.full_name} onChange={(e) => update('full_name', e.target.value)} />
              </Field>
              <Field label="Search Name">
                <Input value={form.search_name} onChange={(e) => update('search_name', e.target.value)} />
              </Field>
              <Field label="First Name">
                <Input value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
              </Field>
              <Field label="Last Name">
                <Input value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
              </Field>
              <Field label="GSM Staff Number">
                <Input
                  value={form.gsm_staff_number}
                  onChange={(e) => update('gsm_staff_number', e.target.value)}
                />
              </Field>
              <Field label="Samsaran Staff Number">
                <Input
                  value={form.samsaran_staff_number}
                  onChange={(e) => update('samsaran_staff_number', e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Worker Type" required>
                <Select value={form.worker_type} onValueChange={(v) => update('worker_type', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select worker type" />
                  </SelectTrigger>
                  <SelectContent>
                    {WORKER_TYPES.map((w) => (
                      <SelectItem key={w} value={w}>
                        {w}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Unit" required>
                <Input value={form.unit} onChange={(e) => update('unit', e.target.value)} />
              </Field>
              <Field label="Division" required>
                <Select value={form.division} onValueChange={(v) => update('division', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(DIVISIONS).map(([code, label]) => (
                      <SelectItem key={code} value={code}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Category">
                <Input value={form.category} onChange={(e) => update('category', e.target.value)} />
              </Field>
              <Field label="Job Name">
                <Input value={form.job_name} onChange={(e) => update('job_name', e.target.value)} />
              </Field>
              <Field label="Job Title">
                <Input value={form.job_title} onChange={(e) => update('job_title', e.target.value)} />
              </Field>
              <Field label="Position Name">
                <Input value={form.position_name} onChange={(e) => update('position_name', e.target.value)} />
              </Field>
              <Field label="Appointment Type">
                <Input
                  value={form.appointment_type}
                  onChange={(e) => update('appointment_type', e.target.value)}
                />
              </Field>
              <Field label="Current Grade">
                <Select value={form.current_grade} onValueChange={(v) => update('current_grade', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {GRADES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Current Step">
                <Input value={form.current_step} onChange={(e) => update('current_step', e.target.value)} />
              </Field>
              <Field label="Line Manager">
                <Input value={form.line_manager} onChange={(e) => update('line_manager', e.target.value)} />
              </Field>
              <Field label="Reporting Lines">
                <Input
                  value={form.reporting_lines}
                  onChange={(e) => update('reporting_lines', e.target.value)}
                />
              </Field>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox
                  id="intern"
                  checked={form.intern}
                  onCheckedChange={(c) => update('intern', c === true)}
                />
                <Label htmlFor="intern" className="font-normal">
                  Intern
                </Label>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Official Duty Station">
                <Select
                  value={form.official_duty_station}
                  onValueChange={(v) => update('official_duty_station', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select duty station" />
                  </SelectTrigger>
                  <SelectContent>
                    {LOCATIONS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {l}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Office Location">
                <Input
                  value={form.office_location}
                  onChange={(e) => update('office_location', e.target.value)}
                />
              </Field>
              <Field label="GSM Gender">
                <Select value={form.gsm_gender} onValueChange={(v) => update('gsm_gender', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    {GENDERS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Nationality">
                <Input value={form.nationality} onChange={(e) => update('nationality', e.target.value)} />
              </Field>
              <Field label="Date of Birth">
                <Input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => update('date_of_birth', e.target.value)}
                />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="APA Start Date">
                <Input
                  type="date"
                  value={form.apa_start_date}
                  onChange={(e) => update('apa_start_date', e.target.value)}
                />
              </Field>
              <Field label="First Incumbency Start Date">
                <Input
                  type="date"
                  value={form.first_incumbency_start_date}
                  onChange={(e) => update('first_incumbency_start_date', e.target.value)}
                />
              </Field>
              <Field label="Entry on Duty Date (WHO)">
                <Input
                  type="date"
                  value={form.entry_on_duty_date_who}
                  onChange={(e) => update('entry_on_duty_date_who', e.target.value)}
                />
              </Field>
              <Field label="Contract Start Date">
                <Input
                  type="date"
                  value={form.contract_start_date}
                  onChange={(e) => update('contract_start_date', e.target.value)}
                />
              </Field>
              <Field label="Contract End Date">
                <Input
                  type="date"
                  value={form.contract_end_date}
                  onChange={(e) => update('contract_end_date', e.target.value)}
                />
              </Field>
              <Field label="Service Time (Current Organization)">
                <Input
                  value={form.service_time_current_org}
                  onChange={(e) => update('service_time_current_org', e.target.value)}
                />
              </Field>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || saving}
          >
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => handleClose(false)} disabled={saving}>
              Cancel
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={!stepValid}
              >
                Next
              </Button>
            ) : (
              <Button onClick={handleSave} disabled={!allValid || saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
