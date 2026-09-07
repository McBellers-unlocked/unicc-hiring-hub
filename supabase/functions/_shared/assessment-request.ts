import type { DataRecord } from './assessment-core.ts';
import { ASSESSMENT_AI_BUDGET_MS, GATEWAY_REQUEST_TIMEOUT_MS } from './assessment-timing.ts';

export const ASSESSMENT_MODEL = 'openai/gpt-5';
export const ASSESSMENT_PROMPT_VERSION = '2026-09-07.evidence-workspace.3';
export const ASSESSMENT_REASONING_EFFORT = 'low';
export const ASSESSMENT_EXECUTION_CONFIG = {
  source_format_version: '2.known-identical-aliases',
  reasoning_effort: ASSESSMENT_REASONING_EFFORT,
  gateway_request_timeout_ms: GATEWAY_REQUEST_TIMEOUT_MS,
  assessment_ai_budget_ms: ASSESSMENT_AI_BUDGET_MS,
};

/** Both assessment stages use the same recorded model and reasoning settings. */
export function buildAssessmentRequest(system: string, payload: unknown, name: string, properties: DataRecord) {
  return {
    model: ASSESSMENT_MODEL,
    reasoning_effort: ASSESSMENT_REASONING_EFFORT,
    messages: [{ role: 'system', content: system }, { role: 'user', content: JSON.stringify(payload) }],
    tools: [{ type: 'function', function: { name, description: 'Return complete evidence assessments using the given schema.',
      parameters: { type: 'object', properties, required: Object.keys(properties), additionalProperties: false } } }],
    tool_choice: { type: 'function', function: { name } },
  };
}
