import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { jobId } = await req.json();

    // Get 4 applications in Panel Interview stage
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select('id, candidate_id')
      .eq('job_id', jobId)
      .eq('status', 'Panel Interview')
      .limit(4);

    if (appsError) throw appsError;

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No applications in Panel Interview stage found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Get available time slots
    const { data: slots, error: slotsError } = await supabase
      .from('panel_interview_time_slots')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'available')
      .order('slot_datetime')
      .limit(applications.length);

    if (slotsError) throw slotsError;

    if (!slots || slots.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No available time slots found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Book slots for each application
    const updates = [];
    for (let i = 0; i < Math.min(applications.length, slots.length); i++) {
      const { error: updateError } = await supabase
        .from('panel_interview_time_slots')
        .update({
          status: 'booked',
          booked_by_application_id: applications[i].id,
          updated_at: new Date().toISOString()
        })
        .eq('id', slots[i].id);

      if (updateError) {
        console.error('Error updating slot:', updateError);
      } else {
        updates.push({
          slotId: slots[i].id,
          applicationId: applications[i].id
        });
      }
    }

    return new Response(
      JSON.stringify({
        message: `Successfully booked ${updates.length} interview slots`,
        bookings: updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
