import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Brain, TrendingUp, Info, GraduationCap, Briefcase, Lightbulb, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CriterionScore {
  criterionId: string;
  criterionText: string;
  type: string;
  score: number;
  passed: boolean;
  evidence: string;
  confidence: number;
  details?: {
    required?: string;
    candidateHas?: string;
  };
}

interface ScoringResult {
  criteria: CriterionScore[];
  educationScore: CriterionScore | null;
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
  const [scoringData, setScoringData] = useState<ScoringResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchScoringData();
  }, [applicationId]);

  const fetchScoringData = async () => {
    try {
      setLoading(true);
      
      const { data: screeningScore, error: scoreError } = await supabase
        .from('screening_scores')
        .select('*')
        .eq('application_id', applicationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (scoreError) throw scoreError;

      if (!screeningScore) {
        setError('No scoring data available yet. Scoring may still be in progress.');
        return;
      }

      // Handle both old and new format
      const breakdown = screeningScore.rubric_breakdown as any;
      if (breakdown?.analysisVersion?.startsWith('3.0')) {
        setScoringData(breakdown as ScoringResult);
      } else {
        // Legacy format - show message
        setError('Scoring data is in legacy format. Please re-run scoring for detailed criterion analysis.');
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
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={fetchScoringData} variant="outline" className="mt-4">
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!scoringData) return null;

  // Combine all criteria for display
  const allCriteria = [
    ...(scoringData.educationScore ? [scoringData.educationScore] : []),
    ...scoringData.criteria
  ];

  // Group by type
  const groupedCriteria = allCriteria.reduce((acc, criterion) => {
    const type = criterion.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(criterion);
    return acc;
  }, {} as Record<string, CriterionScore[]>);

  return (
    <div className="space-y-6">
      {/* Overall Score Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Criterion-Based AI Scoring
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className={`text-3xl font-bold ${
                scoringData.overallScore >= 70 ? 'text-green-600' : 
                scoringData.overallScore >= 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {scoringData.overallScore}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={scoringData.overallScore} className="mt-2" />
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">
                {scoringData.passedCount}/{scoringData.totalCount}
              </div>
              <div className="text-sm text-muted-foreground">Criteria Passed</div>
              <Progress 
                value={(scoringData.passedCount / Math.max(1, scoringData.totalCount)) * 100} 
                className="mt-2" 
              />
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
              <Badge variant={scoringData.recommendForLonglist ? 'default' : 'destructive'} className="mt-1">
                {scoringData.recommendForLonglist ? 'Longlist' : 'Not Recommended'}
              </Badge>
            </div>

            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-2">Analysis Version</div>
              <Badge variant="outline">{scoringData.analysisVersion}</Badge>
            </div>
          </div>

          {!scoringData.recommendForLonglist && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                This application does not meet the minimum criteria for longlisting.
                {scoringData.passedCount < scoringData.totalCount * 0.6 && 
                  ` Failed ${scoringData.totalCount - scoringData.passedCount} of ${scoringData.totalCount} criteria.`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Individual Criteria Results */}
      <Card>
        <CardHeader>
          <CardTitle>Essential Criteria Assessment</CardTitle>
          <p className="text-sm text-muted-foreground">
            Each criterion from the job requirements assessed individually
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
                      ? 'border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900' 
                      : 'border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-start gap-2 flex-1">
                      {criterion.passed ? (
                        <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
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
                  
                  <div className="text-sm text-muted-foreground bg-muted/30 p-2 rounded">
                    <span className="font-medium">Evidence:</span> {criterion.evidence}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Scoring Methodology */}
      <Card>
        <CardHeader>
          <CardTitle>Scoring Methodology (v3.0)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground space-y-3">
            <div>
              <p className="font-medium">Criterion-Based Analysis:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Each bullet point in Essential Criteria is scored separately</li>
                <li>Years of experience: Deterministic check against PHF work history</li>
                <li>Education: Deterministic match against PHF education entries</li>
                <li>Other criteria: AI relevance check using duties and motivation letter</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium">Pass/Fail Criteria:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Years requirements must be met exactly (total years from PHF)</li>
                <li>Education level must match or exceed requirement</li>
                <li>AI checks experience relevance using specific evidence</li>
              </ul>
            </div>
            
            <div>
              <p className="font-medium">Longlist Recommendation:</p>
              <ul className="list-disc list-inside ml-4 space-y-1">
                <li>All core criteria (years + education) must pass</li>
                <li>At least 60% of all criteria must pass</li>
                <li>Overall weighted score ≥ 60</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
