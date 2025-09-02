import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Brain, TrendingUp, FileText, Info } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CriterionScore {
  score: number;
  evidence: string;
  confidence: number;
  weight: number;
  mustHave: boolean;
}

interface ScoringBreakdown {
  criteria: Record<string, CriterionScore>;
  overallScore: number;
  passedMustHaves: boolean;
  recommendForLonglist: boolean;
  analysisVersion: string;
}

interface ApplicationScoringProps {
  applicationId: string;
}

export function ApplicationScoring({ applicationId }: ApplicationScoringProps) {
  const [loading, setLoading] = useState(true);
  const [scoringData, setScoringData] = useState<ScoringBreakdown | null>(null);
  const [criteriaData, setCriteriaData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScoringData();
  }, [applicationId]);

  const fetchScoringData = async () => {
    try {
      setLoading(true);
      
      // Fetch screening score and related criteria
      const { data: screeningScore, error: scoreError } = await supabase
        .from('screening_scores')
        .select(`
          *,
          applications!inner(
            id,
            jobs!inner(
              essential_criteria(*)
            )
          )
        `)
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoreError) {
        throw scoreError;
      }

      if (!screeningScore) {
        setError('No scoring data available yet. Scoring may still be in progress.');
        return;
      }

      setScoringData(screeningScore.rubric_breakdown as unknown as ScoringBreakdown);
      setCriteriaData(screeningScore.applications.jobs.essential_criteria || []);

    } catch (err) {
      console.error('Error fetching scoring data:', err);
      setError('Failed to load scoring data');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadgeVariant = (score: number, mustHave: boolean) => {
    if (mustHave && score < 70) return 'destructive';
    if (score >= 80) return 'default';
    if (score >= 70) return 'secondary';
    return 'outline';
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
            <span className="text-muted-foreground">Analyzing application...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
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
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <Button 
            onClick={fetchScoringData} 
            variant="outline" 
            className="mt-4"
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scoringData) {
    return null;
  }

  const getCriterionName = (criterionId: string) => {
    const criterion = criteriaData.find(c => c.id === criterionId);
    return criterion?.label || criterionId;
  };

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Scoring Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${getScoreColor(scoringData.overallScore)}`}>
                {scoringData.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={scoringData.overallScore} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {scoringData.passedMustHaves ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">Must-Have Requirements</div>
              <div className={`text-sm font-medium ${scoringData.passedMustHaves ? 'text-green-600' : 'text-red-600'}`}>
                {scoringData.passedMustHaves ? 'Passed' : 'Failed'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                {scoringData.recommendForLonglist ? (
                  <TrendingUp className="h-8 w-8 text-green-600" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-600" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">Recommendation</div>
              <div className={`text-sm font-medium ${scoringData.recommendForLonglist ? 'text-green-600' : 'text-red-600'}`}>
                {scoringData.recommendForLonglist ? 'Longlist' : 'Not Recommended'}
              </div>
            </div>
          </div>

          {!scoringData.recommendForLonglist && (
            <Alert variant="destructive" className="mb-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This application does not meet the minimum requirements for longlisting. 
                {!scoringData.passedMustHaves && ' Failed must-have requirements.'}
                {scoringData.overallScore < 70 && ' Overall score below 70 threshold.'}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Detailed Criterion Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Scoring Breakdown</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI analysis of application materials against essential criteria
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(scoringData.criteria).map(([criterionId, score]) => (
              <div key={criterionId} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <h4 className="font-medium">{getCriterionName(criterionId)}</h4>
                    {score.mustHave && (
                      <Badge variant="outline" className="text-xs">
                        Must Have
                      </Badge>
                    )}
                    <Badge 
                      variant={getScoreBadgeVariant(score.score, score.mustHave)}
                      className="text-xs"
                    >
                      {score.score}/100
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">
                      Weight: {score.weight}x
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Confidence: {Math.round(score.confidence * 100)}%
                    </div>
                  </div>
                </div>
                
                <Progress 
                  value={score.score} 
                  className="mb-2 h-2" 
                />
                
                <div className="text-sm text-muted-foreground">
                  <strong>Evidence:</strong> {score.evidence}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Methodology</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Scoring Scale:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>0-30: No evidence or very limited evidence found</li>
              <li>31-69: Moderate evidence with some gaps</li>
              <li>70-100: Strong evidence meeting or exceeding requirements</li>
            </ul>
            <p className="mt-4"><strong>Longlist Criteria:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Overall weighted score ≥ 70</li>
              <li>All must-have criteria ≥ 70</li>
            </ul>
            <p className="mt-4 text-xs">
              Analysis Version: {scoringData.analysisVersion} | 
              Powered by AI document analysis
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}