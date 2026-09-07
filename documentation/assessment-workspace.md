# Evidence-based assessment workspace

The recruitment workspace keeps AI findings, reviewer findings and recruiter decisions separate. An assessment never changes an application stage or selects a candidate. The `/assessment-demo` route contains synthetic examples only and does not save decisions or send messages.

## Assessment policy

Each job requirement has an essential/desirable classification, an explicit gate or weighted-evidence treatment, a weight and a recorded policy approval. Approve the complete criterion set with a rationale before using AI recommendations. Editing the assessed policy invalidates approval; a new assessment is needed to apply changes. Empty or incomplete criterion sets cannot produce a positive recommendation.

Findings have four states:

| Finding | Meaning |
| --- | --- |
| Supported | Supplied evidence supports the complete requirement or an allowed alternative. |
| Contradicted | Explicit contrary evidence has passed the required second check. Silence is not contradiction. |
| Insufficient evidence | Information is missing, ambiguous, conflicting or insufficient to establish a requirement. |
| Assessment unavailable | An input or processing problem prevented evaluation. |

Desirable evidence is kept distinct from eligibility gates. Missing non-gating desirable evidence is informational: it does not prevent a positive recommendation when essentials and explicit gates are supported. An unresolved essential or explicit gate requires review; only a verified contradiction of an explicit gate can produce the "gate not met" recommendation. Evidence coverage and diagnostic model confidence are not hiring probabilities. The same recommendation vocabulary is used in candidate summaries, filters and detailed assessments; legacy percentages do not infer eligibility.

## Evidence and reviewer decisions

The evaluator and verifier receive the full criterion and the saved source records. Every decisive AI finding must contain an exact quote that can be matched to its source. Source references carry a record ID and UTF-16 start/end offsets; the viewer validates the reference again before highlighting it. Deterministic duration calculations list their contributing employment records. Relevant experience counts only evidenced qualifying intervals, with overlapping dates merged. Ongoing employment is capped at the recorded submission timestamp. The scope explicitly warns that legacy timestamps may predate actual submission; a missing or invalid timestamp leaves duration unresolved.

The source viewer displays preserved application text, not a live profile or an independently verified credential. Raw CV/PDF attachments are not parsed by this pipeline; the scope panel states exclusions and incomplete coverage. Missing inputs, unavailable services, unknown qualifications and ambiguous duration must remain visible as review work.

Each assessment has an immutable run ID, source snapshot, criterion snapshot, pipeline/prompt/model provenance and an assessment timestamp. Version 5 performs fresh evaluations instead of reusing the earlier verdict/decomposition caches. `screening_scores` remains a compatibility projection; immutable runs are the assessment history. Saving both records is atomic. Changed application inputs or criterion policy require a fresh assessment before a decision can rely on that AI result.

Reviewer findings and disagreements add history entries rather than replacing the AI output. Reviewers can select an overlooked passage directly in the saved source; supported or contradicted human findings require a matching source reference. Inclusion, exclusion and clarification decisions require a rationale. The decision service validates the actor, application, assessment version and unresolved disagreements, and writes the human decision together with the stage event. A manual decision can preserve its own snapshot when an AI run is unavailable. Rerunning AI does not clear human history or resolve disagreements.

Use **Prepare manual review snapshot** to inspect frozen submitted evidence before a human finding or decision when there is no AI run. If the application or criteria change, explicitly prepare and inspect the current manual snapshot; a decision cannot silently substitute new evidence for a previously selected snapshot.

## Assessment execution

The evaluator and verifier use the configured `openai/gpt-5` model with the complete criteria and saved source records. Each gateway request can take up to 50 seconds, within a shared 80-second AI budget for the assessment. Later attempts are capped by the remaining budget, with a 500-millisecond completion margin; no new attempt starts with less than one second remaining. The immutable result records both limits in `execution_config`, and the input hash includes this configuration.

Batch scoring processes up to four applications concurrently per slice. Every outcome in the slice settles before its saved counters advance and the next slice starts. Failed requests remain visible in the batch record. Assessment runs do not change application stages or human decisions.

A saved assessment can contain unavailable findings, so a completed batch count alone does not establish that AI evaluation succeeded. Operational checks should inspect the saved run's `models_used`, `scope.processingErrors` and criterion findings, together with policy approval and source coverage. These checks establish processing completeness, not candidate suitability. Gateway diagnostics record attempt timing, status and error type; save failures record the database error code and message. They do not log request or response bodies, submitted evidence or credentials.

## Validation

Use Node.js 24 or later for the native TypeScript regression tests:

```sh
npm --prefix tests ci
npm run test:assessment
npm run build
```

The isolated test package pins PGlite to execute the actual migration and decision functions against a disposable matching schema. It covers the metadata-column repair on an older schema, preservation of existing scores and immutable runs, gateway deadline limits and bounded batch concurrency. It does not replay the repository’s complete historical migration chain. The tests use synthetic records and stubbed model responses; they never connect to the production database or scoring gateway.

The assessment regression workflow runs this isolated suite on relevant pull requests and main-branch changes, with read-only repository access and no production credentials.

The existing application lockfile is out of sync with `package.json`, and the existing calendar dependencies have a peer-version conflict. For this change, application validation used `npm install --legacy-peer-deps --ignore-scripts --package-lock=false`; the application dependency ranges and lockfile were not rewritten. The full frontend type check has seven pre-existing errors in unrelated affiliate/profile/organisation screens, reproduced at the base commit with the same installed dependencies. Changed assessment code must introduce no additional diagnostics.

Browser checks should cover all three synthetic applicants, opening exact evidence, a required decision rationale, the unchanged original AI assessment after a human decision, and the display of legacy or unavailable results. Before production release, also exercise the authenticated reviewer flow against the staging database, including a disagreement, its resolution and a second assessment version.

## Coordinated release

This is a database, edge-function and frontend change. Release these components together in staging before production:

1. Apply `supabase/migrations/20260907120000_assessment_workspace_controls.sql`, followed by `supabase/migrations/20260907143000_assessment_score_metadata_columns.sql`, using the normal migration process. The first adds immutable runs, review/policy events, guarded decision functions and criterion policy fields. The second ensures older deployments have the model/prompt metadata columns required by the atomic save function, without changing existing score data or inventing historical provenance.
2. Deploy `score-application` and `trigger-batch-scoring`, including their shared assessment modules. Retain the existing gateway configuration and service credentials.
3. Deploy the frontend and refresh active recruiter sessions. Older clients cannot bypass the new decision rationale/history requirements.
4. Review the complete criteria set for each active role and approve its treatment. Run fresh assessments; older scores remain available as historical information.
5. Verify staff/assigned-reviewer access, manual decisions, saved source highlighting, concurrent/stale decisions and the audit history in staging before enabling real recruiter work.

The new history references prevent hard deletion of an application or job with retained assessment or policy records; existing deletion actions will be blocked in those cases. Any future retention/deletion workflow must handle these records explicitly.

Do not roll back by deleting assessment or reviewer history. Retain the additive tables and use a forward correction or a compatible frontend/backend release. This implementation does not merge a pull request, deploy functions, run production migrations, assess real applicants or send candidate communications automatically.
