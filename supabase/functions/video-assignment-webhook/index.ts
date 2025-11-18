import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VideoAssignmentUpdate {
  token: string;
  status: 'LinkOpened' | 'InProgress' | 'Completed' | 'Failed';
  meta?: Record<string, any>;
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

    const { token, status, meta = {} }: VideoAssignmentUpdate = await req.json();

    console.log(`Updating video assignment status: ${token} -> ${status}`);

    // Use the database function to update status and log event
    const { data, error } = await supabase.rpc('update_video_assignment_status', {
      assignment_token: token,
      new_status: status,
      event_meta: meta
    });

    if (error) {
      throw error;
    }

    if (!data) {
      return new Response(
        JSON.stringify({ error: 'Assignment not found or already completed' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If completed, trigger transcription and scoring
    if (status === 'Completed') {
      console.log('Video assignment completed, triggering post-processing...');
      
      // Here you could trigger transcription services
      // For now, we'll just log the completion
      
      // Get assignment details for notification
      const { data: assignment } = await supabase
        .from('video_assignments')
        .select(`
          *,
          applications!inner(
            id,
            candidates!inner(name, email),
            jobs!inner(title)
          )
        `)
        .eq('token', token)
        .single();

      if (assignment) {
        // Send completion notification to HR
        await supabase.functions.invoke('send-video-completion-notification', {
          body: {
            assignmentId: assignment.id,
            candidateName: assignment.applications.candidates.name,
            candidateEmail: assignment.applications.candidates.email,
            jobTitle: assignment.applications.jobs.title,
            completedAt: assignment.completed_at
          }
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error updating video assignment:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});