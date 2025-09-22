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
import { Briefcase, Info, Plus, Calendar } from 'lucide-react';

interface WorkExperienceEntry {
  position: string;
  company: string;
  startDate: string;
  endDate?: string;
  location?: string;
  isCurrent?: boolean;
  isUNExperience?: boolean;
  description?: string;
}

interface PHFWorkExperienceSectionProps {
  profileWorkExperience: WorkExperienceEntry[];
}

export default function PHFWorkExperienceSection({ profileWorkExperience }: PHFWorkExperienceSectionProps) {
  // Debug: Log the data to check what's being passed
  console.log('PHFWorkExperienceSection - profileWorkExperience:', profileWorkExperience);
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newExperience, setNewExperience] = useState({
    company: '',
    position: '',
    employmentType: 'Full-time',
    location: '',
    startDate: '',
    endDate: '',
    isCurrent: false,
    isUNExperience: false,
    description: ''
  });
  const formatDateRange = (startDate: string, endDate?: string, isCurrent?: boolean) => {
    const formatDate = (date: string) => {
      if (!date) return '';
      const d = new Date(date);
      if (isNaN(d.getTime())) return date; // Return original if invalid date
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${year}-${month}`;
    };

    const start = formatDate(startDate);
    const end = isCurrent ? 'Present' : (endDate ? formatDate(endDate) : 'Present');
    
    return `${start} - ${end}`;
  };

  const handleAddExperience = () => {
    // This would typically call a parent function to add the experience
    console.log('Adding new experience:', newExperience);
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
      description: ''
    });
  };

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
          </div>
        </div>

        {/* Work Experience Entries */}
        {profileWorkExperience && profileWorkExperience.length > 0 ? (
          <div className="space-y-3">
            {profileWorkExperience.map((experience, index) => (
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
          </div>
        </div>
      </CardContent>
    </Card>
  );
}