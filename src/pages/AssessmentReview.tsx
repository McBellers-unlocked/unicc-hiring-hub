import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  Mail,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  Save,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface ScoreData {
  legal_accuracy: number | null;
  communication: number | null;
  prioritization: number | null;
  risk_awareness: number | null;
  comments: string;
}

export default function AssessmentReview() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const preselectedSlotId = searchParams.get("slot");

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(preselectedSlotId);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, ScoreData>>({});

  // Fetch assessment
  const { data: assessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("written_assessments")
        .select("*, assessment_emails(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch completed slots
  const { data: slots } = useQuery({
    queryKey: ["assessment-slots-completed", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_slots")
        .select("*")
        .eq("assessment_id", id)
        .eq("status", "completed")
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch ALL thread messages for selected slot (to show full conversation)
  const { data: threadMessages } = useQuery({
    queryKey: ["assessment-threads", selectedSlotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_email_threads")
        .select("*")
        .eq("slot_id", selectedSlotId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSlotId,
  });

  // Fetch existing scores
  const { data: existingScores } = useQuery({
    queryKey: ["assessment-scores", selectedSlotId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_scores")
        .select("*")
        .eq("slot_id", selectedSlotId);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSlotId,
  });

  // Load existing scores into state
  useState(() => {
    if (existingScores) {
      const scoresMap: Record<string, ScoreData> = {};
      existingScores.forEach((s) => {
        scoresMap[s.email_id] = {
          legal_accuracy: s.legal_accuracy,
          communication: s.communication,
          prioritization: s.prioritization,
          risk_awareness: s.risk_awareness,
          comments: s.comments || "",
        };
      });
      setScores(scoresMap);
    }
  });

  // Save scores mutation
  const saveScoresMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSlotId || !user) throw new Error("Missing data");

      for (const [emailId, scoreData] of Object.entries(scores)) {
        await supabase.from("assessment_scores").upsert(
          {
            slot_id: selectedSlotId,
            email_id: emailId,
            scored_by: user.id,
            ...scoreData,
          },
          { onConflict: "slot_id,email_id,scored_by" }
        );
      }
    },
    onSuccess: () => {
      toast.success("Scores saved");
      queryClient.invalidateQueries({ queryKey: ["assessment-scores", selectedSlotId] });
    },
    onError: () => {
      toast.error("Failed to save scores");
    },
  });

  const updateScore = (emailId: string, field: keyof ScoreData, value: any) => {
    setScores({
      ...scores,
      [emailId]: {
        ...scores[emailId],
        [field]: value,
      },
    });
  };

  const selectedSlot = slots?.find((s) => s.id === selectedSlotId);
  const emails = assessment?.assessment_emails?.sort((a: any, b: any) => a.order_index - b.order_index) || [];
  const selectedEmail = emails.find((e: any) => e.id === selectedEmailId);
  // Get all thread messages for the selected email (full conversation)
  const emailThread = threadMessages?.filter((m) => m.original_email_id === selectedEmailId) || [];

  const getScoreLabel = (score: number | null) => {
    switch (score) {
      case 4:
        return "Excellent";
      case 3:
        return "Good";
      case 2:
        return "Adequate";
      case 1:
        return "Poor";
      default:
        return "Not scored";
    }
  };

  const getScoreColor = (score: number | null) => {
    switch (score) {
      case 4:
        return "bg-emerald-100 text-emerald-700";
      case 3:
        return "bg-blue-100 text-blue-700";
      case 2:
        return "bg-amber-100 text-amber-700";
      case 1:
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-500";
    }
  };

  if (loadingAssessment) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/assessments")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{assessment?.title}</h1>
            <p className="text-muted-foreground">Review candidate responses</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-4">
          {/* Candidate list */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Completed Submissions</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[600px]">
                {slots?.map((slot) => (
                  <button
                    key={slot.id}
                    onClick={() => {
                      setSelectedSlotId(slot.id);
                      setSelectedEmailId(null);
                    }}
                    className={`w-full text-left p-4 border-b transition-colors ${
                      selectedSlotId === slot.id ? "bg-primary/10" : "hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{slot.candidate_name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{slot.candidate_email}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {slot.started_at && slot.submitted_at
                        ? `${differenceInMinutes(
                            new Date(slot.submitted_at),
                            new Date(slot.started_at)
                          )} min`
                        : "—"}
                    </div>
                  </button>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Main review area */}
          <div className="lg:col-span-3">
            {selectedSlot ? (
              <Tabs defaultValue="responses">
                <div className="flex items-center justify-between mb-4">
                  <TabsList>
                    <TabsTrigger value="responses">Responses</TabsTrigger>
                    <TabsTrigger value="summary">Summary</TabsTrigger>
                  </TabsList>
                  <Button
                    onClick={() => saveScoresMutation.mutate()}
                    disabled={saveScoresMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save Scores
                  </Button>
                </div>

                <TabsContent value="responses" className="mt-0">
                  <div className="grid gap-4 md:grid-cols-3">
                    {/* Email list */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Emails</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        <ScrollArea className="h-[500px]">
                          {emails.map((email: any) => {
                            const hasResponse = threadMessages?.some(
                              (r) => r.original_email_id === email.id && r.sender_type === 'candidate' && r.content?.trim()
                            );
                            const score = scores[email.id];
                            const hasScore =
                              score?.legal_accuracy ||
                              score?.communication ||
                              score?.prioritization ||
                              score?.risk_awareness;

                            return (
                              <button
                                key={email.id}
                                onClick={() => setSelectedEmailId(email.id)}
                                className={`w-full text-left p-3 border-b transition-colors ${
                                  selectedEmailId === email.id ? "bg-primary/10" : "hover:bg-muted"
                                }`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge
                                    variant="outline"
                                    className={
                                      email.is_curveball
                                        ? "bg-orange-100 text-orange-700"
                                        : ""
                                    }
                                  >
                                    {email.is_curveball ? "Curveball" : email.urgency}
                                  </Badge>
                                  {hasResponse && (
                                    <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  )}
                                  {hasScore && (
                                    <Badge className="bg-primary/10 text-primary text-xs ml-auto">
                                      Scored
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-sm font-medium line-clamp-1">{email.subject}</p>
                              </button>
                            );
                          })}
                        </ScrollArea>
                      </CardContent>
                    </Card>

                    {/* Response and scoring */}
                    <Card className="md:col-span-2">
                      {selectedEmail ? (
                        <>
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  selectedEmail.is_curveball
                                    ? "bg-orange-100 text-orange-700"
                                    : ""
                                }
                              >
                                {selectedEmail.is_curveball ? "Curveball" : selectedEmail.urgency}
                              </Badge>
                            </div>
                            <CardTitle className="text-lg">{selectedEmail.subject}</CardTitle>
                            <CardDescription>
                              From: {selectedEmail.sender_name} &lt;{selectedEmail.sender_email}&gt;
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <ScrollArea className="h-[400px]">
                              <div className="space-y-6">
                                {/* Original email */}
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Original Email
                                  </Label>
                                  <div className="mt-1 p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                                    {selectedEmail.body}
                                  </div>
                                </div>

                                {/* Full Email Thread */}
                                <div>
                                  <Label className="text-xs text-muted-foreground">
                                    Conversation Thread
                                  </Label>
                                  <div className="mt-2 space-y-3">
                                    {emailThread.length > 0 ? (
                                      emailThread.map((message) => (
                                        <div key={message.id}>
                                          <div className="text-xs text-muted-foreground mb-1">
                                            {message.sender_type === 'candidate' 
                                              ? "Candidate's Response" 
                                              : `Reply from ${message.sender_name}`}
                                            <span className="ml-2 opacity-60">
                                              {format(new Date(message.created_at), "HH:mm:ss")}
                                            </span>
                                          </div>
                                          <div className={`p-3 rounded-lg text-sm whitespace-pre-wrap ${
                                            message.sender_type === 'candidate' 
                                              ? "bg-blue-50 border border-blue-200" 
                                              : "bg-amber-50 border border-amber-200"
                                          }`}>
                                            {message.content}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-3 bg-muted rounded-lg text-sm">
                                        <span className="text-muted-foreground italic">
                                          No response provided
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Expected guidance */}
                                {selectedEmail.expected_response_guidance && (
                                  <div>
                                    <Label className="text-xs text-muted-foreground">
                                      Expected Response Guidance
                                    </Label>
                                    <div className="mt-1 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm whitespace-pre-wrap">
                                      {selectedEmail.expected_response_guidance}
                                    </div>
                                  </div>
                                )}

                                {/* Scoring */}
                                <div className="border-t pt-4">
                                  <Label className="font-semibold">Scoring (1-4)</Label>
                                  <div className="grid grid-cols-2 gap-4 mt-3">
                                    {[
                                      { key: "legal_accuracy", label: "Legal Accuracy" },
                                      { key: "communication", label: "Communication" },
                                      { key: "prioritization", label: "Prioritization" },
                                      { key: "risk_awareness", label: "Risk Awareness" },
                                    ].map(({ key, label }) => (
                                      <div key={key} className="space-y-1">
                                        <Label className="text-xs">{label}</Label>
                                        <Select
                                          value={
                                            scores[selectedEmail.id]?.[key as keyof ScoreData]?.toString() ||
                                            ""
                                          }
                                          onValueChange={(v) =>
                                            updateScore(
                                              selectedEmail.id,
                                              key as keyof ScoreData,
                                              v ? parseInt(v) : null
                                            )
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Score" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="1">1 - Poor</SelectItem>
                                            <SelectItem value="2">2 - Adequate</SelectItem>
                                            <SelectItem value="3">3 - Good</SelectItem>
                                            <SelectItem value="4">4 - Excellent</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="mt-4 space-y-1">
                                    <Label className="text-xs">Comments</Label>
                                    <Textarea
                                      value={scores[selectedEmail.id]?.comments || ""}
                                      onChange={(e) =>
                                        updateScore(selectedEmail.id, "comments", e.target.value)
                                      }
                                      placeholder="Add notes about this response..."
                                      rows={3}
                                    />
                                  </div>
                                </div>
                              </div>
                            </ScrollArea>
                          </CardContent>
                        </>
                      ) : (
                        <CardContent className="flex items-center justify-center h-[500px] text-muted-foreground">
                          <div className="text-center">
                            <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
                            <p>Select an email to review</p>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="summary" className="mt-0">
                  <Card>
                    <CardHeader>
                      <CardTitle>Assessment Summary</CardTitle>
                      <CardDescription>
                        {selectedSlot.candidate_name} - Submitted{" "}
                        {selectedSlot.submitted_at &&
                          format(new Date(selectedSlot.submitted_at), "MMM d, yyyy h:mm a")}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Time Stats</h4>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Started</dt>
                              <dd>
                                {selectedSlot.started_at
                                  ? format(new Date(selectedSlot.started_at), "h:mm a")
                                  : "—"}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Submitted</dt>
                              <dd>
                                {selectedSlot.submitted_at
                                  ? format(new Date(selectedSlot.submitted_at), "h:mm a")
                                  : "—"}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Duration</dt>
                              <dd className="font-semibold">
                                {selectedSlot.started_at && selectedSlot.submitted_at
                                  ? `${differenceInMinutes(
                                      new Date(selectedSlot.submitted_at),
                                      new Date(selectedSlot.started_at)
                                    )} minutes`
                                  : "—"}
                              </dd>
                            </div>
                          </dl>
                        </div>

                        <div className="p-4 bg-muted rounded-lg">
                          <h4 className="font-semibold mb-2">Response Stats</h4>
                          <dl className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Emails Responded</dt>
                              <dd>
                                {new Set(threadMessages?.filter((r) => r.sender_type === 'candidate' && r.content?.trim()).map((r) => r.original_email_id)).size || 0} /{" "}
                                {emails.length}
                              </dd>
                            </div>
                            <div className="flex justify-between">
                              <dt className="text-muted-foreground">Emails Scored</dt>
                              <dd>
                                {Object.values(scores).filter((s) => s.legal_accuracy).length} /{" "}
                                {emails.length}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      </div>

                      {/* Score summary */}
                      {Object.keys(scores).length > 0 && (
                        <div className="mt-6">
                          <h4 className="font-semibold mb-3">Score Overview</h4>
                          <div className="space-y-2">
                            {emails.map((email: any) => {
                              const score = scores[email.id];
                              if (!score) return null;

                              const avgScore =
                                [
                                  score.legal_accuracy,
                                  score.communication,
                                  score.prioritization,
                                  score.risk_awareness,
                                ].filter(Boolean).reduce((a, b) => a! + b!, 0) /
                                [
                                  score.legal_accuracy,
                                  score.communication,
                                  score.prioritization,
                                  score.risk_awareness,
                                ].filter(Boolean).length;

                              return (
                                <div
                                  key={email.id}
                                  className="flex items-center gap-4 p-2 bg-muted/50 rounded"
                                >
                                  <span className="flex-1 text-sm truncate">{email.subject}</span>
                                  <Badge className={getScoreColor(Math.round(avgScore))}>
                                    {avgScore.toFixed(1)}
                                  </Badge>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            ) : (
              <Card className="flex items-center justify-center h-[600px]">
                <CardContent className="text-center text-muted-foreground">
                  <User className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>Select a candidate to review their responses</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
