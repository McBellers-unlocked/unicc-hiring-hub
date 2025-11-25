import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, CheckCircle2, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Layout } from '@/components/Layout';

interface TimeSlot {
  id: string;
  slot_datetime: string;
  duration_minutes: number;
  status: string;
  panel_member_ids: string[];
}

interface Invitation {
  id: string;
  deadline_at: string;
  job_id: string;
  jobs: {
    title: string;
    notice_no: string;
    location: string;
  };
}

export default function BookInterviewSlot() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  useEffect(() => {
    if (applicationId) {
      fetchData();
    }
  }, [applicationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch invitation details
      const { data: invitationData, error: invError } = await supabase
        .from('panel_interview_invitations')
        .select(`
          id,
          deadline_at,
          job_id,
          jobs!inner(
            title,
            notice_no,
            location
          )
        `)
        .eq('application_id', applicationId)
        .eq('status', 'pending')
        .single();

      if (invError) throw invError;
      if (!invitationData) {
        toast({
          title: "Not Found",
          description: "Interview invitation not found or already completed.",
          variant: "destructive"
        });
        navigate('/my-applications');
        return;
      }

      setInvitation(invitationData as any);

      // Fetch available slots for this job
      const { data: slotsData, error: slotsError } = await supabase
        .from('panel_interview_time_slots')
        .select('*')
        .eq('job_id', invitationData.job_id)
        .eq('status', 'available')
        .gt('slot_datetime', new Date().toISOString())
        .order('slot_datetime', { ascending: true });

      if (slotsError) throw slotsError;

      setAvailableSlots(slotsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load interview slots",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async () => {
    if (!selectedSlot) return;

    setBooking(true);
    try {
      // Update the time slot
      const { error: slotError } = await supabase
        .from('panel_interview_time_slots')
        .update({
          status: 'booked',
          booked_by_application_id: applicationId
        })
        .eq('id', selectedSlot);

      if (slotError) throw slotError;

      // Update the invitation
      const { error: invError } = await supabase
        .from('panel_interview_invitations')
        .update({
          status: 'booked',
          booked_slot_id: selectedSlot,
          booked_at: new Date().toISOString()
        })
        .eq('application_id', applicationId);

      if (invError) throw invError;

      toast({
        title: "Success!",
        description: "Your interview slot has been booked successfully."
      });

      navigate('/my-applications');
    } catch (error) {
      console.error('Error booking slot:', error);
      toast({
        title: "Error",
        description: "Failed to book interview slot. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!invitation) {
    return (
      <Layout>
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">Invitation Not Found</h3>
          <p className="text-muted-foreground mb-6">
            The interview invitation could not be found or may have expired.
          </p>
          <Button onClick={() => navigate('/my-applications')}>
            Back to Applications
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Book Your Interview</h1>
          <p className="text-muted-foreground">
            Select your preferred time slot for the panel interview
          </p>
        </div>

        {/* Job Info Card */}
        <Card>
          <CardHeader>
            <CardTitle>{invitation.jobs.title}</CardTitle>
            <CardDescription>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{invitation.jobs.notice_no}</Badge>
                </div>
                {invitation.jobs.location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4" />
                    {invitation.jobs.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <Clock className="h-4 w-4" />
                  Book by {format(new Date(invitation.deadline_at), 'PPP')}
                </div>
              </div>
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Available Slots */}
        <Card>
          <CardHeader>
            <CardTitle>Available Time Slots</CardTitle>
            <CardDescription>
              Select a time that works best for you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No slots available at the moment.</p>
                <p className="text-sm mt-1">Please check back later or contact HR.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableSlots.map((slot) => (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedSlot === slot.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedSlot(slot.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        selectedSlot === slot.id
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`}>
                        {selectedSlot === slot.id && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold">
                          {format(new Date(slot.slot_datetime), 'EEEE, MMMM d, yyyy')}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(slot.slot_datetime), 'h:mm a')} - {slot.duration_minutes} minutes
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Users className="h-3 w-3" />
                          {slot.panel_member_ids.length} panel members
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={() => navigate('/my-applications')}
          >
            Cancel
          </Button>
          <Button
            onClick={handleBookSlot}
            disabled={!selectedSlot || booking}
          >
            {booking ? 'Booking...' : 'Confirm Booking'}
          </Button>
        </div>
      </div>
    </Layout>
  );
}
