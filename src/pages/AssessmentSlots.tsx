import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPublicSiteUrl } from "@/lib/utils";
import { ArrowLeft, Plus, Mail, Calendar, Clock, Copy, ExternalLink, Trash2, AlertCircle } from "lucide-react";
import { format, addMinutes, addHours } from "date-fns";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AssessmentSlots() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null);

  // Fetch assessment details
  const { data: assessment, isLoading: loadingAssessment } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("written_assessments")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch slots
  const { data: slots, isLoading: loadingSlots } = useQuery({
    queryKey: ["assessment-slots", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_slots")
        .select("*")
        .eq("assessment_id", id)
        .order("scheduled_start", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Create slot mutation
  const createSlotMutation = useMutation({
    mutationFn: async () => {
      if (!scheduledStart || !assessment) throw new Error("Missing data");

      const availabilityWindowHours = assessment.availability_window_hours || 24;
      const availableFrom = scheduledStart;
      const availableUntil = addHours(scheduledStart, availabilityWindowHours);
      // scheduled_end is now calculated when assessment starts, but we set a placeholder
      const scheduledEnd = addMinutes(availableUntil, assessment.time_limit_minutes);

      const { data, error } = await supabase
        .from("assessment_slots")
        .insert({
          assessment_id: id,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          scheduled_start: scheduledStart.toISOString(),
          scheduled_end: scheduledEnd.toISOString(),
          available_from: availableFrom.toISOString(),
          available_until: availableUntil.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send invite email with two-stage timing info
      await supabase.functions.invoke("send-assessment-invite", {
        body: {
          slotId: data.id,
          candidateName,
          candidateEmail,
          assessmentTitle: assessment.title,
          availableFrom: availableFrom.toISOString(),
          availableUntil: availableUntil.toISOString(),
          timeLimitMinutes: assessment.time_limit_minutes,
          accessToken: data.access_token,
        },
      });

      return data;
    },
    onSuccess: () => {
      toast.success("Candidate invited successfully");
      queryClient.invalidateQueries({ queryKey: ["assessment-slots", id] });
      setIsInviteDialogOpen(false);
      setCandidateName("");
      setCandidateEmail("");
      setScheduledStart(null);
    },
    onError: (error) => {
      toast.error("Failed to invite candidate");
      console.error(error);
    },
  });

  // Delete slot mutation
  const deleteSlotMutation = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("assessment_slots").delete().eq("id", slotId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Slot deleted");
      queryClient.invalidateQueries({ queryKey: ["assessment-slots", id] });
    },
    onError: () => {
      toast.error("Failed to delete slot");
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-emerald-100 text-emerald-700">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-700">In Progress</Badge>;
      case "scheduled":
        return <Badge variant="secondary">Scheduled</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-muted-foreground">Expired</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const copyAssessmentLink = (token: string) => {
    const link = `${getPublicSiteUrl()}/assessment/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
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
            <p className="text-muted-foreground">Manage candidate slots and invitations</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-8 h-8 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{slots?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">Total Slots</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {slots?.filter((s) => s.status === "scheduled" || s.status === "in_progress").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="w-8 h-8 text-emerald-500" />
                <div>
                  <p className="text-2xl font-bold">
                    {slots?.filter((s) => s.status === "completed").length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Candidate Slots</CardTitle>
              <CardDescription>Invite candidates and track their assessment progress</CardDescription>
            </div>
            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={assessment?.status !== "active"}>
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Candidate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Candidate</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a candidate to take this assessment.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Candidate Name</Label>
                    <Input
                      id="name"
                      value={candidateName}
                      onChange={(e) => setCandidateName(e.target.value)}
                      placeholder="John Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Candidate Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={candidateEmail}
                      onChange={(e) => setCandidateEmail(e.target.value)}
                      placeholder="john.smith@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Assessment Opens At</Label>
                    <DatePicker
                      selected={scheduledStart}
                      onChange={(date: Date | null) => setScheduledStart(date)}
                      showTimeSelect
                      dateFormat="MMMM d, yyyy h:mm aa"
                      minDate={new Date()}
                      className="w-full px-3 py-2 border border-input rounded-md bg-background"
                      placeholderText="Select date and time"
                    />
                    <p className="text-xs text-muted-foreground">
                      When the assessment becomes available to the candidate
                    </p>
                  </div>
                  
                  {scheduledStart && assessment && (
                    <div className="bg-muted/50 p-3 rounded-lg border text-sm space-y-1">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Candidate will receive:</span>
                      </div>
                      <ul className="list-disc list-inside text-muted-foreground ml-6 space-y-1">
                        <li>Assessment opens: <strong className="text-foreground">{format(scheduledStart, "MMM d, yyyy 'at' h:mm a")}</strong></li>
                        <li>Must start within: <strong className="text-foreground">{assessment.availability_window_hours || 24} hours</strong></li>
                        <li>Time to complete once started: <strong className="text-foreground">{assessment.time_limit_minutes} minutes</strong></li>
                      </ul>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => createSlotMutation.mutate()}
                    disabled={
                      createSlotMutation.isPending ||
                      !candidateName ||
                      !candidateEmail ||
                      !scheduledStart
                    }
                  >
                    {createSlotMutation.isPending ? "Sending..." : "Send Invitation"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loadingSlots ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : slots?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No candidates invited yet</p>
                <p className="text-sm">Click "Invite Candidate" to get started</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Available Window</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {slots?.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{slot.candidate_name}</p>
                          <p className="text-sm text-muted-foreground">{slot.candidate_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(slot.available_from || slot.scheduled_start), "MMM d, yyyy h:mm a")}</p>
                          {slot.available_until && (
                            <p className="text-xs text-muted-foreground">
                              Until {format(new Date(slot.available_until), "h:mm a")}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(slot.status)}</TableCell>
                      <TableCell>
                        {slot.started_at
                          ? format(new Date(slot.started_at), "h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell>
                        {slot.submitted_at
                          ? format(new Date(slot.submitted_at), "h:mm a")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyAssessmentLink(slot.access_token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          {slot.status === "completed" && (
                            <Link to={`/admin/assessments/${id}/review?slot=${slot.id}`}>
                              <Button variant="ghost" size="sm">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          )}
                          {slot.status === "scheduled" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteSlotMutation.mutate(slot.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
