import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Clock, Send, AlertTriangle, CheckCircle, Inbox, ChevronLeft, MessageSquare } from "lucide-react";
import { differenceInSeconds, addMinutes } from "date-fns";
import { EmailThread } from "@/components/assessment/EmailThread";

interface AssessmentEmail {
  id: string;
  order_index: number;
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  urgency: string;
  is_curveball: boolean;
  reply_enabled?: boolean;
  reply_mode?: string;
  reply_style?: string;
  reply_ai_prompt?: string;
  reply_pre_written?: string;
  reply_delay_min?: number;
  reply_delay_max?: number;
}

interface ThreadMessage {
  id: string;
  slot_id: string;
  original_email_id: string;
  sender_type: "original" | "candidate" | "system_reply";
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  is_read: boolean;
  scheduled_for?: string;
}

interface AssessmentData {
  slot_id: string;
  assessment_id: string;
  candidate_name: string;
  time_limit_minutes: number;
  curveball_trigger_type: string;
  curveball_trigger_value: number;
  instructions: string;
  title: string;
  started_at: string | null;
}

export default function CandidateAssessment() {
  const { token } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hasStarted, setHasStarted] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [showCurveball, setShowCurveball] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingReplies, setPendingReplies] = useState<Record<string, NodeJS.Timeout>>({});
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const curveballTriggered = useRef(false);

  // Validate token and get assessment data
  const { data: assessmentData, isLoading, error } = useQuery({
    queryKey: ["assessment-token", token],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_assessment_token", {
        p_token: token,
      });
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Invalid or expired assessment link");
      return data[0] as AssessmentData;
    },
  });

  // Fetch emails
  const { data: emails } = useQuery({
    queryKey: ["assessment-emails", assessmentData?.assessment_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_emails")
        .select("*")
        .eq("assessment_id", assessmentData?.assessment_id)
        .order("order_index");
      if (error) throw error;
      return data as AssessmentEmail[];
    },
    enabled: !!assessmentData?.assessment_id,
  });

  // Fetch thread messages for all emails
  const { data: threadMessages, refetch: refetchThreads } = useQuery({
    queryKey: ["email-threads", assessmentData?.slot_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_email_threads")
        .select("*")
        .eq("slot_id", assessmentData?.slot_id)
        .order("created_at");
      if (error) throw error;
      return data as ThreadMessage[];
    },
    enabled: !!assessmentData?.slot_id && hasStarted,
    refetchInterval: 10000, // Poll for new replies every 10 seconds
  });

  // Fetch existing responses
  const { data: existingResponses } = useQuery({
    queryKey: ["assessment-responses", assessmentData?.slot_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_responses")
        .select("*")
        .eq("slot_id", assessmentData?.slot_id);
      if (error) throw error;
      return data;
    },
    enabled: !!assessmentData?.slot_id && hasStarted,
  });

  // Load existing responses into state
  useEffect(() => {
    if (existingResponses) {
      const resMap: Record<string, string> = {};
      existingResponses.forEach((r) => {
        resMap[r.email_id] = r.response_text || "";
      });
      setResponses(resMap);
    }
  }, [existingResponses]);

  // Check if already started
  useEffect(() => {
    if (assessmentData?.started_at) {
      setHasStarted(true);
    }
  }, [assessmentData]);

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || !assessmentData) return;

    const startTime = assessmentData.started_at
      ? new Date(assessmentData.started_at)
      : new Date();
    const endTime = addMinutes(startTime, assessmentData.time_limit_minutes);

    const interval = setInterval(() => {
      const remaining = differenceInSeconds(endTime, new Date());
      setTimeRemaining(Math.max(0, remaining));

      // Check curveball trigger (time-based)
      if (
        !curveballTriggered.current &&
        assessmentData.curveball_trigger_type === "time"
      ) {
        const elapsedMinutes = (assessmentData.time_limit_minutes * 60 - remaining) / 60;
        if (elapsedMinutes >= assessmentData.curveball_trigger_value) {
          triggerCurveball();
        }
      }

      // Auto-submit when time runs out
      if (remaining <= 0) {
        clearInterval(interval);
        handleSubmit();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStarted, assessmentData]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!hasStarted || !assessmentData) return;

    autoSaveTimer.current = setInterval(() => {
      saveResponses();
    }, 30000);

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [hasStarted, assessmentData, responses]);

  // Cleanup pending reply timers on unmount
  useEffect(() => {
    return () => {
      Object.values(pendingReplies).forEach((timer) => clearTimeout(timer));
    };
  }, [pendingReplies]);

  const triggerCurveball = useCallback(async () => {
    if (curveballTriggered.current) return;
    curveballTriggered.current = true;
    setShowCurveball(true);

    // Mark curveball as shown in DB
    await supabase.rpc("mark_curveball_shown", { p_token: token });

    // Show notification
    toast.warning("📧 New urgent email received!", {
      duration: 5000,
      description: "Check your inbox for an important message.",
    });
  }, [token]);

  // Check progress-based curveball trigger
  useEffect(() => {
    if (
      !hasStarted ||
      !assessmentData ||
      !emails ||
      curveballTriggered.current ||
      assessmentData.curveball_trigger_type !== "progress"
    )
      return;

    const regularEmails = emails.filter((e) => !e.is_curveball);
    const respondedCount = regularEmails.filter((e) => responses[e.id]?.trim()).length;
    const progressPercent = (respondedCount / regularEmails.length) * 100;

    if (progressPercent >= assessmentData.curveball_trigger_value) {
      triggerCurveball();
    }
  }, [responses, emails, assessmentData, hasStarted, triggerCurveball]);

  const startAssessment = async () => {
    const { data: success } = await supabase.rpc("start_assessment", { p_token: token });
    if (success) {
      setHasStarted(true);
      toast.success("Assessment started. Good luck!");
    } else {
      toast.error("Failed to start assessment");
    }
  };

  const saveResponses = async () => {
    if (!assessmentData) return;

    const responsesToSave = Object.entries(responses).map(([emailId, text]) => ({
      slot_id: assessmentData.slot_id,
      email_id: emailId,
      response_text: text,
      last_saved_at: new Date().toISOString(),
    }));

    for (const response of responsesToSave) {
      await supabase.from("assessment_responses").upsert(response, {
        onConflict: "slot_id,email_id",
      });
    }
  };

  // Send a response and schedule AI reply
  const sendResponse = async (emailId: string, content: string) => {
    if (!assessmentData || !content.trim()) return;

    const email = emails?.find((e) => e.id === emailId);
    if (!email) return;

    // Save response to assessment_responses (for backward compatibility)
    await supabase.from("assessment_responses").upsert({
      slot_id: assessmentData.slot_id,
      email_id: emailId,
      response_text: content,
      last_saved_at: new Date().toISOString(),
    }, { onConflict: "slot_id,email_id" });

    // Insert candidate's message into thread
    const { data: threadMessage, error: threadError } = await supabase
      .from("assessment_email_threads")
      .insert({
        slot_id: assessmentData.slot_id,
        original_email_id: emailId,
        sender_type: "candidate",
        sender_name: assessmentData.candidate_name,
        sender_email: "candidate@assessment.local",
        content: content,
        is_read: true,
      })
      .select()
      .single();

    if (threadError) {
      console.error("Error saving thread message:", threadError);
      toast.error("Failed to send response");
      return;
    }

    // Refetch threads to show the new message
    refetchThreads();

    // Schedule AI reply if enabled
    if (email.reply_enabled) {
      const delayMin = email.reply_delay_min || 4;
      const delayMax = email.reply_delay_max || 8;
      const randomDelay = delayMin + Math.random() * (delayMax - delayMin);
      const delayMs = randomDelay * 60 * 1000; // Convert to milliseconds

      console.log(`Scheduling reply for email ${emailId} in ${randomDelay.toFixed(1)} minutes`);

      const timer = setTimeout(async () => {
        try {
          const response = await supabase.functions.invoke("generate-assessment-reply", {
            body: {
              thread_message_id: threadMessage.id,
              email_id: emailId,
              slot_id: assessmentData.slot_id,
              candidate_response: content,
              reply_mode: email.reply_mode || "ai",
              reply_style: email.reply_style,
              reply_ai_prompt: email.reply_ai_prompt,
              reply_pre_written: email.reply_pre_written,
              original_email: {
                sender_name: email.sender_name,
                sender_email: email.sender_email,
                subject: email.subject,
                body: email.body,
              },
            },
          });

          if (response.error) {
            console.error("Error generating reply:", response.error);
          } else {
            console.log("Reply generated successfully");
            refetchThreads();
            toast.info("📧 New reply received!", {
              duration: 4000,
              description: `${email.sender_name} has responded to your email.`,
            });
          }
        } catch (err) {
          console.error("Error calling generate-assessment-reply:", err);
        }

        // Remove timer from pending
        setPendingReplies((prev) => {
          const updated = { ...prev };
          delete updated[emailId];
          return updated;
        });
      }, delayMs);

      // Track pending timer
      setPendingReplies((prev) => ({ ...prev, [emailId]: timer }));
    }

    toast.success("Response sent!");
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await saveResponses();

    const { data: success } = await supabase.rpc("submit_assessment", { p_token: token });
    if (success) {
      toast.success("Assessment submitted successfully!");
      navigate("/assessment/complete");
    } else {
      toast.error("Failed to submit assessment");
    }
    setIsSubmitting(false);
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-500 text-white";
      case "high":
        return "bg-orange-500 text-white";
      case "normal":
        return "bg-blue-500 text-white";
      case "low":
        return "bg-gray-400 text-white";
      default:
        return "bg-gray-400 text-white";
    }
  };

  // Get thread messages for a specific email
  const getThreadForEmail = (emailId: string): ThreadMessage[] => {
    return (threadMessages || []).filter((m) => m.original_email_id === emailId);
  };

  // Check if email has unread replies
  const hasUnreadReplies = (emailId: string): boolean => {
    return getThreadForEmail(emailId).some(
      (m) => m.sender_type === "system_reply" && !m.is_read
    );
  };

  // Get response count for an email (including thread messages)
  const getResponseCount = (emailId: string): number => {
    const thread = getThreadForEmail(emailId);
    return thread.filter((m) => m.sender_type === "candidate").length;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Skeleton className="h-8 w-64 mx-auto mb-4" />
          <Skeleton className="h-4 w-48 mx-auto" />
        </div>
      </div>
    );
  }

  if (error || !assessmentData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Assessment Link</h2>
            <p className="text-muted-foreground">
              This assessment link is invalid, expired, or has already been completed.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Instructions screen before starting
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{assessmentData.title}</CardTitle>
            <CardDescription>Written Assessment - Inbox Simulation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Welcome, {assessmentData.candidate_name}!</h3>
              <div className="prose prose-sm text-muted-foreground">
                {assessmentData.instructions || (
                  <p>
                    In this assessment, you will be presented with a simulated email inbox. Your
                    task is to read each email carefully and draft appropriate responses. You have{" "}
                    <strong>{assessmentData.time_limit_minutes} minutes</strong> to complete the
                    assessment.
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <Clock className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">{assessmentData.time_limit_minutes} minutes</p>
                <p className="text-sm text-muted-foreground">Time Limit</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="font-semibold">{emails?.filter((e) => !e.is_curveball).length || 0}</p>
                <p className="text-sm text-muted-foreground">Emails to Review</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg dark:bg-amber-950/30 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                  <p className="font-semibold mb-1">Important Notes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Once started, the timer cannot be paused</li>
                    <li>Your responses are auto-saved every 30 seconds</li>
                    <li>You can submit early by clicking "Submit Assessment"</li>
                    <li>New emails may arrive during the assessment</li>
                    <li>Senders may reply to your responses - check back for updates!</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button onClick={startAssessment} className="w-full" size="lg">
              Start Assessment
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main assessment interface
  const visibleEmails = emails?.filter((e) => !e.is_curveball || showCurveball) || [];
  const selectedEmail = visibleEmails.find((e) => e.id === selectedEmailId);
  const selectedEmailThread = selectedEmailId ? getThreadForEmail(selectedEmailId) : [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with timer */}
      <header className="bg-primary text-primary-foreground py-3 px-4 shadow-lg sticky top-0 z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Inbox className="w-6 h-6" />
            <div>
              <h1 className="font-semibold">{assessmentData.title}</h1>
              <p className="text-sm opacity-80">{assessmentData.candidate_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining && timeRemaining < 300
                  ? "bg-red-600 animate-pulse"
                  : "bg-primary-foreground/10"
              }`}
            >
              <Clock className="w-5 h-5" />
              <span className="font-mono text-xl font-bold">
                {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
              </span>
            </div>
            <Button
              variant="secondary"
              onClick={() => setShowSubmitDialog(true)}
              disabled={isSubmitting}
            >
              <Send className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex">
        {/* Email list sidebar */}
        <aside className="w-80 border-r bg-muted/30 flex flex-col">
          <div className="p-4 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <Inbox className="w-4 h-4" />
              Inbox ({visibleEmails.length})
            </h2>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {visibleEmails.map((email) => {
                const hasResponse = getResponseCount(email.id) > 0 || !!responses[email.id]?.trim();
                const isNew = email.is_curveball && showCurveball;
                const hasNewReply = hasUnreadReplies(email.id);
                const threadCount = getThreadForEmail(email.id).length;

                return (
                  <button
                    key={email.id}
                    onClick={() => setSelectedEmailId(email.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedEmailId === email.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted"
                    } ${isNew ? "ring-2 ring-orange-400 animate-pulse" : ""} ${
                      hasNewReply ? "ring-2 ring-amber-400" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={`text-xs ${getUrgencyColor(email.urgency)}`}>
                        {email.urgency}
                      </Badge>
                      {isNew && (
                        <Badge className="bg-orange-500 text-white text-xs">NEW</Badge>
                      )}
                      {hasNewReply && (
                        <Badge className="bg-amber-500 text-white text-xs">REPLY</Badge>
                      )}
                      {hasResponse && (
                        <CheckCircle className="w-4 h-4 text-emerald-500 ml-auto" />
                      )}
                    </div>
                    <p className="font-medium text-sm line-clamp-1">{email.subject}</p>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        From: {email.sender_name}
                      </p>
                      {threadCount > 0 && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {threadCount}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </ScrollArea>
        </aside>

        {/* Email content and response area */}
        <main className="flex-1 flex flex-col">
          {selectedEmail ? (
            <>
              {/* Email header */}
              <div className="p-4 border-b bg-background">
                <div className="flex items-center gap-4 mb-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedEmailId(null)}>
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Back
                  </Button>
                  <Badge className={getUrgencyColor(selectedEmail.urgency)}>
                    {selectedEmail.urgency}
                  </Badge>
                  {selectedEmail.is_curveball && (
                    <Badge className="bg-orange-500 text-white">URGENT - NEW</Badge>
                  )}
                  {selectedEmail.reply_enabled && (
                    <Badge variant="outline" className="text-amber-600 border-amber-300">
                      Interactive
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-semibold">{selectedEmail.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  From: {selectedEmail.sender_name} &lt;{selectedEmail.sender_email}&gt;
                </p>
              </div>

              {/* Threaded conversation view */}
              <div className="flex-1">
                <EmailThread
                  originalEmail={selectedEmail}
                  threadMessages={selectedEmailThread}
                  currentResponse={responses[selectedEmail.id] || ""}
                  onResponseChange={(value) =>
                    setResponses({ ...responses, [selectedEmail.id]: value })
                  }
                  onSendResponse={() => {
                    sendResponse(selectedEmail.id, responses[selectedEmail.id] || "");
                    // Clear the input after sending (user can continue the conversation)
                    setResponses({ ...responses, [selectedEmail.id]: "" });
                  }}
                  candidateName={assessmentData.candidate_name}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Select an email from the inbox to view and respond</p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Submit confirmation dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit your assessment? You cannot make changes after
              submission.
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="text-sm">
                  <strong>Emails responded to:</strong>{" "}
                  {visibleEmails.filter((e) => getResponseCount(e.id) > 0 || responses[e.id]?.trim()).length} / {visibleEmails.length}
                </p>
                <p className="text-sm">
                  <strong>Time remaining:</strong>{" "}
                  {timeRemaining !== null ? formatTime(timeRemaining) : "--:--"}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Working</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Assessment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
