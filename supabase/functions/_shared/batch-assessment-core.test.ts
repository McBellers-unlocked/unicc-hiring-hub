import test from 'node:test';
import assert from 'node:assert/strict';
import { ASSESSMENT_SLICE_SIZE, assessBatchSlice, validateBatchContinuation } from './batch-assessment-core.ts';

test('a batch starts at most four saves and waits for every mixed result before advancing', async () => {
  const ids = ['app-1', 'app-2', 'app-3', 'app-4', 'app-5', 'app-6'];
  const started: string[] = [];
  const release = new Map<string, () => void>();
  let active = 0, peak = 0, settled = false;
  const pending = assessBatchSlice(ids, 0, async id => {
    started.push(id); active++; peak = Math.max(peak, active);
    await new Promise<void>(resolve => release.set(id, resolve));
    active--;
    if (id === 'app-2') return 'Assessment returned status 503.';
    if (id === 'app-4') throw new Error('Unexpected worker details');
    return null;
  }).then(result => { settled = true; return result; });
  assert.equal(ASSESSMENT_SLICE_SIZE, 4);
  assert.deepEqual(started, ids.slice(0, 4));
  assert.equal(active, 4);
  release.get('app-1')!(); release.get('app-2')!(); release.get('app-3')!();
  await new Promise<void>(resolve => setImmediate(resolve));
  assert.equal(settled, false, 'durable counters must not advance while one save is outstanding');
  assert.deepEqual(started, ids.slice(0, 4), 'the next slice must not start early');
  release.get('app-4')!();
  const result = await pending;
  assert.equal(peak, 4);
  assert.deepEqual(result, { nextIndex: 4, complete: false, scoredCount: 2, errorCount: 2,
    failures: [{ applicationId: 'app-2', reason: 'Assessment returned status 503.' },
      { applicationId: 'app-4', reason: 'Assessment request did not complete.' }] });
  const nextBatch = { status: 'pending', total_applications: ids.length, scored_count: result.scoredCount, error_count: result.errorCount };
  assert.equal(validateBatchContinuation(nextBatch, ids, result.nextIndex), null);
  assert.ok(validateBatchContinuation(nextBatch, ids, 0), 'replaying the earlier offset remains invalid');
});

test('the final partial slice assesses only the remaining applications and counts each once', async () => {
  const ids = ['app-1', 'app-2', 'app-3', 'app-4', 'app-5', 'app-6'];
  const started: string[] = [];
  const result = await assessBatchSlice(ids, 4, async id => {
    started.push(id);
    return id === 'app-6' ? 'Assessment request exceeded its time limit.' : null;
  });
  assert.deepEqual(started, ['app-5', 'app-6']);
  assert.deepEqual(result, { nextIndex: 6, complete: true, scoredCount: 1, errorCount: 1,
    failures: [{ applicationId: 'app-6', reason: 'Assessment request exceeded its time limit.' }] });
  assert.equal(4 + result.scoredCount + result.errorCount, ids.length);
  assert.ok(validateBatchContinuation({ status: 'completed', total_applications: 6, scored_count: 3, error_count: 3 }, ids, 6));
});

test('invalid slice offsets cannot dispatch work and an empty response is never counted as a save', async () => {
  let calls = 0;
  for (const offset of [-1, 0.5, 1]) {
    await assert.rejects(assessBatchSlice(['only-app'], offset, async () => { calls++; return null; }), /offset is invalid/);
  }
  assert.equal(calls, 0);
  const result = await assessBatchSlice(['only-app'], 0, async () => '');
  assert.equal(result.scoredCount, 0);
  assert.equal(result.errorCount, 1);
  assert.equal(result.complete, true);
});
