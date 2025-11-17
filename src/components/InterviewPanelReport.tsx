import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Save } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface InterviewPanelReportProps {
  jobId: string;
}

interface ReportData {
  application_id: string;
  introduction: string;
  skills: string;
  competencies: string;
  recommendation: string;
}

interface Candidate {
  application_id: string;
  candidate_name: string;
  candidate_email: string;
  has_panel_interview: boolean;
}

export function InterviewPanelReport({ jobId }: InterviewPanelReportProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [reports, setReports] = useState<Record<string, ReportData>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch all applications with panel interviews scheduled
      const { data: applications } = await supabase
        .from('applications')
        .select(`
          id,
          candidate:candidates(name, email)
        `)
        .eq('job_id', jobId)
        .eq('status', 'Panel Interview');

      if (!applications || applications.length === 0) {
        setCandidates([]);
        setLoading(false);
        return;
      }

      const candidateList: Candidate[] = applications.map(app => ({
        application_id: app.id,
        candidate_name: app.candidate?.name || 'Unknown',
        candidate_email: app.candidate?.email || '',
        has_panel_interview: true,
      }));

      setCandidates(candidateList);

      // Fetch existing reports for these applications
      const { data: existingReports } = await supabase
        .from('interview_panel_reports')
        .select('*')
        .eq('job_id', jobId)
        .in('application_id', applications.map(a => a.id));

      const reportsMap: Record<string, ReportData> = {};
      
      candidateList.forEach(candidate => {
        const existingReport = existingReports?.find(
          r => r.application_id === candidate.application_id
        );

        reportsMap[candidate.application_id] = {
          application_id: candidate.application_id,
          introduction: existingReport?.introduction || '',
          skills: existingReport?.skills || '',
          competencies: existingReport?.competencies || '',
          recommendation: existingReport?.recommendation || '',
        };
      });

      setReports(reportsMap);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load interview panel reports",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (applicationId: string, field: keyof ReportData, value: string) => {
    setReports(prev => ({
      ...prev,
      [applicationId]: {
        ...prev[applicationId],
        [field]: value,
      },
    }));
  };

  const handleSave = async (applicationId: string) => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save reports",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(prev => ({ ...prev, [applicationId]: true }));

      const reportData = reports[applicationId];

      // Check if report already exists
      const { data: existing } = await supabase
        .from('interview_panel_reports')
        .select('id')
        .eq('application_id', applicationId)
        .single();

      if (existing) {
        // Update existing report
        const { error } = await supabase
          .from('interview_panel_reports')
          .update({
            introduction: reportData.introduction,
            skills: reportData.skills,
            competencies: reportData.competencies,
            recommendation: reportData.recommendation,
            updated_at: new Date().toISOString(),
          })
          .eq('application_id', applicationId);

        if (error) throw error;
      } else {
        // Create new report
        const { error } = await supabase
          .from('interview_panel_reports')
          .insert({
            application_id: applicationId,
            job_id: jobId,
            introduction: reportData.introduction,
            skills: reportData.skills,
            competencies: reportData.competencies,
            recommendation: reportData.recommendation,
            created_by: user.id,
          });

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Report saved successfully",
      });
    } catch (error) {
      console.error('Error saving report:', error);
      toast({
        title: "Error",
        description: "Failed to save report",
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [applicationId]: false }));
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-[400px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (candidates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Interview Panel Report</CardTitle>
          <CardDescription>
            Compile interview panel reports for each candidate
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No candidates with scheduled panel interviews found.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Interview Panel Report</CardTitle>
        <CardDescription>
          Compile interview panel reports for each candidate with scheduled interviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={candidates[0]?.application_id} className="w-full">
          <TabsList className="w-full flex-wrap h-auto">
            {candidates.map((candidate) => (
              <TabsTrigger 
                key={candidate.application_id} 
                value={candidate.application_id}
                className="flex-1 min-w-[150px]"
              >
                {candidate.candidate_name}
              </TabsTrigger>
            ))}
          </TabsList>

          {candidates.map((candidate) => {
            const report = reports[candidate.application_id] || {
              application_id: candidate.application_id,
              introduction: '',
              skills: '',
              competencies: '',
              recommendation: '',
            };

            return (
              <TabsContent 
                key={candidate.application_id} 
                value={candidate.application_id}
                className="space-y-6 mt-6"
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor={`introduction-${candidate.application_id}`}>
                      Introduction
                    </Label>
                    <Textarea
                      id={`introduction-${candidate.application_id}`}
                      value={report.introduction}
                      onChange={(e) => handleFieldChange(candidate.application_id, 'introduction', e.target.value)}
                      placeholder="Provide an introduction to the candidate and their application..."
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`skills-${candidate.application_id}`}>
                      Skills
                    </Label>
                    <Textarea
                      id={`skills-${candidate.application_id}`}
                      value={report.skills}
                      onChange={(e) => handleFieldChange(candidate.application_id, 'skills', e.target.value)}
                      placeholder="Describe the candidate's relevant skills and qualifications..."
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`competencies-${candidate.application_id}`}>
                      Competencies
                    </Label>
                    <Textarea
                      id={`competencies-${candidate.application_id}`}
                      value={report.competencies}
                      onChange={(e) => handleFieldChange(candidate.application_id, 'competencies', e.target.value)}
                      placeholder="Assess the candidate's competencies based on interview performance..."
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor={`recommendation-${candidate.application_id}`}>
                      Recommendation
                    </Label>
                    <Textarea
                      id={`recommendation-${candidate.application_id}`}
                      value={report.recommendation}
                      onChange={(e) => handleFieldChange(candidate.application_id, 'recommendation', e.target.value)}
                      placeholder="Provide your final recommendation for this candidate..."
                      rows={4}
                      className="resize-y"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button 
                      onClick={() => handleSave(candidate.application_id)}
                      disabled={saving[candidate.application_id]}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {saving[candidate.application_id] ? 'Saving...' : 'Save Report'}
                    </Button>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
