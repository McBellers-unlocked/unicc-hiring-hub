/**
 * AI match score → candidate fit tier.
 *
 * Thresholds:
 *  - Yes:   score ≥ 75
 *  - Maybe: 50 ≤ score < 75
 *  - No:    score < 50  (does not meet education / essential experience)
 *  - Not scored: score is null / undefined
 */

export type FitTier = "yes" | "maybe" | "no" | "not_scored";

export interface FitTierInfo {
  tier: FitTier;
  label: string;
  /** Short tier label shown in the pill, e.g. "Yes" */
  shortLabel: string;
  /** Tailwind classes for a Badge background + text */
  badgeClass: string;
  /** Tailwind class for a left card border */
  borderClass: string;
  /** Human-readable threshold description */
  description: string;
}

export const FIT_TIER_THRESHOLDS = {
  yes: 75,
  maybe: 50,
} as const;

export function getFitTier(score: number | null | undefined): FitTierInfo {
  if (score === null || score === undefined || Number.isNaN(score)) {
    return {
      tier: "not_scored",
      label: "Not scored",
      shortLabel: "—",
      badgeClass: "bg-gray-100 text-gray-700",
      borderClass: "",
      description: "Awaiting AI scoring",
    };
  }
  if (score >= FIT_TIER_THRESHOLDS.yes) {
    return {
      tier: "yes",
      label: "Yes",
      shortLabel: "Yes",
      badgeClass: "bg-green-100 text-green-800",
      borderClass: "border-l-4 border-l-green-500",
      description: "Strong fit (≥75%)",
    };
  }
  if (score >= FIT_TIER_THRESHOLDS.maybe) {
    return {
      tier: "maybe",
      label: "Maybe",
      shortLabel: "Maybe",
      badgeClass: "bg-amber-100 text-amber-800",
      borderClass: "border-l-4 border-l-amber-500",
      description: "Partial fit (50–74%)",
    };
  }
  return {
    tier: "no",
    label: "No",
    shortLabel: "No",
    badgeClass: "bg-red-100 text-red-800",
    borderClass: "border-l-4 border-l-red-500",
    description: "Does not meet essential requirements (<50%)",
  };
}

export const FIT_TIER_LEGEND =
  "Fit tier: Yes ≥75% · Maybe 50–74% · No <50% (below education / essential experience threshold)";
