import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Briefcase, Info, Plus, Calendar, Edit2 } from 'lucide-react';

interface WorkExperienceEntry {
  position: string;
  company: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isCurrent?: boolean;
  isUNExperience?: boolean;
  description?: string;
  supervisor_name?: string;
  supervisor_title?: string;
  supervisor_phone?: string;
  supervisor_email?: string;
}

interface PHFWorkExperienceSectionProps {
  profileWorkExperience: WorkExperienceEntry[];
  onAddExperience?: (experience: WorkExperienceEntry) => void;
  onEditExperience?: (index: number, experience: WorkExperienceEntry) => void;
  editedExperiences?: WorkExperienceEntry[];
}

export default function PHFWorkExperienceSection({ 
  profileWorkExperience, 
  onAddExperience, 
  onEditExperience,
  editedExperiences 
}: PHFWorkExperienceSectionProps) {
  // Debug: Log the data to check what's being passed
  console.log('PHFWorkExperienceSection - profileWorkExperience:', profileWorkExperience);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newExperience, setNewExperience] = useState({
    company: '',
    position: '',
    employmentType: 'Full-time',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    isUNExperience: false,
    description: '',
    supervisor_name: '',
    supervisor_title: '',
    supervisor_phone: '',
    supervisor_email: ''
  });
  const [editingExperience, setEditingExperience] = useState({
    company: '',
    position: '',
    employmentType: 'Full-time',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    isUNExperience: false,
    description: '',
    supervisor_name: '',
    supervisor_title: '',
    supervisor_phone: '',
    supervisor_email: ''
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

  const handleAddExperience = () => {
    if (onAddExperience) {
      onAddExperience({
        position: newExperience.position,
        company: newExperience.company,
        startDate: newExperience.startDate,
        endDate: newExperience.endDate,
        location: newExperience.location,
        isCurrent: newExperience.isCurrent,
        isUNExperience: newExperience.isUNExperience,
        description: newExperience.description,
        supervisor_name: newExperience.supervisor_name,
        supervisor_title: newExperience.supervisor_title,
        supervisor_phone: newExperience.supervisor_phone,
        supervisor_email: newExperience.supervisor_email
      });
    }
    setIsAddDialogOpen(false);
    // Reset form
    setNewExperience({
      company: '',
      position: '',
      employmentType: 'Full-time',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      isUNExperience: false,
      description: '',
      supervisor_name: '',
      supervisor_title: '',
      supervisor_phone: '',
      supervisor_email: ''
    });
  };

  const handleEditExperience = (index: number) => {
    const experienceToEdit = (editedExperiences && editedExperiences[index]) || profileWorkExperience[index];
    const exp = experienceToEdit as any;

    // Support both simple and PHF/DB field names
    const description = exp?.description || exp?.duties_and_responsibilities || '';
    const company = exp?.company || exp?.employer_name || '';
    const position = exp?.position || exp?.exact_title_of_post || '';
    const startDate = exp?.startDate || exp?.start_date || (exp?.period_from_year && exp?.period_from_month ? `${exp.period_from_year}-${String(exp.period_from_month).padStart(2, '0')}` : '');
    const endDate = exp?.endDate || exp?.end_date || (exp?.period_to_year && exp?.period_to_month ? `${exp.period_to_year}-${String(exp.period_to_month).padStart(2, '0')}` : '');
    const isCurrent = exp?.isCurrent ?? exp?.is_present ?? exp?.ongoing ?? exp?.current ?? false;
    const isUNExperience = exp?.isUNExperience ?? exp?.is_un_system_post ?? false;

    setEditingIndex(index);
    setEditingExperience({
      company,
      position,
      employmentType: 'Full-time', // Default since this isn't stored in the original data
      location: exp?.location || exp?.employer_address || '',
      startDate,
      endDate,
      isCurrent,
      isUNExperience,
      description,
      supervisor_name: exp?.supervisor_name || '',
      supervisor_title: exp?.supervisor_title || '',
      supervisor_phone: exp?.supervisor_phone || '',
      supervisor_email: exp?.supervisor_email || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (onEditExperience && editingIndex !== null) {
      onEditExperience(editingIndex, {
        position: editingExperience.position,
        company: editingExperience.company,
        startDate: editingExperience.startDate,
        endDate: editingExperience.endDate,
        location: editingExperience.location,
        isCurrent: editingExperience.isCurrent,
        isUNExperience: editingExperience.isUNExperience,
        description: editingExperience.description,
        supervisor_name: editingExperience.supervisor_name,
        supervisor_title: editingExperience.supervisor_title,
        supervisor_phone: editingExperience.supervisor_phone,
        supervisor_email: editingExperience.supervisor_email
      });
    }
    setIsEditDialogOpen(false);
    setEditingIndex(null);
  };

  // Use edited experiences if available, otherwise use profile work experience
  const displayExperiences = editedExperiences || profileWorkExperience;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5" />
          Employment Record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guidance */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm text-blue-900">
              <span className="font-medium">Employment Record (reverse chronological):</span> Include military service. Note periods not gainfully employed separately. Last 5 years require attestations.
            </p>
            <p className="text-sm text-blue-900 mt-2">
              <span className="font-medium">⚠️ Supervisor details are mandatory:</span> You must provide supervisor contact information (Name, Job Title, Phone, Email) for each employment entry for application verification purposes.
            </p>
          </div>
        </div>

        {/* Work Experience Entries */}
        {displayExperiences && displayExperiences.length > 0 ? (
          <div className="space-y-3">
            {displayExperiences.map((experience, index) => (
              <div key={index} className="border rounded-lg p-4 bg-card">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-lg">
                        {experience.position}
                      </h4>
                      {experience.isUNExperience && (
                        <Badge variant="default" className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">
                          UN Experience
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground font-medium">{experience.company}</p>
                    <div className="text-sm text-muted-foreground">
                      {formatDateRange(experience.startDate, experience.endDate, experience.isCurrent)}
                      {experience.location && (
                        <>
                          <span className="mx-2">•</span>
                          <span>{experience.location}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditExperience(index)}
                    className="ml-2 h-8 w-8 p-0"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                </div>
                {experience.description && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {experience.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No work experience information available in profile</p>
          </div>
        )}

        {/* Add Employment Entry Button */}
        <div className="border-2 border-dashed border-muted rounded-lg p-8">
          <div className="text-center">
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Employment Entry
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Work Experience</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company/Organization *</Label>
                      <Input
                        id="company"
                        placeholder="Company name"
                        value={newExperience.company}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="position">Position Title *</Label>
                      <Input
                        id="position"
                        placeholder="Your role"
                        value={newExperience.position}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employmentType">Employment Type</Label>
                      <Select 
                        value={newExperience.employmentType} 
                        onValueChange={(value) => setNewExperience(prev => ({ ...prev, employmentType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        placeholder="City, Country"
                        value={newExperience.location}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="month"
                        value={newExperience.startDate}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="month"
                        value={newExperience.endDate}
                        onChange={(e) => setNewExperience(prev => ({ ...prev, endDate: e.target.value }))}
                        disabled={newExperience.isCurrent}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isCurrent"
                        checked={newExperience.isCurrent}
                        onCheckedChange={(checked) => setNewExperience(prev => ({ 
                          ...prev, 
                          isCurrent: checked as boolean,
                          endDate: checked ? '' : prev.endDate
                        }))}
                      />
                      <Label htmlFor="isCurrent">I currently work here</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isUNExperience"
                        checked={newExperience.isUNExperience}
                        onCheckedChange={(checked) => setNewExperience(prev => ({ ...prev, isUNExperience: checked as boolean }))}
                      />
                      <Label htmlFor="isUNExperience">This is UN system experience</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe your responsibilities and achievements..."
                      rows={4}
                      value={newExperience.description}
                      onChange={(e) => setNewExperience(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Supervisor Details Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">Supervisor Details (Required)</h4>
                      <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supervisor_name">Supervisor Name *</Label>
                        <Input
                          id="supervisor_name"
                          placeholder="Full name"
                          value={newExperience.supervisor_name}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, supervisor_name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supervisor_title">Supervisor Job Title *</Label>
                        <Input
                          id="supervisor_title"
                          placeholder="Job title"
                          value={newExperience.supervisor_title}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, supervisor_title: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="supervisor_phone">Supervisor Phone Number *</Label>
                        <Input
                          id="supervisor_phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={newExperience.supervisor_phone}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, supervisor_phone: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="supervisor_email">Supervisor Email *</Label>
                        <Input
                          id="supervisor_email"
                          type="email"
                          placeholder="supervisor@company.com"
                          value={newExperience.supervisor_email}
                          onChange={(e) => setNewExperience(prev => ({ ...prev, supervisor_email: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddExperience} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Work Experience
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Edit Experience Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Edit Work Experience</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-6 py-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-company">Company/Organization *</Label>
                      <Input
                        id="edit-company"
                        placeholder="Company name"
                        value={editingExperience.company}
                        onChange={(e) => setEditingExperience(prev => ({ ...prev, company: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-position">Position Title *</Label>
                      <Input
                        id="edit-position"
                        placeholder="Your role"
                        value={editingExperience.position}
                        onChange={(e) => setEditingExperience(prev => ({ ...prev, position: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-employmentType">Employment Type</Label>
                      <Select 
                        value={editingExperience.employmentType} 
                        onValueChange={(value) => setEditingExperience(prev => ({ ...prev, employmentType: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Full-time">Full-time</SelectItem>
                          <SelectItem value="Part-time">Part-time</SelectItem>
                          <SelectItem value="Contract">Contract</SelectItem>
                          <SelectItem value="Freelance">Freelance</SelectItem>
                          <SelectItem value="Internship">Internship</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-location">Location</Label>
                      <Input
                        id="edit-location"
                        placeholder="City, Country"
                        value={editingExperience.location}
                        onChange={(e) => setEditingExperience(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-startDate">Start Date</Label>
                      <Input
                        id="edit-startDate"
                        type="month"
                        value={editingExperience.startDate}
                        onChange={(e) => setEditingExperience(prev => ({ ...prev, startDate: e.target.value }))}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="edit-endDate">End Date</Label>
                      <Input
                        id="edit-endDate"
                        type="month"
                        value={editingExperience.endDate}
                        onChange={(e) => setEditingExperience(prev => ({ ...prev, endDate: e.target.value }))}
                        disabled={editingExperience.isCurrent}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isCurrent"
                        checked={editingExperience.isCurrent}
                        onCheckedChange={(checked) => setEditingExperience(prev => ({ 
                          ...prev, 
                          isCurrent: checked as boolean,
                          endDate: checked ? '' : prev.endDate
                        }))}
                      />
                      <Label htmlFor="edit-isCurrent">I currently work here</Label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isUNExperience"
                        checked={editingExperience.isUNExperience}
                        onCheckedChange={(checked) => setEditingExperience(prev => ({ ...prev, isUNExperience: checked as boolean }))}
                      />
                      <Label htmlFor="edit-isUNExperience">This is UN system experience</Label>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea
                      id="edit-description"
                      placeholder="Describe your responsibilities and achievements..."
                      rows={4}
                      value={editingExperience.description}
                      onChange={(e) => setEditingExperience(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  {/* Supervisor Details Section */}
                  <div className="space-y-4 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">Supervisor Details (Required)</h4>
                      <Badge variant="destructive" className="text-xs">Mandatory</Badge>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-supervisor_name">Supervisor Name *</Label>
                        <Input
                          id="edit-supervisor_name"
                          placeholder="Full name"
                          value={editingExperience.supervisor_name}
                          onChange={(e) => setEditingExperience(prev => ({ ...prev, supervisor_name: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-supervisor_title">Supervisor Job Title *</Label>
                        <Input
                          id="edit-supervisor_title"
                          placeholder="Job title"
                          value={editingExperience.supervisor_title}
                          onChange={(e) => setEditingExperience(prev => ({ ...prev, supervisor_title: e.target.value }))}
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-supervisor_phone">Supervisor Phone Number *</Label>
                        <Input
                          id="edit-supervisor_phone"
                          type="tel"
                          placeholder="+1 234 567 8900"
                          value={editingExperience.supervisor_phone}
                          onChange={(e) => setEditingExperience(prev => ({ ...prev, supervisor_phone: e.target.value }))}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="edit-supervisor_email">Supervisor Email *</Label>
                        <Input
                          id="edit-supervisor_email"
                          type="email"
                          placeholder="supervisor@company.com"
                          value={editingExperience.supervisor_email}
                          onChange={(e) => setEditingExperience(prev => ({ ...prev, supervisor_email: e.target.value }))}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                      <Edit2 className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}