import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  ChevronDown,
  AlertTriangle,
  Shield,
  Star,
  ThumbsUp,
  HelpCircle,
  TrendingDown,
  Eye,
} from "lucide-react";
import { useState } from "react";
import { CandidateProfileSheet } from "./CandidateProfileSheet";

interface TalentPoolMatchResultsProps {
  runId: string;
  jobTitle?: string;
}

const tierConfig = {
  strong: { label: "Strong Match", color: "bg-emerald-100 text-emerald-800 border-emerald-300", icon: Star },
  good: { label: "Good Match", color: "bg-blue-100 text-blue-800 border-blue-300", icon: ThumbsUp },
  possible: { label: "Possible Match", color: "bg-amber-100 text-amber-800 border-amber-300", icon: HelpCircle },
  low: { label: "Low Match", color: "bg-muted text-muted-foreground border-border", icon: TrendingDown },
};

const confidenceConfig = {
  high: { label: "High Confidence", color: "text-emerald-700 bg-emerald-50" },
  medium: { label: "Medium Confidence", color: "text-amber-700 bg-amber-50" },
  low: { label: "Low Confidence", color: "text-red-700 bg-red-50" },
};

export function TalentPoolMatchResults({ runId, jobTitle }: TalentPoolMatchResultsProps) {
  const [minTier, setMinTier] = useState<string>("all");
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);

  // Fetch results
  const { data: results, isLoading } = useQuery({
    queryKey: ["talent-match-results", runId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("talent_match_results")
        .select(`
          *,
          candidates:candidate_id (
            id, name, email, current_position, location,
            years_of_experience, skills, education, profile_photo_url
          )
        `)
        .eq("run_id", runId)
        .order("rank", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading match results...</p>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <Alert>
        <AlertDescription>No matching candidates found for this job.</AlertDescription>
      </Alert>
    );
  }

  // Filter by min tier
  const tierOrder = ["strong", "good", "possible", "low"];
  const filtered = minTier === "all"
    ? results
    : results.filter((r: any) => tierOrder.indexOf(r.tier) <= tierOrder.indexOf(minTier));

  return (
    <div className="space-y-4">
      {/* Disclaimer */}
      <Alert className="border-amber-200 bg-amber-50">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>AI-generated match suggestions.</strong> Scores reflect profile similarity, not candidate quality.
          Missing data is treated as unknown, not negative. Final decisions require recruiter review.
        </AlertDescription>
      </Alert>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filtered.length} candidate{filtered.length !== 1 ? "s" : ""} matched
          {jobTitle && <span> for <strong>{jobTitle}</strong></span>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Min tier:</span>
          <Select value={minTier} onValueChange={setMinTier}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="strong">Strong only</SelectItem>
              <SelectItem value="good">Good+</SelectItem>
              <SelectItem value="possible">Possible+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        {filtered.map((result: any) => {
          const candidate = result.candidates;
          const tier = tierConfig[result.tier as keyof typeof tierConfig] || tierConfig.low;
          const conf = confidenceConfig[result.confidence as keyof typeof confidenceConfig] || confidenceConfig.low;
          const TierIcon = tier.icon;
          const reasons = Array.isArray(result.reasons) ? result.reasons : [];
          const gaps = Array.isArray(result.gaps) ? result.gaps : [];
          const skills = Array.isArray(candidate?.skills) ? candidate.skills : [];

          return (
            <Card key={result.candidate_id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Candidate info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold truncate">{candidate?.name || "Unknown"}</span>
                      <Badge variant="outline" className={`text-xs ${tier.color}`}>
                        <TierIcon className="h-3 w-3 mr-1" />
                        {tier.label}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${conf.color}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {conf.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {candidate?.current_position || "Position unknown"}
                      {candidate?.location && ` · ${candidate.location}`}
                      {candidate?.years_of_experience != null && ` · ${candidate.years_of_experience}y exp`}
                    </p>

                    {/* Skills preview */}
                    {skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {skills.slice(0, 6).map((skill: any, i: number) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {typeof skill === "string" ? skill : skill.name || ""}
                          </Badge>
                        ))}
                        {skills.length > 6 && (
                          <Badge variant="outline" className="text-xs">+{skills.length - 6}</Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Right: Score + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-2xl font-bold text-primary">{result.match_score}%</div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setSelectedCandidateId(candidate?.id)}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                  </div>
                </div>

                {/* Expandable reasons/gaps */}
                {(reasons.length > 0 || gaps.length > 0) && (
                  <Collapsible>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-2 gap-1 text-xs h-7">
                        <ChevronDown className="h-3 w-3" />
                        Details
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-2 space-y-2">
                      {reasons.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-emerald-700 mb-1">Matching signals:</p>
                          <ul className="space-y-1">
                            {reasons.map((r: any, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                <span className="text-emerald-500 shrink-0">✓</span>
                                <span><strong>{r.label}:</strong> {r.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {gaps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-amber-700 mb-1">Gaps / Unknowns:</p>
                          <ul className="space-y-1">
                            {gaps.map((g: any, i: number) => (
                              <li key={i} className="text-xs text-muted-foreground flex gap-1">
                                <span className="text-amber-500 shrink-0">?</span>
                                <span><strong>{g.label}:</strong> {g.detail}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Candidate detail sheet */}
      {selectedCandidateId && (() => {
        const selectedResult = results?.find((r: any) => r.candidate_id === selectedCandidateId);
        const candidateData = selectedResult?.candidates;
        if (!candidateData) return null;
        return (
          <CandidateProfileSheet
            candidate={candidateData}
            open={!!selectedCandidateId}
            onClose={() => setSelectedCandidateId(null)}
          />
        );
      })()}
    </div>
  );
}
