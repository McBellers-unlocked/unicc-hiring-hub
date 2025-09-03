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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, Clock, MapPin, Link as LinkIcon } from 'lucide-react';
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

  const handleSchedule = async () => {
    if (!scheduledDate || !scheduledTime || selectedPanelists.length === 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = scheduledTime.split(':');
      const scheduledAt = new Date(scheduledDate);
      scheduledAt.setHours(parseInt(hours), parseInt(minutes));

      // Create panel interview
      const { data: interview, error: interviewError } = await supabase
        .from('panel_interviews')
        .insert({
          application_id: applicationId,
          title,
          scheduled_at: scheduledAt.toISOString(),
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

      // Add participants
      const participants = selectedPanelists.map(panelistId => ({
        panel_interview_id: interview.id,
        panelist_id: panelistId
      }));

      const { error: participantsError } = await supabase
        .from('panel_interview_participants')
        .insert(participants);

      if (participantsError) throw participantsError;

      // Call calendar sync
      await supabase.functions.invoke('sync-calendar', {
        body: {
          interviewId: interview.id,
          title,
          scheduledAt: scheduledAt.toISOString(),
          duration,
          location,
          meetingLink,
          participants: selectedPanelists
        }
      });

      toast({
        title: "Success",
        description: "Panel interview scheduled successfully"
      });

      onScheduled();
    } catch (error) {
      console.error('Error scheduling interview:', error);
      toast({
        title: "Error",
        description: "Failed to schedule panel interview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5" />
          Schedule Panel Interview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="title">Interview Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Panel Interview"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              min="30"
              max="240"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !scheduledDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
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
          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="time"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Conference Room A"
                className="pl-10"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="meetingLink">Meeting Link</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="meetingLink"
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://teams.microsoft.com/..."
                className="pl-10"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Feedback Template</Label>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger>
              <SelectValue placeholder="Select feedback template" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Select Panelists</Label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {users.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <Checkbox
                  id={user.id}
                  checked={selectedPanelists.includes(user.id)}
                  onCheckedChange={() => handlePanelistToggle(user.id)}
                />
                <Label htmlFor={user.id} className="text-sm font-normal">
                  {user.name} ({user.role})
                </Label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Additional notes for the interview..."
            rows={3}
          />
        </div>

        <Button 
          onClick={handleSchedule} 
          disabled={loading || !scheduledDate || !scheduledTime || selectedPanelists.length === 0}
          className="w-full"
        >
          {loading ? 'Scheduling...' : 'Schedule Interview'}
        </Button>
      </CardContent>
    </Card>
  );
};