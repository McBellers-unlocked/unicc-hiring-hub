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

async function processScoringInBackground(
  supabase: any,
  batchJobId: string,
  applicationsToScore: { id: string }[],
  skippedCount: number
) {
  try {
    console.log(`Background processing started for batch job ${batchJobId}`);
    
    // Update status to processing
    await supabase.from('batch_scoring_jobs')
      .update({ status: 'processing' })
      .eq('id', batchJobId);

    let scoredCount = 0;
    let errorCount = 0;

    // Process in batches
    for (let i = 0; i < applicationsToScore.length; i += BATCH_SIZE) {
      const batch = applicationsToScore.slice(i, i + BATCH_SIZE);
      const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(applicationsToScore.length / BATCH_SIZE);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} applications)`);
      
      // Process batch concurrently
      const batchResults = await Promise.all(
        batch.map(app => scoreWithRetry(supabase, app.id))
      );
      
      // Count results
      for (const result of batchResults) {
        if (result.status === 'success') scoredCount++;
        else if (result.status === 'error') errorCount++;
      }
      
      // Update progress in database
      await supabase.from('batch_scoring_jobs')
        .update({ 
          scored_count: scoredCount, 
          error_count: errorCount 
        })
        .eq('id', batchJobId);
      
      console.log(`Progress: ${scoredCount} scored, ${errorCount} errors`);
      
      // Delay between batches (except for the last batch)
      if (i + BATCH_SIZE < applicationsToScore.length) {
        console.log(`Waiting ${BATCH_DELAY_MS}ms before next batch...`);
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
    }

    // Mark as completed
    await supabase.from('batch_scoring_jobs')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        scored_count: scoredCount,
        skipped_count: skippedCount,
        error_count: errorCount
      })
      .eq('id', batchJobId);

    console.log(`Batch job ${batchJobId} completed: ${scoredCount} scored, ${skippedCount} skipped, ${errorCount} errors`);

  } catch (error: any) {
    console.error(`Batch job ${batchJobId} failed:`, error);
    
    // Mark as failed
    await supabase.from('batch_scoring_jobs')
      .update({ 
        status: 'failed',
        completed_at: new Date().toISOString(),
        error_message: error.message
      })
      .eq('id', batchJobId);
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

    // Create batch job record
    const { data: batchJob, error: insertError } = await supabase
      .from('batch_scoring_jobs')
      .insert({
        job_id: jobId,
        status: 'pending',
        total_applications: applications?.length || 0,
        skipped_count: skippedApplications.length
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Start background processing (non-blocking)
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processScoringInBackground(
        supabase,
        batchJob.id,
        applicationsToScore,
        skippedApplications.length
      )
    );

    // Return immediately with batch job ID for polling
    return new Response(
      JSON.stringify({ 
        message: 'Batch scoring started',
        batchJobId: batchJob.id,
        total: applications?.length || 0,
        toScore: applicationsToScore.length,
        skipped: skippedApplications.length
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 202  // Accepted - processing in background
      }
    );
  } catch (error: any) {
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
