import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Brain, Play, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { ApplicationScoring } from '@/components/ApplicationScoring';

export default function ApplicationScoringTest() {
  const [applicationId, setApplicationId] = useState('');
  const [isScoring, setIsScoring] = useState(false);
  const [lastScoredId, setLastScoredId] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);

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
          screening_scores(ai_score, created_at)
        `)
        .order('created_at', { ascending: false })
        .limit(10);

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
      const { data, error } = await supabase.functions.invoke('score-application', {
        body: { applicationId: applicationId.trim() }
      });

      if (error) throw error;

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

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Application Scoring System</h1>
        <Button onClick={fetchApplications} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Scoring Trigger */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Test AI Scoring
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
            {isScoring ? 'Analyzing Application...' : 'Trigger AI Scoring'}
          </Button>

          {result && (
            <Alert variant={result.error ? 'destructive' : 'default'}>
              {result.error ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertDescription>
                {result.error || `Enhanced scoring completed! Match Score: ${result.aiScore}%, Recommended: ${result.recommendForLonglist ? 'Yes' : 'No'}`}
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
            Click an application ID to test scoring
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {applications.map((app) => (
              <div 
                key={app.id} 
                className="flex items-center justify-between p-3 border rounded cursor-pointer hover:bg-muted/50"
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
                  {app.screening_scores?.[0] && (
                    <Badge variant="secondary">
                      Score: {app.screening_scores[0].ai_score}
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
            ))}
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