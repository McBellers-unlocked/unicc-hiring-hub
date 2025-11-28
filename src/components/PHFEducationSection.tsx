import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { GraduationCap, Info, Plus, Edit2 } from 'lucide-react';
import { EDUCATION_LEVELS } from '@/lib/educationLevels';

interface EducationEntry {
  institution: string;
  degree?: string;
  degree_type?: string;
  field_of_study?: string;
  field?: string;
  grade?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  description?: string;
  is_current?: boolean;
  isCurrent?: boolean;
}

interface PHFEducationSectionProps {
  profileEducation: EducationEntry[];
  onAddEducation?: (education: EducationEntry) => void;
  onEditEducation?: (index: number, education: EducationEntry) => void;
  editedEducation?: EducationEntry[];
}

export default function PHFEducationSection({ 
  profileEducation, 
  onAddEducation, 
  onEditEducation,
  editedEducation 
}: PHFEducationSectionProps) {
  console.log('PHFEducationSection - profileEducation:', profileEducation);
  if (profileEducation) {
    profileEducation.forEach((edu, index) => {
      console.log(`PHF Education ${index}:`, edu);
    });
  }

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newEducation, setNewEducation] = useState({
    institution: '',
    degree_type: '',
    field_of_study: '',
    grade: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });
  const [editingEducation, setEditingEducation] = useState({
    institution: '',
    degree_type: '',
    field_of_study: '',
    grade: '',
    start_date: '',
    end_date: '',
    is_current: false,
    description: ''
  });
  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const formatDate = (date: string) => {
      if (!date) return '';
      
      // Handle YYYY-MM format
      if (date.includes('-') && date.length <= 7) {
        const [year, month] = date.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
      }
      
      // Try to parse as a full date
      const d = new Date(date);
      if (isNaN(d.getTime())) return date; // Return original if invalid date
      return d.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short'
      });
    };

    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : (endDate ? formatDate(endDate) : 'Present');
    
    return `${start} - ${end}`;
  };

  const formatDegreeTitle = (degree: string, fieldOfStudy: string) => {
    // If field of study exists and is different from degree, combine them appropriately
    if (fieldOfStudy && fieldOfStudy.trim() !== '') {
      // Check if the degree already contains the field of study
      if (degree.toLowerCase().includes(fieldOfStudy.toLowerCase())) {
        return degree;
      }
      // Otherwise, format as "Degree in Field of Study"
      return `${degree} in ${fieldOfStudy}`;
    }
    return degree;
  };

  const handleAddEducation = () => {
    if (onAddEducation) {
      onAddEducation({
        institution: newEducation.institution,
        degree: newEducation.degree_type,
        degree_type: newEducation.degree_type,
        field_of_study: newEducation.field_of_study,
        grade: newEducation.grade,
        start_date: newEducation.start_date,
        end_date: newEducation.end_date,
        is_current: newEducation.is_current,
        description: newEducation.description
      });
    }
    setIsAddDialogOpen(false);
    // Reset form
    setNewEducation({
      institution: '',
      degree_type: '',
      field_of_study: '',
      grade: '',
      start_date: '',
      end_date: '',
      is_current: false,
      description: ''
    });
  };

  const handleEditEducation = (index: number) => {
    const educationToEdit = (editedEducation && editedEducation[index]) || profileEducation[index];
    
    setEditingIndex(index);
    setEditingEducation({
      institution: educationToEdit.institution || '',
      degree_type: educationToEdit.degree_type || educationToEdit.degree || '',
      field_of_study: educationToEdit.field_of_study || educationToEdit.field || '',
      grade: educationToEdit.grade || '',
      start_date: educationToEdit.start_date || educationToEdit.startDate || '',
      end_date: educationToEdit.end_date || educationToEdit.endDate || '',
      is_current: educationToEdit.is_current || educationToEdit.isCurrent || false,
      description: educationToEdit.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (onEditEducation && editingIndex !== null) {
      onEditEducation(editingIndex, {
        institution: editingEducation.institution,
        degree: editingEducation.degree_type,
        degree_type: editingEducation.degree_type,
        field_of_study: editingEducation.field_of_study,
        grade: editingEducation.grade,
        start_date: editingEducation.start_date,
        end_date: editingEducation.end_date,
        is_current: editingEducation.is_current,
        description: editingEducation.description
      });
    }
    setIsEditDialogOpen(false);
    setEditingIndex(null);
  };

  // Use edited education if available, otherwise use profile education
  const displayEducation = editedEducation || profileEducation;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Education
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guidance */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900">
              <span className="font-medium">Guidance:</span> Exclude primary/secondary education if you have a university degree or equivalent. Include postgraduate/professional courses.
            </p>
          </div>
        </div>

        {/* Education Entries */}
        {displayEducation && displayEducation.length > 0 ? (
          <div className="space-y-3">
            {displayEducation.map((education, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1 flex-1">
                      <h4 className="font-medium text-lg">
                        {formatDegreeTitle(education.degree || education.degree_type, education.field_of_study || education.field)}
                      </h4>
                      <p className="text-muted-foreground">{education.institution}</p>
                      <div className="text-sm text-muted-foreground">
                        {formatDateRange(education.start_date || education.startDate, education.end_date || education.endDate, education.is_current || education.isCurrent)}
                        {education.grade && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Grade: {education.grade}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditEducation(index)}
                      className="ml-2 h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {education.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {education.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No education information available in profile</p>
          </div>
        )}

        {/* Add Education Entry Button */}
        <div className="border-2 border-dashed border-muted rounded-lg p-8">
          <div className="text-center">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Education Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Education Entry</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="institution">Institution Name *</Label>
                    <Input
                      id="institution"
                      placeholder="University or school name"
                      value={newEducation.institution}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, institution: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="degree_type">Level of Education *</Label>
                      <Select 
                        value={newEducation.degree_type} 
                        onValueChange={(value) => setNewEducation(prev => ({ ...prev, degree_type: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select level of education" />
                        </SelectTrigger>
                        <SelectContent>
                          {EDUCATION_LEVELS.map(level => (
                            <SelectItem key={level.value} value={level.value}>
                              {level.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="field_of_study">Field of Study</Label>
                      <Input
                        id="field_of_study"
                        placeholder="e.g., Computer Science, Business"
                        value={newEducation.field_of_study}
                        onChange={(e) => setNewEducation(prev => ({ ...prev, field_of_study: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="start_date">Start Date</Label>
                      <Input
                        id="start_date"
                        type="month"
                        value={newEducation.start_date}
                        onChange={(e) => setNewEducation(prev => ({ ...prev, start_date: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="end_date">End Date</Label>
                      <Input
                        id="end_date"
                        type="month"
                        value={newEducation.end_date}
                        onChange={(e) => setNewEducation(prev => ({ ...prev, end_date: e.target.value }))}
                        disabled={newEducation.is_current}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_current"
                      checked={newEducation.is_current}
                      onCheckedChange={(checked) => setNewEducation(prev => ({ 
                        ...prev, 
                        is_current: checked as boolean,
                        end_date: checked ? '' : prev.end_date
                      }))}
                    />
                    <Label htmlFor="is_current">Currently studying here</Label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="grade">Grade / GPA (optional)</Label>
                    <Input
                      id="grade"
                      placeholder="e.g., 3.8/4.0, First Class, etc."
                      value={newEducation.grade}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, grade: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Additional details about your education..."
                      rows={3}
                      value={newEducation.description}
                      onChange={(e) => setNewEducation(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddEducation}
                      disabled={!newEducation.institution || !newEducation.degree_type}
                    >
                      Add Education
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Edit Education Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Education Entry</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit_institution">Institution Name *</Label>
                <Input
                  id="edit_institution"
                  placeholder="University or school name"
                  value={editingEducation.institution}
                  onChange={(e) => setEditingEducation(prev => ({ ...prev, institution: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_degree_type">Level of Education *</Label>
                  <Select 
                    value={editingEducation.degree_type} 
                    onValueChange={(value) => setEditingEducation(prev => ({ ...prev, degree_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level of education" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_field_of_study">Field of Study</Label>
                  <Input
                    id="edit_field_of_study"
                    placeholder="e.g., Computer Science, Business"
                    value={editingEducation.field_of_study}
                    onChange={(e) => setEditingEducation(prev => ({ ...prev, field_of_study: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_start_date">Start Date</Label>
                  <Input
                    id="edit_start_date"
                    type="month"
                    value={editingEducation.start_date}
                    onChange={(e) => setEditingEducation(prev => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="edit_end_date">End Date</Label>
                  <Input
                    id="edit_end_date"
                    type="month"
                    value={editingEducation.end_date}
                    onChange={(e) => setEditingEducation(prev => ({ ...prev, end_date: e.target.value }))}
                    disabled={editingEducation.is_current}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_is_current"
                  checked={editingEducation.is_current}
                  onCheckedChange={(checked) => setEditingEducation(prev => ({ 
                    ...prev, 
                    is_current: checked as boolean,
                    end_date: checked ? '' : prev.end_date
                  }))}
                />
                <Label htmlFor="edit_is_current">Currently studying here</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_grade">Grade / GPA (optional)</Label>
                <Input
                  id="edit_grade"
                  placeholder="e.g., 3.8/4.0, First Class, etc."
                  value={editingEducation.grade}
                  onChange={(e) => setEditingEducation(prev => ({ ...prev, grade: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit_description">Description (optional)</Label>
                <Textarea
                  id="edit_description"
                  placeholder="Additional details about your education..."
                  rows={3}
                  value={editingEducation.description}
                  onChange={(e) => setEditingEducation(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit}
                  disabled={!editingEducation.institution || !editingEducation.degree_type}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
