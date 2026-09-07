import test from 'node:test';
import assert from 'node:assert/strict';
import { locateEvidence, findingStatus, normalizeSources, evidenceFromSelectedRange } from '../src/lib/assessmentEvidence.ts';
import { assessmentDemo } from '../src/lib/assessmentDemo.ts';

test('only exact saved spans can be opened as verified evidence', () => {
  const sources = [{ id: 'source', label: 'Employment', kind: 'work_experience', text: 'Before. Managed HR programmes. After.' }];
  const evidence = { sourceId: 'source', quote: 'Managed HR programmes.', startOffset: 8, endOffset: 30 };
  assert.equal(locateEvidence(sources, evidence)?.source.id, 'source');
  assert.equal(locateEvidence(sources, { ...evidence, quote: 'Managed IT programmes.' }), null);
  assert.equal(locateEvidence(sources, { ...evidence, sourceId: 'different' }), null);
  assert.equal(locateEvidence(sources, { ...evidence, startOffset: -1 }), null);
  assert.equal(locateEvidence(sources, { ...evidence, endOffset: 300 }), null);
  assert.equal(locateEvidence(sources, { quote: evidence.quote, source: 'work_experience' }), null);
});
test('unknown and legacy boolean findings do not imply supported or contradicted', () => {
  for (const status of [false, true, null, undefined, 'failed', 'toString']) assert.equal(findingStatus(status), 'assessment_unavailable');
  assert.equal(findingStatus('insufficient_evidence'), 'insufficient_evidence');
});
test('all walkthrough evidence is traceable and uncertainty is distinct from contradiction', () => {
  for (const scenario of ['clear', 'missing', 'gap']) {
    const data = assessmentDemo(scenario);
    for (const criterion of data.allCriteria) for (const sub of criterion.subrequirements) for (const evidence of sub.evidence) assert.ok(locateEvidence(data.sources, evidence));
  }
  assert.equal(assessmentDemo('clear').recommendation, 'recommend');
  assert.equal(assessmentDemo('missing').recommendation, 'review');
  assert.equal(assessmentDemo('gap').recommendation, 'reject');
});

test('reviewer-selected passages preserve exact UTF-16 offsets across emoji and lines', () => {
  const source = { id: 'source', kind: 'application', label: 'Saved answer', text: 'Before 🧭\nOverlooked evidence.\nAfter' };
  const quote = '🧭\nOverlooked evidence.';
  const start = source.text.indexOf(quote);
  const evidence = evidenceFromSelectedRange(source, start, start + quote.length, quote);
  assert.equal(evidence?.quote, quote);
  assert.equal(locateEvidence([source], evidence)?.start, start);
  assert.equal(evidenceFromSelectedRange(source, start + 1, start + quote.length, quote), null);
  assert.equal(evidenceFromSelectedRange(source, start, start + quote.length, 'Paraphrased evidence'), null);
  assert.equal(evidenceFromSelectedRange(source, 0, 0, ''), null);
});

test('source normalization safely handles missing kinds and ambiguous duplicate IDs', () => {
  const sources = normalizeSources([{ id: 'one', text: 'Saved answer', label: 'Answer' }, { id: 'one', text: 'Another answer', label: 'Duplicate' }, { id: 'two', text: 'Unique answer', label: 'Unique' }, { label: 'Missing ID', text: 'Text' }, null]);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].id, 'two');
  assert.equal(sources[0].kind, 'application');
  assert.equal(locateEvidence([{ id: 'same', text: 'Exact' }, { id: 'same', text: 'Exact' }], { sourceId: 'same', quote: 'Exact', startOffset: 0, endOffset: 5 }), null);
});
