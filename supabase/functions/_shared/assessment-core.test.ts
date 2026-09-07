import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyVerification, assessEducationLevel, assessExperienceDuration, buildEvidenceSources, combineCriterion,
  employmentInterval, minimumExperienceYears, normaliseDegreeLevel, normaliseJudgement,
  parseAssessmentCriteria, requirementTexts, summariseAssessment, unionExperienceYears, validateEvidence,
  submittedApplicationInputs,
  rawCriteriaSnapshot, recordedSubmissionCutoff,
} from './assessment-core.ts';
import type { AssessmentScope, AssessmentStatus, CriterionDefinition, DataRecord, EvidenceSource } from './assessment-core.ts';
import { assessCriteria } from './assessment-engine.ts';
import type { AssessmentGateway } from './assessment-engine.ts';
import { validateBatchContinuation } from './batch-assessment-core.ts';

const approvedAt = '2026-09-07T10:00:00Z';
const asOf = '2026-09-07T12:00:00Z';
const source: EvidenceSource = { id: 'source-1', kind: 'application', label: 'Application answer', text: 'I hold an active licence. I do not hold the required clearance.' };
const evidence = [{ sourceId: source.id, quote: 'I hold an active licence.' }];
const def = (overrides: Partial<CriterionDefinition> = {}): CriterionDefinition => ({
  id: 'criterion-1', requirementId: 'criterion-1', bulletIndex: 0, text: 'An active licence is required.',
  type: 'attribute', category: 'essential', assessmentMode: 'gate', assessmentWeight: 1, policyApprovedAt: approvedAt, ...overrides,
});
const scope = (overrides: Partial<AssessmentScope> = {}): AssessmentScope => ({
  inputTruncated: false, processingErrors: [], missingSources: [], sourceCount: 1,
  assessedSourceIds: [source.id], excludedSources: [], policyApproved: true, criteriaComplete: true, limitations: [], ...overrides,
});
const scored = (status: AssessmentStatus, definition = def()) => combineCriterion(definition, [{
  id: 'S1', text: definition.text, type: 'llm', status, demonstrated: status === 'supported',
  evidence: validateEvidence(evidence, [source]).evidence, missing: null, confidence: 1, flags: [],
  verification: { valid: true, issues: [], confidence_adjustment: 0 },
}]);

test('empty criteria and a single unmet essential never recommend', () => {
  assert.equal(summariseAssessment([], scope()).recommendation, 'review');
  assert.equal(summariseAssessment([scored('contradicted')], scope()).recommendation, 'reject');
  assert.equal(summariseAssessment([scored('insufficient_evidence')], scope()).recommendation, 'review');
});

test('an unknown criterion or processing failure cannot be turned into an exclusion', () => {
  const contradiction = scored('contradicted');
  for (const status of ['insufficient_evidence', 'assessment_unavailable'] as AssessmentStatus[]) {
    const unknown = scored(status, def({ id: 'unknown' }));
    assert.equal(summariseAssessment([contradiction, unknown], scope()).recommendation, 'review');
  }
  assert.equal(summariseAssessment([contradiction], scope({ processingErrors: ['Service error'] })).recommendation, 'review');
  assert.equal(summariseAssessment([contradiction], scope({ inputTruncated: true })).recommendation, 'review');
});

test('all essential criteria and approved policies are required for recommendation', () => {
  assert.equal(summariseAssessment([scored('supported')], scope()).recommendation, 'recommend');
  assert.equal(summariseAssessment([scored('supported', def({ policyApprovedAt: null }))], scope()).recommendation, 'review');
  assert.equal(summariseAssessment([scored('supported')], scope({ criteriaComplete: false })).recommendation, 'review');
  const weightedEssential = scored('contradicted', def({ id: 'weighted', assessmentMode: 'weighted' }));
  assert.equal(summariseAssessment([scored('supported'), weightedEssential], scope()).recommendation, 'review');
});

test('desirables are assessed without becoming essential exclusion gates', () => {
  const desirable = scored('contradicted', def({ id: 'desirable', category: 'desirable', assessmentMode: 'weighted' }));
  const result = summariseAssessment([scored('supported'), desirable], scope());
  assert.equal(result.recommendation, 'recommend');
  assert.equal(result.desirableTotal, 1);
  assert.equal(result.desirableMet, 0);
  assert.equal(result.essentialTotal, 1);
  const desirableUnknown = scored('insufficient_evidence', def({ id: 'desirable-unknown', category: 'desirable', assessmentMode: 'weighted' }));
  assert.equal(summariseAssessment([scored('supported'), desirableUnknown], scope()).recommendation, 'recommend');
  assert.equal(summariseAssessment([scored('contradicted'), desirableUnknown], scope()).recommendation, 'reject');
  assert.equal(summariseAssessment([scored('supported'), scored('insufficient_evidence', def({ category: 'desirable', assessmentMode: 'gate' }))], scope()).recommendation, 'review');
  assert.equal(summariseAssessment([scored('supported'), scored('contradicted', def({ category: 'desirable', assessmentMode: 'gate' }))], scope()).recommendation, 'reject');
});

test('configured weights affect only the evidence coverage metric, not the gate decision', () => {
  const supported = scored('supported', def({ assessmentWeight: 99 }));
  const contradiction = scored('contradicted', def({ id: 'gate-2', assessmentWeight: 1 }));
  const result = summariseAssessment([supported, contradiction], scope());
  assert.equal(result.overallScore, 99);
  assert.equal(result.recommendation, 'reject');
});

test('prose descriptions, essential education aliases and desirables survive parsing', () => {
  const parsed = parseAssessmentCriteria([
    { id: 'experience', category: 'Essential Criteria', title: 'Essential Experience', description: 'At least five years of project management experience.', policy_approved_at: approvedAt },
    { id: 'education', category: 'Essential Education', title: "Bachelor's degree in Computer Science", policy_approved_at: approvedAt },
    { id: 'desirable', category: 'Desirable Criteria', title: 'French language fluency', policy_approved_at: approvedAt, assessment_weight: 3 },
  ]);
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.criteria.length, 3);
  assert.equal(parsed.criteria[0].text, 'At least five years of project management experience.');
  assert.equal(parsed.criteria[0].type, 'years_experience');
  assert.equal(parsed.criteria[1].type, 'education');
  assert.equal(parsed.criteria[1].assessmentMode, 'gate');
  assert.equal(parsed.criteria[2].assessmentMode, 'weighted');
  assert.equal(parsed.criteria[2].assessmentWeight, 3);
});

test('compound alternatives and title qualifiers are preserved', () => {
  const alternatives = 'At least one of the following:\n- A degree\n- Equivalent professional experience';
  assert.deepEqual(requirementTexts('Essential Education', alternatives), [alternatives]);
  assert.deepEqual(requirementTexts('Essential Education', '- A degree\n- Or equivalent experience'), ['- A degree\n- Or equivalent experience']);
  assert.deepEqual(requirementTexts('For the most recent five years', '- Manage teams\n- Deliver programmes'), ['For the most recent five years\n- Manage teams\n- Deliver programmes']);
  assert.deepEqual(requirementTexts('Essential Criteria', '- Manage teams\n- Deliver programmes'), ['Manage teams', 'Deliver programmes']);
});

test('invalid, empty or unknown criterion records prevent silent approval', () => {
  const parsed = parseAssessmentCriteria([
    { id: 'empty', category: 'Essential Criteria', title: '' },
    { id: 'unknown', category: 'Unmapped requirement', title: 'Some requirement', policy_approved_at: approvedAt },
    { id: 'bad-weight', category: 'essential', title: 'Requirement', assessment_weight: -1 },
  ]);
  assert.equal(parsed.criteria.length, 2);
  assert.equal(parsed.issues.length, 3);
  assert.equal(parseAssessmentCriteria([], 'First Level University').criteria[0].policyApprovedAt, null);
});

test('all education criteria are retained instead of overwriting one another', () => {
  const results = [scored('supported', def({ id: 'degree', type: 'education' })), scored('supported', def({ id: 'certificate', type: 'education' }))];
  const summary = summariseAssessment(results, scope());
  assert.equal(summary.educationScores.length, 2);
  assert.equal(summary.allCriteria.length, 2);
  assert.equal(summary.totalCount, 2);
});

test('quotes must resolve to an exact span of their named immutable source', () => {
  const checked = validateEvidence(evidence, [source]);
  assert.equal(checked.issues.length, 0);
  const citation = checked.evidence[0];
  assert.equal(source.text.slice(citation.startOffset, citation.endOffset), citation.quote);
  assert.equal(citation.sourceId, source.id);
  assert.equal(validateEvidence([{ sourceId: source.id, quote: 'The candidate holds a licence.' }], [source]).evidence.length, 0);
  assert.equal(validateEvidence([{ sourceId: 'not-a-source', quote: source.text }], [source]).evidence.length, 0);
});

test('ambiguous repeated quotes require explicit valid offsets; Unicode offsets match browser slicing', () => {
  const repeated: EvidenceSource = { ...source, text: 'Yes. Yes.' };
  assert.equal(validateEvidence([{ sourceId: source.id, quote: 'Yes.' }], [repeated]).evidence.length, 0);
  assert.equal(validateEvidence([{ sourceId: source.id, quote: 'Yes.', startOffset: 5, endOffset: 9 }], [repeated]).evidence[0].startOffset, 5);
  const unicode: EvidenceSource = { ...source, text: '📄 Evidence: Développé le programme.' };
  const quotation = validateEvidence([{ sourceId: source.id, quote: 'Développé le programme.' }], [unicode]).evidence[0];
  assert.equal(unicode.text.slice(quotation.startOffset, quotation.endOffset), quotation.quote);
});

test('identical PHF work aliases produce one traceable value with every original label and record retained', () => {
  const description = '📄 Built the digital payment roadmap and delivered RSI services for multilingual events.';
  const record = { duties_and_responsibilities: description, position: 'Delivery officer', title: 'Delivery officer', exact_title: 'Delivery officer',
    exact_title_of_post: 'Delivery officer', description, startDate: '2022-01-01', start_date: '2022-01-01' };
  const application = { phf_data: { _workExperiences: [record, { ...record }] }, answers: {} };
  const before = structuredClone(application);
  const { sources, workExperience } = submittedApplicationInputs(application);
  assert.deepEqual(application, before, 'source formatting must not mutate the raw submitted snapshot');
  assert.deepEqual(workExperience, before.phf_data._workExperiences);
  assert.equal(sources.length, 2, 'identical records remain distinct named sources');
  sources.forEach((source, index) => {
    assert.equal(source.id, `work-experience-${index}`);
    assert.equal(source.label, `Work experience ${index + 1}`);
    assert.equal(source.recordIndex, index);
    assert.ok(source.text.includes(`description / duties_and_responsibilities: ${description}`));
    assert.ok(source.text.includes('position / title / exact_title / exact_title_of_post: Delivery officer'));
    assert.equal(source.text.split(description).length - 1, 1);
    const checked = validateEvidence([{ sourceId: source.id, quote: description }], sources);
    assert.equal(checked.issues.length, 0);
    const citation = checked.evidence[0];
    assert.equal(source.text.slice(citation.startOffset, citation.endOffset), description);
    const assessment = normaliseJudgement(def(), { status: 'supported', evidence: [{ sourceId: source.id, quote: description }], confidence: 1 }, sources);
    assert.equal(assessment.status, 'supported');
    assert.ok(!assessment.flags.includes('EVIDENCE_NOT_VERIFIED'));
  });
});

test('different alias values and unrelated repeated fields remain intact without weakening exact-quote validation', () => {
  const record = { description: 'I delivered RSI operations.', duties_and_responsibilities: 'I did not deliver payment operations.',
    position: 'Assistant', exact_title_of_post: 'Consultant', isCurrent: true, is_present: false,
    additional_statement: 'This sentence appears twice.', unrelated_statement: 'This sentence appears twice.' };
  const [source] = buildEvidenceSources({ workExperience: [record], education: [], motivationLetter: '' });
  for (const [key, value] of Object.entries(record)) assert.ok(source.text.includes(`${key}: ${value}`));
  for (const quote of [record.description, record.duties_and_responsibilities]) {
    assert.equal(validateEvidence([{ sourceId: source.id, quote }], [source]).evidence.length, 1);
  }
  assert.equal(validateEvidence([{ sourceId: source.id, quote: record.additional_statement }], [source]).evidence.length, 0);
  const startOffset = source.text.indexOf(record.additional_statement);
  assert.equal(validateEvidence([{ sourceId: source.id, quote: record.additional_statement, startOffset,
    endOffset: startOffset + record.additional_statement.length }], [source]).evidence.length, 1);
});

test('education aliases retain all labels and distinct qualifications with stable browser-compatible citation offsets', () => {
  const record = { institution: 'Université Exemple', institution_name: 'Université Exemple',
    degree_type: 'B.Sc. Computer Science', degree: 'B.Sc. Computer Science', degree_or_certificate_title: 'B.Sc. Computer Science',
    field_of_study: 'Distributed systems', field: 'Distributed systems', main_course_of_study: 'Information security',
    is_completed: false, completed: true };
  const sources = buildEvidenceSources({ workExperience: [], education: [record], motivationLetter: '' });
  const source = sources[0];
  assert.ok(source.text.includes('degree_type / degree / degree_or_certificate_title: B.Sc. Computer Science'));
  assert.ok(source.text.includes('field_of_study / field: Distributed systems'));
  assert.ok(source.text.includes('main_course_of_study: Information security'));
  assert.ok(source.text.includes('is_completed: false'));assert.ok(source.text.includes('completed: true'));
  for (const quote of ['Université Exemple', 'B.Sc. Computer Science', 'Distributed systems', 'Information security']) {
    const checked = validateEvidence([{ sourceId: source.id, quote }], sources);
    assert.equal(checked.issues.length, 0);
    assert.equal(source.text.slice(checked.evidence[0].startOffset, checked.evidence[0].endOffset), quote);
  }
  const reverse = Object.fromEntries(Object.entries(record).reverse());
  assert.equal(buildEvidenceSources({ workExperience: [], education: [reverse], motivationLetter: '' })[0].text, source.text);
});

test('alias normalization uses exact typed values and retains genuine repetition within submitted prose', () => {
  const sources = buildEvidenceSources({ workExperience: [{ description: 'Yes. Yes.', duties_and_responsibilities: 'Yes. Yes.',
    position: 'Officer', exact_title_of_post: 'Officer ', isCurrent: true, is_present: 'true' }], education: [], motivationLetter: '' });
  const lines = sources[0].text.split('\n');
  assert.ok(lines.includes('position: Officer'));
  assert.ok(lines.includes('exact_title_of_post: Officer '));
  assert.ok(lines.includes('isCurrent: true'));assert.ok(lines.includes('is_present: true'));
  assert.equal(validateEvidence([{ sourceId: sources[0].id, quote: 'Yes.' }], sources).evidence.length, 0);
  assert.equal(validateEvidence([{ sourceId: sources[0].id, quote: 'Yes. Yes.' }], sources).evidence.length, 1);
});

test('missing or invented quotes cannot become supported or contradicted judgements', () => {
  for (const status of ['supported', 'contradicted']) {
    assert.equal(normaliseJudgement(def(), { status, evidence: [], confidence: 1 }, [source]).status, 'insufficient_evidence');
    assert.equal(normaliseJudgement(def(), { status, evidence: [{ sourceId: source.id, quote: 'Invented evidence' }], confidence: 1 }, [source]).status, 'insufficient_evidence');
  }
});

test('a second check is required for every decisive judgement irrespective of confidence', () => {
  const initial = normaliseJudgement(def(), { status: 'supported', evidence, confidence: 1 }, [source]);
  assert.equal(applyVerification(initial, undefined).status, 'assessment_unavailable');
  assert.equal(applyVerification(initial, { verdict: 'uncertain' }).status, 'insufficient_evidence');
  assert.equal(applyVerification(initial, { verdict: 'invalid' }).status, 'insufficient_evidence');
  assert.equal(applyVerification(initial, { verdict: 'confirmed' }).status, 'supported');
});

test('common degree spelling variants normalise; unfamiliar degrees remain unknown', () => {
  for (const value of ['B.Sc.', 'BSc', "Bachelor's Degree", 'Bachelor of Science']) assert.equal(normaliseDegreeLevel(value), 3);
  for (const value of ['M.Sc.', 'MSc', "Master's Degree", 'Ph.D.']) assert.equal(normaliseDegreeLevel(value), 4);
  assert.equal(normaliseDegreeLevel('Unfamiliar qualification'), null);
  const education = [{ degree_type: 'Unfamiliar qualification', is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' });
  const check = assessEducationLevel(def({ type: 'education', text: "Bachelor's degree in Physics" }), education, sources);
  assert.equal(check?.status, 'insufficient_evidence');
});

test('missing degree completion is review, and deterministic citations point to actual education records', () => {
  const definition = def({ type: 'education', text: "Bachelor's degree in Computer Science" });
  const education = [{ degree_type: 'B.Sc.', field_of_study: 'Computer Science', is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' });
  const result = assessEducationLevel(definition, education, sources)!;
  assert.equal(result.status, 'supported');
  assert.equal(result.evidence[0].source, 'education');
  assert.equal(result.evidence[0].quote, sources[0].text);
  assert.equal(result.evidence[0].quote.includes('Candidate has'), false);
  assert.equal(assessEducationLevel(definition, [{ degree_type: 'B.Sc.' }], sources)?.status, 'insufficient_evidence');
});

test('education alternative routes are not reduced to the highest degree', () => {
  const definition = def({ text: "Master's degree or Bachelor's degree with equivalent experience", type: 'education' });
  assert.equal(assessEducationLevel(definition, [], []), null);
});

test('experience thresholds preserve range minimum and reject ambiguous alternative thresholds', () => {
  assert.equal(minimumExperienceYears('3-5 years of experience'), 3);
  assert.equal(minimumExperienceYears('At least five (5) years of HR experience'), 5);
  assert.equal(minimumExperienceYears('5 years or 2 years with an advanced degree'), null);
  assert.equal(minimumExperienceYears('At least 18 months of experience'), null);
  assert.equal(minimumExperienceYears('Five to ten years of professional experience'), 5);
  assert.equal(minimumExperienceYears('Twenty-five years of professional experience'), 25);
  assert.equal(minimumExperienceYears('No less than five years of professional experience'), 5);
  assert.equal(minimumExperienceYears('Five (6) years of experience'), null);
  assert.equal(minimumExperienceYears('One hundred and five years of experience'), null);
});

test('clear duration requirements receive duration checks even without the word experience', () => {
  for (const title of ['At least five years managing HR programmes', '5 years in HR', 'At least 2 years leading technology teams']) {
    const parsed = parseAssessmentCriteria([{ id: 'duration', category: 'essential', title }]);
    assert.equal(parsed.criteria[0].type, 'years_experience', title);
  }
  const degree = parseAssessmentCriteria([{ id: 'degree', category: 'Essential Education', title: 'A four-year degree in medicine' }]);
  assert.equal(degree.criteria[0].type, 'education');
});

test('missing end dates and invalid calendar dates do not fabricate current employment', () => {
  assert.equal(employmentInterval({ start_date: '2010-01-01' }, 0, asOf), null);
  assert.equal(employmentInterval({ start_date: '2020-02-30', end_date: '2024-01-01' }, 0, asOf), null);
  assert.ok(employmentInterval({ start_date: '2020-01-01', is_current: true }, 0, asOf));
});

test('overlapping employment is counted once and exact calendar anniversaries meet a threshold', () => {
  const ranges = [
    { start: Date.parse('2015-01-01'), end: Date.parse('2020-01-01') },
    { start: Date.parse('2017-01-01'), end: Date.parse('2020-01-01') },
  ];
  assert.equal(unionExperienceYears(ranges), 5);
  assert.ok(unionExperienceYears([{ start: Date.parse('2015-01-02'), end: Date.parse('2020-01-01') }]) < 5);
});

test('unrelated years cannot satisfy five years of relevant experience', () => {
  const records = [
    { start_date: '2010-01-01', end_date: '2020-01-01', duties: 'Full-time civil engineering design.' },
    { start_date: '2020-01-01', end_date: '2021-01-01', duties: 'Full-time human resources management for this entire role.' },
  ];
  const sources = buildEvidenceSources({ workExperience: records, education: [], motivationLetter: '' });
  const definition = def({ text: 'At least 5 years of human resources experience', type: 'years_experience' });
  const result = assessExperienceDuration(definition, records, sources, { qualifyingEmployment: [{
    sourceId: sources[1].id, wholeIntervalSupported: true, evidence: [{ sourceId: sources[1].id, quote: records[1].duties }],
  }] }, asOf);
  assert.equal(result.status, 'insufficient_evidence');
  assert.match(result.calculation!, /1\.00 years/);
  assert.equal(result.evidence.length, 1);
  assert.equal(result.evidence[0].sourceId, sources[1].id);
});

test('an isolated relevant task does not count an entire employment interval', () => {
  const records = [{ start_date: '2010-01-01', end_date: '2020-01-01', duties: 'Helped with one HR workshop.' }];
  const sources = buildEvidenceSources({ workExperience: records, education: [], motivationLetter: '' });
  const result = assessExperienceDuration(def({ text: '5 years of HR experience', type: 'years_experience' }), records, sources, {
    qualifyingEmployment: [{ sourceId: sources[0].id, wholeIntervalSupported: false, evidence: [{ sourceId: sources[0].id, quote: records[0].duties }] }],
  }, asOf);
  assert.equal(result.status, 'insufficient_evidence');
  assert.equal(result.evidence.length, 0);
});

test('partial dates use a conservative lower bound, not the longest possible duration', () => {
  const interval = employmentInterval({ period_from_year: '2020', period_to_year: '2025' }, 0, asOf)!;
  assert.equal(new Date(interval.start).toISOString().slice(0, 10), '2020-12-31');
  assert.equal(new Date(interval.end).toISOString().slice(0, 10), '2025-01-01');
  assert.ok(unionExperienceYears([interval]) < 5);
});

const fakeGateway = (overrides: Partial<AssessmentGateway> = {}): AssessmentGateway => ({
  async evaluate(criteria) { return { model: 'test-model', judgements: criteria.map(criterion => ({ criterionId: criterion.id, status: 'supported', evidence, confidence: 1 })) }; },
  async verify(criteria) { return { model: 'test-model', verifications: criteria.map(criterion => ({ criterionId: criterion.id, verdict: 'confirmed', reason: 'Exact evidence supports the requirement.', qualifyingEmploymentVerified: false })) }; },
  ...overrides,
});

test('service failures produce an unavailable row for every criterion', async () => {
  const criteria = [def(), def({ id: 'criterion-2', type: 'education' })];
  const result = await assessCriteria({ criteria, sources: [source], workExperience: [], education: [], asOf,
    gateway: fakeGateway({ async evaluate() { throw new Error('Synthetic service failure'); } }) });
  assert.equal(result.criteria.length, criteria.length);
  assert.ok(result.criteria.every(criterion => criterion.status === 'assessment_unavailable'));
  assert.equal(result.processingErrors.length, 1);
});

test('missing or duplicate model rows do not silently drop criteria', async () => {
  const criteria = [def(), def({ id: 'criterion-2' })];
  const result = await assessCriteria({ criteria, sources: [source], workExperience: [], education: [], asOf,
    gateway: fakeGateway({ async evaluate() { return { model: 'test-model', judgements: [
      { criterionId: 'criterion-1', status: 'supported', evidence }, { criterionId: 'criterion-1', status: 'supported', evidence },
    ] }; } }) });
  assert.equal(result.criteria.length, 2);
  assert.ok(result.criteria.every(criterion => criterion.status === 'assessment_unavailable'));
});

test('high-confidence judgements still receive verification and rejected evidence stays unresolved on repeated runs', async () => {
  let evaluationCalls = 0;
  let verificationCalls = 0;
  const gateway = fakeGateway({
    async evaluate() { evaluationCalls++; return { model: 'test-model', judgements: [{ criterionId: 'criterion-1', status: 'supported', evidence, confidence: 1 }] }; },
    async verify() { verificationCalls++; return { model: 'test-model', verifications: [{ criterionId: 'criterion-1', verdict: 'invalid', reason: 'The quotation does not establish the complete criterion.' }] }; },
  });
  for (let run = 0; run < 2; run++) {
    const result = await assessCriteria({ criteria: [def()], sources: [source], workExperience: [], education: [], asOf, gateway });
    assert.equal(result.criteria[0].status, 'insufficient_evidence');
  }
  assert.equal(evaluationCalls, 2);
  assert.equal(verificationCalls, 2);
});

test('education field assessment receives the actual education source even when absent from work history', async () => {
  const education = [{ degree_type: 'B.Sc.', field_of_study: 'Computer Science', is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' });
  const definition = def({ text: "Bachelor's degree in Computer Science", type: 'education' });
  const gateway = fakeGateway({
    async evaluate(criteria, receivedSources) {
      assert.ok(receivedSources.some(source => source.kind === 'education' && source.text.includes('Computer Science')));
      return { model: 'test-model', judgements: [{ criterionId: criteria[0].id, status: 'supported', confidence: 1,
        evidence: [{ sourceId: receivedSources[0].id, quote: 'field_of_study: Computer Science' }] }] };
    },
  });
  const result = await assessCriteria({ criteria: [definition], sources, workExperience: [], education, asOf, gateway });
  assert.equal(result.criteria[0].status, 'supported');
  assert.equal(result.criteria[0].subrequirements.length, 2);
});

test('verified relevant intervals can establish duration; unverified interval assertions cannot', async () => {
  const workExperience = [{ start_date: '2015-01-01', end_date: '2020-01-01', duties: 'Full-time HR management throughout the entire role.' }];
  const sources = buildEvidenceSources({ workExperience, education: [], motivationLetter: '' });
  const definition = def({ text: 'At least 5 years of HR experience', type: 'years_experience' });
  const quote = { sourceId: sources[0].id, quote: workExperience[0].duties };
  for (const intervalVerified of [true, false]) {
    const result = await assessCriteria({ criteria: [definition], sources, workExperience, education: [], asOf,
      gateway: fakeGateway({
        async evaluate() { return { model: 'test-model', judgements: [{ criterionId: definition.id, status: 'supported', evidence: [quote], confidence: 1,
          qualifyingEmployment: [{ sourceId: sources[0].id, wholeIntervalSupported: true, evidence: [quote] }] }] }; },
        async verify() { return { model: 'test-model', verifications: [{ criterionId: definition.id, verdict: 'confirmed', reason: 'Checked against the role.', qualifyingEmploymentVerified: intervalVerified }] }; },
      }) });
    assert.equal(result.criteria[0].status, intervalVerified ? 'supported' : 'insufficient_evidence');
  }
});

test('no source data stays insufficient evidence and does not invoke the model', async () => {
  let called = false;
  const result = await assessCriteria({ criteria: [def()], sources: [], workExperience: [], education: [], asOf,
    gateway: fakeGateway({ async evaluate() { called = true; throw new Error('Should not run'); } }) });
  assert.equal(called, false);
  assert.equal(result.criteria[0].status, 'insufficient_evidence');
});

test('assessment sources come only from the submitted application and honour explicit empty lists', () => {
  const result = submittedApplicationInputs({
    phf_data: { _workExperiences: [], employment: [{ duties: 'Old alias should not revive deleted experience' }], _education: [], education: [{ degree_type: 'B.Sc.' }] },
    candidates: { work_experience: [{ duties: 'A newer profile or different application' }], phf_education: [{ degree_type: 'Ph.D.' }], motivation_letter: 'Profile letter', skills: ['Profile skill'] },
  });
  assert.equal(result.workExperience.length, 0);
  assert.equal(result.education.length, 0);
  assert.equal(result.sources.length, 0);
  const alias = submittedApplicationInputs({ phf_data: { _workExperiences: [{ duties: 'Submitted work' }] } });
  assert.equal(alias.sources[0].text, 'duties: Submitted work');
});

test('a verified standalone degree alternative does not incorrectly require experience years', async () => {
  const education = [{ degree_type: "Master's Degree", field_of_study: 'Computer Science', is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' });
  const definition = def({ text: "2 years of professional experience OR a relevant master's degree", type: 'years_experience' });
  const result = await assessCriteria({ criteria: [definition], sources, workExperience: [], education, asOf,
    gateway: fakeGateway({
      async evaluate() { return { model: 'test-model', judgements: [{ criterionId: definition.id, status: 'supported',
        evidence: [{ sourceId: sources[0].id, quote: "degree_type: Master's Degree" }], confidence: 1, satisfiedAlternative: "a relevant master's degree" }] }; },
      async verify() { return { model: 'test-model', verifications: [{ criterionId: definition.id, verdict: 'confirmed', alternativeRouteVerified: true }] }; },
    }) });
  assert.equal(result.criteria[0].status, 'supported');
  assert.equal(result.criteria[0].subrequirements.length, 1);
});

test('a degree branch nested inside AND cannot bypass the required experience duration', async () => {
  const education = [{ degree_type: "Master's Degree", is_completed: true }];
  const sources = buildEvidenceSources({ workExperience: [], education, motivationLetter: '' });
  const definition = def({ text: "2 years of professional experience AND (a master's degree OR a bachelor's degree)", type: 'years_experience' });
  const result = await assessCriteria({ criteria: [definition], sources, workExperience: [], education, asOf,
    gateway: fakeGateway({
      async evaluate() { return { model: 'test-model', judgements: [{ criterionId: definition.id, status: 'supported',
        evidence: [{ sourceId: sources[0].id, quote: "degree_type: Master's Degree" }], confidence: 1, satisfiedAlternative: "a master's degree" }] }; },
      async verify() { return { model: 'test-model', verifications: [{ criterionId: definition.id, verdict: 'confirmed', alternativeRouteVerified: true }] }; },
    }) });
  assert.equal(result.criteria[0].status, 'insufficient_evidence');
});

test('a desirable-only processing gap is visible but does not change essential eligibility', () => {
  const desiredUnavailable = scored('assessment_unavailable', def({ id: 'desirable-service-error', category: 'desirable', assessmentMode: 'weighted' }));
  const result = summariseAssessment([scored('supported'), desiredUnavailable], scope({
    processingErrors: ['The desirable evidence check was unavailable.'], blockingProcessingErrors: [],
  }));
  assert.equal(result.recommendation, 'recommend');
  assert.equal(result.scope.processingErrors.length, 1);
  assert.equal(result.unresolvedRequiredCount, 0);
});

test('employment uses the recorded submission cutoff and does not accrue after submission', () => {
  const cutoff = recordedSubmissionCutoff('2020-01-01T00:00:00Z', asOf)!;
  const interval = employmentInterval({ start_date: '2015-01-01', is_current: true }, 0, cutoff)!;
  assert.equal(unionExperienceYears([interval]), 5);
  assert.equal(recordedSubmissionCutoff(null, asOf), null);
  assert.equal(recordedSubmissionCutoff('invalid', asOf), null);
  assert.equal(recordedSubmissionCutoff('2099-01-01', asOf), null);
});

test('the atomic-save snapshot contains every raw policy field with explicit nulls', () => {
  const snapshot = rawCriteriaSnapshot([{ id: 'criterion', title: 'Requirement', category: 'Essential Criteria', weight: 2,
    policy_approved_at: approvedAt, created_at: 'not part of criteria identity' }]);
  assert.deepEqual(Object.keys(snapshot[0]).sort(), ['id', 'title', 'description', 'category', 'must_have', 'params', 'validator', 'weight', 'order_index',
    'assessment_mode', 'assessment_weight', 'policy_approved_at', 'policy_approved_by'].sort());
  assert.equal(snapshot[0].assessment_mode, null);
  assert.equal(snapshot[0].weight, 2);
  assert.equal(snapshot[0].policy_approved_at, approvedAt);
});

test('batch continuations must match pending status, the exact application set size and recorded offset', () => {
  const batch = { status: 'pending', total_applications: 2, scored_count: 1, error_count: 0 };
  assert.equal(validateBatchContinuation(batch, ['application-1', 'application-2'], 1), null);
  assert.ok(validateBatchContinuation(batch, ['application-1', 'application-2'], 0));
  assert.ok(validateBatchContinuation(batch, ['application-1', 'application-1'], 1));
  assert.ok(validateBatchContinuation(batch, ['application-1'], 0));
  assert.ok(validateBatchContinuation({ ...batch, status: 'processing' }, ['application-1', 'application-2'], 1));
  assert.ok(validateBatchContinuation({ ...batch, status: 'completed' }, ['application-1', 'application-2'], 1));
});
