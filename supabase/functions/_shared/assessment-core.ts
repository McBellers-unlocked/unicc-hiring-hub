/** Pure assessment policy and evidence checks. No network or database access. */
export type AssessmentStatus = 'supported' | 'contradicted' | 'insufficient_evidence' | 'assessment_unavailable';
export type CriterionCategory = 'essential' | 'desirable';
export type AssessmentMode = 'gate' | 'weighted';
export type CriterionType = 'years_experience' | 'education' | 'specific_experience' | 'knowledge' | 'skill' | 'ability' | 'attribute';
export type DataRecord = Record<string, unknown>;

export interface EvidenceSource {
  id: string;
  kind: 'work_experience' | 'education' | 'motivation_letter' | 'application';
  label: string;
  text: string;
  recordIndex?: number;
}

export interface EvidenceQuote {
  source: string;
  sourceId: string;
  quote: string;
  /** UTF-16 offsets into the immutable source text, end exclusive. */
  startOffset: number;
  endOffset: number;
}

export interface CriterionDefinition {
  id: string;
  requirementId: string;
  bulletIndex: number;
  text: string;
  type: CriterionType;
  category: CriterionCategory;
  assessmentMode: AssessmentMode;
  assessmentWeight: number;
  policyApprovedAt: string | null;
}

export interface SubRequirementAssessment {
  id: string;
  text: string;
  type: 'deterministic' | 'llm';
  status: AssessmentStatus;
  /** Compatibility only: false also means unresolved, never proof of failure. */
  demonstrated: boolean;
  evidence: EvidenceQuote[];
  missing: string | null;
  confidence: number;
  flags: string[];
  calculation?: string;
  verification?: { valid: boolean; issues: string[]; confidence_adjustment: number };
}

export interface CriterionAssessment {
  criterionId: string;
  requirementId: string;
  criterionText: string;
  type: CriterionType;
  category: CriterionCategory;
  assessmentMode: AssessmentMode;
  assessmentWeight: number;
  policyApprovedAt: string | null;
  status: AssessmentStatus;
  score: number;
  passed: boolean;
  confidence: number;
  evidence: EvidenceQuote[];
  missing: string | null;
  subrequirements: SubRequirementAssessment[];
  recombine_logic: string;
  flags: string[];
  calculation?: string;
}

export interface AssessmentScope {
  inputTruncated: boolean;
  processingErrors: string[];
  /** Errors affecting a gate/essential assessment; other processing errors remain visible. */
  blockingProcessingErrors?: string[];
  missingSources: string[];
  sourceCount: number;
  assessedSourceIds: string[];
  excludedSources: string[];
  policyApproved: boolean;
  criteriaComplete: boolean;
  limitations: string[];
  experienceCutoff?: string | null;
  experienceDateBasis?: string;
}

export interface ProposedJudgement {
  criterionId?: unknown;
  status?: unknown;
  evidence?: unknown;
  missing?: unknown;
  rationale?: unknown;
  confidence?: unknown;
  qualifyingEmployment?: unknown;
  satisfiedAlternative?: unknown;
}

export const UNRESOLVED_STATUSES: AssessmentStatus[] = ['insufficient_evidence', 'assessment_unavailable'];
const STATUSES: AssessmentStatus[] = ['supported', 'contradicted', ...UNRESOLVED_STATUSES];

export function asRecord(value: unknown): DataRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {};
}

export function firstArray(...values: unknown[]): DataRecord[] {
  // An explicitly empty submitted list is meaningful; do not revive an older alias.
  const selected = values.find(value => Array.isArray(value));
  return Array.isArray(selected) ? selected.map(asRecord) : [];
}

export function categoryForRequirement(row: DataRecord): CriterionCategory | null {
  const category = String(row.category ?? '').toLowerCase().replace(/[_-]+/g, ' ').trim().replace(/\s+/g, ' ');
  if (row.must_have === true || /^(essential|required|mandatory)( criteria| education| experience)?$/.test(category)) return 'essential';
  if (/^(desirable|preferred)( criteria| education| experience)?$/.test(category)) return 'desirable';
  return null;
}

function classifyCriterion(text: string): CriterionType {
  const duration = /\b(years?|months?)\b/i.test(text);
  const employmentContext = /\b(experience|working|employment|professional|managing|management|leading|leadership|developing|delivering|designing|supporting|coordinating|supervising|practising|practicing)\b|\byears?\s+(in|as|within)\b/i.test(text);
  if (duration && employmentContext) return 'years_experience';
  if (/\b(degree|education|university|bachelor|master|ph\.?d|doctorate|diploma)\b/i.test(text)) return 'education';
  if (/\bexperience\b/i.test(text)) return 'specific_experience';
  if (/knowledge|understanding/i.test(text)) return 'knowledge';
  if (/skill|proficiency|fluency/i.test(text)) return 'skill';
  if (/ability|able to/i.test(text)) return 'ability';
  return 'attribute';
}

/** Split independent bullets only; keep prose, titles and alternatives intact. */
export function requirementTexts(titleValue: unknown, descriptionValue: unknown): string[] {
  const title = typeof titleValue === 'string' ? titleValue.trim() : '';
  const description = typeof descriptionValue === 'string' ? descriptionValue.trim() : '';
  if (!description) return title ? [title] : [];
  const genericTitle = /^(?:(?:essential|desirable|required|preferred)\s+)?(?:criteria|requirements?|education|experience|qualifications?)[:.]?$/i.test(title);
  if (title && !genericTitle) return [description.includes(title) ? description : `${title}\n${description}`];
  const lines = description.split(/\r?\n/).filter(line => line.trim());
  const bullet = /^\s*(?:[-*•·–—]|\d+[.)])\s+/;
  const allBullets = lines.length > 0 && lines.every(line => bullet.test(line));
  // A row with alternatives or a shared condition remains one complete requirement.
  if (allBullets && !/\b(either|or|one of|any of|following|alternatively|in lieu|unless)\b/i.test(description)) {
    return lines.map(line => line.replace(bullet, '').trim());
  }
  return [description];
}

export function parseAssessmentCriteria(rows: unknown, fallbackEducation?: unknown): {
  criteria: CriterionDefinition[];
  issues: string[];
  snapshot: Array<DataRecord>;
} {
  const issues: string[] = [];
  const criteria: CriterionDefinition[] = [];
  const snapshot: DataRecord[] = [];
  const requirements = Array.isArray(rows) ? rows.map(asRecord) : [];
  const seenIds = new Set<string>();
  for (const [rowIndex, row] of requirements.entries()) {
    const requirementId = typeof row.id === 'string' && row.id ? row.id : `missing-id-${rowIndex}`;
    if (!row.id || seenIds.has(requirementId)) issues.push(`Requirement ${rowIndex + 1} has a missing or duplicate identifier.`);
    seenIds.add(requirementId);
    const recognisedCategory = categoryForRequirement(row);
    if (!recognisedCategory) issues.push(`Requirement ${requirementId} has an unrecognised category; recruiter review is required.`);
    const category = recognisedCategory ?? 'essential';
    const explicitMode = row.assessment_mode;
    if (explicitMode != null && explicitMode !== 'gate' && explicitMode !== 'weighted') issues.push(`Requirement ${requirementId} has an invalid assessment mode.`);
    const assessmentMode: AssessmentMode = explicitMode === 'gate' || explicitMode === 'weighted'
      ? explicitMode : category === 'essential' ? 'gate' : 'weighted';
    const configuredWeight = row.assessment_weight ?? row.weight ?? 1;
    const weight = typeof configuredWeight === 'number' ? configuredWeight : Number(configuredWeight);
    const assessmentWeight = Number.isFinite(weight) && weight > 0 ? weight : 1;
    if (!Number.isFinite(weight) || weight <= 0) issues.push(`Requirement ${requirementId} has an invalid assessment weight.`);
    const policyApprovedAt = typeof row.policy_approved_at === 'string' && Number.isFinite(Date.parse(row.policy_approved_at)) ? row.policy_approved_at : null;
    const texts = requirementTexts(row.title, row.description);
    if (!texts.length) issues.push(`Requirement ${requirementId} contains no assessable text.`);
    snapshot.push({
      requirementId, title: row.title ?? '', description: row.description ?? '',
      originalCategory: row.category ?? null, category, must_have: row.must_have === true,
      assessmentMode, assessmentWeight, policyApprovedAt, criterionCount: texts.length,
    });
    texts.forEach((text, bulletIndex) => criteria.push({
      id: texts.length > 1 ? `${requirementId}-${bulletIndex}` : requirementId,
      requirementId, bulletIndex, text, type: classifyCriterion(text), category,
      assessmentMode, assessmentWeight, policyApprovedAt,
    }));
  }
  if (typeof fallbackEducation === 'string' && fallbackEducation.trim() && !criteria.some(c => c.type === 'education' && c.category === 'essential')) {
    const text = `Required education: ${fallbackEducation.trim()}`;
    criteria.push({ id: 'job-education-level', requirementId: 'job-education-level', bulletIndex: 0, text,
      type: 'education', category: 'essential', assessmentMode: 'gate', assessmentWeight: 1, policyApprovedAt: null });
    snapshot.push({ requirementId: 'job-education-level', title: text, description: '', category: 'essential',
      assessmentMode: 'gate', assessmentWeight: 1, policyApprovedAt: null, criterionCount: 1 });
    issues.push('The job-level education requirement must be included in the approved structured criteria.');
  }
  if (!criteria.length) issues.push('No complete assessment criteria are available.');
  return { criteria, issues, snapshot };
}

export function recordText(record: DataRecord): string {
  return Object.entries(record)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`)
    .join('\n');
}

export function buildEvidenceSources(input: {
  workExperience: DataRecord[];
  education: DataRecord[];
  motivationLetter: string;
  applicationEvidence?: DataRecord;
}): EvidenceSource[] {
  const sources: EvidenceSource[] = [];
  for (const [recordIndex, record] of input.workExperience.entries()) sources.push({
    id: `work-experience-${recordIndex}`, kind: 'work_experience', label: `Work experience ${recordIndex + 1}`,
    text: recordText(record), recordIndex,
  });
  for (const [recordIndex, record] of input.education.entries()) sources.push({
    id: `education-${recordIndex}`, kind: 'education', label: `Education ${recordIndex + 1}`,
    text: recordText(record), recordIndex,
  });
  if (input.motivationLetter.trim()) sources.push({ id: 'motivation-letter', kind: 'motivation_letter', label: 'Motivation letter', text: input.motivationLetter });
  if (input.applicationEvidence && Object.keys(input.applicationEvidence).length) sources.push({
    id: 'application-answers', kind: 'application', label: 'Application answers, skills and languages', text: recordText(input.applicationEvidence),
  });
  return sources;
}

/** Only the selected application's submitted snapshot is assessment evidence. */
export function submittedApplicationInputs(application: DataRecord) {
  const phf = asRecord(application.phf_data);
  const answers = asRecord(application.answers);
  const workExperience = firstArray(phf._workExperiences, phf._workExperience, phf._employment, phf.employment, phf.work_experience);
  const education = firstArray(phf._education, phf.education);
  const motivationValues = [answers.motivation_letter, asRecord(phf.motivationLetter).motivation_letter_content, phf.motivation_letter];
  const motivationLetter = motivationValues.find(value => typeof value === 'string') as string | undefined ?? '';
  const applicationEvidence: DataRecord = {};
  if (Object.keys(answers).length) applicationEvidence.answers = answers;
  const skills = asRecord(phf.skills).additional_skills ?? phf.skills ?? asRecord(phf.otherInformation).additional_skills;
  if (phf.languages != null) applicationEvidence.languages = phf.languages;
  if (skills != null) applicationEvidence.skills = skills;
  if (phf.certifications != null) applicationEvidence.certifications = phf.certifications;
  const sources = buildEvidenceSources({ workExperience, education, motivationLetter, applicationEvidence });
  return { workExperience, education, sources };
}

export function rawCriteriaSnapshot(rows: unknown): DataRecord[] {
  const keys = ['id', 'title', 'description', 'category', 'must_have', 'params', 'validator', 'weight', 'order_index',
    'assessment_mode', 'assessment_weight', 'policy_approved_at', 'policy_approved_by'];
  return (Array.isArray(rows) ? rows : []).map(value => {
    const row = asRecord(value);
    return Object.fromEntries(keys.map(key => [key, row[key] ?? null]));
  });
}

export function recordedSubmissionCutoff(value: unknown, assessedAt: string): string | null {
  if (typeof value !== 'string') return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && timestamp <= Date.parse(assessedAt) ? new Date(timestamp).toISOString() : null;
}

/** A verified standalone education alternative can satisfy a years OR degree rule. */
export function usesVerifiedEducationAlternative(definition: CriterionDefinition, proposed: ProposedJudgement | undefined, verification: DataRecord | undefined, sub: SubRequirementAssessment, sources: EvidenceSource[]): boolean {
  if (!/\bor\b/i.test(definition.text) || /\band\b/i.test(definition.text) || verification?.alternativeRouteVerified !== true) return false;
  const route = typeof proposed?.satisfiedAlternative === 'string' ? proposed.satisfiedAlternative.trim() : '';
  if (!route || !definition.text.includes(route) || /\byears?\b|experience|employment/i.test(route) || !/degree|master|bachelor|university|ph\.?d/i.test(route)) return false;
  return sub.evidence.some(e => sources.some(source => source.id === e.sourceId && source.kind === 'education'));
}

/** An explanation or paraphrase is never promoted into a source quotation. */
export function validateEvidence(proposed: unknown, sources: EvidenceSource[]): { evidence: EvidenceQuote[]; issues: string[] } {
  if (!Array.isArray(proposed)) return { evidence: [], issues: proposed == null ? [] : ['Evidence is not an array.'] };
  const evidence: EvidenceQuote[] = [];
  const issues: string[] = [];
  for (const value of proposed) {
    const quote = asRecord(value);
    const source = sources.find(source => source.id === quote.sourceId);
    if (!source || typeof quote.quote !== 'string' || !quote.quote.length) {
      issues.push('A quotation has no recognised source or exact text.');
      continue;
    }
    let start = typeof quote.startOffset === 'number' ? quote.startOffset : -1;
    const suppliedEnd = typeof quote.endOffset === 'number' ? quote.endOffset : -1;
    if (!Number.isInteger(start) || start < 0 || suppliedEnd !== start + quote.quote.length || source.text.slice(start, suppliedEnd) !== quote.quote) {
      start = source.text.indexOf(quote.quote);
      if (start < 0 || source.text.indexOf(quote.quote, start + 1) !== -1) {
        issues.push('A quotation is not an exact, unambiguous span in its claimed source.');
        continue;
      }
    }
    const item: EvidenceQuote = { source: source.kind, sourceId: source.id, quote: quote.quote, startOffset: start, endOffset: start + quote.quote.length };
    if (!evidence.some(e => e.sourceId === item.sourceId && e.startOffset === item.startOffset && e.endOffset === item.endOffset)) evidence.push(item);
  }
  return { evidence, issues };
}

export function wholeSourceEvidence(source: EvidenceSource): EvidenceQuote {
  return { source: source.kind, sourceId: source.id, quote: source.text, startOffset: 0, endOffset: source.text.length };
}

export function unavailableSub(text: string, reason: string, id = 'S1'): SubRequirementAssessment {
  return { id, text, type: 'llm', status: 'assessment_unavailable', demonstrated: false,
    evidence: [], missing: reason, confidence: 0, flags: ['ASSESSMENT_UNAVAILABLE'] };
}

export function normaliseJudgement(definition: CriterionDefinition, proposed: ProposedJudgement | undefined, sources: EvidenceSource[]): SubRequirementAssessment {
  if (!proposed || !STATUSES.includes(proposed.status as AssessmentStatus)) return unavailableSub(definition.text, 'No valid assessment was returned for this criterion.');
  const checked = validateEvidence(proposed.evidence, sources);
  let status = proposed.status as AssessmentStatus;
  const flags: string[] = [];
  let missing = typeof proposed.missing === 'string' && proposed.missing.trim() ? proposed.missing : null;
  if (checked.issues.length || ((status === 'supported' || status === 'contradicted') && !checked.evidence.length)) {
    status = 'insufficient_evidence';
    missing = 'The proposed judgement could not be linked to exact source evidence.';
    flags.push('EVIDENCE_NOT_VERIFIED');
  }
  if (status === 'insufficient_evidence' && !missing) missing = 'The supplied material does not establish this criterion; this is not a finding that the candidate lacks it.';
  if (status === 'assessment_unavailable' && !missing) missing = 'This criterion could not be assessed.';
  const confidence = typeof proposed.confidence === 'number' && Number.isFinite(proposed.confidence) ? Math.max(0, Math.min(1, proposed.confidence)) : 0;
  return { id: 'S1', text: definition.text, type: 'llm', status, demonstrated: status === 'supported',
    evidence: checked.evidence, missing, confidence, flags };
}

export function applyVerification(sub: SubRequirementAssessment, verification: unknown): SubRequirementAssessment {
  if (sub.status !== 'supported' && sub.status !== 'contradicted') return sub;
  const result = asRecord(verification);
  const reason = typeof result.reason === 'string' ? result.reason : 'The second evidence check did not establish this judgement.';
  if (result.verdict === 'confirmed') return { ...sub, verification: { valid: true, issues: [], confidence_adjustment: 0 } };
  const unavailable = !['invalid', 'uncertain'].includes(String(result.verdict));
  return { ...sub, status: unavailable ? 'assessment_unavailable' : 'insufficient_evidence', demonstrated: false,
    missing: unavailable ? 'The required second evidence check was unavailable.' : reason,
    flags: [...sub.flags, unavailable ? 'VERIFICATION_UNAVAILABLE' : 'VERIFICATION_UNRESOLVED'],
    verification: { valid: false, issues: [reason], confidence_adjustment: 0 } };
}

/** Unknown labels stay unknown. They never become a lower degree. */
export function normaliseDegreeLevel(value: unknown): number | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const text = value.toLowerCase().replace(/[.'’\s()_-]/g, '');
  if (/^(phd|dphil|edd|doctorate|doctorofphilosophy|doctorofeducation|postdoctoral|md|jd)$/.test(text)) return 4;
  if (/^(msc|ma|meng|mba|emba|llm|advanceduniversity|advanceduniversitydegree|master|masters|mastersdegree|masterof(science|arts|engineering|businessadministration))$/.test(text)) return 4;
  if (/^(bsc|ba|beng|bba|bcom|llb|firstleveluniversity|firstleveluniversitydegree|bachelor|bachelors|bachelorsdegree(honors|honours)?|bachelorof(science|arts|engineering|businessadministration|commerce))$/.test(text)) return 3;
  if (/^(associate(degree)?|professional(certificate|license)?|technicaldiploma|diploma|certificate)$/.test(text)) return 2;
  if (/^(secondary|secondaryeducationcertificate|highschooldiploma|alevels|internationalbaccalaureate)$/.test(text)) return 1;
  return null;
}

export function requiredEducationLevel(text: string): number | null {
  // Alternative routes must be assessed as written, not reduced to a higher degree gate.
  if (/\b(or|equivalent|in lieu|alternatively)\b/i.test(text)) return null;
  if (/master|advanced university|ph\.?d|doctorate/i.test(text)) return 4;
  if (/bachelor|first level university|university degree/i.test(text)) return 3;
  if (/secondary|high school/i.test(text)) return 1;
  return null;
}

export function assessEducationLevel(definition: CriterionDefinition, education: DataRecord[], sources: EvidenceSource[]): SubRequirementAssessment | null {
  const required = requiredEducationLevel(definition.text);
  if (required === null) return null;
  const qualifying: EvidenceSource[] = [];
  const unknown: string[] = [];
  education.forEach((record, recordIndex) => {
    const value = record.degree_type ?? record.degree ?? record.degree_or_certificate_title;
    const level = normaliseDegreeLevel(value);
    const completed = record.is_completed ?? record.isCompleted ?? record.completed;
    if (level === null) unknown.push(`Education ${recordIndex + 1}: degree label needs review.`);
    else if (level >= required && completed !== true) unknown.push(`Education ${recordIndex + 1}: completion is not confirmed.`);
    if (level !== null && level >= required && completed === true) {
      const source = sources.find(s => s.kind === 'education' && s.recordIndex === recordIndex);
      if (source?.text) qualifying.push(source);
    }
  });
  const supported = qualifying.length > 0;
  return { id: 'education-level', text: 'Required degree level and completion', type: 'deterministic',
    status: supported ? 'supported' : 'insufficient_evidence', demonstrated: supported,
    evidence: qualifying.map(wholeSourceEvidence), confidence: supported ? 1 : 0,
    missing: supported ? null : unknown.join(' ') || 'The supplied education records do not establish the required completed degree. This is not proof that no qualifying degree exists.',
    flags: supported ? [] : ['EDUCATION_REVIEW_REQUIRED'],
    calculation: supported ? 'A recognised completed degree in the supplied education record meets the required level. Field relevance is assessed separately against the full criterion.' : undefined };
}

export function minimumExperienceYears(text: string): number | null {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
    thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
    twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
  if (/\b(months?|hundred|thousand)\b/i.test(text)) return null;
  let normalised = text.toLowerCase().replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[-\s]+(one|two|three|four|five|six|seven|eight|nine))?\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen)\b/g,
    (_match, tens: string, units: string, single: string) => String(tens ? words[tens] + (words[units] ?? 0) : words[single]));
  const parenthesised = Array.from(normalised.matchAll(/\b(\d+)\s*\((\d+)\)/g));
  if (parenthesised.some(match => match[1] !== match[2])) return null;
  normalised = normalised.replace(/\b(\d+)\s*\(\1\)/g, '$1').replace(/\bno less than\b/g, 'at least');
  const matches = Array.from(normalised.matchAll(/\b(\d+(?:\.\d+)?)\s*(?:(?:[-–]|to)\s*(\d+(?:\.\d+)?))?\s*\+?\s*years?\b/g));
  if (matches.length !== 1 || /\b(up to|at most|less than)\b/.test(normalised)) return null;
  return Number(matches[0][1]);
}

export function isGenericExperienceRequirement(text: string): boolean {
  const stripped = text.toLowerCase().replace(/\b(at least|a minimum of|minimum of|minimum|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|years?|of|experience|work|working|employment|professional|required)\b/g, '').replace(/[\d\s+().,:;–-]/g, '');
  return stripped.length === 0;
}

interface EmploymentInterval { start: number; end: number; recordIndex: number; conservative: boolean }
const DAY = 86400000;

function dateBound(value: unknown, end: boolean): { time: number; conservative: boolean } | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const input = value.trim();
  if (/^\d{4}$/.test(input)) return { time: Date.UTC(Number(input), end ? 0 : 11, end ? 1 : 31), conservative: true };
  if (/^\d{4}-\d{2}$/.test(input)) {
    const [year, month] = input.split('-').map(Number);
    if (month < 1 || month > 12) return null;
    return { time: end ? Date.UTC(year, month - 1, 1) : Date.UTC(year, month, 0), conservative: true };
  }
  if (!/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(input)) return null;
  const [year, month, day] = input.slice(0, 10).split('-').map(Number);
  const calendarDate = new Date(Date.UTC(year, month - 1, day));
  if (calendarDate.getUTCFullYear() !== year || calendarDate.getUTCMonth() !== month - 1 || calendarDate.getUTCDate() !== day) return null;
  const time = Date.parse(input);
  return Number.isFinite(time) ? { time, conservative: false } : null;
}

export function employmentInterval(record: DataRecord, recordIndex: number, asOf: string): EmploymentInterval | null {
  const current = record.is_present === true || record.isCurrent === true || record.is_current === true;
  let start: ReturnType<typeof dateBound> = null;
  let end: ReturnType<typeof dateBound> = null;
  const startYear = record.period_from_year ?? record.from_year;
  const endYear = record.period_to_year ?? record.to_year;
  if (startYear != null) {
    const month = record.period_from_month ?? record.from_month;
    start = dateBound(`${startYear}${month != null && month !== '' ? `-${String(month).padStart(2, '0')}` : ''}`, false);
    if (endYear != null) {
      const month = record.period_to_month ?? record.to_month;
      end = dateBound(`${endYear}${month != null && month !== '' ? `-${String(month).padStart(2, '0')}` : ''}`, true);
    }
  } else {
    start = dateBound(record.start_date ?? record.startDate, false);
    end = dateBound(record.end_date ?? record.endDate, true);
  }
  if (current) end = dateBound(asOf, true);
  const cutoff = Date.parse(asOf);
  // A missing end date never silently means present employment.
  if (!start || !end || !Number.isFinite(cutoff) || start.time > cutoff || end.time < start.time) return null;
  return { start: start.time, end: Math.min(end.time, cutoff), recordIndex, conservative: start.conservative || end.conservative };
}

export function unionExperienceYears(intervals: Array<{ start: number; end: number }>): number {
  const sorted = intervals.map(interval => ({ ...interval })).sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const interval of sorted) {
    const last = merged[merged.length - 1];
    if (last && interval.start <= last.end + DAY) last.end = Math.max(last.end, interval.end);
    else merged.push(interval);
  }
  // Calendar anniversaries make an exact five-year interval equal five years,
  // including leap years. Fractions use the actual next anniversary interval.
  return merged.reduce((sum, interval) => {
    const start = new Date(interval.start);
    let years = new Date(interval.end).getUTCFullYear() - start.getUTCFullYear();
    const anniversary = (offset: number) => Date.UTC(start.getUTCFullYear() + offset, start.getUTCMonth(), start.getUTCDate(), start.getUTCHours(), start.getUTCMinutes(), start.getUTCSeconds(), start.getUTCMilliseconds());
    if (anniversary(years) > interval.end) years--;
    const lower = anniversary(years);
    const upper = anniversary(years + 1);
    return sum + years + (interval.end - lower) / (upper - lower);
  }, 0);
}

export function assessExperienceDuration(definition: CriterionDefinition, workExperience: DataRecord[], sources: EvidenceSource[], proposed: ProposedJudgement, asOf: string): SubRequirementAssessment {
  const minimum = minimumExperienceYears(definition.text);
  const generic = isGenericExperienceRequirement(definition.text);
  const eligibleSourceIds = new Set<string>();
  if (generic) sources.filter(s => s.kind === 'work_experience').forEach(s => eligibleSourceIds.add(s.id));
  else if (Array.isArray(proposed.qualifyingEmployment)) {
    for (const item of proposed.qualifyingEmployment) {
      const record = asRecord(item);
      const evidence = validateEvidence(record.evidence, sources);
      if (record.wholeIntervalSupported === true && typeof record.sourceId === 'string' && !evidence.issues.length && evidence.evidence.some(e => e.sourceId === record.sourceId)) eligibleSourceIds.add(record.sourceId);
    }
  }
  const intervals: EmploymentInterval[] = [];
  const intervalSources: EvidenceSource[] = [];
  for (const source of sources.filter(s => s.kind === 'work_experience' && eligibleSourceIds.has(s.id))) {
    if (source.recordIndex === undefined) continue;
    const interval = employmentInterval(workExperience[source.recordIndex] ?? {}, source.recordIndex, asOf);
    if (interval) { intervals.push(interval); intervalSources.push(source); }
  }
  const years = unionExperienceYears(intervals);
  const supported = minimum !== null && years >= minimum;
  const cutoffLabel = Number.isFinite(Date.parse(asOf)) ? asOf.slice(0, 10) : 'an unavailable recorded submission date';
  const calculation = `${years.toFixed(2)} years from the union of ${intervals.length} evidenced qualifying employment interval(s), assessed as of ${cutoffLabel}.${minimum === null ? ' The required minimum needs clarification.' : ` Required minimum: ${minimum} years.`}${intervals.some(i => i.conservative) ? ' Incomplete date precision uses the shortest guaranteed interval.' : ''}`;
  return { id: 'qualifying-duration', text: 'Duration of evidenced qualifying employment', type: 'deterministic',
    status: supported ? 'supported' : 'insufficient_evidence', demonstrated: supported, confidence: supported ? 1 : 0,
    evidence: intervalSources.map(wholeSourceEvidence), calculation,
    missing: supported ? null : minimum === null ? 'The experience threshold or its alternative routes need reviewer interpretation.' : 'The supplied evidence and dates do not establish the required duration in this field. Unrelated years and isolated duties are not counted as qualifying experience.',
    flags: supported ? [] : ['QUALIFYING_DURATION_UNRESOLVED'] };
}

export function combineCriterion(definition: CriterionDefinition, subs: SubRequirementAssessment[]): CriterionAssessment {
  let status: AssessmentStatus = 'supported';
  if (!subs.length || subs.some(s => s.status === 'assessment_unavailable')) status = 'assessment_unavailable';
  else if (subs.some(s => s.status === 'insufficient_evidence')) status = 'insufficient_evidence';
  else if (subs.some(s => s.status === 'contradicted')) status = 'contradicted';
  const passed = status === 'supported';
  return { criterionId: definition.id, requirementId: definition.requirementId, criterionText: definition.text,
    type: definition.type, category: definition.category, assessmentMode: definition.assessmentMode,
    assessmentWeight: definition.assessmentWeight, policyApprovedAt: definition.policyApprovedAt,
    status, passed, score: passed ? 100 : 0,
    confidence: subs.length ? Math.min(...subs.map(s => s.confidence)) : 0,
    evidence: subs.flatMap(s => s.evidence), missing: subs.map(s => s.missing).filter(Boolean).join(' ') || null,
    subrequirements: subs, recombine_logic: subs.map(s => s.id).join(' AND ') || 'S1',
    flags: Array.from(new Set(subs.flatMap(s => s.flags))), calculation: subs.map(s => s.calculation).filter(Boolean).join('\n') || undefined };
}

export function summariseAssessment(allCriteria: CriterionAssessment[], scope: AssessmentScope) {
  const essential = allCriteria.filter(c => c.category === 'essential');
  const desirable = allCriteria.filter(c => c.category === 'desirable');
  const unresolved = allCriteria.filter(c => UNRESOLVED_STATUSES.includes(c.status));
  const unresolvedRequired = unresolved.filter(c => c.category === 'essential' || c.assessmentMode === 'gate');
  const contradictions = allCriteria.filter(c => c.status === 'contradicted');
  const contradictedGates = allCriteria.filter(c => c.assessmentMode === 'gate' && c.status === 'contradicted');
  const supportedCount = allCriteria.filter(c => c.status === 'supported').length;
  const essentialMet = essential.filter(c => c.status === 'supported').length;
  const allPoliciesApproved = allCriteria.length > 0 && allCriteria.every(c => Boolean(c.policyApprovedAt));
  const complete = scope.criteriaComplete && !scope.inputTruncated && (scope.blockingProcessingErrors ?? scope.processingErrors).length === 0;
  let recommendation: 'recommend' | 'review' | 'reject' = 'review';
  let recommendation_reason: string;
  if (!allCriteria.length || !essential.length) recommendation_reason = 'Recruiter review is required: no complete essential assessment set is available.';
  else if (!complete) recommendation_reason = 'Recruiter review is required because the assessment or criterion set is incomplete. No inclusion or exclusion is inferred.';
  else if (!allPoliciesApproved || !scope.policyApproved) recommendation_reason = 'Recruiter approval of the criterion and gate policy is required before a recommendation can be used.';
  else if (unresolvedRequired.length) recommendation_reason = `${unresolvedRequired.length} essential or gate criterion/criteria need evidence or assessment review. Missing evidence is not proof that a requirement is unmet.`;
  else if (contradictedGates.length) {
    recommendation = 'reject';
    recommendation_reason = `Verified evidence contradicts ${contradictedGates.length} approved gate(s): ${contradictedGates.map(c => c.criterionText).join('; ')}. The recruiter owns the inclusion or exclusion decision.`;
  } else if (essentialMet !== essential.length) recommendation_reason = 'Some essential criteria are not supported. The recruiter must resolve them before longlisting.';
  else {
    recommendation = 'recommend';
    recommendation_reason = `The supplied evidence supports all ${essential.length} approved essential criteria.${unresolved.length ? ` ${unresolved.length} non-gating desirable criterion/criteria have unresolved evidence and do not count against eligibility.` : ''} The recruiter still owns the longlist decision.`;
  }
  const totalWeight = allCriteria.reduce((sum, criterion) => sum + criterion.assessmentWeight, 0);
  const supportedWeight = allCriteria.filter(c => c.status === 'supported').reduce((sum, criterion) => sum + criterion.assessmentWeight, 0);
  const overallScore = totalWeight ? Math.round(100 * supportedWeight / totalWeight) : 0;
  const educationScores = allCriteria.filter(c => c.type === 'education');
  return {
    // Legacy projections remain readable. New consumers should use allCriteria/status.
    criteria: allCriteria.filter(c => c.type !== 'education'), educationScore: educationScores[0] ?? null,
    educationScores, allCriteria, overallScore, scoreMeaning: 'Weighted share of criteria supported by supplied evidence; not a hiring probability or recommendation.',
    passedCount: supportedCount, supportedCount, totalCount: allCriteria.length,
    essentialMet, essentialTotal: essential.length, desirableMet: desirable.filter(c => c.status === 'supported').length,
    desirableTotal: desirable.length, unresolvedCount: unresolved.length, unresolvedRequiredCount: unresolvedRequired.length, contradictedCount: contradictions.length,
    coverageRatio: essential.length ? essentialMet / essential.length : 0, matchStrengthOnMet: null,
    recommendation, recommendation_reason, recommendForLonglist: recommendation === 'recommend',
    analysisVersion: '5.0-evidence-workspace', scope: { ...scope, policyApproved: allPoliciesApproved && scope.policyApproved },
  };
}
