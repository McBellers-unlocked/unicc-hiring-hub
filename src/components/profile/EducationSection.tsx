import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, GraduationCap } from "lucide-react";

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
        {education.map((edu, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">{edu.institution}</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeEducation(index)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Institution</Label>
                <Input
                  value={edu.institution}
                  onChange={(e) => updateEducation(index, 'institution', e.target.value)}
                />
              </div>
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
              <div>
                <Label>Grade/GPA (optional)</Label>
                <Input
                  value={edu.grade || ""}
                  onChange={(e) => updateEducation(index, 'grade', e.target.value)}
                />
              </div>
              <div>
                <Label>Start Date</Label>
                <Input
                  type="month"
                  value={edu.startDate}
                  onChange={(e) => updateEducation(index, 'startDate', e.target.value)}
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="month"
                  value={edu.endDate}
                  onChange={(e) => updateEducation(index, 'endDate', e.target.value)}
                />
              </div>
            </div>
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
        ))}

        {/* Add New Education */}
        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-muted-foreground">Add Education</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Institution *</Label>
              <Input
                value={newEducation.institution}
                onChange={(e) => setNewEducation({ ...newEducation, institution: e.target.value })}
                placeholder="University name"
              />
            </div>
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
            <div>
              <Label>Grade/GPA</Label>
              <Input
                value={newEducation.grade}
                onChange={(e) => setNewEducation({ ...newEducation, grade: e.target.value })}
                placeholder="3.8, First Class, etc."
              />
            </div>
            <div>
              <Label>Start Date</Label>
              <Input
                type="month"
                value={newEducation.startDate}
                onChange={(e) => setNewEducation({ ...newEducation, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date</Label>
              <Input
                type="month"
                value={newEducation.endDate}
                onChange={(e) => setNewEducation({ ...newEducation, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <Label>Description</Label>
            <Textarea
              value={newEducation.description}
              onChange={(e) => setNewEducation({ ...newEducation, description: e.target.value })}
              placeholder="Describe achievements, thesis, notable projects..."
              rows={3}
            />
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
