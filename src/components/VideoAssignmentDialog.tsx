import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { VideoAssignmentManager } from "./VideoAssignmentManager";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface VideoAssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationId: string;
  candidateName: string;
}

export function VideoAssignmentDialog({ 
  open, 
  onOpenChange, 
  applicationId,
  candidateName 
}: VideoAssignmentDialogProps) {
  const navigate = useNavigate();
  const [canCreateAssignment, setCanCreateAssignment] = useState<boolean | null>(null);
  const [jobTitle, setJobTitle] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');

  useEffect(() => {
    if (open) {
      checkIfCanCreate();
    }
  }, [open, applicationId]);

  const checkIfCanCreate = async () => {
    try {
      const { data: appData } = await supabase
        .from('applications')
        .select('job_id, jobs(title)')
        .eq('id', applicationId)
        .single();
      
      if (appData) {
        setJobTitle(appData.jobs?.title || '');
        setJobId(appData.job_id);
        
        const { data: questionSets } = await supabase
          .from('video_question_sets')
          .select('id')
          .eq('job_id', appData.job_id)
          .limit(1);
        
        setCanCreateAssignment(questionSets && questionSets.length > 0);
      }
    } catch (error) {
      console.error('Error checking video questions:', error);
      setCanCreateAssignment(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Video Assignment - {candidateName}</DialogTitle>
        </DialogHeader>
        {canCreateAssignment === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>
                The job "{jobTitle}" doesn't have video questions configured.
              </span>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  navigate(`/admin/jobs/${jobId}/edit?step=5`);
                }}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure Now
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <VideoAssignmentManager applicationId={applicationId} />
      </DialogContent>
    </Dialog>
  );
}
