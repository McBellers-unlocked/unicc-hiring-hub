import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PanelMember {
  user_id: string;
  name: string;
  panel_role: string;
  duty_station?: string;
  nationality?: string;
  division?: string;
}

interface TimeSlot {
  id: string;
  slot_datetime: string;
  duration_minutes: number;
  status: string;
  panel_member_ids: string[];
}

interface PanelInterviewSlotManagerProps {
  jobId: string;
  panelMembers: PanelMember[];
}

export function PanelInterviewSlotManager({ jobId, panelMembers }: PanelInterviewSlotManagerProps) {
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState('09:00');
  const [duration, setDuration] = useState(60);

  useEffect(() => {
    fetchSlots();
  }, [jobId]);

  const fetchSlots = async () => {
    try {
      const { data, error } = await supabase
        .from('panel_interview_time_slots' as any)
        .select('*')
        .eq('job_id', jobId)
        .order('slot_datetime');

      if (error) throw error;
      
      setSlots((data || []).map((slot: any) => ({
        id: slot.id,
        slot_datetime: slot.slot_datetime,
        duration_minutes: slot.duration_minutes,
        status: slot.status,
        panel_member_ids: slot.panel_member_ids
      })));
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to load time slots');
    } finally {
      setLoading(false);
    }
  };

  const createSlot = async () => {
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const slotDateTime = new Date(selectedDate);
      const [hours, minutes] = selectedTime.split(':');
      slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const allPanelMemberIds = panelMembers.map(pm => pm.user_id);

      const { error } = await supabase
        .from('panel_interview_time_slots' as any)
        .insert([{
          job_id: jobId,
          slot_datetime: slotDateTime.toISOString(),
          duration_minutes: duration,
          panel_member_ids: allPanelMemberIds,
          status: 'available'
        }]);

      if (error) throw error;

      toast.success('Time slot created successfully');
      fetchSlots();
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Error creating slot:', error);
      toast.error('Failed to create time slot');
    }
  };

  const createBulkSlots = async () => {
    if (!selectedDate) {
      toast.error('Please select a start date');
      return;
    }

    try {
      const allPanelMemberIds = panelMembers.map(pm => pm.user_id);
      const slotsToCreate = [];
      
      // Create slots for the next 5 business days, 3 slots per day
      for (let day = 0; day < 5; day++) {
        const currentDate = new Date(selectedDate);
        currentDate.setDate(currentDate.getDate() + day);
        
        // Skip weekends
        if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;
        
        // Create 3 slots per day: 9am, 11am, 2pm
        const times = ['09:00', '11:00', '14:00'];
        times.forEach(time => {
          const [hours, minutes] = time.split(':');
          const slotDateTime = new Date(currentDate);
          slotDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
          
          slotsToCreate.push({
            job_id: jobId,
            slot_datetime: slotDateTime.toISOString(),
            duration_minutes: duration,
            panel_member_ids: allPanelMemberIds,
            status: 'available'
          });
        });
      }

      const { error } = await supabase
        .from('panel_interview_time_slots' as any)
        .insert(slotsToCreate);

      if (error) throw error;

      toast.success(`Created ${slotsToCreate.length} time slots`);
      fetchSlots();
      setSelectedDate(undefined);
    } catch (error) {
      console.error('Error creating bulk slots:', error);
      toast.error('Failed to create time slots');
    }
  };

  const deleteSlot = async (slotId: string) => {
    try {
      const { error } = await supabase
        .from('panel_interview_time_slots' as any)
        .delete()
        .eq('id', slotId);

      if (error) throw error;

      toast.success('Time slot deleted');
      fetchSlots();
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error('Failed to delete time slot');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">Available</Badge>;
      case 'booked':
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">Booked</Badge>;
      case 'reserved':
        return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">Reserved</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Panel Interview Scheduling</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Panel Interview Scheduling</CardTitle>
        <CardDescription>
          Create and manage interview time slots for this position
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Create New Slot */}
        <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
          <h3 className="font-medium">Create Time Slots</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="time">Time</Label>
              <Input
                id="time"
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value))}
                min={15}
                step={15}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={createSlot} className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create Single Slot
            </Button>
            <Button onClick={createBulkSlots} variant="outline" className="flex-1">
              <Plus className="h-4 w-4 mr-2" />
              Create Multiple Slots
            </Button>
          </div>
        </div>

        {/* Existing Slots */}
        <div className="space-y-2">
          <h3 className="font-medium">Scheduled Time Slots ({slots.length})</h3>
          {slots.length === 0 ? (
            <p className="text-muted-foreground text-sm">No time slots created yet</p>
          ) : (
            <div className="space-y-2">
              {slots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {format(new Date(slot.slot_datetime), "PPP 'at' p")}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Duration: {slot.duration_minutes} minutes
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(slot.status)}
                    {slot.status === 'available' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSlot(slot.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
