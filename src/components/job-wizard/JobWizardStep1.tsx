import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { JobFormData } from '@/pages/JobWizard';
import { useToast } from '@/hooks/use-toast';

interface Props {
  data: JobFormData;
  onUpdate: (data: Partial<JobFormData>) => void;
  onNext: () => void;
}

const JOB_CATEGORIES = [
  'Information Technology',
  'Human Resources',
  'Finance',
  'Operations',
  'Legal',
  'Communications',
  'Project Management',
  'Administrative Support',
];

const JOB_TYPES = [
  'Permanent',
  'Fixed-term',
  'Temporary',
  'Consultant',
  'Intern',
];

const TIMEZONES = [
  'Europe/Zurich',
  'Europe/London',
  'America/New_York',
  'America/Los_Angeles',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function JobWizardStep1({ data, onUpdate, onNext }: Props) {
  const { toast } = useToast();
  const [formData, setFormData] = useState(data);

  const updateField = (field: keyof JobFormData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    onUpdate(updated);
  };

  const validateAndProceed = () => {
    const requiredFields = ['title', 'category', 'type', 'location', 'org_unit'];
    const missingFields = requiredFields.filter(field => !formData[field as keyof JobFormData]);

    if (missingFields.length > 0) {
      toast({
        title: "Validation Error",
        description: `Please fill in required fields: ${missingFields.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    if (formData.closing_date && formData.issue_date && formData.closing_date <= formData.issue_date) {
      toast({
        title: "Validation Error",
        description: "Closing date must be after issue date",
        variant: "destructive",
      });
      return;
    }

    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Basics & Meta</CardTitle>
        <p className="text-muted-foreground">Enter the basic job information and metadata</p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Job Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="e.g., Senior Software Developer"
              required
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {JOB_CATEGORIES.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notice Number */}
          <div className="space-y-2">
            <Label htmlFor="notice_no">Notice Number</Label>
            <Input
              id="notice_no"
              value={formData.notice_no}
              onChange={(e) => updateField('notice_no', e.target.value)}
              placeholder="e.g., UNICC/2024/001"
            />
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Employment Type *</Label>
            <Select value={formData.type} onValueChange={(value) => updateField('type', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {JOB_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Positions */}
          <div className="space-y-2">
            <Label htmlFor="positions">Number of Positions</Label>
            <Input
              id="positions"
              type="number"
              min="1"
              value={formData.positions}
              onChange={(e) => updateField('positions', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Grade */}
          <div className="space-y-2">
            <Label htmlFor="grade">Grade</Label>
            <Input
              id="grade"
              value={formData.grade}
              onChange={(e) => updateField('grade', e.target.value)}
              placeholder="e.g., P3, P4, NOB"
            />
          </div>

          {/* Salary Estimate */}
          <div className="space-y-2">
            <Label htmlFor="salary_estimate">Salary Estimate</Label>
            <Input
              id="salary_estimate"
              value={formData.salary_estimate}
              onChange={(e) => updateField('salary_estimate', e.target.value)}
              placeholder="e.g., CHF 80,000 - 100,000"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location">Location *</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="e.g., Geneva, Switzerland"
              required
            />
          </div>

          {/* Org Unit */}
          <div className="space-y-2">
            <Label htmlFor="org_unit">Organization Unit *</Label>
            <Input
              id="org_unit"
              value={formData.org_unit}
              onChange={(e) => updateField('org_unit', e.target.value)}
              placeholder="e.g., Technology Division"
              required
            />
          </div>

          {/* Timezone */}
          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={formData.timezone} onValueChange={(value) => updateField('timezone', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Issue Date */}
          <div className="space-y-2">
            <Label>Issue Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.issue_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.issue_date ? format(formData.issue_date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.issue_date || undefined}
                  onSelect={(date) => updateField('issue_date', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Closing Date */}
          <div className="space-y-2">
            <Label>Closing Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !formData.closing_date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formData.closing_date ? format(formData.closing_date, "PPP p") : "Pick date & time"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.closing_date || undefined}
                  onSelect={(date) => updateField('closing_date', date)}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Privacy Notice URL */}
        <div className="space-y-2">
          <Label htmlFor="privacy_notice_url">Privacy Notice URL</Label>
          <Input
            id="privacy_notice_url"
            value={formData.privacy_notice_url}
            onChange={(e) => updateField('privacy_notice_url', e.target.value)}
            placeholder="https://..."
          />
        </div>

        {/* Eligibility Note */}
        <div className="space-y-2">
          <Label htmlFor="eligibility_note">Eligibility Note</Label>
          <Textarea
            id="eligibility_note"
            value={formData.eligibility_note}
            onChange={(e) => updateField('eligibility_note', e.target.value)}
            placeholder="Special eligibility requirements or notes for candidates..."
            rows={3}
          />
        </div>

        {/* Navigation */}
        <div className="flex justify-end pt-6">
          <Button onClick={validateAndProceed}>
            Next: Description & Requirements
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}