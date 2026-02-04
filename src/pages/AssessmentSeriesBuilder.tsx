import { useState, useEffect } from "react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, Save, GripVertical, Layers, Clock, FileText, Lock, Unlock } from "lucide-react";
import { format } from "date-fns";

interface SeriesPart {
  id?: string;
  assessment_id: string;
  part_number: number;
  part_title: string;
  unlock_after_previous: boolean;
  assessment?: {
    id: string;
    title: string;
    assessment_type: string;
    time_limit_minutes: number;
    time_limit_hours: number | null;
  };
}

export default function AssessmentSeriesBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEditing = !!id;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [seriesOpensAt, setSeriesOpensAt] = useState("");
  const [seriesClosesAt, setSeriesClosesAt] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "archived">("draft");
  const [parts, setParts] = useState<SeriesPart[]>([]);
  const [activeTab, setActiveTab] = useState("basics");

  // Fetch available assessments for adding to series
  const { data: availableAssessments } = useQuery({
    queryKey: ["available-assessments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("written_assessments")
        .select("id, title, assessment_type, time_limit_minutes, time_limit_hours")
        .order("title");
      if (error) throw error;
      return data;
    },
  });

  // Fetch existing series
  const { data: series, isLoading } = useQuery({
    queryKey: ["assessment-series", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("assessment_series")
        .select(`
          *,
          assessment_series_parts(
            id,
            assessment_id,
            part_number,
            part_title,
            unlock_after_previous,
            written_assessments(id, title, assessment_type, time_limit_minutes, time_limit_hours)
          )
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: isEditing,
  });

  // Populate form when series loads
  useEffect(() => {
    if (series) {
      setTitle(series.title);
      setDescription(series.description || "");
      setSeriesOpensAt(series.series_opens_at ? format(new Date(series.series_opens_at), "yyyy-MM-dd'T'HH:mm") : "");
      setSeriesClosesAt(series.series_closes_at ? format(new Date(series.series_closes_at), "yyyy-MM-dd'T'HH:mm") : "");
      setStatus(series.status);
      setParts(
        (series.assessment_series_parts || [])
          .sort((a: any, b: any) => a.part_number - b.part_number)
          .map((p: any) => ({
            id: p.id,
            assessment_id: p.assessment_id,
            part_number: p.part_number,
            part_title: p.part_title || "",
            unlock_after_previous: p.unlock_after_previous,
            assessment: p.written_assessments,
          }))
      );
    }
  }, [series]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      const seriesData = {
        title,
        description,
        series_opens_at: seriesOpensAt ? new Date(seriesOpensAt).toISOString() : null,
        series_closes_at: seriesClosesAt ? new Date(seriesClosesAt).toISOString() : null,
        status,
        created_by: user?.id,
      };

      let seriesId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("assessment_series")
          .update(seriesData)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("assessment_series")
          .insert(seriesData)
          .select()
          .single();
        if (error) throw error;
        seriesId = data.id;
      }

      // Handle parts - delete existing and insert new
      if (seriesId) {
        await supabase.from("assessment_series_parts").delete().eq("series_id", seriesId);

        if (parts.length > 0) {
          const partsToInsert = parts.map((part, index) => ({
            series_id: seriesId,
            assessment_id: part.assessment_id,
            part_number: index + 1,
            part_title: part.part_title,
            unlock_after_previous: part.unlock_after_previous,
          }));

          const { error } = await supabase.from("assessment_series_parts").insert(partsToInsert);
          if (error) throw error;
        }
      }

      return seriesId;
    },
    onSuccess: (seriesId) => {
      toast.success(isEditing ? "Series updated" : "Series created");
      queryClient.invalidateQueries({ queryKey: ["assessment-series"] });
      if (!isEditing) {
        navigate(`/admin/assessment-series/${seriesId}/edit`);
      }
    },
    onError: (error) => {
      toast.error("Failed to save series");
      console.error(error);
    },
  });

  const saveAndContinue = async (nextTab: string) => {
    try {
      await saveMutation.mutateAsync();
      setActiveTab(nextTab);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const addPart = (assessmentId: string) => {
    const assessment = availableAssessments?.find(a => a.id === assessmentId);
    if (!assessment) return;

    setParts([
      ...parts,
      {
        assessment_id: assessmentId,
        part_number: parts.length + 1,
        part_title: `Part ${parts.length + 1}: ${assessment.title}`,
        unlock_after_previous: parts.length > 0,
        assessment: assessment as any,
      },
    ]);
  };

  const updatePart = (index: number, field: keyof SeriesPart, value: any) => {
    const updated = [...parts];
    updated[index] = { ...updated[index], [field]: value };
    setParts(updated);
  };

  const removePart = (index: number) => {
    setParts(parts.filter((_, i) => i !== index));
  };

  const getAssessmentTypeLabel = (type: string | null) => {
    switch (type) {
      case "inbox_simulation":
        return "Inbox Simulation";
      case "research_exercise":
        return "Research Exercise";
      default:
        return "Inbox Simulation";
    }
  };

  const getTimeLimitDisplay = (assessment: any) => {
    if (assessment?.assessment_type === "research_exercise" && assessment?.time_limit_hours) {
      return `${assessment.time_limit_hours} hours`;
    }
    return `${assessment?.time_limit_minutes || 90} minutes`;
  };

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
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/assessment-series")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Series" : "Create Assessment Series"}
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basics">1. Basics</TabsTrigger>
            <TabsTrigger value="parts">2. Parts</TabsTrigger>
            <TabsTrigger value="preview">3. Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="basics" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Series Information</CardTitle>
                <CardDescription>Set up the series title, description, and availability window.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Series Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Associate Policy Officer Assessment"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Brief description of the assessment series..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="opensAt">Series Opens At</Label>
                    <Input
                      id="opensAt"
                      type="datetime-local"
                      value={seriesOpensAt}
                      onChange={(e) => setSeriesOpensAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">When candidates can start</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="closesAt">Series Closes At</Label>
                    <Input
                      id="closesAt"
                      type="datetime-local"
                      value={seriesClosesAt}
                      onChange={(e) => setSeriesClosesAt(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">Final deadline for all parts</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg border">
                  <h4 className="font-medium mb-2">How series timing works:</h4>
                  <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-1">
                    <li>The series becomes available at the <strong>Opens At</strong> date/time</li>
                    <li>Candidates must complete <strong>all parts</strong> before the <strong>Closes At</strong> deadline</li>
                    <li>Each part has its own time limit once started</li>
                    <li>Parts can be configured to unlock only after the previous part is completed</li>
                  </ol>
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
                onClick={() => saveAndContinue("parts")}
                disabled={saveMutation.isPending || !title}
              >
                {saveMutation.isPending ? "Saving..." : "Save & Continue"}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="parts" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Series Parts</CardTitle>
                <CardDescription>
                  Add assessments as parts of this series. Candidates will complete them in order.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {parts.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Layers className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No parts added yet. Select an assessment to add as the first part.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parts.map((part, index) => (
                      <Card key={index} className="border-l-4 border-l-primary">
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                              <Badge variant="outline">Part {index + 1}</Badge>
                              <Badge variant="secondary">
                                {getAssessmentTypeLabel(part.assessment?.assessment_type || null)}
                              </Badge>
                              <Badge variant="outline" className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeLimitDisplay(part.assessment)}
                              </Badge>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removePart(index)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>

                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label>Part Title</Label>
                              <Input
                                value={part.part_title}
                                onChange={(e) => updatePart(index, "part_title", e.target.value)}
                                placeholder="e.g., Part 1: Inbox Simulation"
                              />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <span className="font-medium">{part.assessment?.title}</span>
                              </div>
                            </div>

                            {index > 0 && (
                              <div className="flex items-center gap-3">
                                <Switch
                                  checked={part.unlock_after_previous}
                                  onCheckedChange={(v) => updatePart(index, "unlock_after_previous", v)}
                                />
                                <div className="flex items-center gap-2">
                                  {part.unlock_after_previous ? (
                                    <Lock className="w-4 h-4 text-amber-600" />
                                  ) : (
                                    <Unlock className="w-4 h-4 text-emerald-600" />
                                  )}
                                  <span className="text-sm">
                                    {part.unlock_after_previous
                                      ? "Locked until Part " + index + " is completed"
                                      : "Available immediately with Part 1"}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                <div className="border-t pt-4">
                  <Label className="mb-2 block">Add Assessment</Label>
                  <Select onValueChange={addPart}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select an assessment to add..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAssessments?.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.title} ({getAssessmentTypeLabel(a.assessment_type)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Or <a href="/admin/assessments/new" className="text-primary underline">create a new assessment</a> first
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
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
                  onClick={() => saveAndContinue("preview")}
                  disabled={saveMutation.isPending || !title}
                >
                  {saveMutation.isPending ? "Saving..." : "Save & Continue"}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Series Preview</CardTitle>
                <CardDescription>
                  This is what candidates will see when they access the series portal.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-6 bg-muted/20">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold">{title || "Assessment Series"}</h2>
                    {description && <p className="text-muted-foreground mt-2">{description}</p>}
                    {seriesOpensAt && seriesClosesAt && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Available: {format(new Date(seriesOpensAt), "MMM d, yyyy 'at' HH:mm")} -{" "}
                        {format(new Date(seriesClosesAt), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-4">
                    {parts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No parts added yet
                      </p>
                    ) : (
                      parts.map((part, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-4 bg-background rounded-lg border"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium">{part.part_title}</p>
                              <p className="text-sm text-muted-foreground">
                                {getAssessmentTypeLabel(part.assessment?.assessment_type || null)} •{" "}
                                {getTimeLimitDisplay(part.assessment)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {index > 0 && part.unlock_after_previous ? (
                              <Badge variant="secondary" className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Locked
                              </Badge>
                            ) : (
                              <Button size="sm" variant="outline">
                                Start
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={() => setActiveTab("parts")}>
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
                  onClick={() => {
                    saveMutation.mutate();
                    if (!saveMutation.isPending) {
                      navigate("/admin/assessment-series");
                    }
                  }}
                  disabled={saveMutation.isPending || !title}
                >
                  {saveMutation.isPending ? "Saving..." : "Save & Finish"}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
