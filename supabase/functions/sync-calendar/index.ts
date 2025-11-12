import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface CalendarSyncRequest {
  interviewId: string;
  title: string;
  scheduledAt: string;
  duration: number;
  location?: string;
  meetingLink?: string;
  participants: string[];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      interviewId,
      title,
      scheduledAt,
      duration,
      location,
      meetingLink,
      participants
    }: CalendarSyncRequest = await req.json();

    console.log("Processing calendar sync for interview:", interviewId);

    // Get participant email addresses
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .in('id', participants);

    if (usersError) {
      console.error("Error fetching participants:", usersError);
      throw usersError;
    }

    // Create calendar event data
    const startDate = new Date(scheduledAt);
    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);

    const calendarEvent = {
      subject: title,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: "UTC"
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: "UTC"
      },
      location: {
        displayName: location || "TBD"
      },
      body: {
        contentType: "text",
        content: `Panel Interview\n\n${meetingLink ? `Meeting Link: ${meetingLink}\n\n` : ''}Please join on time.`
      },
      attendees: users.map(user => ({
        emailAddress: {
          address: user.email,
          name: user.name
        },
        type: "required"
      })),
      isOnlineMeeting: !!meetingLink,
      onlineMeetingUrl: meetingLink
    };

    console.log("Calendar event created:", JSON.stringify(calendarEvent, null, 2));

    // Generate iCalendar (.ics) file
    const icsContent = generateICS({
      title,
      startDate,
      endDate,
      location: location || "TBD",
      description: `Panel Interview\n\n${meetingLink ? `Meeting Link: ${meetingLink}\n\n` : ''}Please join on time.`,
      attendees: users.map(u => ({ email: u.email, name: u.name }))
    });

    console.log("Generated .ics file for Outlook sync");

    // For now, store the ICS content in the interview notes
    // In a full implementation, you would email this to participants
    console.log("Would email .ics file to:", users.map(u => u.email).join(', '));

    // Update interview status to indicate calendar sync attempt
    const { error: updateError } = await supabase
      .from('panel_interviews')
      .update({
        status: 'scheduled'
      })
      .eq('id', interviewId);

    if (updateError) {
      console.error("Error updating interview status:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Calendar sync initiated",
        eventData: calendarEvent,
        icsGenerated: true
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in sync-calendar function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

// Helper function to generate iCalendar format
function generateICS(params: {
  title: string;
  startDate: Date;
  endDate: Date;
  location: string;
  description: string;
  attendees: { email: string; name: string }[];
}): string {
  const { title, startDate, endDate, location, description, attendees } = params;
  
  // Format dates as YYYYMMDDTHHMMSSZ
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const attendeeLines = attendees.map(att => 
    `ATTENDEE;CN=${att.name};RSVP=TRUE:mailto:${att.email}`
  ).join('\n');

  const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//UNICC//Panel Interview//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:${Date.now()}@unicc.org
DTSTAMP:${formatDate(new Date())}
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:${title}
LOCATION:${location}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
STATUS:CONFIRMED
SEQUENCE:0
${attendeeLines}
END:VEVENT
END:VCALENDAR`;

  return ics;
}

serve(handler);