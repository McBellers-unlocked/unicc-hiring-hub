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

    // Reset all booked slots back to available
    await supabase
      .from('panel_interview_time_slots')
      .update({
        status: 'available',
        booked_by_application_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('status', 'booked');

    // Delete any existing panel interviews for this job's applications
    const { data: applications } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId);

    if (applications && applications.length > 0) {
      const appIds = applications.map(a => a.id);
      await supabase
        .from('panel_interviews')
        .delete()
        .in('application_id', appIds);
    }

    // Now call simulate-slot-bookings to re-create everything properly
    const response = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/functions/v1/simulate-slot-bookings`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      }
    );

    const result = await response.json();

    return new Response(
      JSON.stringify({
        message: 'Successfully reset and rebooked interviews',
        result
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
