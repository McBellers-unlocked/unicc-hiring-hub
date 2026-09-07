import { createClient } from 'jsr:@supabase/supabase-js@2';
import { validateBatchContinuation } from '../_shared/batch-assessment-core.ts';

declare const EdgeRuntime: { waitUntil(promise: Promise<unknown>): void } | undefined;
const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' };
const STALL_THRESHOLD_MS = 180_000;
const HEARTBEAT_MS = 20_000;
const SCORE_REQUEST_TIMEOUT_MS = 100_000;
type Client = ReturnType<typeof createClient>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function markFailed(supabase: Client, batchJobId: string, reason: string) {
  const { error } = await supabase.from('batch_scoring_jobs').update({
    status: 'failed', error_message: reason, completed_at: new Date().toISOString(), last_updated_at: new Date().toISOString(),
  }).eq('id', batchJobId).in('status', ['pending', 'processing']);
  if (error) console.error('Could not record interrupted batch state:', error.message);
}

async function dispatchContinuation(supabase: Client, batchJobId: string, applicationIds: string[], sliceIndex: number, forceRescore: boolean) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/trigger-batch-scoring`, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ _resumeBatchJobId: batchJobId, _resumeApplicationIds: applicationIds,
        _resumeSliceIndex: sliceIndex, _resumeForceRescore: forceRescore }),
    });
    if (!response.ok) throw new Error(`Continuation returned status ${response.status}.`);
    await response.body?.cancel();
  } catch (error) {
    await markFailed(supabase, batchJobId, 'The next assessment could not be started. Check progress before starting another batch.');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function scoreApplication(applicationId: string, forceRescore: boolean): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCORE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/score-application`, {
      method: 'POST', signal: controller.signal,
      headers: { Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ applicationId, forceRescore }),
    });
    if (!response.ok) return `Assessment returned status ${response.status}.`;
    const body = await response.json();
    return body.success === true ? null : 'Assessment did not report a saved result.';
  } catch {
    return 'Assessment request was interrupted or exceeded its time limit.';
  } finally {
    clearTimeout(timer);
  }
}

async function processSlice(supabase: Client, batchJobId: string, applicationIds: string[], sliceIndex: number, forceRescore: boolean) {
  const heartbeat = setInterval(() => {
    Promise.resolve(supabase.from('batch_scoring_jobs').update({ last_updated_at: new Date().toISOString() })
      .eq('id', batchJobId).eq('status', 'processing'))
      .then(({ error }) => { if (error) console.error('Batch heartbeat failed:', error.message); })
      .catch(() => console.error('Batch heartbeat could not be written.'));
  }, HEARTBEAT_MS);
  try {
    const applicationId = applicationIds[sliceIndex];
    const failure = await scoreApplication(applicationId, forceRescore);
    const { data: batch, error: readError } = await supabase.from('batch_scoring_jobs')
      .select('scored_count,error_count,error_message,status').eq('id', batchJobId).single();
    if (readError || !batch || batch.status !== 'processing') throw new Error('The active batch could not be read.');
    const nextIndex = sliceIndex + 1;
    const complete = nextIndex === applicationIds.length;
    const { error: updateError } = await supabase.from('batch_scoring_jobs').update({
      scored_count: batch.scored_count + (failure ? 0 : 1),
      error_count: batch.error_count + (failure ? 1 : 0),
      error_message: failure ? [batch.error_message, `${applicationId}: ${failure}`].filter(Boolean).join(' | ').slice(0, 2000) : batch.error_message,
      status: complete ? 'completed' : 'pending',
      completed_at: complete ? new Date().toISOString() : null,
      last_updated_at: new Date().toISOString(),
    }).eq('id', batchJobId).eq('status', 'processing');
    if (updateError) throw new Error('The batch result could not be recorded.');
    clearInterval(heartbeat);
    if (!complete) await dispatchContinuation(supabase, batchJobId, applicationIds, nextIndex, forceRescore);
  } catch {
    await markFailed(supabase, batchJobId, 'Assessment processing stopped before the batch finished. Review saved results and check progress before retrying.');
  } finally {
    clearInterval(heartbeat);
  }
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceKey);
    const authHeader = req.headers.get('Authorization');
    const isServiceRole = Boolean(serviceKey) && authHeader === `Bearer ${serviceKey}`;
    if (!isServiceRole) {
      if (!authHeader) return json({ error: 'Unauthorized' }, 401);
      const { data: { user }, error } = await supabase.auth.getUser(authHeader.replace(/^Bearer\s+/i, ''));
      if (error || !user) return json({ error: 'Unauthorized' }, 401);
      const { data: profile, error: roleError } = await supabase.from('users').select('role').eq('id', user.id).single();
      if (roleError || !profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) return json({ error: 'Forbidden' }, 403);
    }
    const body = await req.json();
    if (body._resumeBatchJobId) {
      // Continuations are internal service calls, never a recruiter-controlled
      // way to replay arbitrary offsets or alter a different batch's counters.
      if (!isServiceRole) return json({ error: 'Internal continuation requires service authorization.' }, 403);
      const { _resumeBatchJobId: batchJobId, _resumeApplicationIds: applicationIds,
        _resumeSliceIndex: sliceIndex, _resumeForceRescore: forceRescore } = body;
      const { data: batch, error: batchError } = await supabase.from('batch_scoring_jobs').select('*').eq('id', batchJobId).single();
      if (batchError || !batch) return json({ error: 'Batch not found.' }, 404);
      const invalid = validateBatchContinuation(batch, applicationIds, sliceIndex);
      if (invalid) return json({ error: invalid }, 409);
      const { data: matches, error: matchesError } = await supabase.from('applications').select('id,job_id').in('id', applicationIds);
      if (matchesError || matches?.length !== applicationIds.length || matches.some((application: { job_id: string }) => application.job_id !== batch.job_id)) {
        await markFailed(supabase, batchJobId, 'The batch application list no longer matches the job.');
        return json({ error: 'The continuation application list does not match this job.' }, 409);
      }
      // Atomic pending -> processing claim. A duplicate continuation cannot
      // process the same offset concurrently or replay an already processed one.
      const { data: claim, error: claimError } = await supabase.from('batch_scoring_jobs').update({
        status: 'processing', started_at: batch.started_at ?? new Date().toISOString(), last_updated_at: new Date().toISOString(),
      }).eq('id', batchJobId).eq('status', 'pending').eq('scored_count', batch.scored_count).eq('error_count', batch.error_count).select('id').maybeSingle();
      if (claimError || !claim) return json({ error: 'This continuation was already claimed.' }, 409);
      const task = processSlice(supabase, batchJobId, applicationIds, sliceIndex, forceRescore === true);
      if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(task);
      else await task;
      return json({ resumed: true, batchJobId });
    }
    const jobId = typeof body.jobId === 'string' ? body.jobId : '';
    if (!jobId) return json({ error: 'Job ID is required.' }, 400);
    const staleBefore = new Date(Date.now() - STALL_THRESHOLD_MS).toISOString();
    const { error: staleError } = await supabase.from('batch_scoring_jobs').update({
      status: 'failed', completed_at: new Date().toISOString(), last_updated_at: new Date().toISOString(),
      error_message: 'No assessment progress was recorded for more than three minutes.',
    }).eq('job_id', jobId).in('status', ['pending', 'processing']).lt('last_updated_at', staleBefore);
    if (staleError) throw new Error('Existing batch progress could not be checked.');
    const { data: active, error: activeError } = await supabase.from('batch_scoring_jobs').select('*')
      .eq('job_id', jobId).in('status', ['pending', 'processing']).order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (activeError) throw new Error('Existing assessment progress could not be checked.');
    if (active) return json({ batchJobId: active.id, total: active.total_applications,
      toScore: active.total_applications, skipped: 0, existing: true, message: 'An assessment batch is already running.' });
    const { data: applications, error: appError } = await supabase.from('applications').select('id')
      .eq('job_id', jobId).eq('phf_completed', true).neq('status', 'Draft').not('status', 'is', null).order('id');
    if (appError) throw new Error('The submitted applications could not be loaded.');
    const applicationIds = (applications ?? []).map((application: { id: string }) => application.id);
    if (!applicationIds.length) return json({ total: 0, toScore: 0, skipped: 0, message: 'No submitted applications are available for assessment.' });
    const { data: batch, error: insertError } = await supabase.from('batch_scoring_jobs').insert({
      job_id: jobId, status: 'pending', total_applications: applicationIds.length, skipped_count: 0,
      last_updated_at: new Date().toISOString(),
    }).select().single();
    if (insertError || !batch) throw new Error('The assessment batch could not be created.');
    // The continuation acknowledges its durable claim immediately; its work is
    // tracked by EdgeRuntime.waitUntil. HTTP failures become visible terminal state.
    await dispatchContinuation(supabase, batch.id, applicationIds, 0, body.forceRescore === true);
    return json({ batchJobId: batch.id, total: applicationIds.length, toScore: applicationIds.length, skipped: 0,
      sliceSize: 1, message: 'Fresh evidence assessments have started.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Assessment batch could not be started.';
    console.error('Batch assessment failed:', message);
    return json({ error: message }, 500);
  }
});
