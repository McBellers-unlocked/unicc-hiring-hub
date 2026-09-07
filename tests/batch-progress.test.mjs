import assert from 'node:assert/strict';
import { test } from 'node:test';
import { classifyBatchStart, batchPollingStatus, BATCH_STALE_AFTER_MS } from '../src/lib/batchProgress.ts';

test('empty batches never start polling an undefined ID', () => {
  assert.equal(classifyBatchStart({ toScore: 0, total: 0 }), 'empty');
  assert.equal(classifyBatchStart({ toScore: 2 }), 'invalid');
  assert.equal(classifyBatchStart({ batchJobId: 'batch', toScore: 2 }), 'started');
});

test('both pending and processing batches become actionable when their heartbeat stalls', () => {
  for (const status of ['pending', 'processing']) {
    assert.equal(batchPollingStatus({ status, last_updated_at: '2026-09-07T00:00:00Z' }, Date.parse('2026-09-07T00:04:00Z'), 0), 'stalled');
  }
});

test('missing timestamps cannot create endless polling and terminal states take precedence', () => {
  assert.equal(batchPollingStatus({ status: 'pending' }, BATCH_STALE_AFTER_MS + 1, 0), 'stalled');
  assert.equal(batchPollingStatus({ status: 'processing' }, 1000, 0), 'processing');
  for (const status of ['completed', 'failed', 'incomplete']) {
    assert.equal(batchPollingStatus({ status }, BATCH_STALE_AFTER_MS + 1, 0), status);
  }
});
