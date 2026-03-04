import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } });
    }

    console.log("Starting cleanup of test applicants...");

    // Get all test candidates (emails ending with @example.com)
    const { data: testCandidates, error: fetchError } = await supabase
      .from('candidates')
      .select('id, email')
      .like('email', '%@example.com');

    if (fetchError) {
      console.error("Error fetching test candidates:", fetchError);
      throw fetchError;
    }

    if (!testCandidates || testCandidates.length === 0) {
      console.log("No test candidates found to delete");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No test candidates found",
          deleted: 0
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    console.log(`Found ${testCandidates.length} test candidates to delete`);

    const BATCH_SIZE = 10; // Small batch to avoid URL length limits
    let totalDeleted = 0;

    // Process in batches to avoid URL length limits
    for (let i = 0; i < testCandidates.length; i += BATCH_SIZE) {
      const batch = testCandidates.slice(i, i + BATCH_SIZE);
      const candidateIds = batch.map(c => c.id);
      
      console.log(`Processing batch ${Math.floor(i/BATCH_SIZE) + 1} of ${Math.ceil(testCandidates.length/BATCH_SIZE)}`);

      // Get all application IDs for this batch
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .in('candidate_id', candidateIds);

      const applicationIds = applications?.map(a => a.id) || [];

      if (applicationIds.length > 0) {
        // Delete video assignments
        await supabase
          .from('video_assignments')
          .delete()
          .in('application_id', applicationIds);

        // Delete video answers
        await supabase
          .from('video_answers')
          .delete()
          .in('application_id', applicationIds);

        // Delete screening scores
        await supabase
          .from('screening_scores')
          .delete()
          .in('application_id', applicationIds);

        // Delete stage events
        await supabase
          .from('stage_events')
          .delete()
          .in('application_id', applicationIds);

        // Delete video events (need to get assignment IDs first)
        const { data: videoAssignmentIds } = await supabase
          .from('video_assignments')
          .select('id')
          .in('application_id', applicationIds);

        if (videoAssignmentIds && videoAssignmentIds.length > 0) {
          await supabase
            .from('video_events')
            .delete()
            .in('assignment_id', videoAssignmentIds.map(v => v.id));
        }

        // Delete applications
        await supabase
          .from('applications')
          .delete()
          .in('candidate_id', candidateIds);
      }

      // Delete candidates
      await supabase
        .from('candidates')
        .delete()
        .in('id', candidateIds);

      totalDeleted += batch.length;
      console.log(`Deleted ${totalDeleted} of ${testCandidates.length} candidates`);
    }

    console.log(`Successfully deleted ${totalDeleted} test candidates`);

    // Log audit entry
    await supabase.from('audit_logs').insert({
      action: 'BULK_TEST_DATA_CLEANUP',
      entity: 'candidates',
      entity_id: candidateIds[0],
      after: {
        candidates_deleted: testCandidates.length,
        timestamp: new Date().toISOString()
      }
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Deleted ${testCandidates.length} test candidates and their applications`,
        deleted: testCandidates.length
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
    console.error("Error in cleanup-test-applicants function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
