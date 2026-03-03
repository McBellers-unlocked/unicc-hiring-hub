import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Process 1 application per slice to stay well within timeout
const SLICE_SIZE = 1;
const MAX_RETRIES = 2;
const STALL_THRESHOLD_MS = 120000; // 2 minutes

async function scoreWithRetry(
  supabase: any,
  appId: string,
  forceRescore: boolean,
  retries = 0
): Promise<{ id: string; status: string; error?: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('score-application', {
      body: { applicationId: appId, forceRescore }
    });

    if (error) {
      if (retries < MAX_RETRIES) {
        const delay = 3000 * (retries + 1);
        console.log(`Retrying ${appId} (attempt ${retries + 1}/${MAX_RETRIES}), waiting ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
        return scoreWithRetry(supabase, appId, forceRescore, retries + 1);
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
      return scoreWithRetry(supabase, appId, forceRescore, retries + 1);
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
  sliceIndex: number,
  forceRescore: boolean
) {
  const slice = applicationIds.slice(sliceIndex, sliceIndex + SLICE_SIZE);
  if (slice.length === 0) return;

  console.log(`Processing slice ${Math.floor(sliceIndex / SLICE_SIZE) + 1}: ${slice.length} apps (offset ${sliceIndex}/${applicationIds.length})`);

  let sliceScored = 0;
  let sliceErrors = 0;
  const errorSnippets: string[] = [];

  for (const appId of slice) {
    const result = await scoreWithRetry(supabase, appId, forceRescore);
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
    console.log(`Self-invoking next slice at offset ${nextIndex}`);
    // Self-invoke via fetch() instead of EdgeRuntime.waitUntil to survive process shutdown
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    try {
      await fetch(`${supabaseUrl}/functions/v1/trigger-batch-scoring`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _resumeBatchJobId: batchJobId,
          _resumeApplicationIds: applicationIds,
          _resumeSliceIndex: nextIndex,
          _resumeForceRescore: forceRescore,
        }),
      });
    } catch (fetchErr) {
      console.error('Self-invoke failed, batch will stall and can be resumed:', fetchErr);
    }
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
    const body = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle resume invocations (self-invoked continuation)
    if (body._resumeBatchJobId) {
      const { _resumeBatchJobId, _resumeApplicationIds, _resumeSliceIndex, _resumeForceRescore } = body;
      console.log(`Resuming batch ${_resumeBatchJobId} at slice ${_resumeSliceIndex}`);
      await processSlice(supabase, _resumeBatchJobId, _resumeApplicationIds, _resumeSliceIndex, _resumeForceRescore);
      return new Response(JSON.stringify({ resumed: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { jobId, forceRescore } = body;

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

    const applicationIds = applications?.map(a => a.id) || [];

    // Step 3: For non-force runs, skip already-scored applications
    let applicationsToScore: string[];
    let skippedCount: number;

    if (forceRescore) {
      // NO upfront deletion — score-application will handle atomic per-app replacement
      applicationsToScore = applicationIds;
      skippedCount = 0;
      console.log(`Force rescore: will score all ${applicationsToScore.length} (atomic per-app replacement)`);
    } else {
      const { data: existingScores } = await supabase
        .from('screening_scores')
        .select('application_id')
        .in('application_id', applicationIds);
      const alreadyScoredIds = new Set(existingScores?.map(s => s.application_id) || []);
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

    // Step 4: Create batch job record
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

    // Step 5: Return immediately, then self-invoke to start processing asynchronously
    // This prevents the client from waiting 30-120s per app showing "Starting..."
    try {
      fetch(`${supabaseUrl}/functions/v1/trigger-batch-scoring`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          _resumeBatchJobId: batchJob.id,
          _resumeApplicationIds: applicationsToScore,
          _resumeSliceIndex: 0,
          _resumeForceRescore: forceRescore || false,
        }),
      });
    } catch (fetchErr) {
      console.error('Failed to self-invoke first slice:', fetchErr);
    }

    return new Response(
      JSON.stringify({
        message: 'Batch scoring started (self-invoking slices)',
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