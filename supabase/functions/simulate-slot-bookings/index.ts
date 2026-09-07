import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth guard: allow service role (internal calls) or Admin/HR users
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = authHeader === `Bearer ${supabaseServiceKey}`;
    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

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

    // Get feedback template for this job
    const { data: template, error: templateError } = await supabase
      .from('feedback_form_templates')
      .select('id')
      .eq('job_id', jobId)
      .eq('auto_generated', true)
      .single();

    if (templateError) {
      console.error('Error fetching template:', templateError);
    }

    // Get panel members for this job
    const { data: panelMembers, error: panelError } = await supabase
      .from('job_interview_panel_members')
      .select('user_id, panel_role')
      .eq('job_id', jobId);

    if (panelError) {
      console.error('Error fetching panel members:', panelError);
    }

    // Get slot details to use scheduled_at time
    const { data: slotDetails, error: slotDetailsError } = await supabase
      .from('panel_interview_time_slots')
      .select('id, slot_datetime, duration_minutes')
      .in('id', slots.map(s => s.id));

    if (slotDetailsError) {
      console.error('Error fetching slot details:', slotDetailsError);
    }

    // Book slots for each application and create panel interviews
    const updates = [];
    for (let i = 0; i < Math.min(applications.length, slots.length); i++) {
      const slotDetail = slotDetails?.find(sd => sd.id === slots[i].id);
      
      // Update slot status
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
        continue;
      }

      // Create panel interview record
      const { data: interview, error: interviewError } = await supabase
        .from('panel_interviews')
        .insert({
          application_id: applications[i].id,
          title: 'Panel Interview',
          scheduled_at: slotDetail?.slot_datetime,
          duration_minutes: slotDetail?.duration_minutes || 60,
          status: 'scheduled',
          feedback_template_id: template?.id || null,
          created_by: applications[i].candidate_id
        })
        .select('id')
        .single();

      if (interviewError) {
        console.error('Error creating panel interview:', interviewError);
        continue;
      }

      // Add panel members as participants
      if (interview && panelMembers && panelMembers.length > 0) {
        const participants = panelMembers.map(pm => ({
          panel_interview_id: interview.id,
          panelist_id: pm.user_id,
          role: pm.panel_role
        }));

        const { error: participantsError } = await supabase
          .from('panel_interview_participants')
          .insert(participants);

        if (participantsError) {
          console.error('Error adding participants:', participantsError);
        }
      }

      updates.push({
        slotId: slots[i].id,
        applicationId: applications[i].id,
        interviewId: interview?.id
      });
    }

    return new Response(
      JSON.stringify({
        message: `Successfully booked ${updates.length} interview slots`,
        bookings: updates
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
