import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, Clock, MapPin, Link as LinkIcon, Users, UserPlus, Building2, X } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface FeedbackTemplate {
  id: string;
  name: string;
  sections: any;
}

interface ExternalPanelist {
  id?: string;
  name: string;
  position: string;
  organization: string;
  email: string;
  isExternal: true;
}

interface PanelInterviewSchedulerProps {
  applicationId: string;
  onScheduled: () => void;
}

export const PanelInterviewScheduler: React.FC<PanelInterviewSchedulerProps> = ({
  applicationId,
  onScheduled
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [selectedPanelists, setSelectedPanelists] = useState<string[]>([]);
  const [externalPanelists, setExternalPanelists] = useState<ExternalPanelist[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExternalForm, setShowExternalForm] = useState(false);
  const [externalForm, setExternalForm] = useState({
    name: '',
    position: '',
    organization: '',
    email: ''
  });
  const [scheduledDate, setScheduledDate] = useState<Date>();
  const [scheduledTime, setScheduledTime] = useState('');
  const [duration, setDuration] = useState(60);
  const [location, setLocation] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [title, setTitle] = useState('Panel Interview');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role')
        .in('role', ['Admin', 'HR Assistant', 'Hiring Manager', 'Panel Member'])
        .order('name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive"
      });
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('feedback_form_templates')
        .select('id, name, sections')
        .order('name');

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load feedback templates",
        variant: "destructive"
      });
    }
  };

  const handlePanelistToggle = (userId: string) => {
    setSelectedPanelists(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAddExternalPanelist = () => {
    if (!externalForm.name || !externalForm.position || !externalForm.organization || !externalForm.email) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields for the external panelist",
        variant: "destructive"
      });
      return;
    }

    setExternalPanelists(prev => [...prev, { ...externalForm, isExternal: true }]);
    setExternalForm({ name: '', position: '', organization: '', email: '' });
    setShowExternalForm(false);
    toast({
      title: "External Panelist Added",
      description: `${externalForm.name} has been added to the panel`
    });
  };

  const handleRemoveExternalPanelist = (index: number) => {
    setExternalPanelists(prev => prev.filter((_, i) => i !== index));
  };

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSchedule = async () => {
    if (!scheduledDate || (selectedPanelists.length === 0 && externalPanelists.length === 0)) {
      toast({
        title: "Missing Information",
        description: "Please select date and at least one panelist",
        variant: "destructive"
      });
      return;
    }

    if (!scheduledTime) {
      toast({
        title: "Missing Information",
        description: "Please select a time",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const scheduledDateTime = new Date(scheduledDate);
      const [hours, minutes] = scheduledTime.split(':');
      scheduledDateTime.setHours(parseInt(hours), parseInt(minutes));

      // Create external panelists first if any
      const createdExternalIds: string[] = [];
      for (const external of externalPanelists) {
        const { data: externalData, error: externalError } = await supabase
          .from('external_panel_members')
          .insert({
            name: external.name,
            position: external.position,
            organization: external.organization,
            email: external.email
          })
          .select()
          .single();

        if (externalError) throw externalError;
        createdExternalIds.push(externalData.id);
      }

      // Create interview record
      const { data: interview, error: interviewError } = await supabase
        .from('panel_interviews')
        .insert({
          application_id: applicationId,
          title,
          scheduled_at: scheduledDateTime.toISOString(),
          duration_minutes: duration,
          location: location || null,
          meeting_link: meetingLink || null,
          notes: notes || null,
          feedback_template_id: selectedTemplate || null,
          created_by: user?.id
        })
        .select()
        .single();

      if (interviewError) throw interviewError;

      // Add internal panelists
      const internalParticipants = selectedPanelists.map(panelistId => ({
        panel_interview_id: interview.id,
        panelist_id: panelistId,
        external_panelist_id: null
      }));

      // Add external panelists
      const externalParticipants = createdExternalIds.map(externalId => ({
        panel_interview_id: interview.id,
        panelist_id: null,
        external_panelist_id: externalId
      }));

      const allParticipants = [...internalParticipants, ...externalParticipants];

      if (allParticipants.length > 0) {
        const { error: participantsError } = await supabase
          .from('panel_interview_participants')
          .insert(allParticipants);

        if (participantsError) throw participantsError;
      }

      // Sync with calendar
      const internalEmails = selectedPanelists
        .map(id => users.find(u => u.id === id)?.email)
        .filter(Boolean) as string[];
      
      const externalEmails = externalPanelists.map(e => e.email);
      const allEmails = [...internalEmails, ...externalEmails];

      if (allEmails.length > 0) {
        await supabase.functions.invoke('sync-calendar', {
          body: {
            interviewId: interview.id,
            title,
            scheduledAt: scheduledDateTime.toISOString(),
            duration,
            location: location || '',
            meetingLink: meetingLink || '',
            participants: allEmails
          }
        });
      }

      toast({
        title: "Success",
        description: "Panel interview scheduled successfully"
      });

      onScheduled();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Error",
        description: "Failed to schedule interview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule Panel Interview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="title">Interview Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Panel Interview"
            />
          </div>

          <div>
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="45">45 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
                <SelectItem value="90">90 minutes</SelectItem>
                <SelectItem value="120">120 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>
              <CalendarIcon className="h-4 w-4 inline mr-2" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  {scheduledDate ? format(scheduledDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={scheduledDate}
                  onSelect={setScheduledDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <Label htmlFor="time">
              <Clock className="h-4 w-4 inline mr-2" />
              Time
            </Label>
            <Input
              id="time"
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="location">
            <MapPin className="h-4 w-4 inline mr-2" />
            Location
          </Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Conference Room A"
          />
        </div>

        <div>
          <Label htmlFor="meeting-link">
            <LinkIcon className="h-4 w-4 inline mr-2" />
            Meeting Link (Optional)
          </Label>
          <Input
            id="meeting-link"
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            placeholder="https://teams.microsoft.com/..."
          />
        </div>

        <div>
          <Label htmlFor="template">Feedback Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select template (optional)" />
            </SelectTrigger>
            <SelectContent>
              {templates.map(template => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>
              <Users className="h-4 w-4 inline mr-2" />
              Panel Members
            </Label>
            <Dialog open={showExternalForm} onOpenChange={setShowExternalForm}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add External Member
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add External Panel Member</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="ext-name">Full Name</Label>
                    <Input
                      id="ext-name"
                      value={externalForm.name}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-position">Position</Label>
                    <Input
                      id="ext-position"
                      value={externalForm.position}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, position: e.target.value }))}
                      placeholder="Senior Manager"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-org">Organization</Label>
                    <Input
                      id="ext-org"
                      value={externalForm.organization}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, organization: e.target.value }))}
                      placeholder="UN Organization"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ext-email">Email</Label>
                    <Input
                      id="ext-email"
                      type="email"
                      value={externalForm.email}
                      onChange={(e) => setExternalForm(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="john.doe@organization.org"
                    />
                  </div>
                  <Button onClick={handleAddExternalPanelist} className="w-full">
                    Add External Member
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search for internal staff */}
          <div>
            <Label htmlFor="search-staff">Search UNICC Staff</Label>
            <Input
              id="search-staff"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="mb-2"
            />
          </div>

          {/* Selected internal panelists */}
          {selectedPanelists.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Selected Internal Members</Label>
              <div className="flex flex-wrap gap-2">
                {selectedPanelists.map(id => {
                  const selectedUser = users.find(u => u.id === id);
                  return selectedUser ? (
                    <Badge key={id} variant="secondary" className="gap-1">
                      {selectedUser.name}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handlePanelistToggle(id)}
                      />
                    </Badge>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* Selected external panelists */}
          {externalPanelists.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">External Members</Label>
              <div className="space-y-2">
                {externalPanelists.map((external, index) => (
                  <div key={index} className="flex items-start justify-between p-2 border rounded-md bg-muted/50">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{external.name}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {external.position} at {external.organization}
                      </div>
                      <div className="text-xs text-muted-foreground">{external.email}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExternalPanelist(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Internal staff list */}
          <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
            <Label className="text-xs text-muted-foreground">Available UNICC Staff</Label>
            {filteredUsers.map(availableUser => (
              <div key={availableUser.id} className="flex items-center space-x-2">
                <Checkbox
                  id={availableUser.id}
                  checked={selectedPanelists.includes(availableUser.id)}
                  onCheckedChange={() => handlePanelistToggle(availableUser.id)}
                />
                <label
                  htmlFor={availableUser.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {availableUser.name} ({availableUser.email}) - {availableUser.role}
                </label>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff members found
              </p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes (Optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any additional notes..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSchedule} 
          disabled={loading || !scheduledDate || !scheduledTime || (selectedPanelists.length === 0 && externalPanelists.length === 0)}
          className="w-full"
        >
          {loading ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      </CardContent>
    </Card>
  );
};