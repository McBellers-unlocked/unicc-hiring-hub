import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ASSESSMENT_AI_BUDGET_MS, GATEWAY_REQUEST_TIMEOUT_MS, gatewayAttemptTimeoutMs } from './assessment-timing.ts';

test('a successful 34.657 second evaluator has headroom and leaves verification inside the same deadline', () => {
  const startedAt = 1_000_000;
  const deadline = startedAt + ASSESSMENT_AI_BUDGET_MS;
  assert.equal(gatewayAttemptTimeoutMs(deadline, startedAt), GATEWAY_REQUEST_TIMEOUT_MS);
  const verifierStartedAt = startedAt + 34_657;
  const verifierTimeout = gatewayAttemptTimeoutMs(deadline, verifierStartedAt);
  assert.equal(verifierTimeout, 44_843);
  assert.ok(verifierTimeout > 11_307);
  assert.ok(verifierStartedAt + verifierTimeout < deadline);
});

test('a late retry cannot reset or overrun the shared 80 second budget', () => {
  const deadline = ASSESSMENT_AI_BUDGET_MS;
  assert.equal(gatewayAttemptTimeoutMs(deadline, 50_500), 29_000);
  assert.equal(gatewayAttemptTimeoutMs(deadline, 79_000), 500);
  assert.equal(gatewayAttemptTimeoutMs(deadline, 79_001), null);
  assert.equal(gatewayAttemptTimeoutMs(deadline, 80_000), null);
  assert.equal(gatewayAttemptTimeoutMs(deadline, 85_000), null);
});

test('an unavailable clock or deadline never starts an unbounded request', () => {
  assert.equal(gatewayAttemptTimeoutMs(Number.NaN, 0), null);
  assert.equal(gatewayAttemptTimeoutMs(Number.POSITIVE_INFINITY, 0), null);
  assert.equal(gatewayAttemptTimeoutMs(80_000, Number.NaN), null);
});
