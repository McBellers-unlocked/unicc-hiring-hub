import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, forceRescore } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log(`Batch scoring for job ${jobId}, forceRescore: ${forceRescore}`);

    // Get all applications for this job that have PHF completed
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('phf_completed', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${applications?.length || 0} applications to score`);

    const scoringPromises = applications?.map(async (app) => {
      try {
        // Check if already scored
        const { data: existingScore } = await supabase
          .from('screening_scores')
          .select('id')
          .eq('application_id', app.id)
          .maybeSingle();

        if (existingScore) {
          if (forceRescore) {
            // Delete existing score to allow re-scoring
            const { error: deleteError } = await supabase
              .from('screening_scores')
              .delete()
              .eq('application_id', app.id);
            
            if (deleteError) {
              console.error(`Failed to delete score for ${app.id}:`, deleteError);
              return { id: app.id, status: 'error', error: deleteError };
            }
            console.log(`Deleted existing score for ${app.id}, will rescore`);
          } else {
            console.log(`Application ${app.id} already has a score, skipping`);
            return { id: app.id, status: 'skipped' };
          }
        }

        // Trigger scoring
        const { data, error } = await supabase.functions.invoke('score-application', {
          body: { applicationId: app.id }
        });

        if (error) {
          console.error(`Error scoring ${app.id}:`, error);
          return { id: app.id, status: 'error', error };
        }

        console.log(`Scored application ${app.id}`);
        return { id: app.id, status: 'success' };
      } catch (err) {
        console.error(`Exception scoring ${app.id}:`, err);
        return { id: app.id, status: 'error', error: err };
      }
    }) || [];

    const results = await Promise.all(scoringPromises);
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    return new Response(
      JSON.stringify({ 
        message: 'Batch scoring completed',
        total: applications?.length || 0,
        success: successCount,
        errors: errorCount,
        skipped: skippedCount,
        results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in trigger-batch-scoring:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
