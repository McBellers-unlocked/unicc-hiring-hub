import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Play, RefreshCw, CheckCircle, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationScoring } from '@/components/ApplicationScoring';

export default function ApplicationScoringTest() {
  const [applicationId, setApplicationId] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [isScoringAll, setIsScoringAll] = useState(false);
  const [lastScoredId, setLastScoredId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [scoringProgress, setScoringProgress] = useState<string>('');

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .select(`
          id,
          status,
          suggested_for_longlist,
          candidates(name, email),
          jobs(title),
          screening_scores(ai_score, created_at, version)
        `)
        .order('created_at', { ascending: false })
        .limit(15);

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const triggerScoring = async () => {
    if (!applicationId.trim()) return;

    setIsScoring(true);
    setResult(null);

    try {
      console.log('Triggering scoring for application:', applicationId.trim());
      const { data, error } = await supabase.functions.invoke('score-application', {
        body: { applicationId: applicationId.trim() }
      });

      if (error) {
        console.error('Scoring error:', error);
        throw error;
      }

      console.log('Scoring result:', data);
      setResult(data);
      setLastScoredId(applicationId.trim());
      await fetchApplications(); // Refresh the list

    } catch (error) {
      console.error('Error triggering scoring:', error);
      setResult({ error: error.message });
    } finally {
      setIsScoring(false);
    }
  };

  const scoreAllApplications = async () => {
    setIsScoringAll(true);
    setScoringProgress('');
    setResult(null);

    try {
      // Get unscored applications
      const unscoredApps = applications.filter(app => 
        !app.screening_scores || app.screening_scores.length === 0 || 
        app.screening_scores.some(score => score.version !== '2.0')
      );

      console.log(`Found ${unscoredApps.length} applications to score`);
      setScoringProgress(`Scoring ${unscoredApps.length} applications...`);

      let completed = 0;
      let failed = 0;

      for (const app of unscoredApps) {
        try {
          setScoringProgress(`Scoring ${app.candidates?.name || 'Unknown'} (${completed + 1}/${unscoredApps.length})`);
          
          const { data, error } = await supabase.functions.invoke('score-application', {
            body: { applicationId: app.id }
          });

          if (error) {
            console.error(`Failed to score application ${app.id}:`, error);
            failed++;
          } else {
            console.log(`Successfully scored application ${app.id}`);
            completed++;
          }

          // Small delay to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (error) {
          console.error(`Error scoring application ${app.id}:`, error);
          failed++;
        }
      }

      setResult({
        batchComplete: true,
        completed,
        failed,
        total: unscoredApps.length
      });

      await fetchApplications(); // Refresh the list

    } catch (error) {
      console.error('Error in batch scoring:', error);
      setResult({ error: error.message });
    } finally {
      setIsScoringAll(false);
      setScoringProgress('');
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Enhanced Application Scoring System</h1>
        <Button onClick={fetchApplications} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Batch Scoring */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Batch Score Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Score all applications that haven't been processed with the enhanced system (version 2.0)
          </p>
          
          <Button 
            onClick={scoreAllApplications} 
            disabled={isScoringAll}
            className="w-full"
            variant="secondary"
          >
            {isScoringAll ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            {isScoringAll ? 'Scoring Applications...' : 'Score All Unscored Applications'}
          </Button>

          {scoringProgress && (
            <div className="text-sm text-muted-foreground bg-muted/30 p-3 rounded">
              {scoringProgress}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Individual Scoring Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Test Individual Scoring
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="applicationId">Application ID</Label>
            <Input
              id="applicationId"
              value={applicationId}
              onChange={(e) => setApplicationId(e.target.value)}
              placeholder="Enter application ID to score..."
            />
          </div>
          
          <Button 
            onClick={triggerScoring} 
            disabled={!applicationId.trim() || isScoring}
            className="w-full"
          >
            {isScoring ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {isScoring ? 'Analyzing Application...' : 'Trigger Enhanced Scoring'}
          </Button>

          {result && (
            <Alert variant={result.error ? 'destructive' : 'default'}>
              {result.error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.error && `Error: ${result.error}`}
                {result.batchComplete && `Batch scoring completed! ${result.completed} successful, ${result.failed} failed out of ${result.total} applications.`}
                {result.aiScore && `Enhanced scoring completed! Match Score: ${result.aiScore}%, Recommended: ${result.recommendForLonglist ? 'Yes' : 'No'}`}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Recent Applications */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Applications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Click an application ID to test scoring. Red = not scored, Green = scored with v2.0
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {applications.map((app) => {
              const hasEnhancedScore = app.screening_scores?.some(score => score.version === '2.0');
              const hasAnyScore = app.screening_scores?.length > 0;
              
              return (
                <div 
                  key={app.id} 
                  className={`flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50 ${
                    hasEnhancedScore ? 'border-green-200 bg-green-50/30' : 
                    hasAnyScore ? 'border-yellow-200 bg-yellow-50/30' : 
                    'border-red-200 bg-red-50/30'
                  }`}
                  onClick={() => setApplicationId(app.id)}
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="font-medium">{app.candidates?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {app.jobs?.title}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        ID: {app.id}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {app.screening_scores?.map((score, index) => (
                      <Badge key={index} variant="secondary">
                        Score: {score.ai_score} (v{score.version})
                      </Badge>
                    ))}
                    {!hasAnyScore && (
                      <Badge variant="outline" className="text-red-600">
                        Not Scored
                      </Badge>
                    )}
                    {app.suggested_for_longlist && (
                      <Badge variant="default">
                        Recommended
                      </Badge>
                    )}
                    <Badge variant="outline">
                      {app.status}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Scoring Results Display */}
      {lastScoredId && (
        <ApplicationScoring applicationId={lastScoredId} />
      )}
    </div>
  );
}