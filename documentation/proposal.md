# Proposal — Recommendation model fix (v4.2 → v4.3)

*Effectively Phase 7 of the original plan, delivered as its own change set because it alters scored behaviour and warrants its own version.*

## Why

A live example surfaced the problem: a candidate meeting **4 of 8 essential criteria** — and among the must-passes, only the two easiest, deterministic ones (a 2-year threshold and a first-level degree) — is presented as **"Yes · 79%."** Two faults combine:

1. **The verdict contradicts the gate.** The documented recommendation requires `passRatio >= 0.6`; this candidate sits at 0.5, so it should read "No." The coverage condition isn't actually gating the badge.
2. **A compensatory weighted average is the wrong aggregation for must-haves.** Essential criteria are must-haves, but strong scores on the cleared criteria — amplified by the ×2 weight on years+education (both deterministic 100s) and the failure floor of 20 introduced in v4.2 — buy back the four that are missed, producing a 79% that masquerades as fit.

This change makes the verdict coverage-gated and stops the percentage standing in for the recommendation.

## In scope (MVP)

- Replace the verdict with a coverage-gated, three-state recommendation — **Recommend / Review / Reject** — driven by `corePass` (years + education, the hard floor) and a configurable miss tolerance.
- Drop the `overallScore >= 60` condition from the verdict (it's the leniency culprit and becomes redundant once coverage gates). Keep `overallScore` in `rubric_breakdown` for continuity — demoted, not deleted.
- Emit new fields: `essentialMet`, `essentialTotal`, `coverageRatio`, `matchStrengthOnMet` (weighted average over **passed criteria only**), `recommendation` (enum), `recommendation_reason` (human-readable, naming the missed criteria).
- UI: lead with the verdict and "meets X of N essential criteria"; show `matchStrengthOnMet` as a clearly-labelled secondary metric; surface `recommendation_reason`.
- Bump `pipeline_version` to `4.3` (this also finally moves off the `4.0` value that never got bumped in v4.2).

## Policy lever — confirm before the demo

- **`MAX_ESSENTIAL_MISSES` (default 1)** — the number of essential criteria a candidate may miss and still be **Recommended**. `1` is the principled must-have default (must-haves are must-haves). Raise it if your panel treats some essentials as semi-negotiable. With the default, the example candidate (4 misses) lands in **Review**, not Recommend — it clears the hard floor but misses too many must-haves to auto-recommend, so a human decides.

## In scope (Phase 2 / later)

- Per-job miss tolerance — different vacancies have different must-have strictness. Stays a global constant for now.
- A formal essential-vs-desirable split, if desirable criteria are ever added. All current criteria are essential, so not needed yet.

## Out of scope

- Re-tuning the old `overallScore` constants (the 20 floor, the ×2 weights). Unnecessary — the headline no longer uses that number, so the fix lands by construction. Leave it untouched in the breakdown.

## Acceptance

- The 4-of-8 example candidate no longer shows "Yes"; the reason names the four missed criteria.
- A candidate meeting all/nearly all essentials still recommends.
- `matchStrengthOnMet` is computed over passed criteria only — a failed criterion cannot raise it.
- The per-criterion scoring formula and the evaluator are untouched.
