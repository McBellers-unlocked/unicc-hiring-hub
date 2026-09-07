/** Pure passage preparation and exact reference resolution. No network or database access. */
import type { DataRecord, EvidenceSource, EvidenceQuote, ProposedJudgement } from './assessment-core.ts';

export const PASSAGE_FORMAT_VERSION = '1.contiguous-source-passages';
export const MAX_PASSAGE_CHARACTERS = 1_000;
interface Passage { passageId: string; startOffset: number; endOffset: number; text: string }
export interface PassageSource { id: string; kind: EvidenceSource['kind']; label: string; passages: { passageId: string; text: string }[] }
export interface PassageIssue { criterionId: string | null; code: 'INVALID_PASSAGE_REFERENCE'; path: string }
const record = (value: unknown): DataRecord => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as DataRecord : {};

function safeBoundary(text: string, end: number): number {
  const before = text.charCodeAt(end - 1), after = text.charCodeAt(end);
  if ((before >= 0xD800 && before <= 0xDBFF && after >= 0xDC00 && after <= 0xDFFF)
    || (text[end - 1] === '\r' && text[end] === '\n')) return end - 1;
  return end;
}

/** Every character appears exactly once; offsets retain JavaScript/DB viewer UTF-16 indexing. */
export function partitionSourceText(text: string, limit = MAX_PASSAGE_CHARACTERS): Passage[] {
  if (typeof text !== 'string' || !Number.isInteger(limit) || limit < 64 || limit > 4_000) throw new Error('Invalid passage input or limit.');
  const passages: Passage[] = [];
  let start = 0;
  while (start < text.length) {
    const hardEnd = safeBoundary(text, Math.min(start + limit, text.length));
    let end = hardEnd;
    if (end < text.length) {
      const window = text.slice(start, hardEnd), minimum = Math.floor(limit / 3);
      const newline = window.lastIndexOf('\n') + 1;
      if (newline >= minimum) end = start + newline;
      else {
        const sentences = [...window.matchAll(/[.!?][\t ]+(?=\S)/g)];
        const sentence = sentences.at(-1);
        const boundary = sentence ? sentence.index + sentence[0].length : 0;
        if (boundary >= minimum) end = start + boundary;
        else {
          const spaces = [...window.matchAll(/\s+(?=\S)/g)], space = spaces.at(-1);
          const wordBoundary = space ? space.index + space[0].length : 0;
          if (wordBoundary >= minimum) end = start + wordBoundary;
        }
      }
    }
    end = safeBoundary(text, end);
    if (end <= start) throw new Error('A source could not be partitioned without losing text.');
    passages.push({ passageId: `p-${start.toString(36)}-${end.toString(36)}`, startOffset: start, endOffset: end, text: text.slice(start, end) });
    start = end;
  }
  return passages;
}

/** Keep the authoritative offsets in this closure; the evaluator receives only IDs and passage text. */
export function createPassageCatalog(sources: EvidenceSource[], limit = MAX_PASSAGE_CHARACTERS) {
  const index = new Map<string, { source: EvidenceSource; passages: Map<string, Passage> }>();
  const evaluatorSources: PassageSource[] = [];
  for (const input of sources) {
    if (!input || typeof input.id !== 'string' || !input.id || typeof input.text !== 'string' || index.has(input.id)) {
      throw new Error('Source identifiers must be unique and source text must be available.');
    }
    const source = { ...input }, passages = partitionSourceText(source.text, limit);
    index.set(source.id, { source, passages: new Map(passages.map(passage => [passage.passageId, passage])) });
    evaluatorSources.push({ id: source.id, kind: source.kind, label: source.label,
      passages: passages.map(({ passageId, text }) => ({ passageId, text })) });
  }

  function resolveJudgements(values: unknown[]): { judgements: ProposedJudgement[]; issues: PassageIssue[] } {
    const issues: PassageIssue[] = [];
    const judgements = values.map(value => {
      const proposed = record(value), criterionId = typeof proposed.criterionId === 'string' ? proposed.criterionId : null;
      let invalid = false;
      const fail = (path: string) => { invalid = true; issues.push({ criterionId, code: 'INVALID_PASSAGE_REFERENCE', path }); };
      const resolveEvidence = (value: unknown, path: string, employmentSourceId?: string): EvidenceQuote[] => {
        if (!Array.isArray(value)) { fail(path); return []; }
        const resolved: EvidenceQuote[] = [];
        value.forEach((entry, i) => {
          const reference = record(entry), known = typeof reference.sourceId === 'string' ? index.get(reference.sourceId) : undefined;
          const passage = typeof reference.passageId === 'string' ? known?.passages.get(reference.passageId) : undefined;
          if (Object.keys(reference).length !== 2 || !Object.hasOwn(reference, 'sourceId') || !Object.hasOwn(reference, 'passageId')
            || !known || !passage || (employmentSourceId !== undefined && reference.sourceId !== employmentSourceId)) {
            fail(`${path}[${i}]`); return;
          }
          const quote: EvidenceQuote = { source: known.source.kind, sourceId: known.source.id, quote: passage.text,
            startOffset: passage.startOffset, endOffset: passage.endOffset };
          if (!resolved.some(item => item.sourceId === quote.sourceId && item.startOffset === quote.startOffset && item.endOffset === quote.endOffset)) resolved.push(quote);
        });
        return resolved;
      };
      const evidence = resolveEvidence(proposed.evidence, 'evidence');
      const qualifyingEmployment: DataRecord[] = [];
      if (!Array.isArray(proposed.qualifyingEmployment)) fail('qualifyingEmployment');
      else proposed.qualifyingEmployment.forEach((value, i) => {
        const item = record(value), known = typeof item.sourceId === 'string' ? index.get(item.sourceId) : undefined;
        if (!known || known.source.kind !== 'work_experience' || typeof item.wholeIntervalSupported !== 'boolean') {
          fail(`qualifyingEmployment[${i}]`); return;
        }
        qualifyingEmployment.push({ sourceId: known.source.id, wholeIntervalSupported: item.wholeIntervalSupported,
          evidence: resolveEvidence(item.evidence, `qualifyingEmployment[${i}].evidence`, known.source.id) });
      });
      return {
        criterionId: proposed.criterionId, status: invalid ? 'assessment_unavailable' : proposed.status,
        evidence: invalid ? [] : evidence, qualifyingEmployment: invalid ? [] : qualifyingEmployment,
        missing: invalid ? 'The assessment returned an invalid source passage reference; this criterion requires reassessment or human review.' : proposed.missing,
        rationale: proposed.rationale, confidence: invalid ? 0 : proposed.confidence,
        satisfiedAlternative: invalid ? '' : proposed.satisfiedAlternative,
      };
    });
    return { judgements, issues };
  }
  return { evaluatorSources, resolveJudgements, passageCount: evaluatorSources.reduce((sum, source) => sum + source.passages.length, 0) };
}

/** Replaces the evaluator's free-text quote schema at BOTH evidence positions. */
export const passageEvidenceSchema = {
  type: 'array', items: { type: 'object', properties: {
    sourceId: { type: 'string' }, passageId: { type: 'string' },
  }, required: ['sourceId', 'passageId'], additionalProperties: false },
};
