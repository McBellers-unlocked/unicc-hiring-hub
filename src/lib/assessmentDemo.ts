// Synthetic examples only. This module contains no candidate or production data.
const source = (id: string, kind: string, label: string, text: string) => ({ id, kind, label, text });
function quote(record: ReturnType<typeof source>, text: string) {
  const startOffset = record.text.indexOf(text);
  if (startOffset < 0) throw new Error('Demo evidence must exist in its source');
  return { source: record.kind, sourceId: record.id, quote: text, startOffset, endOffset: startOffset + text.length };
}
export function assessmentDemo(scenario: 'clear' | 'missing' | 'gap') {
  const experience = source('work-0', 'work_experience', 'Employment record 1', 'Role: HR Programme Manager\nEmployer: Example Organisation\nStart date: 2019-01-01\nEnd date: 2026-01-01\nDuties: I managed HR programmes throughout this seven-year appointment, including recruitment operations and workforce planning.');
  const education = source('education-0', 'education', 'Education declaration', scenario === 'missing'
    ? 'University: Example University\nCourse: Management\nQualification and completion date: not provided'
    : scenario === 'gap' ? 'Highest qualification: secondary school. I do not hold a completed university degree.'
    : 'University: Example University\nDegree: Bachelor of Science in Management\nCompletion: completed\nAward date: 2018-06-30');
  const motivation = source('motivation', 'motivation_letter', 'Motivation letter', 'I would like to apply my experience in HR operations to this role. I have not included information about UN-system experience in this application.');
  const status = scenario === 'clear' ? 'supported' : scenario === 'gap' ? 'contradicted' : 'insufficient_evidence';
  const criteria = [
    { criterionId: 'experience', criterionText: 'At least five years managing HR programmes', category: 'essential', type: 'years_experience', assessmentMode: 'gate', assessmentWeight: 1, status: 'supported', passed: true, policyApprovedAt: '2026-09-07T09:00:00Z', subrequirements: [{ id: 'S1', text: 'Five years of relevant experience', status: 'supported', calculation: 'Seven non-overlapping years, from 1 January 2019 to 1 January 2026. The duties statement covers that appointment.', evidence: [quote(experience, 'Start date: 2019-01-01\nEnd date: 2026-01-01'), quote(experience, 'I managed HR programmes throughout this seven-year appointment, including recruitment operations and workforce planning.')] }] },
    { criterionId: 'education', criterionText: 'A completed university degree', category: 'essential', type: 'education', assessmentMode: 'gate', assessmentWeight: 1, status, passed: status === 'supported', policyApprovedAt: '2026-09-07T09:00:00Z', subrequirements: [{ id: 'S1', text: 'Completed degree', status, missing: scenario === 'missing' ? 'The qualification and completion status were not supplied. Ask for clarification; do not infer a lack of qualification.' : null, evidence: scenario === 'missing' ? [quote(education, 'Qualification and completion date: not provided')] : [quote(education, scenario === 'gap' ? 'I do not hold a completed university degree.' : 'Degree: Bachelor of Science in Management\nCompletion: completed')] }] },
    { criterionId: 'un-experience', criterionText: 'Experience working in the UN system', category: 'desirable', type: 'specific_experience', assessmentMode: 'weighted', assessmentWeight: 1, status: 'insufficient_evidence', passed: false, policyApprovedAt: '2026-09-07T09:00:00Z', subrequirements: [{ id: 'S1', text: 'UN-system experience', status: 'insufficient_evidence', missing: 'Not demonstrated in the supplied records. This desirable criterion is not an eligibility gate.', evidence: [] }] },
  ];
  return {
    assessmentId: `demo-${scenario}`, pipeline_version: '5.0', prompt_version: 'synthetic-demo', model_version: 'Illustrative fixture — no model call',
    recommendation: scenario === 'clear' ? 'recommend' : scenario === 'gap' ? 'reject' : 'review',
    recommendation_reason: scenario === 'clear' ? 'Both essential gates have supporting application evidence. A recruiter must confirm the decision.' : scenario === 'gap' ? 'The application explicitly states that the degree gate is not met. A recruiter must confirm the evidence and record any exclusion.' : 'Degree completion is unclear. Request evidence or record a reasoned human finding before deciding.',
    allCriteria: criteria, criteriaSnapshot: criteria.map(({ subrequirements, ...criterion }) => criterion),
    sources: [experience, education, motivation], scope: { sourceCount: 3, assessedSourceIds: ['work-0', 'education-0', 'motivation'], inputTruncated: false, policyApproved: true, processingErrors: [], missingSources: [], limitations: ['Synthetic demonstration. No references, awarding institutions or employment claims have been independently checked.'] },
  };
}
