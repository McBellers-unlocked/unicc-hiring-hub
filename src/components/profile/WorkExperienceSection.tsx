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

interface WorkExperience {
  company: string;
  position: string;
  type: string;
  startDate: string;
  endDate: string;
  location: string;
  description: string;
  isUNExperience: boolean;
  isCurrent: boolean;
}

interface WorkExperienceSectionProps {
  workExperience: WorkExperience[];
  onChange: (workExperience: WorkExperience[]) => void;
}

export default function WorkExperienceSection({ workExperience, onChange }: WorkExperienceSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [newWork, setNewWork] = useState<WorkExperience>({
    company: "",
    position: "",
    type: "Full-time",
    startDate: "",
    endDate: "",
    location: "",
    description: "",
    isUNExperience: false,
    isCurrent: false,
  });

  const addWorkExperience = () => {
    if (newWork.company && newWork.position) {
      onChange([...workExperience, newWork]);
      setNewWork({
        company: "",
        position: "",
        type: "Full-time",
        startDate: "",
        endDate: "",
        location: "",
        description: "",
        isUNExperience: false,
        isCurrent: false,
      });
    }
  };

  const removeWorkExperience = (index: number) => {
    onChange(workExperience.filter((_, i) => i !== index));
  };

  const updateWorkExperience = (index: number, field: keyof WorkExperience, value: string | boolean) => {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Work Experience
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
                        <h4 className="font-medium">{work.position}</h4>
                        {work.isUNExperience && (
                          <span className="px-2 py-1 text-xs bg-primary/20 text-primary rounded">
                            UN Experience
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{work.company}</p>
                      <p className="text-xs text-muted-foreground">
                        {work.startDate} - {work.isCurrent ? "Present" : work.endDate}
                        {work.location && ` • ${work.location}`}
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
                      <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h5>
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <Label>Company/Organization</Label>
                          <Input
                            value={work.company}
                            onChange={(e) => updateWorkExperience(index, 'company', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label>Position Title</Label>
                          <Input
                            value={work.position}
                            onChange={(e) => updateWorkExperience(index, 'position', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Employment Type</Label>
                            <Select
                              value={work.type}
                              onValueChange={(value) => updateWorkExperience(index, 'type', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Full-time">Full-time</SelectItem>
                                <SelectItem value="Part-time">Part-time</SelectItem>
                                <SelectItem value="Contract">Contract</SelectItem>
                                <SelectItem value="Internship">Internship</SelectItem>
                                <SelectItem value="Consultant">Consultant</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Location</Label>
                            <Input
                              value={work.location}
                              onChange={(e) => updateWorkExperience(index, 'location', e.target.value)}
                              placeholder="City, Country"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Employment Dates */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Employment Dates</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor={`work-start-date-${index}`}>Start Date (Month/Year)</Label>
                          <Input
                            id={`work-start-date-${index}`}
                            type="month"
                            value={work.startDate}
                            onChange={(e) => updateWorkExperience(index, 'startDate', e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor={`work-end-date-${index}`}>End Date (Month/Year)</Label>
                          <Input
                            id={`work-end-date-${index}`}
                            type="month"
                            value={work.endDate}
                            onChange={(e) => updateWorkExperience(index, 'endDate', e.target.value)}
                            className="w-full"
                            disabled={work.isCurrent}
                            placeholder={work.isCurrent ? "Present" : ""}
                          />
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`current-${index}`}
                            checked={work.isCurrent}
                            onCheckedChange={(checked) => {
                              updateWorkExperience(index, 'isCurrent', !!checked);
                              if (checked) {
                                updateWorkExperience(index, 'endDate', '');
                              }
                            }}
                          />
                          <Label htmlFor={`current-${index}`}>I currently work here</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`un-exp-${index}`}
                            checked={work.isUNExperience}
                            onCheckedChange={(checked) => updateWorkExperience(index, 'isUNExperience', !!checked)}
                          />
                          <Label htmlFor={`un-exp-${index}`}>This is UN system experience</Label>
                        </div>
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Job Description</h5>
                      <div>
                        <Label>Description</Label>
                        <Textarea
                          value={work.description}
                          onChange={(e) => updateWorkExperience(index, 'description', e.target.value)}
                          placeholder="Describe your responsibilities and achievements..."
                          rows={4}
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
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 space-y-6">
          <h4 className="font-medium text-muted-foreground">Add Work Experience</h4>
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h5>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Company/Organization *</Label>
                <Input
                  value={newWork.company}
                  onChange={(e) => setNewWork({ ...newWork, company: e.target.value })}
                  placeholder="Company name"
                />
              </div>
              <div>
                <Label>Position Title *</Label>
                <Input
                  value={newWork.position}
                  onChange={(e) => setNewWork({ ...newWork, position: e.target.value })}
                  placeholder="Your role"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Employment Type</Label>
                  <Select
                    value={newWork.type}
                    onValueChange={(value) => setNewWork({ ...newWork, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Part-time">Part-time</SelectItem>
                      <SelectItem value="Contract">Contract</SelectItem>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Consultant">Consultant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={newWork.location}
                    onChange={(e) => setNewWork({ ...newWork, location: e.target.value })}
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Employment Dates */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Employment Dates</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="new-work-start-date">Start Date (Month/Year)</Label>
                <Input
                  id="new-work-start-date"
                  type="month"
                  value={newWork.startDate}
                  onChange={(e) => setNewWork({ ...newWork, startDate: e.target.value })}
                  className="w-full"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-work-end-date">End Date (Month/Year)</Label>
                <Input
                  id="new-work-end-date"
                  type="month"
                  value={newWork.endDate}
                  onChange={(e) => setNewWork({ ...newWork, endDate: e.target.value })}
                  className="w-full"
                  disabled={newWork.isCurrent}
                  placeholder={newWork.isCurrent ? "Present" : ""}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-current"
                  checked={newWork.isCurrent}
                  onCheckedChange={(checked) => {
                    setNewWork({ ...newWork, isCurrent: !!checked });
                    if (checked) {
                      setNewWork(prev => ({ ...prev, endDate: '' }));
                    }
                  }}
                />
                <Label htmlFor="new-current">I currently work here</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="new-un-exp"
                  checked={newWork.isUNExperience}
                  onCheckedChange={(checked) => setNewWork({ ...newWork, isUNExperience: !!checked })}
                />
                <Label htmlFor="new-un-exp">This is UN system experience</Label>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Job Description</h5>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newWork.description}
                onChange={(e) => setNewWork({ ...newWork, description: e.target.value })}
                placeholder="Describe your responsibilities and achievements..."
                rows={4}
              />
            </div>
          </div>

          <Button onClick={addWorkExperience} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Work Experience
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
