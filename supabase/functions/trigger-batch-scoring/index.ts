import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Slice-based resumable configuration
const SLICE_SIZE = 2; // Process 2 applications per invocation (keeps well within timeout)
const MAX_RETRIES = 2;
const STALL_THRESHOLD_MS = 120000; // 2 minutes

async function scoreWithRetry(
  supabase: any,
  appId: string,
  retries = 0
): Promise<{ id: string; status: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('score-application', {
      body: { applicationId: appId }
    });

    if (error) {
      if (retries < MAX_RETRIES) {
        const delay = 3000 * (retries + 1);
        console.log(`Retrying ${appId} (attempt ${retries + 1}/${MAX_RETRIES}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        return scoreWithRetry(supabase, appId, retries + 1);
      }
      const errMsg = typeof error === 'string' ? error : (error?.message || JSON.stringify(error));
      console.error(`Failed to score ${appId} after ${MAX_RETRIES} retries:`, errMsg);
      return { id: appId, status: 'error', error: errMsg.substring(0, 200) };
    }

    console.log(`Successfully scored application ${appId}`);
    return { id: appId, status: 'success' };
  } catch (err: any) {
    if (retries < MAX_RETRIES) {
      const delay = 3000 * (retries + 1);
      console.log(`Exception scoring ${appId}, retrying (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, delay));
      return scoreWithRetry(supabase, appId, retries + 1);
    }
    const errMsg = err?.message || String(err);
    console.error(`Exception scoring ${appId} after ${MAX_RETRIES} retries:`, errMsg);
    return { id: appId, status: 'error', error: errMsg.substring(0, 200) };
  }
}

async function processSlice(
  supabase: any,
  batchJobId: string,
  applicationIds: string[],
  sliceIndex: number
) {
  const slice = applicationIds.slice(sliceIndex, sliceIndex + SLICE_SIZE);
  if (slice.length === 0) return;

  console.log(`Processing slice ${Math.floor(sliceIndex / SLICE_SIZE) + 1}: ${slice.length} apps (offset ${sliceIndex}/${applicationIds.length})`);

  // Score each app in the slice sequentially (one at a time to stay within limits)
  let sliceScored = 0;
  let sliceErrors = 0;
  const errorSnippets: string[] = [];

  for (const appId of slice) {
    const result = await scoreWithRetry(supabase, appId);
    if (result.status === 'success') {
      sliceScored++;
    } else {
      sliceErrors++;
      if (result.error) errorSnippets.push(`${appId.substring(0, 8)}: ${result.error?.substring(0, 80)}`);
    }
  }

  // Read current counts and increment
  const { data: currentJob } = await supabase
    .from('batch_scoring_jobs')
    .select('scored_count, error_count, error_message')
    .eq('id', batchJobId)
    .single();

  const newScoredCount = (currentJob?.scored_count || 0) + sliceScored;
  const newErrorCount = (currentJob?.error_count || 0) + sliceErrors;
  const existingErrors = currentJob?.error_message || '';
  const newErrorMessage = errorSnippets.length > 0
    ? [existingErrors, ...errorSnippets].filter(Boolean).join(' | ').substring(0, 2000)
    : existingErrors;

  // Persist progress
  await supabase.from('batch_scoring_jobs')
    .update({
      status: 'processing',
      scored_count: newScoredCount,
      error_count: newErrorCount,
      error_message: newErrorMessage || null,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', batchJobId);

  console.log(`Slice done. Cumulative: ${newScoredCount} scored, ${newErrorCount} errors`);

  // Check if there are more to process
  const nextIndex = sliceIndex + SLICE_SIZE;
  if (nextIndex < applicationIds.length) {
    console.log(`Scheduling next slice at offset ${nextIndex}`);
    // Self-invoke the next slice via EdgeRuntime.waitUntil
    // @ts-ignore - EdgeRuntime is available in Supabase Edge Functions
    EdgeRuntime.waitUntil(
      processSlice(supabase, batchJobId, applicationIds, nextIndex)
    );
  } else {
    // All done — mark completed
    await supabase.from('batch_scoring_jobs')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        last_updated_at: new Date().toISOString(),
        scored_count: newScoredCount,
        error_count: newErrorCount,
      })
      .eq('id', batchJobId);
    console.log(`Batch job ${batchJobId} completed: ${newScoredCount} scored, ${newErrorCount} errors`);
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

    // Step 1: Mark stalled jobs as incomplete
    const twoMinutesAgo = new Date(Date.now() - STALL_THRESHOLD_MS).toISOString();
    const { data: stalledJobs } = await supabase
      .from('batch_scoring_jobs')
      .select('id')
      .eq('job_id', jobId)
      .eq('status', 'processing')
      .lt('last_updated_at', twoMinutesAgo);

    if (stalledJobs?.length) {
      console.log(`Found ${stalledJobs.length} stalled jobs, marking as incomplete`);
      await supabase
        .from('batch_scoring_jobs')
        .update({
          status: 'incomplete',
          completed_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString(),
          error_message: 'Marked incomplete: no progress for 2+ minutes'
        })
        .in('id', stalledJobs.map((j: any) => j.id));
    }

    // Step 2: Get PHF-completed applications
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id')
      .eq('job_id', jobId)
      .eq('phf_completed', true);

    if (fetchError) throw fetchError;

    console.log(`Found ${applications?.length || 0} PHF-completed applications`);

    // Step 3: Get already-scored applications
    const applicationIds = applications?.map(a => a.id) || [];
    const { data: existingScores } = await supabase
      .from('screening_scores')
      .select('application_id')
      .in('application_id', applicationIds);

    const alreadyScoredIds = new Set(existingScores?.map(s => s.application_id) || []);

    // Step 4: Determine what to score
    let applicationsToScore: string[];
    let skippedCount: number;

    if (forceRescore) {
      if (alreadyScoredIds.size > 0) {
        console.log(`Force rescore: deleting ${alreadyScoredIds.size} existing scores`);
        await supabase
          .from('screening_scores')
          .delete()
          .in('application_id', Array.from(alreadyScoredIds));
      }
      applicationsToScore = applicationIds;
      skippedCount = 0;
    } else {
      applicationsToScore = applicationIds.filter(id => !alreadyScoredIds.has(id));
      skippedCount = alreadyScoredIds.size;
    }

    console.log(`Will score ${applicationsToScore.length} applications, skipping ${skippedCount}`);

    if (applicationsToScore.length === 0) {
      return new Response(
        JSON.stringify({
          message: 'No applications to score',
          total: applicationIds.length,
          toScore: 0,
          skipped: skippedCount
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Step 5: Create batch job record
    const { data: batchJob, error: insertError } = await supabase
      .from('batch_scoring_jobs')
      .insert({
        job_id: jobId,
        status: 'pending',
        total_applications: applicationIds.length,
        skipped_count: skippedCount,
        last_updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Step 6: Start slice-based processing (non-blocking)
    // @ts-ignore
    EdgeRuntime.waitUntil(
      processSlice(supabase, batchJob.id, applicationsToScore, 0)
    );

    return new Response(
      JSON.stringify({
        message: 'Batch scoring started (resumable slices)',
        batchJobId: batchJob.id,
        total: applicationIds.length,
        toScore: applicationsToScore.length,
        skipped: skippedCount,
        sliceSize: SLICE_SIZE
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 202 }
    );
  } catch (error: any) {
    console.error('Error in trigger-batch-scoring:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
