import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, Trash2, GraduationCap, ChevronDown, ChevronUp, Edit2, CalendarIcon } from "lucide-react";

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  grade?: string;
  description?: string;
}

interface EducationSectionProps {
  education: Education[];
  onChange: (education: Education[]) => void;
}

export default function EducationSection({ education, onChange }: EducationSectionProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [newEducation, setNewEducation] = useState<Education>({
    institution: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    grade: "",
    description: "",
  });

  const addEducation = () => {
    if (newEducation.institution && newEducation.degree && newEducation.field) {
      onChange([...education, newEducation]);
      setNewEducation({
        institution: "",
        degree: "",
        field: "",
        startDate: "",
        endDate: "",
        grade: "",
        description: "",
      });
    }
  };

  const removeEducation = (index: number) => {
    onChange(education.filter((_, i) => i !== index));
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = education.map((edu, i) => 
      i === index ? { ...edu, [field]: value } : edu
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
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Existing Education Entries */}
        {education.map((edu, index) => {
          const isExpanded = expandedItems.has(index);
          return (
            <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleExpanded(index)}>
              <div className="border rounded-lg overflow-hidden">
                {/* Collapsed Summary View */}
                <div className="p-4 bg-muted/30">
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <h4 className="font-medium">{edu.degree} in {edu.field}</h4>
                      <p className="text-sm text-muted-foreground">{edu.institution}</p>
                      <p className="text-xs text-muted-foreground">
                        {edu.startDate} - {edu.endDate}
                        {edu.grade && ` • Grade: ${edu.grade}`}
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
                        onClick={() => removeEducation(index)}
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
                          <Label>Institution</Label>
                          <Input
                            value={edu.institution}
                            onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Degree</Label>
                            <Select
                              value={edu.degree}
                              onValueChange={(value) => updateEducation(index, 'degree', value)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select degree" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                                <SelectItem value="Master's">Master's</SelectItem>
                                <SelectItem value="PhD">PhD</SelectItem>
                                <SelectItem value="Associate">Associate</SelectItem>
                                <SelectItem value="Certificate">Certificate</SelectItem>
                                <SelectItem value="Diploma">Diploma</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Field of Study</Label>
                            <Input
                              value={edu.field}
                              onChange={(e) => updateEducation(index, 'field', e.target.value)}
                            />
                          </div>
                        </div>
                        <div>
                          <Label>Grade/GPA (optional)</Label>
                          <Input
                            value={edu.grade || ""}
                            onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                            placeholder="3.8, First Class, etc."
                          />
                        </div>
                      </div>
                    </div>

                    {/* Study Dates */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Study Period</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label>Start Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !edu.startDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {edu.startDate ? format(new Date(edu.startDate), "PPP") : "Select start date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={edu.startDate ? new Date(edu.startDate) : undefined}
                                onSelect={(date) => updateEducation(index, 'startDate', date ? date.toISOString().split('T')[0] : '')}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div>
                          <Label>End Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !edu.endDate && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {edu.endDate ? format(new Date(edu.endDate), "PPP") : "Select end date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={edu.endDate ? new Date(edu.endDate) : undefined}
                                onSelect={(date) => updateEducation(index, 'endDate', date ? date.toISOString().split('T')[0] : '')}
                                initialFocus
                                className="p-3 pointer-events-auto"
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                    </div>

                    {/* Additional Details */}
                    <div className="space-y-4">
                      <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Additional Details</h5>
                      <div>
                        <Label>Description (optional)</Label>
                        <Textarea
                          value={edu.description || ""}
                          onChange={(e) => updateEducation(index, 'description', e.target.value)}
                          placeholder="Describe achievements, thesis, notable projects..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}

        {/* Add New Education */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 space-y-6">
          <h4 className="font-medium text-muted-foreground">Add Education</h4>
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Basic Information</h5>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label>Institution *</Label>
                <Input
                  value={newEducation.institution}
                  onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                  placeholder="University name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Degree *</Label>
                  <Select
                    value={newEducation.degree}
                    onValueChange={(value) => setNewEducation({ ...newEducation, degree: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select degree" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor's">Bachelor's</SelectItem>
                      <SelectItem value="Master's">Master's</SelectItem>
                      <SelectItem value="PhD">PhD</SelectItem>
                      <SelectItem value="Associate">Associate</SelectItem>
                      <SelectItem value="Certificate">Certificate</SelectItem>
                      <SelectItem value="Diploma">Diploma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Field of Study *</Label>
                  <Input
                    value={newEducation.field}
                    onChange={(e) => setNewEducation({ ...newEducation, field: e.target.value })}
                    placeholder="Computer Science, Business, etc."
                  />
                </div>
              </div>
              <div>
                <Label>Grade/GPA</Label>
                <Input
                  value={newEducation.grade}
                  onChange={(e) => setNewEducation({ ...newEducation, grade: e.target.value })}
                  placeholder="3.8, First Class, etc."
                />
              </div>
            </div>
          </div>

          {/* Study Dates */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Study Period</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Start Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newEducation.startDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEducation.startDate ? format(new Date(newEducation.startDate), "PPP") : "Select start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newEducation.startDate ? new Date(newEducation.startDate) : undefined}
                      onSelect={(date) => setNewEducation({ ...newEducation, startDate: date ? date.toISOString().split('T')[0] : '' })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label>End Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !newEducation.endDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newEducation.endDate ? format(new Date(newEducation.endDate), "PPP") : "Select end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={newEducation.endDate ? new Date(newEducation.endDate) : undefined}
                      onSelect={(date) => setNewEducation({ ...newEducation, endDate: date ? date.toISOString().split('T')[0] : '' })}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h5 className="text-sm font-medium text-muted-foreground border-b pb-2">Additional Details</h5>
            <div>
              <Label>Description</Label>
              <Textarea
                value={newEducation.description}
                onChange={(e) => setNewEducation({ ...newEducation, description: e.target.value })}
                placeholder="Describe achievements, thesis, notable projects..."
                rows={3}
              />
            </div>
          </div>

          <Button onClick={addEducation} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Education
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
