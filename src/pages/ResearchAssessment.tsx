import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInSeconds, addHours } from "date-fns";
import { Clock, Download, Upload, FileText, CheckCircle2, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

export default function ResearchAssessment() {
  const { token, assessmentId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Validate series token
  const { data: seriesAccess, isLoading: accessLoading, error: accessError } = useQuery({
    queryKey: ["series-access", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc("validate_series_token", { p_token: token });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Invalid access");
      return data[0];
    },
    enabled: !!token,
    retry: false,
  });

  // Get assessment details
  const { data: assessment, isLoading: assessmentLoading } = useQuery({
    queryKey: ["research-assessment", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("written_assessments")
        .select("*")
        .eq("id", assessmentId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentId,
  });

  // Get or create slot for this candidate
  const { data: slot, isLoading: slotLoading, refetch: refetchSlot } = useQuery({
    queryKey: ["research-slot", assessmentId, seriesAccess?.candidate_email],
    queryFn: async () => {
      // First try to find existing slot
      const { data: existingSlot, error: findError } = await supabase
        .from("assessment_slots")
        .select("*")
        .eq("assessment_id", assessmentId)
        .eq("candidate_email", seriesAccess.candidate_email)
        .maybeSingle();

      if (findError) throw findError;
      if (existingSlot) return existingSlot;

      // Create new slot if none exists
      const timeLimitHours = assessment?.time_limit_hours || 48;
      const now = new Date();
      const endTime = addHours(now, timeLimitHours);

      const { data: newSlot, error: createError } = await supabase
        .from("assessment_slots")
        .insert({
          assessment_id: assessmentId,
          candidate_name: seriesAccess.candidate_name,
          candidate_email: seriesAccess.candidate_email,
          scheduled_start: now.toISOString(),
          scheduled_end: endTime.toISOString(),
          status: "in_progress",
          started_at: now.toISOString(),
        })
        .select()
        .single();

      if (createError) throw createError;
      return newSlot;
    },
    enabled: !!assessmentId && !!seriesAccess?.candidate_email && !!assessment,
  });

  // Get existing submission
  const { data: submission, refetch: refetchSubmission } = useQuery({
    queryKey: ["research-submission", slot?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("research_exercise_submissions")
        .select("*")
        .eq("slot_id", slot.id)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slot?.id,
  });

  // Timer effect
  useEffect(() => {
    if (!slot?.scheduled_end) return;

    const updateTimer = () => {
      const endTime = new Date(slot.scheduled_end);
      const now = new Date();
      const remaining = differenceInSeconds(endTime, now);
      setTimeRemaining(Math.max(0, remaining));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [slot?.scheduled_end]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Mark slot as completed
      const { error } = await supabase
        .from("assessment_slots")
        .update({ status: "completed", submitted_at: new Date().toISOString() })
        .eq("id", slot.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Assessment submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["research-slot"] });
      navigate(`/series/${token}`);
    },
    onError: () => {
      toast.error("Failed to submit assessment");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !slot) return;

    setIsUploading(true);
    try {
      // Upload file to storage
      const fileName = `${slot.id}/${Date.now()}-${selectedFile.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("assessment-documents")
        .upload(`submissions/${fileName}`, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("assessment-documents")
        .getPublicUrl(`submissions/${fileName}`);

      // Save submission record
      const { error: saveError } = await supabase
        .from("research_exercise_submissions")
        .insert({
          slot_id: slot.id,
          file_url: urlData.publicUrl,
          file_name: selectedFile.name,
          file_size_bytes: selectedFile.size,
        });

      if (saveError) throw saveError;

      toast.success("File uploaded successfully");
      setSelectedFile(null);
      refetchSubmission();
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const formatTimeRemaining = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m remaining`;
    }
    return `${mins}m ${secs}s remaining`;
  };

  const getTimeProgress = () => {
    if (!slot?.started_at || !assessment?.time_limit_hours) return 0;
    const totalSeconds = assessment.time_limit_hours * 3600;
    const elapsed = totalSeconds - (timeRemaining || 0);
    return Math.min(100, (elapsed / totalSeconds) * 100);
  };

  if (accessLoading || assessmentLoading || slotLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto p-4">
          <Skeleton className="h-12 w-3/4 mx-auto mb-4" />
          <Skeleton className="h-6 w-1/2 mx-auto mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (accessError || !seriesAccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              This assessment link is invalid or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = timeRemaining !== null && timeRemaining <= 0;
  const isCompleted = slot?.status === "completed";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8 px-4 max-w-3xl">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/series/${token}`)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Series
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{assessment?.title}</h1>
          <p className="text-muted-foreground">Research Exercise</p>
        </div>

        {/* Timer Card */}
        {!isCompleted && timeRemaining !== null && (
          <Card className={`mb-6 ${isExpired ? "border-destructive" : ""}`}>
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className={`w-4 h-4 ${isExpired ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className={isExpired ? "text-destructive font-medium" : ""}>
                    {isExpired ? "Time expired" : formatTimeRemaining(timeRemaining)}
                  </span>
                </div>
                <Badge variant={isExpired ? "destructive" : "secondary"}>
                  {assessment?.time_limit_hours || 48} hour limit
                </Badge>
              </div>
              <Progress value={getTimeProgress()} className="h-2" />
            </CardContent>
          </Card>
        )}

        {isCompleted ? (
          <Card>
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600 mb-4" />
              <h2 className="text-xl font-bold mb-2">Assessment Submitted</h2>
              <p className="text-muted-foreground">
                You submitted this assessment on{" "}
                {slot?.submitted_at && format(new Date(slot.submitted_at), "MMM d, yyyy 'at' HH:mm")}
              </p>
              {submission && (
                <div className="mt-4 p-4 bg-muted rounded-lg inline-flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="text-sm">{submission.file_name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Instructions */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Instructions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  {assessment?.instructions ? (
                    <p className="whitespace-pre-wrap">{assessment.instructions}</p>
                  ) : (
                    <p className="text-muted-foreground">No specific instructions provided.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Reference Document */}
            {assessment?.reference_document_url && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Reference Document</CardTitle>
                  <CardDescription>
                    Download and review this document before preparing your submission.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    onClick={() => window.open(assessment.reference_document_url, "_blank")}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {assessment.reference_document_name || "Download Document"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* File Upload */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Your Submission</CardTitle>
                <CardDescription>
                  Upload your completed work. You can re-upload to replace your submission until the deadline.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {submission && (
                  <div className="mb-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="text-sm font-medium text-emerald-700">
                          Current submission: {submission.file_name}
                        </span>
                      </div>
                      <span className="text-xs text-emerald-600">
                        {format(new Date(submission.submitted_at), "MMM d 'at' HH:mm")}
                      </span>
                    </div>
                  </div>
                )}

                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.doc,.docx,.txt"
                    disabled={isExpired}
                  />
                  <label
                    htmlFor="file-upload"
                    className={`cursor-pointer ${isExpired ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {selectedFile ? selectedFile.name : "Click to select a file or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, DOC, DOCX, or TXT (max 10MB)
                    </p>
                  </label>
                </div>

                {selectedFile && !isExpired && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({(selectedFile.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <Button
                      size="sm"
                      onClick={handleUpload}
                      disabled={isUploading}
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-1" />
                          Upload
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="lg"
                    disabled={!submission || isExpired || submitMutation.isPending}
                  >
                    {submitMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Assessment"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to submit this assessment? Once submitted, you cannot make further changes.
                      <div className="mt-4 p-3 bg-muted rounded-lg flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span className="text-sm">{submission?.file_name}</span>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => submitMutation.mutate()}>
                      Submit
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
