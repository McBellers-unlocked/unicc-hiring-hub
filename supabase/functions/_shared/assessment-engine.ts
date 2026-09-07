import {
  applyVerification, asRecord, assessEducationLevel, assessExperienceDuration, combineCriterion,
  normaliseJudgement, unavailableSub,
  usesVerifiedEducationAlternative,
} from './assessment-core.ts';
import type { CriterionDefinition, CriterionAssessment, DataRecord, EvidenceSource, ProposedJudgement } from './assessment-core.ts';

export interface AssessmentGateway {
  evaluate(criteria: CriterionDefinition[], sources: EvidenceSource[]): Promise<{ judgements: ProposedJudgement[]; model: string }>;
  verify(criteria: CriterionDefinition[], sources: EvidenceSource[], judgements: DataRecord[]): Promise<{ verifications: DataRecord[]; model: string }>;
}

function uniqueByCriterion<T extends { criterionId?: unknown }>(values: T[], criterionId: string): T | undefined {
  const matches = values.filter(value => value.criterionId === criterionId);
  return matches.length === 1 ? matches[0] : undefined;
}

/** Every authoritative criterion returns a result, even when an AI call fails. */
export async function assessCriteria(input: {
  criteria: CriterionDefinition[];
  sources: EvidenceSource[];
  workExperience: DataRecord[];
  education: DataRecord[];
  asOf: string;
  gateway: AssessmentGateway;
}): Promise<{ criteria: CriterionAssessment[]; models: string[]; processingErrors: string[] }> {
  const processingErrors: string[] = [];
  const models = new Set<string>();
  let judgements: ProposedJudgement[];
  if (!input.sources.some(source => source.text.trim())) {
    judgements = input.criteria.map(criterion => ({ criterionId: criterion.id, status: 'insufficient_evidence', evidence: [],
      missing: 'No candidate source material is available for this assessment.', confidence: 0 }));
  } else {
    try {
      const result = await input.gateway.evaluate(input.criteria, input.sources);
      judgements = result.judgements;
      models.add(result.model);
    } catch {
      processingErrors.push('The evidence assessment service was unavailable.');
      return { criteria: input.criteria.map(criterion => combineCriterion(criterion, [unavailableSub(criterion.text, processingErrors[0])])),
        models: [], processingErrors };
    }
  }
  const firstPass = input.criteria.map(definition => {
    const proposed = uniqueByCriterion(judgements, definition.id);
    if (!proposed) processingErrors.push(`The service did not return one complete judgement for criterion ${definition.id}.`);
    return { definition, proposed, sub: normaliseJudgement(definition, proposed, input.sources) };
  });
  const decisive = firstPass.filter(row => row.sub.status === 'supported' || row.sub.status === 'contradicted');
  let verifications: DataRecord[] = [];
  if (decisive.length) {
    try {
      const result = await input.gateway.verify(decisive.map(row => row.definition), input.sources, decisive.map(row => ({
        criterionId: row.definition.id, status: row.sub.status, evidence: row.sub.evidence,
        qualifyingEmployment: row.proposed?.qualifyingEmployment ?? [],
        satisfiedAlternative: row.proposed?.satisfiedAlternative ?? '',
      })));
      verifications = result.verifications;
      models.add(result.model);
    } catch {
      processingErrors.push('The required second evidence check was unavailable.');
    }
  }
  const criteria = firstPass.map(({ definition, proposed, sub }) => {
    const verification = uniqueByCriterion(verifications, definition.id);
    const verified = applyVerification(sub, verification);
    if (verified.flags.includes('VERIFICATION_UNAVAILABLE') && !processingErrors.includes('The required second evidence check was unavailable.')) {
      processingErrors.push(`The second evidence check was incomplete for criterion ${definition.id}.`);
    }
    const subs = [verified];
    // Explicitly contradicted evidence has already passed the second check. A lack
    // of other records must not manufacture either a contradiction or its reversal.
    if (verified.status === 'supported' && definition.type === 'education') {
      const level = assessEducationLevel(definition, input.education, input.sources);
      if (level) subs.push(level);
    }
    if (verified.status === 'supported' && definition.type === 'years_experience'
      && !usesVerifiedEducationAlternative(definition, proposed, verification, verified, input.sources)) {
      const durationProposal: ProposedJudgement = {
        ...proposed,
        qualifyingEmployment: asRecord(verification).qualifyingEmploymentVerified === true ? proposed?.qualifyingEmployment : [],
      };
      subs.push(assessExperienceDuration(definition, input.workExperience, input.sources, durationProposal, input.asOf));
    }
    return combineCriterion(definition, subs);
  });
  return { criteria, models: Array.from(models), processingErrors };
}
