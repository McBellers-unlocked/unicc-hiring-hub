import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Video, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface BulkVideoAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationIds: string[];
  candidates: Array<{ id: string; name: string; email: string }>;
  jobTitle: string;
  jobId: string;
  onSuccess: () => void;
}

export function BulkVideoAssignmentDialog({
  open,
  onOpenChange,
  applicationIds,
  candidates,
  jobTitle,
  jobId,
  onSuccess,
}: BulkVideoAssignmentDialogProps) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [sendEmails, setSendEmails] = useState(true);
  const [results, setResults] = useState<{
    successful: string[];
    failed: Array<{ name: string; error: string }>;
  } | null>(null);

  const handleBulkCreate = async () => {
    setIsProcessing(true);
    setResults(null);

    const successful: string[] = [];
    const failed: Array<{ name: string; error: string }> = [];

    // Check if video questions exist
    const { data: questionSets } = await supabase
      .from('video_question_sets')
      .select('id')
      .eq('job_id', jobId);

    if (!questionSets || questionSets.length === 0) {
      toast({
        title: "No Video Questions",
        description: `The job "${jobTitle}" doesn't have video questions configured.`,
        variant: "destructive",
      });
      setIsProcessing(false);
      return;
    }

    // Process each application
    for (const appId of applicationIds) {
      const candidate = candidates.find(c => 
        applicationIds.includes(appId)
      );

      try {
        // Check if assignment already exists
        const { data: existing } = await supabase
          .from('video_assignments')
          .select('id')
          .eq('application_id', appId)
          .maybeSingle();

        if (existing) {
          failed.push({
            name: candidate?.name || 'Unknown',
            error: 'Video assignment already exists'
          });
          continue;
        }

        // Create stage event to trigger assignment creation
        const { error: stageError } = await supabase
          .from('stage_events')
          .insert({
            application_id: appId,
            from_stage: 'Application',
            to_stage: 'Pre-Recorded Video',
            reason: 'Bulk video assignment creation'
          });

        if (stageError) throw stageError;

        // Wait for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verify assignment was created
        const { data: assignment } = await supabase
          .from('video_assignments')
          .select('id')
          .eq('application_id', appId)
          .maybeSingle();

        if (!assignment) {
          throw new Error('Assignment creation failed');
        }

        // Send email if requested
        if (sendEmails) {
          const { error: emailError } = await supabase.functions.invoke('send-video-invite', {
            body: {
              applicationId: appId,
              assignmentId: assignment.id,
              candidateName: candidate?.name,
              candidateEmail: candidate?.email,
              jobTitle: jobTitle,
            }
          });

          if (emailError) {
            console.error('Email error:', emailError);
            // Don't fail the whole operation if email fails
          }
        }

        successful.push(candidate?.name || 'Unknown');
      } catch (error) {
        console.error('Error creating assignment:', error);
        failed.push({
          name: candidate?.name || 'Unknown',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    setResults({ successful, failed });
    setIsProcessing(false);

    if (successful.length > 0) {
      toast({
        title: "Bulk Assignment Complete",
        description: `Successfully created ${successful.length} video assignment(s).`,
      });
      onSuccess();
    }
  };

  const handleClose = () => {
    setResults(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Video Assignment</DialogTitle>
          <DialogDescription>
            Create video assignments for {applicationIds.length} selected candidate(s) for "{jobTitle}"
          </DialogDescription>
        </DialogHeader>

        {!results ? (
          <>
            <div className="space-y-4">
              <Alert>
                <Video className="h-4 w-4" />
                <AlertDescription>
                  This will create video interview assignments for all selected candidates.
                  Each candidate will receive a unique link to complete their video interview.
                </AlertDescription>
              </Alert>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="send-emails" 
                  checked={sendEmails}
                  onCheckedChange={(checked) => setSendEmails(checked as boolean)}
                />
                <Label htmlFor="send-emails" className="cursor-pointer">
                  Send invitation emails to candidates
                </Label>
              </div>

              <div className="border rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="font-medium mb-2">Selected Candidates:</h4>
                <ul className="space-y-1">
                  {candidates.map((candidate) => (
                    <li key={candidate.id} className="text-sm">
                      • {candidate.name} ({candidate.email})
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
                Cancel
              </Button>
              <Button onClick={handleBulkCreate} disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Video className="mr-2 h-4 w-4" />
                    Create Assignments
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="space-y-4">
              {results.successful.length > 0 && (
                <Alert>
                  <AlertDescription>
                    <strong>✓ Success ({results.successful.length}):</strong>
                    <ul className="mt-2 space-y-1">
                      {results.successful.map((name, i) => (
                        <li key={i} className="text-sm">• {name}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {results.failed.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>✗ Failed ({results.failed.length}):</strong>
                    <ul className="mt-2 space-y-1">
                      {results.failed.map((item, i) => (
                        <li key={i} className="text-sm">
                          • {item.name}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}