import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createPassageCatalog, partitionSourceText, MAX_PASSAGE_CHARACTERS } from './assessment-passages.ts';
import { buildEvidenceSources, normaliseJudgement, validateEvidence } from './assessment-core.ts';
import { assessCriteria } from './assessment-engine.ts';
import type { EvidenceSource, CriterionDefinition } from './assessment-core.ts';

const source: EvidenceSource = { id: 'work-1', kind: 'work_experience', label: 'Work experience 1', text: 'I designed a service roadmap throughout this appointment.' };
const definition: CriterionDefinition = { id: 'criterion-1', requirementId: 'criterion-1', bulletIndex: 0,
  text: 'Proven experience designing service roadmaps.', type: 'specific_experience', category: 'essential', assessmentMode: 'gate', assessmentWeight: 1, policyApprovedAt: '2026-09-07T12:00:00Z' };
const proposed = (evidence: unknown, overrides = {}) => ({ criterionId: definition.id, status: 'supported', evidence,
  qualifyingEmployment: [], missing: '', rationale: 'The proposed evidence supports the requirement.', confidence: 0.8, satisfiedAlternative: '', ...overrides });

test('passages partition every original character exactly once at stable UTF-16 offsets', () => {
  for (const text of ['', '  leading\r\ntrailing  ', 'a'.repeat(63) + '😀' + 'z'.repeat(90),
    'Start. ' + 'Sentence with Unicode 👩🏽‍💻 and accents é. '.repeat(100), 'x'.repeat(63) + '\r\n' + 'y'.repeat(63)]) {
    const passages = partitionSourceText(text, 64);
    assert.equal(passages.map(item => item.text).join(''), text);
    assert.deepEqual(passages, partitionSourceText(text, 64));
    let offset = 0;
    for (const item of passages) {
      assert.equal(item.startOffset, offset);
      assert.equal(item.text, text.slice(item.startOffset, item.endOffset));
      assert.ok(item.text.length <= 64 && item.text.length > 0);
      assert.ok(!(item.text.charCodeAt(item.text.length - 1) >= 0xD800 && item.text.charCodeAt(item.text.length - 1) <= 0xDBFF));
      assert.ok(!(item.text.endsWith('\r') && text[item.endOffset] === '\n'));
      offset = item.endOffset;
    }
    assert.equal(offset, text.length);
  }
});

test('evaluator receives complete passage text once and server resolution supplies exact immutable offsets', () => {
  const saved = structuredClone(source), catalog = createPassageCatalog([source]);
  assert.equal(Object.hasOwn(catalog.evaluatorSources[0], 'text'), false);
  assert.equal(catalog.evaluatorSources[0].passages.map(item => item.text).join(''), source.text);
  const reference = { sourceId: source.id, passageId: catalog.evaluatorSources[0].passages[0].passageId };
  const result = catalog.resolveJudgements([proposed([reference, reference])]);
  assert.deepEqual(result.issues, []);
  const checked = validateEvidence(result.judgements[0].evidence, [source]);
  assert.deepEqual(checked.issues, []);
  assert.equal(checked.evidence.length, 1);
  assert.equal(checked.evidence[0].quote, source.text);
  assert.deepEqual(source, saved);
});

test('identical repeated text has distinct IDs and remains exactly traceable without model offsets', () => {
  const repeated = { ...source, text: 'A'.repeat(64) + 'A'.repeat(64) }, catalog = createPassageCatalog([repeated], 64);
  const [first, second] = catalog.evaluatorSources[0].passages;
  assert.equal(first.text, second.text);
  assert.notEqual(first.passageId, second.passageId);
  const result = catalog.resolveJudgements([proposed([{ sourceId: source.id, passageId: second.passageId }])]);
  const normal = normaliseJudgement(definition, result.judgements[0], [repeated]);
  assert.equal(normal.status, 'supported');
  assert.equal(normal.evidence[0].startOffset, 64);
});

test('passage identity is its source and passage pair, even when two sources have matching offsets', () => {
  const a = { ...source, id: 'source-a', text: 'AAAA' }, b = { ...source, id: 'source-b', text: 'BBBB' };
  const catalog = createPassageCatalog([a, b]), passageId = catalog.evaluatorSources[0].passages[0].passageId;
  assert.equal(passageId, catalog.evaluatorSources[1].passages[0].passageId);
  const result = catalog.resolveJudgements([proposed([{ sourceId: b.id, passageId }])]);
  assert.deepEqual(result.issues, []);
  assert.equal((result.judgements[0].evidence as { quote: string }[])[0].quote, b.text);
});

test('unknown, cross-source, extra and malformed references fail the whole affected judgement closed', () => {
  const other = { ...source, id: 'work-2', text: 'Different source text.' }, catalog = createPassageCatalog([source, other]);
  const valid = { sourceId: source.id, passageId: catalog.evaluatorSources[0].passages[0].passageId };
  for (const bad of [{ sourceId: 'unknown', passageId: valid.passageId }, { sourceId: other.id, passageId: valid.passageId },
    { ...valid, passageId: 'unknown' }, { ...valid, quote: 'injected' }, null, { sourceId: source.id, passageId: 7 }]) {
    const result = catalog.resolveJudgements([proposed([valid, bad])]);
    assert.ok(result.issues.length > 0);
    assert.equal(result.judgements[0].status, 'assessment_unavailable');
    assert.deepEqual(result.judgements[0].evidence, []);
  }
  assert.throws(() => createPassageCatalog([source, source]), /unique/);
});

test('one invalid duration reference cannot be ignored in favour of a separate valid interval', () => {
  const other = { ...source, id: 'work-2' }, catalog = createPassageCatalog([source, other]);
  const first = { sourceId: source.id, passageId: catalog.evaluatorSources[0].passages[0].passageId };
  for (const second of [{ sourceId: other.id, passageId: 'unknown' }, first]) {
    const result = catalog.resolveJudgements([proposed([first], { qualifyingEmployment: [
      { sourceId: source.id, wholeIntervalSupported: true, evidence: [first] },
      { sourceId: other.id, wholeIntervalSupported: true, evidence: [second] },
    ] })]);
    assert.equal(result.judgements[0].status, 'assessment_unavailable');
    assert.deepEqual(result.judgements[0].qualifyingEmployment, []);
  }
});

test('catalog membership does not replace the existing full-source second verification', async () => {
  const catalog = createPassageCatalog([source]), reference = { sourceId: source.id, passageId: catalog.evaluatorSources[0].passages[0].passageId };
  let verified = false;
  const result = await assessCriteria({ criteria: [definition], sources: [source], workExperience: [], education: [], asOf: '2026-09-07', gateway: {
    async evaluate(criteria, sources) {
      assert.deepEqual(criteria, [definition]); assert.deepEqual(sources, [source]);
      return { model: 'stub-evaluator', judgements: catalog.resolveJudgements([proposed([reference])]).judgements };
    },
    async verify(criteria, sources, judgements) {
      verified = true;
      assert.deepEqual(criteria, [definition]); assert.deepEqual(sources, [source]);
      assert.equal((judgements[0].evidence as { quote: string }[])[0].quote, source.text);
      return { model: 'stub-verifier', verifications: [{ criterionId: definition.id, verdict: 'invalid', reason: 'This passage does not establish the entire requirement.' }] };
    },
  } });
  assert.equal(verified, true);
  assert.equal(result.criteria[0].status, 'insufficient_evidence');
  assert.deepEqual(result.models, ['stub-evaluator', 'stub-verifier']);
});

test('invalid passage configuration cannot create an unbounded or non-progressing partition', () => {
  for (const limit of [0, 1, 63, 4_001, Number.NaN, 64.5]) assert.throws(() => partitionSourceText(source.text, limit));
  assert.equal(MAX_PASSAGE_CHARACTERS, 1_000);
});

test('all nine full criteria survive resolution and a bad reference affects only its own finding', async () => {
  const criteria = Array.from({ length: 9 }, (_, i) => ({ ...definition, id: `criterion-${i + 1}`, text: `Full criterion ${i + 1}: preserve every qualifier AND alternative exactly.` }));
  const catalog = createPassageCatalog([source]), reference = { sourceId: source.id, passageId: catalog.evaluatorSources[0].passages[0].passageId };
  const result = await assessCriteria({ criteria, sources: [source], workExperience: [], education: [], asOf: '2026-09-07', gateway: {
    async evaluate(received) {
      assert.deepEqual(received, criteria);
      return { model: 'stub-evaluator', judgements: catalog.resolveJudgements(criteria.map((criterion, i) =>
        proposed([i === 4 ? { ...reference, passageId: 'unknown' } : reference], { criterionId: criterion.id }))).judgements };
    },
    async verify(received, sources) {
      assert.deepEqual(received, criteria.filter((_, i) => i !== 4));
      assert.deepEqual(sources, [source]);
      return { model: 'stub-verifier', verifications: received.map(criterion => ({ criterionId: criterion.id, verdict: 'confirmed' })) };
    },
  } });
  assert.equal(result.criteria.length, 9);
  assert.equal(result.criteria.filter(criterion => criterion.status === 'supported').length, 8);
  assert.equal(result.criteria[4].status, 'assessment_unavailable');
});

test('verified overlapping employment still merges duration after passage resolution', async () => {
  const workExperience = [
    { start_date: '2020-01-01', end_date: '2023-01-01', duties: 'Full-time product development throughout the entire role.' },
    { start_date: '2021-01-01', end_date: '2024-01-01', duties: 'Full-time product development throughout the entire role.' },
  ];
  const sources = buildEvidenceSources({ workExperience, education: [], motivationLetter: '' }), catalog = createPassageCatalog(sources);
  const references = catalog.evaluatorSources.map(source => ({ sourceId: source.id, passageId: source.passages[0].passageId }));
  for (const years of [4, 5]) {
    const criterion = { ...definition, text: `At least ${years} years of product development experience`, type: 'years_experience' as const };
    const result = await assessCriteria({ criteria: [criterion], sources, workExperience, education: [], asOf: '2026-09-07', gateway: {
      async evaluate() { return { model: 'stub-evaluator', judgements: catalog.resolveJudgements([proposed(references, {
        qualifyingEmployment: references.map(reference => ({ sourceId: reference.sourceId, wholeIntervalSupported: true, evidence: [reference] })),
      })]).judgements }; },
      async verify() { return { model: 'stub-verifier', verifications: [{ criterionId: criterion.id, verdict: 'confirmed', qualifyingEmploymentVerified: true }] }; },
    } });
    assert.equal(result.criteria[0].status, years === 4 ? 'supported' : 'insufficient_evidence');
  }
});

test('a verified standalone education alternative still bypasses the separate duration branch', async () => {
  const education = [{ degree_type: "Master's Degree", field_of_study: 'Computer Science', is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' }), catalog = createPassageCatalog(sources);
  const criterion = { ...definition, text: "2 years of professional experience OR a relevant master's degree", type: 'years_experience' as const };
  const references = catalog.evaluatorSources[0].passages.map(passage => ({ sourceId: sources[0].id, passageId: passage.passageId }));
  const result = await assessCriteria({ criteria: [criterion], sources, workExperience: [], education, asOf: '2026-09-07', gateway: {
    async evaluate() { return { model: 'stub-evaluator', judgements: catalog.resolveJudgements([proposed(references, { satisfiedAlternative: "a relevant master's degree" })]).judgements }; },
    async verify() { return { model: 'stub-verifier', verifications: [{ criterionId: criterion.id, verdict: 'confirmed', alternativeRouteVerified: true }] }; },
  } });
  assert.equal(result.criteria[0].status, 'supported');
});
