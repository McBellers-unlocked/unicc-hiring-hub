import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface PanelistScore {
  panelist_id: string;
  panelist_name: string;
  responses: Record<string, number>;
  overall: number;
  recommendation: string;
}

interface InterviewScoreMatrixProps {
  applicationId: string;
  jobId: string;
}

export function InterviewScoreMatrix({ applicationId, jobId }: InterviewScoreMatrixProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [scores, setScores] = useState<PanelistScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotes, setShowNotes] = useState(false);

  useEffect(() => {
    loadData();
  }, [applicationId, jobId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch template
      const { data: templateData, error: templateError } = await supabase
        .from('feedback_form_templates')
        .select('*')
        .eq('job_id', jobId)
        .eq('auto_generated', true)
        .single();

      if (templateError) throw templateError;
      setTemplate(templateData);

      // Fetch all feedback responses for this application
      const { data: responses, error: responsesError } = await supabase
        .from('feedback_form_responses')
        .select(`
          *,
          evaluator:users(name)
        `)
        .eq('application_id', applicationId);

      if (responsesError) throw responsesError;

      const panelistScores: PanelistScore[] = responses.map((r: any) => ({
        panelist_id: r.evaluator_id,
        panelist_name: r.evaluator?.name || 'Unknown',
        responses: r.responses || {},
        overall: r.overall || 0,
        recommendation: r.recommendation || 'N/A'
      }));

      setScores(panelistScores);
    } catch (error) {
      console.error('Error loading score matrix:', error);
      toast({
        title: "Error",
        description: "Failed to load interview scores",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 3) return 'text-red-600 bg-red-50';
    if (score < 4) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const calculateAverage = (criterionId: string) => {
    const validScores = scores
      .map(s => s.responses[criterionId])
      .filter(score => typeof score === 'number' && score > 0);
    
    if (validScores.length === 0) return '-';
    const avg = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
    return avg.toFixed(1);
  };

  const calculateOverallPercentage = (overall: number) => {
    return Math.round((overall / 5) * 100);
  };

  const getRankings = () => {
    return scores
      .map((s, idx) => ({ ...s, originalIndex: idx }))
      .sort((a, b) => b.overall - a.overall)
      .map((s, rank) => ({ ...s, rank: rank + 1 }));
  };

  const exportToExcel = () => {
    // Simple CSV export
    let csv = 'Criteria,R/D,';
    csv += scores.map(s => s.panelist_name).join(',') + ',Average\n';

    template?.sections.forEach((section: any) => {
      csv += `\n${section.title}\n`;
      section.criteria.forEach((criterion: any) => {
        const isRequired = criterion.is_essential ? 'R' : 'D';
        csv += `"${criterion.name}",${isRequired},`;
        csv += scores.map(s => s.responses[criterion.id] || '-').join(',');
        csv += `,${calculateAverage(criterion.id)}\n`;
      });
    });

    csv += '\nOverall Mark,';
    csv += scores.map(s => s.overall).join(',') + ',';
    const avgOverall = scores.length > 0 
      ? (scores.reduce((sum, s) => sum + s.overall, 0) / scores.length).toFixed(1)
      : '-';
    csv += avgOverall + '\n';

    csv += 'Overall %,';
    csv += scores.map(s => calculateOverallPercentage(s.overall) + '%').join(',') + ',';
    csv += avgOverall !== '-' ? Math.round((parseFloat(avgOverall) / 5) * 100) + '%' : '-';
    csv += '\n';

    csv += 'Rank,';
    const rankings = getRankings();
    csv += scores.map(s => {
      const ranked = rankings.find(r => r.panelist_id === s.panelist_id);
      return ranked?.rank || '-';
    }).join(',') + ',-\n';

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `interview-scores-${applicationId}.csv`;
    a.click();

    toast({
      title: "Success",
      description: "Score matrix exported successfully"
    });
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading scores...</CardContent></Card>;
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          No feedback template configured for this job.
        </CardContent>
      </Card>
    );
  }

  const hasFeedback = scores.length > 0;
  const rankings = hasFeedback ? getRankings() : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Interview Score Matrix</CardTitle>
          {hasFeedback && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowNotes(!showNotes)}
              >
                {showNotes ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                {showNotes ? 'Hide' : 'Show'} Notes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
              >
                <Download className="w-4 h-4 mr-2" />
                Export to CSV
              </Button>
            </div>
          )}
        </div>
        {!hasFeedback && (
          <p className="text-sm text-muted-foreground mt-2">
            Awaiting feedback from panel members. The criteria below will be used for scoring.
          </p>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[300px]">Criteria</TableHead>
                <TableHead className="w-[60px]">R/D</TableHead>
                {hasFeedback && scores.map(s => (
                  <TableHead key={s.panelist_id} className="text-center">
                    {s.panelist_name}
                  </TableHead>
                ))}
                {hasFeedback && <TableHead className="text-center font-bold">Avg</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {template.sections.map((section: any) => (
                <React.Fragment key={section.title}>
                  <TableRow className="bg-muted/50">
                    <TableCell colSpan={hasFeedback ? scores.length + 3 : 2} className="font-bold">
                      {section.title} ({section.weight}% weight)
                    </TableCell>
                  </TableRow>
                  {section.criteria.map((criterion: any) => (
                    <TableRow key={criterion.id}>
                      <TableCell className="font-medium text-sm">
                        {criterion.name}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={criterion.is_essential ? "destructive" : "secondary"}>
                          {criterion.is_essential ? 'R' : 'D'}
                        </Badge>
                      </TableCell>
                      {hasFeedback && scores.map(s => {
                        const score = s.responses[criterion.id];
                        return (
                          <TableCell key={s.panelist_id} className="text-center">
                            {typeof score === 'number' ? (
                              <span className={cn("px-2 py-1 rounded font-medium", getScoreColor(score))}>
                                {score}
                              </span>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        );
                      })}
                      {hasFeedback && (
                        <TableCell className="text-center font-bold">
                          {calculateAverage(criterion.id)}
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}
              
              {hasFeedback && (
                <>
                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell colSpan={2}>Overall Mark</TableCell>
                    {scores.map(s => (
                      <TableCell key={s.panelist_id} className="text-center">
                        {s.overall}
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {scores.length > 0 
                        ? (scores.reduce((sum, s) => sum + s.overall, 0) / scores.length).toFixed(1)
                        : '-'
                      }
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell colSpan={2}>Overall %</TableCell>
                    {scores.map(s => (
                      <TableCell key={s.panelist_id} className="text-center">
                        {calculateOverallPercentage(s.overall)}%
                      </TableCell>
                    ))}
                    <TableCell className="text-center">
                      {scores.length > 0 
                        ? Math.round((scores.reduce((sum, s) => sum + s.overall, 0) / scores.length / 5) * 100) + '%'
                        : '-'
                      }
                    </TableCell>
                  </TableRow>

                  <TableRow className="bg-primary/10 font-bold">
                    <TableCell colSpan={2}>Rank</TableCell>
                    {scores.map(s => {
                      const ranked = rankings.find(r => r.panelist_id === s.panelist_id);
                      return (
                        <TableCell key={s.panelist_id} className="text-center">
                          {ranked?.rank || '-'}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>

                  <TableRow className="bg-blue-50">
                    <TableCell colSpan={2} className="font-medium">Recommendation</TableCell>
                    {scores.map(s => (
                      <TableCell key={s.panelist_id} className="text-center text-sm">
                        <Badge variant={s.recommendation === 'Yes' ? 'default' : 'secondary'}>
                          {s.recommendation}
                        </Badge>
                      </TableCell>
                    ))}
                    <TableCell className="text-center">-</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}