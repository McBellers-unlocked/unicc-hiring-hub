import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CandidateScore {
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  nationality: string;
  gender: string;
  intern_extern: string;
  criterionScores: Record<string, number>;
  overall: number;
  percentage: number;
  rank: number;
}

interface ReviewCommitteeScoreMatrixProps {
  jobId: string;
}

export function ReviewCommitteeScoreMatrix({ jobId }: ReviewCommitteeScoreMatrixProps) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [candidateScores, setCandidateScores] = useState<CandidateScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [jobId]);

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

      // Fetch interview questions for this job
      const { data: questionsData } = await supabase
        .from('job_interview_questions')
        .select('id')
        .eq('job_id', jobId);

      // Create mapping of questions to competencies/requirements
      const questionMapping: Record<string, string[]> = {};
      
      for (const question of questionsData || []) {
        const { data: compData } = await supabase
          .from('job_interview_question_competencies')
          .select('competency_id, job_competencies(id)')
          .eq('question_id', question.id);

        const { data: reqData } = await supabase
          .from('job_interview_question_requirements')
          .select('requirement_id, job_requirements(id)')
          .eq('question_id', question.id);

        const criterionIds: string[] = [];
        
        if (compData) {
          compData.forEach((c: any) => {
            if (c.job_competencies) {
              criterionIds.push(c.job_competencies.id);
            }
          });
        }
        
        if (reqData) {
          reqData.forEach((r: any) => {
            if (r.job_requirements) {
              criterionIds.push(r.job_requirements.id);
            }
          });
        }

        questionMapping[question.id] = criterionIds;
      }

      // Fetch all applications at Panel Interview stage
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          *,
          candidate:candidates(name, email, present_nationality, gender, location)
        `)
        .eq('job_id', jobId)
        .eq('status', 'Panel Interview');

      const candidateData: CandidateScore[] = [];

      for (const app of applications || []) {
        // Fetch all feedback for this application
        const { data: responses } = await supabase
          .from('feedback_form_responses')
          .select('*')
          .eq('application_id', app.id);

        // Calculate average scores across all panelists for each criterion
        const criterionScores: Record<string, number[]> = {};

        responses?.forEach((r: any) => {
          const questionResponses = r.responses || {};

          Object.keys(questionResponses).forEach(questionId => {
            if (questionId === 'overall_fit' || questionId === 'potential') {
              const responseData = questionResponses[questionId];
              const score = typeof responseData === 'object' ? responseData.score : responseData;
              if (typeof score === 'number') {
                if (!criterionScores[questionId]) criterionScores[questionId] = [];
                criterionScores[questionId].push(score);
              }
              return;
            }

            const responseData = questionResponses[questionId];
            const score = typeof responseData === 'object' ? responseData.score : responseData;
            
            if (typeof score === 'number') {
              const criterionIds = questionMapping[questionId] || [];
              criterionIds.forEach(criterionId => {
                if (!criterionScores[criterionId]) {
                  criterionScores[criterionId] = [];
                }
                criterionScores[criterionId].push(score);
              });
            }
          });
        });

        // Average scores for each criterion
        const avgCriterionScores: Record<string, number> = {};
        Object.keys(criterionScores).forEach(criterionId => {
          const scores = criterionScores[criterionId];
          avgCriterionScores[criterionId] = 
            scores.reduce((sum, s) => sum + s, 0) / scores.length;
        });

        // Calculate overall as SUM of all criterion scores
        const allScores = Object.values(avgCriterionScores);
        const overall = allScores.reduce((sum, s) => sum + s, 0);

        // Calculate total possible
        let totalCriteria = 0;
        const sections = templateData?.sections as any[];
        sections?.forEach((section: any) => {
          totalCriteria += section.criteria.length;
        });
        totalCriteria += 2; // overall_fit and potential

        const maxScore = totalCriteria * 5;
        const percentage = (overall / maxScore) * 100;

        candidateData.push({
          application_id: app.id,
          candidate_name: app.candidate?.name || 'N/A',
          candidate_email: app.candidate?.email || 'N/A',
          nationality: app.candidate?.present_nationality || 'N/A',
          gender: app.candidate?.gender || 'N/A',
          intern_extern: app.candidate?.location?.includes('Internal') ? 'Internal' : 'External',
          criterionScores: avgCriterionScores,
          overall,
          percentage: Math.round(percentage),
          rank: 0
        });
      }

      // Sort by percentage and assign ranks
      candidateData.sort((a, b) => b.percentage - a.percentage);
      candidateData.forEach((c, idx) => {
        c.rank = idx + 1;
      });

      setCandidateScores(candidateData);
    } catch (error) {
      console.error('Error loading review committee matrix:', error);
      toast({
        title: "Error",
        description: "Failed to load scoring matrix",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score < 3) return 'bg-destructive/10 text-destructive';
    if (score < 4) return 'bg-yellow-500/10 text-yellow-700';
    return 'bg-green-500/10 text-green-700';
  };

  const exportToCSV = () => {
    if (!template || candidateScores.length === 0) return;

    const headers = ['Criteria', 'Required/Desirable', ...candidateScores.map(c => c.candidate_name)];
    const rows: string[][] = [headers];

    // Add candidate info rows
    rows.push(['Nationality', '', ...candidateScores.map(c => c.nationality)]);
    rows.push(['Gender', '', ...candidateScores.map(c => c.gender)]);
    rows.push(['Intern/Extern', '', ...candidateScores.map(c => c.intern_extern)]);
    rows.push(['', '', ...candidateScores.map(() => '')]);

    // Add sections
    template.sections.forEach((section: any) => {
      rows.push([section.name, '', ...candidateScores.map(() => '')]);
      
      section.criteria.forEach((criterion: any) => {
        const required = 'R';
        const scores = candidateScores.map(c => {
          const score = c.criterionScores[criterion.id];
          return score ? score.toFixed(1) : '-';
        });
        rows.push([criterion.name, required, ...scores]);
      });
    });

    // Add overall_fit and potential
    rows.push(['Overall Fit', 'R', ...candidateScores.map(c => {
      const score = c.criterionScores['overall_fit'];
      return score ? score.toFixed(1) : '-';
    })]);
    rows.push(['Potential', 'R', ...candidateScores.map(c => {
      const score = c.criterionScores['potential'];
      return score ? score.toFixed(1) : '-';
    })]);

    // Add totals
    rows.push(['', '', ...candidateScores.map(() => '')]);
    rows.push(['Total Score', '', ...candidateScores.map(c => c.overall.toFixed(1))]);
    rows.push(['Percentage', '', ...candidateScores.map(c => `${c.percentage}%`)]);
    rows.push(['Rank', '', ...candidateScores.map(c => `#${c.rank}`)]);

    const csv = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'review-committee-scores.csv';
    a.click();
  };

  if (loading) {
    return <div className="text-center py-8">Loading scoring matrix...</div>;
  }

  if (!template) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No feedback template configured for this job.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (candidateScores.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">
            No candidates have completed panel interviews yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Interview Score Matrix</CardTitle>
          <Button onClick={exportToCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export to CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-64 sticky left-0 bg-background z-10">Criteria</TableHead>
                <TableHead className="w-32 text-center">Required/Desirable</TableHead>
                {candidateScores.map((candidate, idx) => (
                  <TableHead key={candidate.application_id} className={cn(
                    "text-center min-w-[150px]",
                    idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                  )}>
                    <div className="font-semibold">{candidate.candidate_name}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-1">
                      Rank #{candidate.rank}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Candidate Info Rows */}
              <TableRow className="bg-primary/5">
                <TableCell className="font-medium sticky left-0 bg-primary/5 z-10">Nationality</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => (
                  <TableCell key={candidate.application_id} className={cn(
                    "text-center",
                    idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                  )}>
                    {candidate.nationality}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-primary/5">
                <TableCell className="font-medium sticky left-0 bg-primary/5 z-10">Gender</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => (
                  <TableCell key={candidate.application_id} className={cn(
                    "text-center",
                    idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                  )}>
                    {candidate.gender}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-primary/5">
                <TableCell className="font-medium sticky left-0 bg-primary/5 z-10">Intern/Extern</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => (
                  <TableCell key={candidate.application_id} className={cn(
                    "text-center",
                    idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                  )}>
                    {candidate.intern_extern}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow>
                <TableCell colSpan={2 + candidateScores.length} className="h-2"></TableCell>
              </TableRow>

              {/* Sections and Criteria */}
              {template.sections.map((section: any) => (
                <React.Fragment key={section.name}>
                  <TableRow className="bg-secondary/50">
                    <TableCell colSpan={2 + candidateScores.length} className="font-bold">
                      {section.name}
                    </TableCell>
                  </TableRow>
                  {section.criteria.map((criterion: any) => (
                    <TableRow key={criterion.id}>
                      <TableCell className="sticky left-0 bg-background z-10">{criterion.name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="default">
                          R
                        </Badge>
                      </TableCell>
                      {candidateScores.map((candidate, idx) => {
                        const score = candidate.criterionScores[criterion.id];
                        return (
                          <TableCell key={candidate.application_id} className={cn(
                            "text-center",
                            idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                          )}>
                            {score ? (
                              <Badge variant="outline" className={getScoreColor(score)}>
                                {score.toFixed(1)}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </React.Fragment>
              ))}

              {/* Overall Fit and Potential */}
              <TableRow>
                <TableCell className="sticky left-0 bg-background z-10">Overall Fit</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">R</Badge>
                </TableCell>
                {candidateScores.map((candidate, idx) => {
                  const score = candidate.criterionScores['overall_fit'];
                  return (
                    <TableCell key={candidate.application_id} className={cn(
                      "text-center",
                      idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                    )}>
                      {score ? (
                        <Badge variant="outline" className={getScoreColor(score)}>
                          {score.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
              <TableRow>
                <TableCell className="sticky left-0 bg-background z-10">Potential</TableCell>
                <TableCell className="text-center">
                  <Badge variant="default">R</Badge>
                </TableCell>
                {candidateScores.map((candidate, idx) => {
                  const score = candidate.criterionScores['potential'];
                  return (
                    <TableCell key={candidate.application_id} className={cn(
                      "text-center",
                      idx % 2 === 0 ? "bg-muted/30" : "bg-muted/10"
                    )}>
                      {score ? (
                        <Badge variant="outline" className={getScoreColor(score)}>
                          {score.toFixed(1)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>

              {/* Totals */}
              <TableRow>
                <TableCell colSpan={2 + candidateScores.length} className="h-2"></TableCell>
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="sticky left-0 bg-primary/10 z-10">Total Score</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => (
                  <TableCell key={candidate.application_id} className={cn(
                    "text-center",
                    idx % 2 === 0 ? "bg-primary/20" : "bg-primary/15"
                  )}>
                    {candidate.overall.toFixed(1)}
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="sticky left-0 bg-primary/10 z-10">Percentage</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => (
                  <TableCell key={candidate.application_id} className={cn(
                    "text-center",
                    idx % 2 === 0 ? "bg-primary/20" : "bg-primary/15"
                  )}>
                    <Badge variant={candidate.percentage >= 80 ? "default" : "secondary"}>
                      {candidate.percentage}%
                    </Badge>
                  </TableCell>
                ))}
              </TableRow>
              <TableRow className="bg-primary/10 font-bold">
                <TableCell className="sticky left-0 bg-primary/10 z-10">Final Status</TableCell>
                <TableCell></TableCell>
                {candidateScores.map((candidate, idx) => {
                  const status = candidate.percentage < 80 
                    ? "Not Recommended" 
                    : candidate.rank === 1 
                      ? "Recommended" 
                      : "Alternate";
                  const statusVariant = candidate.percentage < 80 
                    ? "destructive" 
                    : candidate.rank === 1 
                      ? "default" 
                      : "secondary";
                  
                  return (
                    <TableCell key={candidate.application_id} className={cn(
                      "text-center",
                      idx % 2 === 0 ? "bg-primary/20" : "bg-primary/15"
                    )}>
                      <Badge variant={statusVariant}>{status}</Badge>
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
