import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const BATCH_SIZE = 3;
const BATCH_DELAY_MS = 2000;
const MAX_RETRIES = 2;

async function scoreWithRetry(
  supabase: any, 
  appId: string, 
  retries = 0
): Promise<{ id: string; status: string; error?: any }> {
  try {
    const { data, error } = await supabase.functions.invoke('score-application', {
      body: { applicationId: appId }
    });

    if (error) {
      // Check if we should retry (rate limit or transient error)
      if (retries < MAX_RETRIES) {
        const delay = 3000 * (retries + 1); // Exponential backoff: 3s, 6s
        console.log(`Retrying ${appId} after error (attempt ${retries + 1}/${MAX_RETRIES}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        return scoreWithRetry(supabase, appId, retries + 1);
      }
      console.error(`Failed to score ${appId} after ${MAX_RETRIES} retries:`, error);
      return { id: appId, status: 'error', error };
    }

    console.log(`Successfully scored application ${appId}`);
    return { id: appId, status: 'success' };
  } catch (err) {
    if (retries < MAX_RETRIES) {
      const delay = 3000 * (retries + 1);
      console.log(`Exception scoring ${appId}, retrying (attempt ${retries + 1}/${MAX_RETRIES}), waiting ${delay}ms`);
      await new Promise(r => setTimeout(r, delay));
      return scoreWithRetry(supabase, appId, retries + 1);
    }
    console.error(`Exception scoring ${appId} after ${MAX_RETRIES} retries:`, err);
    return { id: appId, status: 'error', error: err };
  }
}

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

    console.log(`Found ${applications?.length || 0} applications to process`);

    // Filter applications based on existing scores
    const applicationsToScore: { id: string }[] = [];
    const skippedApplications: { id: string }[] = [];

    for (const app of applications || []) {
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
            continue;
          }
          console.log(`Deleted existing score for ${app.id}, will rescore`);
          applicationsToScore.push(app);
        } else {
          console.log(`Application ${app.id} already has a score, skipping`);
          skippedApplications.push(app);
        }
      } else {
        applicationsToScore.push(app);
      }
    }

    console.log(`Will score ${applicationsToScore.length} applications, skipping ${skippedApplications.length}`);

    // Process applications in batches with rate limiting
    const results: { id: string; status: string; error?: any }[] = [];
    
    for (let i = 0; i < applicationsToScore.length; i += BATCH_SIZE) {
      const batch = applicationsToScore.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(applicationsToScore.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} applications)`);
      
      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(app => scoreWithRetry(supabase, app.id))
      );
      results.push(...batchResults);
      
      // Delay before next batch (except for the last batch)
      if (i + BATCH_SIZE < applicationsToScore.length) {
        console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Add skipped applications to results
    for (const app of skippedApplications) {
      results.push({ id: app.id, status: 'skipped' });
    }

    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;

    console.log(`Batch scoring completed: ${successCount} success, ${errorCount} errors, ${skippedCount} skipped`);

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
