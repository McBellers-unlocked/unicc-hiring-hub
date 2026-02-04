import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, GripVertical, Mail, AlertTriangle, Save, Eye, Users, Upload, FileText, Download, X } from "lucide-react";
import { EmailReplySettings } from "@/components/assessment/EmailReplySettings";
import { TemplateVariablesHelper } from "@/components/assessment/TemplateVariablesHelper";

interface AssessmentEmail {
  id?: string;
  order_index: number;
  sender_name: string;
  sender_email: string;
  subject: string;
  body: string;
  urgency: "low" | "normal" | "high" | "urgent";
  is_curveball: boolean;
  expected_response_guidance: string;
  reply_enabled?: boolean;
  reply_mode?: "ai" | "pre_written";
  reply_style?: string;
  reply_ai_prompt?: string;
  reply_pre_written?: string;
  reply_delay_min?: number;
  reply_delay_max?: number;
}

type AssessmentType = "inbox_simulation" | "research_exercise";

export default function AssessmentBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!id;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [timeLimit, setTimeLimit] = useState(90);
  const [availabilityWindowHours, setAvailabilityWindowHours] = useState(24);
  const [curveballTriggerType, setCurveballTriggerType] = useState<"time" | "progress">("time");
  const [curveballTriggerValue, setCurveballTriggerValue] = useState(36);
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [emails, setEmails] = useState<AssessmentEmail[]>([]);
  const [activeTab, setActiveTab] = useState("basics");

  // New state for assessment type
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("inbox_simulation");
  const [timeLimitHours, setTimeLimitHours] = useState(48);
  const [referenceDocumentUrl, setReferenceDocumentUrl] = useState("");
  const [referenceDocumentName, setReferenceDocumentName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Save and continue to next tab
  const saveAndContinue = async (nextTab: string) => {
    try {
      await saveMutation.mutateAsync();
      setActiveTab(nextTab);
    } catch (error) {
      // Error is already handled by mutation's onError
    }
  };

  // Fetch existing assessment
  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("written_assessments")
        .select("*, assessment_emails(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Populate form when assessment loads
  useEffect(() => {
    if (assessment) {
      setTitle(assessment.title);
      setDescription(assessment.description || "");
      setInstructions(assessment.instructions || "");
      setTimeLimit(assessment.time_limit_minutes);
      setAvailabilityWindowHours(assessment.availability_window_hours || 24);
      setCurveballTriggerType(assessment.curveball_trigger_type || "time");
      setCurveballTriggerValue(assessment.curveball_trigger_value || 36);
      setStatus(assessment.status);
      
      // Load assessment type fields
      setAssessmentType((assessment.assessment_type as AssessmentType) || "inbox_simulation");
      setTimeLimitHours(assessment.time_limit_hours || 48);
      setReferenceDocumentUrl(assessment.reference_document_url || "");
      setReferenceDocumentName(assessment.reference_document_name || "");
      
      setEmails(
        (assessment.assessment_emails || [])
          .sort((a: any, b: any) => a.order_index - b.order_index)
          .map((e: any) => ({
            id: e.id,
            order_index: e.order_index,
            sender_name: e.sender_name,
            sender_email: e.sender_email,
            subject: e.subject,
            body: e.body,
            urgency: e.urgency,
            is_curveball: e.is_curveball,
            expected_response_guidance: e.expected_response_guidance || "",
            reply_enabled: e.reply_enabled || false,
            reply_mode: e.reply_mode || "ai",
            reply_style: e.reply_style || "clarification",
            reply_ai_prompt: e.reply_ai_prompt || "",
            reply_pre_written: e.reply_pre_written || "",
            reply_delay_min: e.reply_delay_min || 4,
            reply_delay_max: e.reply_delay_max || 8,
          }))
      );
    }
  }, [assessment]);

  // Handle document upload
  const handleDocumentUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // For new assessments, use a temporary ID
      const assessmentId = id || crypto.randomUUID();
      const filePath = `reference/${assessmentId}/${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("assessment-documents")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("assessment-documents")
        .getPublicUrl(filePath);

      setReferenceDocumentUrl(publicUrl);
      setReferenceDocumentName(file.name);
      toast.success("Document uploaded successfully");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const removeDocument = () => {
    setReferenceDocumentUrl("");
    setReferenceDocumentName("");
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const assessmentData: any = {
        title,
        description,
        instructions,
        time_limit_minutes: assessmentType === "inbox_simulation" ? timeLimit : timeLimitHours * 60,
        availability_window_hours: availabilityWindowHours,
        curveball_trigger_type: curveballTriggerType,
        curveball_trigger_value: curveballTriggerValue,
        status,
        created_by: user?.id,
        assessment_type: assessmentType,
        time_limit_hours: assessmentType === "research_exercise" ? timeLimitHours : null,
        reference_document_url: assessmentType === "research_exercise" ? referenceDocumentUrl : null,
        reference_document_name: assessmentType === "research_exercise" ? referenceDocumentName : null,
      };

      let assessmentId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("written_assessments")
          .update(assessmentData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("written_assessments")
          .insert(assessmentData)
          .select()
          .single();
        if (error) throw error;
        assessmentId = data.id;
      }

      // Handle emails - only for inbox simulation
      if (assessmentId && assessmentType === "inbox_simulation") {
        await supabase.from("assessment_emails").delete().eq("assessment_id", assessmentId);

        if (emails.length > 0) {
          const emailsToInsert = emails.map((email, index) => ({
            assessment_id: assessmentId,
            order_index: index,
            sender_name: email.sender_name,
            sender_email: email.sender_email,
            subject: email.subject,
            body: email.body,
            urgency: email.urgency,
            is_curveball: email.is_curveball,
            expected_response_guidance: email.expected_response_guidance,
            reply_enabled: email.reply_enabled || false,
            reply_mode: email.reply_mode || "ai",
            reply_style: email.reply_style || "clarification",
            reply_ai_prompt: email.reply_ai_prompt || "",
            reply_pre_written: email.reply_pre_written || "",
            reply_delay_min: email.reply_delay_min || 4,
            reply_delay_max: email.reply_delay_max || 8,
          }));

          const { error } = await supabase.from("assessment_emails").insert(emailsToInsert);
          if (error) throw error;
        }
      }

      return assessmentId;
    },
    onSuccess: (assessmentId) => {
      toast.success(isEditing ? "Assessment updated" : "Assessment created");
      queryClient.invalidateQueries({ queryKey: ["written-assessments"] });
      queryClient.invalidateQueries({ queryKey: ["assessment", id] });
      if (!isEditing) {
        navigate(`/admin/assessments/${assessmentId}/edit`);
      }
    },
    onError: (error) => {
      toast.error("Failed to save assessment");
      console.error(error);
    },
  });

  const addEmail = () => {
    setEmails([
      ...emails,
      {
        order_index: emails.length,
        sender_name: "",
        sender_email: "",
        subject: "",
        body: "",
        urgency: "normal",
        is_curveball: false,
        expected_response_guidance: "",
        reply_enabled: false,
        reply_mode: "ai",
        reply_style: "clarification",
        reply_ai_prompt: "",
        reply_pre_written: "",
        reply_delay_min: 4,
        reply_delay_max: 8,
      },
    ]);
  };

  const updateEmail = (index: number, field: keyof AssessmentEmail, value: any) => {
    const updated = [...emails];
    updated[index] = { ...updated[index], [field]: value };
    setEmails(updated);
  };

  const removeEmail = (index: number) => {
    setEmails(emails.filter((_, i) => i !== index));
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "urgent":
        return "bg-red-100 text-red-700";
      case "high":
        return "bg-orange-100 text-orange-700";
      case "normal":
        return "bg-blue-100 text-blue-700";
      case "low":
        return "bg-gray-100 text-gray-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Determine which tabs to show based on assessment type
  const isResearchExercise = assessmentType === "research_exercise";

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <Skeleton className="h-8 w-64 mb-8" />
          <Skeleton className="h-96 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/assessments")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Assessment" : "Create Assessment"}
            </h1>
            {isEditing && (
              <Badge 
                variant={status === "active" ? "default" : status === "archived" ? "secondary" : "outline"}
                className="capitalize"
              >
                {status}
              </Badge>
            )}
          </div>
          {isEditing && (
            <Button onClick={() => navigate(`/admin/assessments/${id}/slots`)}>
              <Users className="w-4 h-4 mr-2" />
              Manage Candidates
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Conditional tabs based on assessment type */}
          <TabsList className={`grid w-full ${isResearchExercise ? "grid-cols-2" : "grid-cols-4"}`}>
            <TabsTrigger value="basics">1. Basics</TabsTrigger>
            {!isResearchExercise && (
              <>
                <TabsTrigger value="emails">2. Emails</TabsTrigger>
                <TabsTrigger value="curveball">3. Curveball</TabsTrigger>
              </>
            )}
            <TabsTrigger value="preview">{isResearchExercise ? "2. Preview" : "4. Preview"}</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
                <CardDescription>Set up the assessment title, type, and timing.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Assessment Type Selector */}
                <div className="space-y-2">
                  <Label htmlFor="assessmentType">Assessment Type</Label>
                  <Select 
                    value={assessmentType} 
                    onValueChange={(v: AssessmentType) => {
                      setAssessmentType(v);
                      // Reset to basics tab when switching types
                      setActiveTab("basics");
                    }}
                    disabled={isEditing}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="inbox_simulation">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4" />
                          <span>Inbox Simulation</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="research_exercise">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          <span>Research Exercise</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {isResearchExercise 
                      ? "Candidate downloads a document, works offline, and uploads their response"
                      : "Candidate responds to simulated emails in a timed inbox environment"
                    }
                  </p>
                  {isEditing && (
                    <p className="text-xs text-muted-foreground italic">
                      Assessment type cannot be changed after creation
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Assessment Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder={isResearchExercise 
                      ? "e.g., Contract Review Exercise" 
                      : "e.g., Legal Officer Inbox Simulation"
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the assessment..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Candidate Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder={isResearchExercise
                      ? "Instructions for the research exercise (e.g., what to review, what to submit)..."
                      : "Instructions shown to candidates before they start..."
                    }
                    rows={5}
                  />
                </div>

                {/* Conditional timing fields based on type */}
                {isResearchExercise ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeLimitHours">Time Limit (hours)</Label>
                      <Input
                        id="timeLimitHours"
                        type="number"
                        min={1}
                        max={168}
                        value={timeLimitHours}
                        onChange={(e) => setTimeLimitHours(parseInt(e.target.value) || 48)}
                      />
                      <p className="text-xs text-muted-foreground">Once started (e.g., 48 hours)</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
                      <Input
                        id="timeLimit"
                        type="number"
                        min={30}
                        max={180}
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 90)}
                      />
                      <p className="text-xs text-muted-foreground">Once started</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="availabilityWindow">Availability Window (hours)</Label>
                      <Input
                        id="availabilityWindow"
                        type="number"
                        min={1}
                        max={72}
                        value={availabilityWindowHours}
                        onChange={(e) => setAvailabilityWindowHours(parseInt(e.target.value) || 24)}
                      />
                      <p className="text-xs text-muted-foreground">Time to start after opening</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                {/* Reference Document Upload for Research Exercise */}
                {isResearchExercise && (
                  <div className="space-y-2">
                    <Label>Reference Document</Label>
                    <div className="border-2 border-dashed rounded-lg p-4">
                      {referenceDocumentUrl ? (
                        <div className="flex items-center justify-between bg-muted/50 p-3 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary" />
                            <div>
                              <p className="font-medium">{referenceDocumentName}</p>
                              <a 
                                href={referenceDocumentUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline flex items-center gap-1"
                              >
                                <Download className="w-3 h-3" />
                                Download
                              </a>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" onClick={removeDocument}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="text-center">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.txt"
                            onChange={handleDocumentUpload}
                          />
                          <FileText className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload the document candidates will review and work with
                          </p>
                          <Button 
                            variant="outline" 
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                          >
                            <Upload className="w-4 h-4 mr-2" />
                            {isUploading ? "Uploading..." : "Upload Document"}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Accepted: PDF, DOC, DOCX, TXT
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* How timing works explanation */}
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">
                    {isResearchExercise ? "How research exercise timing works:" : "How the two-stage timing works:"}
                  </h4>
                  {isResearchExercise ? (
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>Candidate receives access to the assessment</li>
                      <li>When they click "Start", the <strong>{timeLimitHours}-hour</strong> timer begins</li>
                      <li>They download the reference document and work on their response</li>
                      <li>They can upload their response anytime before the timer expires</li>
                      <li>Multiple uploads allowed - only the final submission is reviewed</li>
                    </ol>
                  ) : (
                    <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                      <li>You schedule a date/time when the assessment becomes <strong>available</strong></li>
                      <li>Candidate has <strong>{availabilityWindowHours} hours</strong> from that time to start</li>
                      <li>Once they click "Start", they have <strong>{timeLimit} minutes</strong> to complete</li>
                      <li>The assessment must be completed in one sitting - no pausing</li>
                    </ol>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || !title}
              >
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button 
                onClick={() => saveAndContinue(isResearchExercise ? "preview" : "emails")}
                disabled={saveMutation.isPending || !title}
              >
                {saveMutation.isPending ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </TabsContent>

          {/* Emails tab - only for inbox simulation */}
          {!isResearchExercise && (
            <TabsContent value="emails" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Inbox Emails</CardTitle>
                  <CardDescription>
                    Create the emails candidates will see in their simulated inbox. Add 4-5 emails for a 90-minute assessment.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <TemplateVariablesHelper />
                  
                  {emails.filter((e) => !e.is_curveball).map((email, index) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                            <Badge variant="outline">Email {index + 1}</Badge>
                            <Badge className={getUrgencyColor(email.urgency)}>{email.urgency}</Badge>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEmail(emails.indexOf(email))}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <Label>Sender Name</Label>
                            <Input
                              value={email.sender_name}
                              onChange={(e) => updateEmail(emails.indexOf(email), "sender_name", e.target.value)}
                              placeholder="John Smith"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Sender Email</Label>
                            <Input
                              value={email.sender_email}
                              onChange={(e) => updateEmail(emails.indexOf(email), "sender_email", e.target.value)}
                              placeholder="john.smith@unicc.org"
                            />
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <Label>Subject</Label>
                          <Input
                            value={email.subject}
                            onChange={(e) => updateEmail(emails.indexOf(email), "subject", e.target.value)}
                            placeholder="RE: Urgent - License Review Needed"
                          />
                        </div>

                        <div className="grid grid-cols-4 gap-4 mb-4">
                          <div className="col-span-3 space-y-2">
                            <Label>Email Body</Label>
                            <Textarea
                              value={email.body}
                              onChange={(e) => updateEmail(emails.indexOf(email), "body", e.target.value)}
                              placeholder="Write the email content..."
                              rows={6}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Urgency</Label>
                            <Select
                              value={email.urgency}
                              onValueChange={(v: any) => updateEmail(emails.indexOf(email), "urgency", v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                                <SelectItem value="urgent">Urgent</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Expected Response Guidance (for reviewers)</Label>
                          <Textarea
                            value={email.expected_response_guidance}
                            onChange={(e) =>
                              updateEmail(emails.indexOf(email), "expected_response_guidance", e.target.value)
                            }
                            placeholder="What should a strong answer include..."
                            rows={3}
                          />
                        </div>

                        {/* Reply Settings */}
                        <EmailReplySettings
                          email={email}
                          onUpdate={(field, value) => updateEmail(emails.indexOf(email), field as keyof AssessmentEmail, value)}
                        />
                      </CardContent>
                    </Card>
                  ))}

                  <Button variant="outline" onClick={addEmail} className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Email
                  </Button>
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("basics")}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !title}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button 
                    onClick={() => saveAndContinue("curveball")}
                    disabled={saveMutation.isPending || !title}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save & Continue"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Curveball tab - only for inbox simulation */}
          {!isResearchExercise && (
            <TabsContent value="curveball" className="space-y-6 mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                    Curveball Email
                  </CardTitle>
                  <CardDescription>
                    Add a surprise email that appears mid-assessment to test adaptability.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Trigger Type</Label>
                      <Select
                        value={curveballTriggerType}
                        onValueChange={(v: any) => setCurveballTriggerType(v)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="time">Time-based</SelectItem>
                          <SelectItem value="progress">Progress-based</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {curveballTriggerType === "time"
                          ? "Curveball appears after a set number of minutes"
                          : "Curveball appears after responding to a percentage of emails"}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Trigger Value ({curveballTriggerType === "time" ? "minutes" : "% complete"})
                      </Label>
                      <Input
                        type="number"
                        value={curveballTriggerValue}
                        onChange={(e) => setCurveballTriggerValue(parseInt(e.target.value) || 36)}
                        min={1}
                        max={curveballTriggerType === "time" ? timeLimit - 10 : 90}
                      />
                    </div>
                  </div>

                  {/* Curveball Email Editor */}
                  {emails.filter((e) => e.is_curveball).length === 0 ? (
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEmails([
                          ...emails,
                          {
                            order_index: 99,
                            sender_name: "",
                            sender_email: "",
                            subject: "",
                            body: "",
                            urgency: "urgent",
                            is_curveball: true,
                            expected_response_guidance: "",
                          },
                        ]);
                      }}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Curveball Email
                    </Button>
                  ) : (
                    emails
                      .filter((e) => e.is_curveball)
                      .map((email) => {
                        const emailIndex = emails.indexOf(email);
                        return (
                          <Card key="curveball" className="border-l-4 border-l-orange-500">
                            <CardContent className="pt-4">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                                  <Badge className="bg-orange-100 text-orange-700">Curveball</Badge>
                                </div>
                                <Button variant="ghost" size="sm" onClick={() => removeEmail(emailIndex)}>
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </div>

                              <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="space-y-2">
                                  <Label>Sender Name</Label>
                                  <Input
                                    value={email.sender_name}
                                    onChange={(e) => updateEmail(emailIndex, "sender_name", e.target.value)}
                                    placeholder="Emergency Contact"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Sender Email</Label>
                                  <Input
                                    value={email.sender_email}
                                    onChange={(e) => updateEmail(emailIndex, "sender_email", e.target.value)}
                                    placeholder="urgent@unicc.org"
                                  />
                                </div>
                              </div>

                              <div className="space-y-2 mb-4">
                                <Label>Subject</Label>
                                <Input
                                  value={email.subject}
                                  onChange={(e) => updateEmail(emailIndex, "subject", e.target.value)}
                                  placeholder="URGENT: Immediate Action Required"
                                />
                              </div>

                              <div className="space-y-2 mb-4">
                                <Label>Email Body</Label>
                                <Textarea
                                  value={email.body}
                                  onChange={(e) => updateEmail(emailIndex, "body", e.target.value)}
                                  placeholder="Write the curveball email content..."
                                  rows={6}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Expected Response Guidance</Label>
                                <Textarea
                                  value={email.expected_response_guidance}
                                  onChange={(e) =>
                                    updateEmail(emailIndex, "expected_response_guidance", e.target.value)
                                  }
                                  placeholder="What should a strong answer include..."
                                  rows={3}
                                />
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                  )}
                </CardContent>
              </Card>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setActiveTab("emails")}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending || !title}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button 
                    onClick={() => saveAndContinue("preview")}
                    disabled={saveMutation.isPending || !title}
                  >
                    {saveMutation.isPending ? "Saving..." : "Save & Continue"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

          <TabsContent value="preview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Assessment Preview
                </CardTitle>
                <CardDescription>Review your assessment before saving.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-2">Details</h4>
                    <dl className="space-y-2 text-sm">
                      <div>
                        <dt className="text-muted-foreground">Title</dt>
                        <dd className="font-medium">{title || "—"}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Type</dt>
                        <dd className="font-medium flex items-center gap-2">
                          {isResearchExercise ? (
                            <>
                              <FileText className="w-4 h-4" />
                              Research Exercise
                            </>
                          ) : (
                            <>
                              <Mail className="w-4 h-4" />
                              Inbox Simulation
                            </>
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Time Limit</dt>
                        <dd className="font-medium">
                          {isResearchExercise ? `${timeLimitHours} hours` : `${timeLimit} minutes`}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Status</dt>
                        <dd>
                          <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  
                  {isResearchExercise ? (
                    <div>
                      <h4 className="font-semibold mb-2">Reference Document</h4>
                      {referenceDocumentUrl ? (
                        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                          <div>
                            <p className="font-medium text-sm">{referenceDocumentName}</p>
                            <a 
                              href={referenceDocumentUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-primary hover:underline"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No document uploaded</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-semibold mb-2">Emails</h4>
                      <dl className="space-y-2 text-sm">
                        <div>
                          <dt className="text-muted-foreground">Regular Emails</dt>
                          <dd className="font-medium">{emails.filter((e) => !e.is_curveball).length}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Curveball Email</dt>
                          <dd className="font-medium">
                            {emails.filter((e) => e.is_curveball).length > 0 ? "Yes" : "No"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Curveball Trigger</dt>
                          <dd className="font-medium">
                            After {curveballTriggerValue}{" "}
                            {curveballTriggerType === "time" ? "minutes" : "% complete"}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  )}
                </div>

                {!isResearchExercise && (
                  <div>
                    <h4 className="font-semibold mb-2">Email Summary</h4>
                    <div className="space-y-2">
                      {emails
                        .filter((e) => !e.is_curveball)
                        .map((email, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-3 p-2 bg-muted rounded-lg text-sm"
                          >
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <Badge className={getUrgencyColor(email.urgency)} variant="outline">
                              {email.urgency}
                            </Badge>
                            <span className="font-medium">{email.subject || "No subject"}</span>
                            <span className="text-muted-foreground">from {email.sender_name || "—"}</span>
                          </div>
                        ))}
                      {emails
                        .filter((e) => e.is_curveball)
                        .map((email, i) => (
                          <div
                            key={`curveball-${i}`}
                            className="flex items-center gap-3 p-2 bg-orange-50 border border-orange-200 rounded-lg text-sm"
                          >
                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                            <Badge className="bg-orange-100 text-orange-700">Curveball</Badge>
                            <span className="font-medium">{email.subject || "No subject"}</span>
                            <span className="text-muted-foreground">
                              (appears after {curveballTriggerValue}{" "}
                              {curveballTriggerType === "time" ? "min" : "%"})
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {isResearchExercise && instructions && (
                  <div>
                    <h4 className="font-semibold mb-2">Candidate Instructions</h4>
                    <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {instructions}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab(isResearchExercise ? "basics" : "curveball")}>
                Back
              </Button>
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !title}>
                <Save className="w-4 h-4 mr-2" />
                {saveMutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Create Assessment"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
