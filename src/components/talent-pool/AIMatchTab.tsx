import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { TalentPoolMatchResults } from "./TalentPoolMatchResults";

interface AIMatchTabProps {
  onMatch: (jobId: string, jobTitle: string) => void;
  isMatching: boolean;
  matchRunId: string | null;
  matchJobTitle: string;
}

export function AIMatchTab({ onMatch, isMatching, matchRunId, matchJobTitle }: AIMatchTabProps) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");

  const { data: jobs } = useQuery({
    queryKey: ["jobs-for-ai-matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, notice_no")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const selectedJob = jobs?.find((j) => j.id === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Job Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            AI-Powered Talent Matching
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Select a job opening to find the best matching candidates from your talent pool.
            The AI analyzes skills, experience, education, and role alignment to rank candidates.
          </p>

          <div className="flex gap-3 items-end">
            <div className="flex-1 space-y-2">
              <label className="text-sm font-medium">Job Opening</label>
              <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job to match against..." />
                </SelectTrigger>
                <SelectContent>
                  {jobs?.map((job) => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.notice_no} — {job.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={() => {
                if (selectedJobId && selectedJob) {
                  onMatch(selectedJobId, selectedJob.title);
                }
              }}
              disabled={!selectedJobId || isMatching}
              className="gap-2"
            >
              {isMatching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Matching...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Find Matches
                </>
              )}
            </Button>
          </div>

          {isMatching && (
            <Alert>
              <Loader2 className="h-4 w-4 animate-spin" />
              <AlertDescription>
                Analyzing candidate profiles and computing match scores. This may take 30–60 seconds
                for the initial run as candidate profiles are being normalized...
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {matchRunId && !isMatching && (
        <TalentPoolMatchResults runId={matchRunId} jobTitle={matchJobTitle} />
      )}
    </div>
  );
}
