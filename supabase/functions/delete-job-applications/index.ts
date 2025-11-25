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

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    console.log(`Deleting applications for job: ${jobId}`);

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

    console.log(`Found ${applications.length} applications to delete`);

    // Collect candidate IDs for test candidates (emails like test.%@example.com)
    const testCandidateIds = applications
      .filter(app => {
        const candidate = app.candidates as any;
        return candidate && candidate.email && candidate.email.startsWith('test.') && candidate.email.endsWith('@example.com');
      })
      .map(app => app.candidate_id);

    console.log(`Found ${testCandidateIds.length} test candidates to delete`);

    // Delete applications first (due to foreign key constraints)
    const { error: deleteAppsError } = await supabase
      .from('applications')
      .delete()
      .eq('job_id', jobId);

    if (deleteAppsError) {
      console.error('Error deleting applications:', deleteAppsError);
      throw deleteAppsError;
    }

    console.log(`Deleted ${applications.length} applications`);

    // Delete test candidates
    let deletedCandidates = 0;
    if (testCandidateIds.length > 0) {
      const { error: deleteCandidatesError } = await supabase
        .from('candidates')
        .delete()
        .in('id', testCandidateIds);

      if (deleteCandidatesError) {
        console.error('Error deleting candidates:', deleteCandidatesError);
        throw deleteCandidatesError;
      }

      deletedCandidates = testCandidateIds.length;
      console.log(`Deleted ${deletedCandidates} test candidates`);
    }

    // Log audit event
    await supabase.from('audit_logs').insert({
      action: 'DELETE_JOB_APPLICATIONS',
      entity: 'applications',
      entity_id: jobId,
      metadata: {
        deleted_applications: applications.length,
        deleted_candidates: deletedCandidates,
        job_id: jobId
      }
    });

    return new Response(
      JSON.stringify({ 
        success: true,
        deleted_applications: applications.length,
        deleted_candidates: deletedCandidates,
        message: `Deleted ${applications.length} applications and ${deletedCandidates} test candidates`
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
