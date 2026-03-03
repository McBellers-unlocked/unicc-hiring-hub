import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Brain, TrendingUp, Info, GraduationCap, Briefcase, Lightbulb, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  StatusFlag,
  EvidenceDisplay,
  ReviewerFeedback,
  SubRequirementDisplay,
  type CriterionScoreV4,
} from '@/components/scoring/ScoringV4Components';

// Legacy v3.0 types
interface CriterionScoreV3 {
  criterionId: string;
  criterionText: string;
  type: string;
  score: number;
  passed: boolean;
  evidence: string;
  confidence: number;
  details?: { required?: string; candidateHas?: string };
}

interface ScoringResultV3 {
  criteria: CriterionScoreV3[];
  educationScore: CriterionScoreV3 | null;
  overallScore: number;
  passedCount: number;
  totalCount: number;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

// v4.0 types
interface ScoringResultV4 {
  criteria: CriterionScoreV4[];
  educationScore: CriterionScoreV4 | null;
  overallScore: number;
  passedCount: number;
  totalCount: number;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

interface ApplicationScoringProps {
  applicationId: string;
}

const criterionTypeLabels: Record<string, string> = {
  years_experience: 'Years of Experience',
  specific_experience: 'Specific Experience',
  output_experience: 'Output/Deliverable Experience',
  knowledge: 'Knowledge',
  skill: 'Skill',
  ability: 'Ability',
  attribute: 'Personal Attribute',
  education: 'Education'
};

const criterionTypeIcons: Record<string, React.ReactNode> = {
  years_experience: <Briefcase className="h-4 w-4" />,
  specific_experience: <Briefcase className="h-4 w-4" />,
  output_experience: <Target className="h-4 w-4" />,
  knowledge: <Lightbulb className="h-4 w-4" />,
  skill: <Target className="h-4 w-4" />,
  ability: <Target className="h-4 w-4" />,
  attribute: <Info className="h-4 w-4" />,
  education: <GraduationCap className="h-4 w-4" />
};

export function ApplicationScoring({ applicationId }: ApplicationScoringProps) {
  const [loading, setLoading] = useState(true);
  const [v3Data, setV3Data] = useState<ScoringResultV3 | null>(null);
  const [v4Data, setV4Data] = useState<ScoringResultV4 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScoringData();
  }, [applicationId]);

  const fetchScoringData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: scores, error: scoreError } = await supabase
        .from('screening_scores')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false });

      if (scoreError) throw scoreError;

      if (!scores || scores.length === 0) {
        setError('No scoring data available yet. Scoring may still be in progress.');
        return;
      }

      // Find v4.0 and v3.0 scores
      for (const score of scores) {
        const breakdown = score.rubric_breakdown as any;
        if (!breakdown) continue;

        if (breakdown.analysisVersion?.startsWith('4.0')) {
          setV4Data(breakdown as ScoringResultV4);
        } else if (breakdown.analysisVersion?.startsWith('3.0')) {
          setV3Data(breakdown as ScoringResultV3);
        }
      }

      // If neither found
      if (!scores.some(s => {
        const b = s.rubric_breakdown as any;
        return b?.analysisVersion?.startsWith('4.0') || b?.analysisVersion?.startsWith('3.0');
      })) {
        setError('Scoring data is in legacy format. Please re-run scoring for detailed analysis.');
      }
    } catch (err) {
      console.error('Error fetching scoring data:', err);
      setError('Failed to load scoring data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Scoring Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span className="text-muted-foreground">Loading scoring data...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error && !v4Data && !v3Data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Scoring Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchScoringData} variant="outline" className="mt-4">Refresh</Button>
        </CardContent>
      </Card>
    );
  }

  // Prefer v4.0 data, fall back to v3.0
  if (v4Data) {
    return <ScoringV4Display data={v4Data} applicationId={applicationId} />;
  }

  if (v3Data) {
    return <ScoringV3Display data={v3Data} />;
  }

  return null;
}

// =============================================================================
// v4.0 Display
// =============================================================================

function ScoringV4Display({ data, applicationId }: { data: ScoringResultV4; applicationId: string }) {
  const allCriteria = [
    ...(data.educationScore ? [data.educationScore] : []),
    ...data.criteria
  ];

  const groupedCriteria = allCriteria.reduce((acc, criterion) => {
    const type = criterion.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(criterion);
    return acc;
  }, {} as Record<string, CriterionScoreV4[]>);

  const handleHighlight = (quote: string) => {
    // Dispatch custom event for source document viewer to pick up
    window.dispatchEvent(new CustomEvent('highlight-evidence', { detail: { quote } }));
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Scoring Analysis
            <Badge variant="outline" className="ml-2 text-xs">{data.analysisVersion}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                data.overallScore >= 70 ? 'text-emerald-600' :
                data.overallScore >= 50 ? 'text-amber-600' : 'text-destructive'
              }`}>
                {data.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={data.overallScore} className="mt-2" />
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {data.passedCount}/{data.totalCount}
              </div>
              <div className="text-sm text-muted-foreground">Criteria Passed</div>
              <Progress
                value={(data.passedCount / Math.max(1, data.totalCount)) * 100}
                className="mt-2"
              />
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {data.recommendForLonglist ? (
                  <TrendingUp className="h-8 w-8 text-emerald-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-destructive" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">Recommendation</div>
              <Badge variant={data.recommendForLonglist ? 'default' : 'destructive'} className="mt-1">
                {data.recommendForLonglist ? 'Longlist' : 'Not Recommended'}
              </Badge>
            </div>
          </div>

          {!data.recommendForLonglist && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This application does not meet the minimum criteria for longlisting.
                {data.passedCount < data.totalCount * 0.6 &&
                  ` Failed ${data.totalCount - data.passedCount} of ${data.totalCount} criteria.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Individual Criteria with Subrequirements */}
      <Card>
        <CardHeader>
          <CardTitle>Essential Criteria Assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each criterion decomposed and individually verified with verbatim evidence
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {Object.entries(groupedCriteria).map(([type, criteria]) => (
            <div key={type} className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                {criterionTypeIcons[type]}
                {criterionTypeLabels[type] || type}
                <Badge variant="outline" className="ml-auto">
                  {criteria.filter(c => c.passed).length}/{criteria.length} passed
                </Badge>
              </div>

              {criteria.map((criterion) => (
                <div
                  key={criterion.criterionId}
                  className={`border rounded-lg p-4 ${
                    criterion.passed
                      ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900'
                      : 'border-destructive/30 bg-destructive/5 dark:bg-destructive/10'
                  }`}
                >
                  {/* Criterion header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-2 flex-1">
                      {criterion.passed ? (
                        <CheckCircle className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{criterion.criterionText}</p>
                        {criterion.details && (
                          <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                            {criterion.details.required && (
                              <p><span className="font-medium">Required:</span> {criterion.details.required}</p>
                            )}
                            {criterion.details.candidateHas && (
                              <p><span className="font-medium">Candidate has:</span> {criterion.details.candidateHas}</p>
                            )}
                          </div>
                        )}
                        {criterion.recombine_logic !== 'S1' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Logic: <code className="bg-muted px-1 rounded">{criterion.recombine_logic}</code>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <Badge
                        variant={criterion.passed ? 'default' : 'destructive'}
                        className="text-xs"
                      >
                        {criterion.score}/100
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(criterion.confidence * 100)}% confidence
                      </div>
                    </div>
                  </div>

                  {/* Subrequirements */}
                  {criterion.subrequirements && criterion.subrequirements.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {criterion.subrequirements.map((sub) => (
                        <SubRequirementDisplay
                          key={sub.id}
                          sub={sub}
                          onHighlight={handleHighlight}
                        />
                      ))}
                    </div>
                  )}

                  {/* Reviewer feedback */}
                  <ReviewerFeedback
                    applicationId={applicationId}
                    criterion={criterion}
                  />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Methodology (v4.0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium">Pipeline:</p>
              <ol className="list-decimal list-inside ml-4 space-y-1">
                <li>Deterministic checks (years, education) — authoritative</li>
                <li>Criterion decomposition into atomic subrequirements</li>
                <li>AI evaluation with verbatim evidence quoting</li>
                <li>Verification pass to detect hallucinated evidence</li>
                <li>Logic recombination (AND/OR) of subrequirements</li>
              </ol>
            </div>
            <div>
              <p className="font-medium">Flags:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li><span className="text-destructive font-medium">CRITICAL</span> — Verifier invalidated evidence or no evidence provided</li>
                <li><span className="text-amber-600 font-medium">REVIEW</span> — Confidence below 60%</li>
                <li><span className="text-emerald-600 font-medium">OK</span> — Verified evidence with high confidence</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// v3.0 Legacy Display (unchanged from original)
// =============================================================================

function ScoringV3Display({ data }: { data: ScoringResultV3 }) {
  const allCriteria = [
    ...(data.educationScore ? [data.educationScore] : []),
    ...data.criteria
  ];

  const groupedCriteria = allCriteria.reduce((acc, criterion) => {
    const type = criterion.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(criterion);
    return acc;
  }, {} as Record<string, CriterionScoreV3[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Scoring Analysis
            <Badge variant="outline" className="ml-2 text-xs">v3.0 (legacy)</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                data.overallScore >= 70 ? 'text-emerald-600' :
                data.overallScore >= 50 ? 'text-amber-600' : 'text-destructive'
              }`}>
                {data.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={data.overallScore} className="mt-2" />
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {data.passedCount}/{data.totalCount}
              </div>
              <div className="text-sm text-muted-foreground">Criteria Passed</div>
            </div>
            <div className="text-center">
              <Badge variant={data.recommendForLonglist ? 'default' : 'destructive'} className="mt-2">
                {data.recommendForLonglist ? 'Longlist' : 'Not Recommended'}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Essential Criteria (Legacy)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedCriteria).map(([type, criteria]) => (
            <div key={type} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground border-b pb-2">
                {criterionTypeIcons[type]}
                {criterionTypeLabels[type] || type}
              </div>
              {criteria.map((criterion) => (
                <div
                  key={criterion.criterionId}
                  className={`border rounded-lg p-3 ${
                    criterion.passed
                      ? 'border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-destructive/30 bg-destructive/5'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {criterion.passed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5" />
                    ) : (
                      <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm">{criterion.criterionText}</p>
                      <p className="text-xs text-muted-foreground mt-1">{criterion.evidence}</p>
                    </div>
                    <Badge variant={criterion.passed ? 'default' : 'destructive'} className="text-xs">
                      {criterion.score}/100
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
