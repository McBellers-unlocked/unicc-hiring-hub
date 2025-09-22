import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Plus, Trash2, Briefcase, ChevronDown, ChevronUp, Edit2 } from "lucide-react";

interface PHFWorkExperience {
  period_from_month: string;
  period_from_year: string;
  period_to_month?: string;
  period_to_year?: string;
  is_present: boolean;
  exact_title_of_post: string;
  type_of_business: string;
  is_un_system_post: boolean;
  un_grade?: string;
  annual_income_starting?: number;
  annual_income_most_recent?: number;
  allowances_or_benefits?: string;
  employees_supervised_number?: number;
  employees_supervised_type?: string;
  employer_name: string;
  employer_address?: string;
  supervisor_name: string;
  supervisor_title?: string;
  supervisor_phone?: string;
  supervisor_email?: string;
  reason_for_change?: string;
  duties_and_responsibilities: string;
  attestations?: string[];
}

interface EnhancedWorkExperienceSectionProps {
  workExperience: PHFWorkExperience[];
  onChange: (workExperience: PHFWorkExperience[]) => void;
}

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

const YEARS = Array.from({ length: 50 }, (_, i) => {
  const year = new Date().getFullYear() - i;
  return { value: year.toString(), label: year.toString() };
});

const UN_GRADES = [
  'P-1', 'P-2', 'P-3', 'P-4', 'P-5', 'D-1', 'D-2', 'G-1', 'G-2', 'G-3', 'G-4', 'G-5', 'G-6', 'G-7'
];

export default function EnhancedWorkExperienceSection({ workExperience, onChange }: EnhancedWorkExperienceSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [newWork, setNewWork] = useState<PHFWorkExperience>({
    period_from_month: "",
    period_from_year: "",
    period_to_month: "",
    period_to_year: "",
    is_present: false,
    exact_title_of_post: "",
    type_of_business: "",
    is_un_system_post: false,
    un_grade: "",
    annual_income_starting: undefined,
    annual_income_most_recent: undefined,
    allowances_or_benefits: "",
    employees_supervised_number: undefined,
    employees_supervised_type: "",
    employer_name: "",
    employer_address: "",
    supervisor_name: "",
    supervisor_title: "",
    supervisor_phone: "",
    supervisor_email: "",
    reason_for_change: "",
    duties_and_responsibilities: "",
    attestations: [],
  });

  const addWorkExperience = () => {
    if (newWork.exact_title_of_post && newWork.employer_name && newWork.supervisor_name && newWork.duties_and_responsibilities) {
      onChange([...workExperience, newWork]);
      setNewWork({
        period_from_month: "",
        period_from_year: "",
        period_to_month: "",
        period_to_year: "",
        is_present: false,
        exact_title_of_post: "",
        type_of_business: "",
        is_un_system_post: false,
        un_grade: "",
        annual_income_starting: undefined,
        annual_income_most_recent: undefined,
        allowances_or_benefits: "",
        employees_supervised_number: undefined,
        employees_supervised_type: "",
        employer_name: "",
        employer_address: "",
        supervisor_name: "",
        supervisor_title: "",
        supervisor_phone: "",
        supervisor_email: "",
        reason_for_change: "",
        duties_and_responsibilities: "",
        attestations: [],
      });
    }
  };

  const removeWorkExperience = (index: number) => {
    onChange(workExperience.filter((_, i) => i !== index));
  };

  const updateWorkExperience = (index: number, field: keyof PHFWorkExperience, value: any) => {
    const updated = workExperience.map((work, i) => 
      i === index ? { ...work, [field]: value } : work
    );
    onChange(updated);
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const formatDisplayDate = (fromMonth: string, fromYear: string, toMonth?: string, toYear?: string, isCurrent?: boolean) => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fromDisplay = fromMonth && fromYear ? `${monthNames[parseInt(fromMonth) - 1]} ${fromYear}` : '';
    const toDisplay = isCurrent ? 'Present' : (toMonth && toYear ? `${monthNames[parseInt(toMonth) - 1]} ${toYear}` : '');
    return `${fromDisplay} - ${toDisplay}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Enhanced Work Experience (PHF Compatible)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Work Experience Entries */}
        {workExperience.map((work, index) => {
          const isExpanded = expandedItems.has(index);
          return (
            <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpanded(index)}>
              <div className="border rounded-lg overflow-hidden">
                {/* Collapsed Summary View */}
                <div className="p-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{work.exact_title_of_post}</h4>
                        {work.is_un_system_post && (
                          <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                            UN Experience {work.un_grade && `(${work.un_grade})`}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{work.employer_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDisplayDate(work.period_from_month, work.period_from_year, work.period_to_month, work.period_to_year, work.is_present)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4 mr-1" />
                          Edit
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-1" />
                          )}
                        </Button>
                      </CollapsibleTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeWorkExperience(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Expanded Edit View */}
                <CollapsibleContent>
                  <div className="p-4 space-y-6 border-t">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Basic Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Post Title *</Label>
                          <Input
                            value={work.exact_title_of_post}
                            onChange={(e) => updateWorkExperience(index, 'exact_title_of_post', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Employer Name *</Label>
                          <Input
                            value={work.employer_name}
                            onChange={(e) => updateWorkExperience(index, 'employer_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Type of Business</Label>
                          <Input
                            value={work.type_of_business}
                            onChange={(e) => updateWorkExperience(index, 'type_of_business', e.target.value)}
                            placeholder="Government, NGO, Private sector, etc."
                          />
                        </div>
                        <div>
                          <Label>Employer Address</Label>
                          <Input
                            value={work.employer_address || ""}
                            onChange={(e) => updateWorkExperience(index, 'employer_address', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Period */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Employment Period</h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <Label>From Month</Label>
                          <Select
                            value={work.period_from_month}
                            onValueChange={(value) => updateWorkExperience(index, 'period_from_month', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>From Year</Label>
                          <Select
                            value={work.period_from_year}
                            onValueChange={(value) => updateWorkExperience(index, 'period_from_year', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map(year => (
                                <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>To Month</Label>
                          <Select
                            value={work.period_to_month || ""}
                            onValueChange={(value) => updateWorkExperience(index, 'period_to_month', value)}
                            disabled={work.is_present}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Month" />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map(month => (
                                <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>To Year</Label>
                          <Select
                            value={work.period_to_year || ""}
                            onValueChange={(value) => updateWorkExperience(index, 'period_to_year', value)}
                            disabled={work.is_present}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                              {YEARS.map(year => (
                                <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`current-${index}`}
                          checked={work.is_present}
                          onCheckedChange={(checked) => updateWorkExperience(index, 'is_present', !!checked)}
                        />
                        <Label htmlFor={`current-${index}`}>I currently work here</Label>
                      </div>
                    </div>

                    {/* UN System Information */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`un-system-${index}`}
                          checked={work.is_un_system_post}
                          onCheckedChange={(checked) => updateWorkExperience(index, 'is_un_system_post', !!checked)}
                        />
                        <Label htmlFor={`un-system-${index}`}>This is a UN system post</Label>
                      </div>
                      {work.is_un_system_post && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>UN Grade</Label>
                            <Select
                              value={work.un_grade || ""}
                              onValueChange={(value) => updateWorkExperience(index, 'un_grade', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                              <SelectContent>
                                {UN_GRADES.map(grade => (
                                  <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Supervisor Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Supervisor Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Supervisor Name *</Label>
                          <Input
                            value={work.supervisor_name}
                            onChange={(e) => updateWorkExperience(index, 'supervisor_name', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Supervisor Title</Label>
                          <Input
                            value={work.supervisor_title || ""}
                            onChange={(e) => updateWorkExperience(index, 'supervisor_title', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Supervisor Phone</Label>
                          <Input
                            value={work.supervisor_phone || ""}
                            onChange={(e) => updateWorkExperience(index, 'supervisor_phone', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Supervisor Email</Label>
                          <Input
                            type="email"
                            value={work.supervisor_email || ""}
                            onChange={(e) => updateWorkExperience(index, 'supervisor_email', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Financial Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Financial Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Starting Annual Income (USD)</Label>
                          <Input
                            type="number"
                            value={work.annual_income_starting || ""}
                            onChange={(e) => updateWorkExperience(index, 'annual_income_starting', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                        <div>
                          <Label>Most Recent Annual Income (USD)</Label>
                          <Input
                            type="number"
                            value={work.annual_income_most_recent || ""}
                            onChange={(e) => updateWorkExperience(index, 'annual_income_most_recent', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                        <div>
                          <Label>Allowances or Benefits</Label>
                          <Input
                            value={work.allowances_or_benefits || ""}
                            onChange={(e) => updateWorkExperience(index, 'allowances_or_benefits', e.target.value)}
                            placeholder="Health insurance, housing allowance, etc."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Management Information */}
                    <div className="space-y-4">
                      <h5 className="font-medium text-sm text-muted-foreground">Management Information</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Number of Employees Supervised</Label>
                          <Input
                            type="number"
                            value={work.employees_supervised_number || ""}
                            onChange={(e) => updateWorkExperience(index, 'employees_supervised_number', e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </div>
                        <div>
                          <Label>Type of Employees Supervised</Label>
                          <Input
                            value={work.employees_supervised_type || ""}
                            onChange={(e) => updateWorkExperience(index, 'employees_supervised_type', e.target.value)}
                            placeholder="Professional staff, consultants, etc."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Duties and Reason for Change */}
                    <div className="space-y-4">
                      <div>
                        <Label>Duties and Responsibilities *</Label>
                        <Textarea
                          value={work.duties_and_responsibilities}
                          onChange={(e) => updateWorkExperience(index, 'duties_and_responsibilities', e.target.value)}
                          placeholder="Describe your main duties and responsibilities..."
                          rows={4}
                        />
                      </div>
                      <div>
                        <Label>Reason for Change/Leaving</Label>
                        <Textarea
                          value={work.reason_for_change || ""}
                          onChange={(e) => updateWorkExperience(index, 'reason_for_change', e.target.value)}
                          placeholder="Why did you leave or are leaving this position?"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Add New Work Experience */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-6">
          <h4 className="font-medium text-muted-foreground">Add Enhanced Work Experience</h4>
          
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Post Title *</Label>
                <Input
                  value={newWork.exact_title_of_post}
                  onChange={(e) => setNewWork({ ...newWork, exact_title_of_post: e.target.value })}
                  placeholder="Your job title"
                />
              </div>
              <div>
                <Label>Employer Name *</Label>
                <Input
                  value={newWork.employer_name}
                  onChange={(e) => setNewWork({ ...newWork, employer_name: e.target.value })}
                  placeholder="Company/organization name"
                />
              </div>
              <div>
                <Label>Type of Business</Label>
                <Input
                  value={newWork.type_of_business}
                  onChange={(e) => setNewWork({ ...newWork, type_of_business: e.target.value })}
                  placeholder="Government, NGO, Private sector, etc."
                />
              </div>
              <div>
                <Label>Employer Address</Label>
                <Input
                  value={newWork.employer_address}
                  onChange={(e) => setNewWork({ ...newWork, employer_address: e.target.value })}
                  placeholder="Full address"
                />
              </div>
            </div>
          </div>

          {/* Period */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>From Month</Label>
                <Select
                  value={newWork.period_from_month}
                  onValueChange={(value) => setNewWork({ ...newWork, period_from_month: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>From Year</Label>
                <Select
                  value={newWork.period_from_year}
                  onValueChange={(value) => setNewWork({ ...newWork, period_from_year: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(year => (
                      <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Month</Label>
                <Select
                  value={newWork.period_to_month}
                  onValueChange={(value) => setNewWork({ ...newWork, period_to_month: value })}
                  disabled={newWork.is_present}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(month => (
                      <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>To Year</Label>
                <Select
                  value={newWork.period_to_year}
                  onValueChange={(value) => setNewWork({ ...newWork, period_to_year: value })}
                  disabled={newWork.is_present}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map(year => (
                      <SelectItem key={year.value} value={year.value}>{year.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-current"
                checked={newWork.is_present}
                onCheckedChange={(checked) => setNewWork({ ...newWork, is_present: !!checked })}
              />
              <Label htmlFor="new-current">I currently work here</Label>
            </div>
          </div>

          {/* UN System */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-un-system"
                checked={newWork.is_un_system_post}
                onCheckedChange={(checked) => setNewWork({ ...newWork, is_un_system_post: !!checked })}
              />
              <Label htmlFor="new-un-system">This is a UN system post</Label>
            </div>
            {newWork.is_un_system_post && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>UN Grade</Label>
                  <Select
                    value={newWork.un_grade}
                    onValueChange={(value) => setNewWork({ ...newWork, un_grade: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {UN_GRADES.map(grade => (
                        <SelectItem key={grade} value={grade}>{grade}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Supervisor Information */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Supervisor Name *</Label>
                <Input
                  value={newWork.supervisor_name}
                  onChange={(e) => setNewWork({ ...newWork, supervisor_name: e.target.value })}
                  placeholder="Supervisor full name"
                />
              </div>
              <div>
                <Label>Supervisor Title</Label>
                <Input
                  value={newWork.supervisor_title}
                  onChange={(e) => setNewWork({ ...newWork, supervisor_title: e.target.value })}
                  placeholder="Supervisor position"
                />
              </div>
              <div>
                <Label>Supervisor Phone</Label>
                <Input
                  value={newWork.supervisor_phone}
                  onChange={(e) => setNewWork({ ...newWork, supervisor_phone: e.target.value })}
                  placeholder="Contact number"
                />
              </div>
              <div>
                <Label>Supervisor Email</Label>
                <Input
                  type="email"
                  value={newWork.supervisor_email}
                  onChange={(e) => setNewWork({ ...newWork, supervisor_email: e.target.value })}
                  placeholder="supervisor@example.com"
                />
              </div>
            </div>
          </div>

          {/* Duties */}
          <div>
            <Label>Duties and Responsibilities *</Label>
            <Textarea
              value={newWork.duties_and_responsibilities}
              onChange={(e) => setNewWork({ ...newWork, duties_and_responsibilities: e.target.value })}
              placeholder="Describe your main duties and responsibilities in detail..."
              rows={4}
            />
          </div>

          <Button onClick={addWorkExperience} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Enhanced Work Experience
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
