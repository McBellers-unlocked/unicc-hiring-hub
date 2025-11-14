import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Users, Trash2, Plus } from 'lucide-react';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

interface TimeSlot {
  id?: string;
  slot_datetime: Date | null;
  duration_minutes: number;
  status: 'available' | 'reserved' | 'booked';
  time?: string;
}

interface PanelMember {
  panel_member_id?: string;
  user_id: string;
  name: string;
  panel_role?: string;
}

interface PanelInterviewSlotManagerProps {
  jobId: string;
  panelMembers: PanelMember[];
}

export function PanelInterviewSlotManager({ jobId, panelMembers }: PanelInterviewSlotManagerProps) {
  const { toast } = useToast();
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSlots();
  }, [jobId]);

  const fetchSlots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('panel_interview_time_slots')
        .select('*')
        .eq('job_id', jobId)
        .order('slot_datetime', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setSlots(data.map(slot => ({
          id: slot.id,
          slot_datetime: slot.slot_datetime ? new Date(slot.slot_datetime) : null,
          duration_minutes: slot.duration_minutes,
          status: slot.status as 'available' | 'reserved' | 'booked',
          time: slot.slot_datetime ? format(new Date(slot.slot_datetime), 'HH:mm') : ''
        })));
      } else {
        // Initialize with 5 empty slots
        initializeSlots();
      }
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast({
        title: "Error",
        description: "Failed to load interview slots",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const initializeSlots = () => {
    const emptySlots: TimeSlot[] = Array(5).fill(null).map(() => ({
      slot_datetime: null,
      duration_minutes: 60,
      status: 'available' as const,
      time: ''
    }));
    setSlots(emptySlots);
  };

  const updateSlot = (index: number, updates: Partial<TimeSlot>) => {
    setSlots(prev => prev.map((slot, i) => 
      i === index ? { ...slot, ...updates } : slot
    ));
  };

  const updateSlotDate = (index: number, date: Date | null) => {
    setSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      
      if (!date) return { ...slot, slot_datetime: null };
      
      // Preserve existing time if any
      if (slot.time && slot.time !== '') {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return { ...slot, slot_datetime: newDate };
      }
      
      return { ...slot, slot_datetime: date };
    }));
  };

  const updateSlotTime = (index: number, time: string) => {
    setSlots(prev => prev.map((slot, i) => {
      if (i !== index) return slot;
      
      const [hours, minutes] = time.split(':').map(Number);
      const newDate = slot.slot_datetime ? new Date(slot.slot_datetime) : new Date();
      newDate.setHours(hours, minutes, 0, 0);
      
      return { 
        ...slot, 
        time,
        slot_datetime: newDate 
      };
    }));
  };

  const addSlot = () => {
    setSlots(prev => [...prev, {
      slot_datetime: null,
      duration_minutes: 60,
      status: 'available',
      time: ''
    }]);
  };

  const removeSlot = (index: number) => {
    if (slots.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one slot is required",
        variant: "destructive",
      });
      return;
    }
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const saveSlots = async () => {
    // Validate all slots have dates and times
    const invalidSlots = slots.filter(s => !s.slot_datetime);
    if (invalidSlots.length > 0) {
      toast({
        title: "Incomplete slots",
        description: "Please set date and time for all slots before saving",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      
      // Delete existing slots for this job
      const { error: deleteError } = await supabase
        .from('panel_interview_time_slots')
        .delete()
        .eq('job_id', jobId);

      if (deleteError) throw deleteError;

      // Insert new slots
      const { error: insertError } = await supabase
        .from('panel_interview_time_slots')
        .insert(
          slots.map(slot => ({
            job_id: jobId,
            panel_member_ids: panelMembers.map(m => m.user_id),
            slot_datetime: slot.slot_datetime?.toISOString(),
            duration_minutes: slot.duration_minutes,
            status: 'available'
          }))
        );

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: "Interview slots saved successfully",
      });

      // Refresh slots to get IDs
      await fetchSlots();
    } catch (error) {
      console.error('Error saving slots:', error);
      toast({
        title: "Error",
        description: "Failed to save interview slots",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const publishSlots = async () => {
    await saveSlots();
    toast({
      title: "Published",
      description: "Slots are now available for candidates to book",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Loading interview slots...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Panel Interview Scheduling
        </CardTitle>
        <CardDescription>
          Create interview time slots for candidates to book. All slots will include the full panel.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Panel Members: {panelMembers.map(m => m.name.split(' ').map(n => n[0]).join('')).join(', ')}</span>
        </div>

        <div className="space-y-3">
          {slots.map((slot, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
              <span className="text-sm font-medium min-w-[60px]">Slot {index + 1}</span>
              
              <CustomDatePicker
                selected={slot.slot_datetime}
                onChange={(date) => updateSlotDate(index, date)}
                placeholderText="Pick date"
                className="flex-1"
              />
              
              <input
                type="time"
                value={slot.time || ''}
                onChange={(e) => updateSlotTime(index, e.target.value)}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm"
              />
              
              <Select
                value={slot.duration_minutes.toString()}
                onValueChange={(value) => updateSlot(index, { duration_minutes: parseInt(value) })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="60">60 min</SelectItem>
                  <SelectItem value="90">90 min</SelectItem>
                  <SelectItem value="120">120 min</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeSlot(index)}
                disabled={slots.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addSlot}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Another Slot
        </Button>

        <div className="flex gap-3 pt-4">
          <Button
            onClick={saveSlots}
            disabled={saving}
            variant="secondary"
            className="flex-1"
          >
            <Clock className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : 'Save Slots'}
          </Button>
          <Button
            onClick={publishSlots}
            disabled={saving}
            className="flex-1"
          >
            {saving ? 'Publishing...' : 'Publish to Candidates'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
