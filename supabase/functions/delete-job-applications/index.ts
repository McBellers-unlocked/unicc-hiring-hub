import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth guard: require Admin or HR role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    console.log(`Deleting TEST applications for job: ${jobId}`);

    // Get all applications for this job with candidate data
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id, candidate_id, candidates(email)')
      .eq('job_id', jobId);

    if (fetchError) throw fetchError;

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No applications found for this job",
          deleted_applications: 0,
          deleted_candidates: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter to only test applications (emails ending with @example.com)
    const testApplications = applications.filter(app => {
      const candidate = app.candidates as any;
      return candidate && candidate.email && candidate.email.endsWith('@example.com');
    });

    if (testApplications.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "No test applications found for this job",
          total_applications: applications.length,
          deleted_applications: 0,
          deleted_candidates: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const testApplicationIds = testApplications.map(app => app.id);
    const testCandidateIds = testApplications.map(app => app.candidate_id);

    console.log(`Found ${testApplications.length} test applications to delete (preserving ${applications.length - testApplications.length} real applications)`);

    // Step 1: Delete screening_scores (depends on applications)
    const { error: deleteScoresError } = await supabase
      .from('screening_scores')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteScoresError) {
      console.error('Error deleting screening_scores:', deleteScoresError);
      throw deleteScoresError;
    }
    console.log('Deleted screening_scores');

    // Step 2: Delete stage_events (depends on applications)
    const { error: deleteStageEventsError } = await supabase
      .from('stage_events')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteStageEventsError) {
      console.error('Error deleting stage_events:', deleteStageEventsError);
      throw deleteStageEventsError;
    }
    console.log('Deleted stage_events');

    // Step 3: Delete video_answers (depends on video_assignments)
    const { data: videoAssignments } = await supabase
      .from('video_assignments')
      .select('id')
      .in('application_id', testApplicationIds);

    if (videoAssignments && videoAssignments.length > 0) {
      const videoAssignmentIds = videoAssignments.map(va => va.id);
      
      const { error: deleteVideoAnswersError } = await supabase
        .from('video_answers')
        .delete()
        .in('assignment_id', videoAssignmentIds);

      if (deleteVideoAnswersError) {
        console.error('Error deleting video_answers:', deleteVideoAnswersError);
        throw deleteVideoAnswersError;
      }
      console.log('Deleted video_answers');

      // Step 4: Delete video_events
      const { error: deleteVideoEventsError } = await supabase
        .from('video_events')
        .delete()
        .in('assignment_id', videoAssignmentIds);

      if (deleteVideoEventsError) {
        console.error('Error deleting video_events:', deleteVideoEventsError);
        throw deleteVideoEventsError;
      }
      console.log('Deleted video_events');
    }

    // Step 5: Delete video_assignments (depends on applications)
    const { error: deleteVideoAssignmentsError } = await supabase
      .from('video_assignments')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteVideoAssignmentsError) {
      console.error('Error deleting video_assignments:', deleteVideoAssignmentsError);
      throw deleteVideoAssignmentsError;
    }
    console.log('Deleted video_assignments');

    // Step 6: Delete evaluations (depends on applications)
    const { error: deleteEvaluationsError } = await supabase
      .from('evaluations')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteEvaluationsError) {
      console.error('Error deleting evaluations:', deleteEvaluationsError);
      throw deleteEvaluationsError;
    }
    console.log('Deleted evaluations');

    // Step 7: Delete feedback_form_responses (depends on applications)
    const { error: deleteFeedbackError } = await supabase
      .from('feedback_form_responses')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteFeedbackError) {
      console.error('Error deleting feedback_form_responses:', deleteFeedbackError);
      throw deleteFeedbackError;
    }
    console.log('Deleted feedback_form_responses');

    // Step 8: Delete interview_panel_reports (depends on applications)
    const { error: deleteReportsError } = await supabase
      .from('interview_panel_reports')
      .delete()
      .in('application_id', testApplicationIds);

    if (deleteReportsError) {
      console.error('Error deleting interview_panel_reports:', deleteReportsError);
      throw deleteReportsError;
    }
    console.log('Deleted interview_panel_reports');

    // Step 9: Delete applications
    const { error: deleteAppsError } = await supabase
      .from('applications')
      .delete()
      .in('id', testApplicationIds);

    if (deleteAppsError) {
      console.error('Error deleting applications:', deleteAppsError);
      throw deleteAppsError;
    }
    console.log(`Deleted ${testApplications.length} test applications`);

    // Step 10: Delete test candidates
    const { error: deleteCandidatesError } = await supabase
      .from('candidates')
      .delete()
      .in('id', testCandidateIds);

    if (deleteCandidatesError) {
      console.error('Error deleting candidates:', deleteCandidatesError);
      throw deleteCandidatesError;
    }
    console.log(`Deleted ${testCandidateIds.length} test candidates`);

    // Log audit event
    await supabase.from('audit_logs').insert({
      action: 'DELETE_TEST_APPLICATIONS',
      entity: 'applications',
      entity_id: jobId,
      metadata: {
        deleted_applications: testApplications.length,
        deleted_candidates: testCandidateIds.length,
        preserved_applications: applications.length - testApplications.length,
        job_id: jobId
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        deleted_applications: testApplications.length,
        deleted_candidates: testCandidateIds.length,
        preserved_applications: applications.length - testApplications.length,
        message: `Deleted ${testApplications.length} test applications and ${testCandidateIds.length} test candidates (preserved ${applications.length - testApplications.length} real applications)`
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
