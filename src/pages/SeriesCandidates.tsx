import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Copy, Send, Users, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function SeriesCandidates() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");

  // Fetch series info
  const { data: series, isLoading: seriesLoading } = useQuery({
    queryKey: ["assessment-series", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_series")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch candidates
  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["series-candidates", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assessment_series_candidates")
        .select("*")
        .eq("series_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Add candidate mutation
  const addCandidateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("assessment_series_candidates")
        .insert({
          series_id: id,
          candidate_name: candidateName,
          candidate_email: candidateEmail,
          created_by: user?.id,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Candidate added");
      queryClient.invalidateQueries({ queryKey: ["series-candidates", id] });
      setCandidateName("");
      setCandidateEmail("");
      setIsAddDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to add candidate");
      console.error(error);
    },
  });

  const copyLink = (token: string) => {
    const link = `${window.location.origin}/series/${token}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copied to clipboard");
  };

  const getSeriesLink = (token: string) => {
    return `${window.location.origin}/series/${token}`;
  };

  if (seriesLoading) {
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
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/assessment-series")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Series
          </Button>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">{series?.title}</h1>
            <p className="text-muted-foreground mt-1">
              Manage candidate access to this assessment series
            </p>
          </div>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Candidate</DialogTitle>
                <DialogDescription>
                  Add a candidate to this assessment series. They will receive a unique access link.
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
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addCandidateMutation.mutate()}
                  disabled={!candidateName || !candidateEmail || addCandidateMutation.isPending}
                >
                  {addCandidateMutation.isPending ? "Adding..." : "Add Candidate"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Candidates ({candidates?.length || 0})
            </CardTitle>
            <CardDescription>
              Each candidate receives a unique access token to access the series portal.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {candidatesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : candidates?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No candidates added yet</p>
                <p className="text-sm">Add candidates to give them access to this assessment series</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead>Access Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates?.map((candidate) => (
                    <TableRow key={candidate.id}>
                      <TableCell className="font-medium">{candidate.candidate_name}</TableCell>
                      <TableCell>{candidate.candidate_email}</TableCell>
                      <TableCell>{format(new Date(candidate.created_at), "MMM d, yyyy")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px]">
                            {getSeriesLink(candidate.access_token)}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyLink(candidate.access_token)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(getSeriesLink(candidate.access_token), "_blank")}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
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
