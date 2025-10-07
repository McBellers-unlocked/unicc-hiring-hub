import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const candidateIds = testCandidates.map(c => c.id);

    // Delete video assignments first
    const { error: videoAssignmentError } = await supabase
      .from('video_assignments')
      .delete()
      .in('application_id', supabase
        .from('applications')
        .select('id')
        .in('candidate_id', candidateIds)
      );

    if (videoAssignmentError) {
      console.log("Video assignment cleanup:", videoAssignmentError);
    }

    // Delete video answers
    const { error: videoAnswerError } = await supabase
      .from('video_answers')
      .delete()
      .in('application_id', supabase
        .from('applications')
        .select('id')
        .in('candidate_id', candidateIds)
      );

    if (videoAnswerError) {
      console.log("Video answer cleanup:", videoAnswerError);
    }

    // Delete screening scores
    const { error: scoresError } = await supabase
      .from('screening_scores')
      .delete()
      .in('application_id', supabase
        .from('applications')
        .select('id')
        .in('candidate_id', candidateIds)
      );

    if (scoresError) {
      console.log("Screening scores cleanup:", scoresError);
    }

    // Delete stage events
    const { error: stageError } = await supabase
      .from('stage_events')
      .delete()
      .in('application_id', supabase
        .from('applications')
        .select('id')
        .in('candidate_id', candidateIds)
      );

    if (stageError) {
      console.log("Stage events cleanup:", stageError);
    }

    // Delete applications
    const { error: appError } = await supabase
      .from('applications')
      .delete()
      .in('candidate_id', candidateIds);

    if (appError) {
      console.error("Error deleting applications:", appError);
      throw appError;
    }

    console.log("Applications deleted successfully");

    // Delete candidates
    const { error: candidateError } = await supabase
      .from('candidates')
      .delete()
      .in('id', candidateIds);

    if (candidateError) {
      console.error("Error deleting candidates:", candidateError);
      throw candidateError;
    }

    console.log(`Successfully deleted ${testCandidates.length} test candidates`);

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
