import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ASSESSMENT_MODEL, ASSESSMENT_PROMPT_VERSION, ASSESSMENT_EXECUTION_CONFIG, buildAssessmentRequest,
} from './assessment-request.ts';

test('both gateway stages request low reasoning with the unchanged model and complete payload', () => {
  const criteria = Array.from({ length: 9 }, (_, index) => ({ id: `criterion-${index + 1}`, text: `Full criterion ${index + 1}` }));
  const sources = [{ id: 'employment-1', text: 'The complete supplied employment record.' }];
  for (const stage of ['assess_criteria', 'verify_assessments']) {
    const payload = { criteria, sources, ...(stage === 'verify_assessments' ? { judgements: [{ criterionId: 'criterion-1', status: 'supported' }] } : {}) };
    const properties = { results: { type: 'array' } };
    const request = buildAssessmentRequest('The complete stage instructions.', payload, stage, properties);
    assert.equal(request.model, 'openai/gpt-5');
    assert.equal(request.reasoning_effort, 'low');
    assert.equal(request.reasoning_effort, ASSESSMENT_EXECUTION_CONFIG.reasoning_effort);
    assert.deepEqual(JSON.parse(request.messages[1].content), payload);
    assert.equal(request.messages[0].content, 'The complete stage instructions.');
    assert.equal(request.tool_choice.function.name, stage);
    assert.deepEqual(request.tools[0].function.parameters.properties, properties);
  }
});

test('recorded execution settings identify the low-effort revision without changing deadlines', () => {
  assert.equal(ASSESSMENT_MODEL, 'openai/gpt-5');
  assert.equal(ASSESSMENT_PROMPT_VERSION, '2026-09-07.evidence-workspace.2');
  assert.deepEqual(ASSESSMENT_EXECUTION_CONFIG, {
    reasoning_effort: 'low', gateway_request_timeout_ms: 50_000, assessment_ai_budget_ms: 80_000,
  });
});
