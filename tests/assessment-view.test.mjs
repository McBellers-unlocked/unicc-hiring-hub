import assert from 'node:assert/strict';
import { test } from 'node:test';
import { latestAssessment, latestApplicationAssessment, assessmentCriteria, getAssessmentView, reviewPriority } from '../src/lib/assessmentView.ts';

test('latest assessment is deterministic across unordered pipeline versions without mutating input', () => {
  const rows = [
    { id: 'old', created_at: '2025-01-01', pipeline_version: '3.0' },
    { id: 'a', created_at: '2026-09-07', pipeline_version: '5.0' },
    { id: 'b', created_at: '2026-09-07', pipeline_version: '5.0' },
  ];
  assert.equal(latestAssessment(rows).id, 'b');
  assert.deepEqual(rows.map(row => row.id), ['old', 'a', 'b']);
  assert.equal(latestAssessment([...rows].reverse()).id, 'b');
});

test('legacy percentages cannot imply eligibility or exclusion', () => {
  for (const ai_score of [0, 49, 75, 100]) {
    const view = getAssessmentView({ ai_score, pipeline_version: '4.3', rubric_breakdown: { recommendation: 'recommend' } });
    assert.equal(view.state, 'legacy');
    assert.equal(view.current, false);
  }
  assert.equal(getAssessmentView(null).state, 'unassessed');
});

test('a traceable review recommendation remains review despite a high legacy aggregate', () => {
  const row = { assessment_run_id: 'run', pipeline_version: '5.0', ai_score: 99, rubric_breakdown: {
    recommendation: 'review', allCriteria: [{ criterionId: 'skill', status: 'insufficient_evidence' }],
  } };
  assert.equal(getAssessmentView(row).state, 'review');
  assert.equal(getAssessmentView(row).unresolved, 1);
  assert.equal(reviewPriority(row), 0);
});

test('allCriteria takes precedence and compatibility education entries are not duplicated', () => {
  const education = { criterionId: 'education', criterionText: 'Degree', category: 'essential' };
  assert.deepEqual(assessmentCriteria({ allCriteria: [], criteria: [education] }), []);
  assert.equal(assessmentCriteria({ criteria: [education], educationScore: education }).length, 1);
  assert.equal(assessmentCriteria({ allCriteria: [education], criteria: [education], educationScores: [education] }).length, 1);
});

test('a new-format result without a run reference requires reassessment', () => {
  assert.equal(getAssessmentView({ pipeline_version: '5.0', rubric_breakdown: { recommendation: 'recommend' } }).state, 'legacy');
});

test('immutable runs take precedence over a stale screening projection', () => {
  const selected = latestApplicationAssessment({
    screening_scores: [{ id: 'score', created_at: '2026-09-07', assessment_run_id: 'old' }],
    assessment_runs: [{ id: 'latest-run', created_at: '2026-09-08', pipeline_version: '5.0' }],
  });
  assert.equal(selected.assessment_run_id, 'latest-run');
});

test('manual snapshots preserve the run reference without implying an AI recommendation', () => {
  const selected = latestApplicationAssessment({ assessment_runs: [{ id: 'manual', pipeline_version: 'manual-1', rubric_breakdown: { assessment_kind: 'manual', recommendation: 'review' } }] });
  const view = getAssessmentView(selected);
  assert.equal(view.assessmentId, 'manual');
  assert.equal(view.state, 'unassessed');
  assert.equal(view.current, false);
  assert.match(view.label, /no AI recommendation/);
});
