import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { format } from "date-fns";
import { FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { fixMarkdownFormatting } from "@/lib/utils";
import { getDivisionCode } from "@/lib/chiefAssignment";

const CORE_COMPETENCY_DEFINITIONS = [
  "Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.",
  "Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.",
  "Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.",
  "Setting an example: Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values."
];

const MANAGEMENT_COMPETENCY_DEFINITIONS = [
  "Ensuring effective use of resources: Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.",
  "Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners."
];

const LEADERSHIP_COMPETENCY_DEFINITIONS = [
  "Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.",
  "Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.",
  "Promoting UNICC's position: Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences."
];

const getCoreCompetencyDefinition = (compName: string) =>
  CORE_COMPETENCY_DEFINITIONS.find(def => def.startsWith(compName)) || compName;

const getManagementCompetencyDefinition = (compName: string) =>
  MANAGEMENT_COMPETENCY_DEFINITIONS.find(def => def.startsWith(compName)) || compName;

const getLeadershipCompetencyDefinition = (compName: string) =>
  LEADERSHIP_COMPETENCY_DEFINITIONS.find(def => def.startsWith(compName)) || compName;

export default function DirectorView() {
  const queryClient = useQueryClient();
  const [pdfPreview, setPdfPreview] = useState<{
    open: boolean;
    requisitionId: string | null;
  }>({
    open: false,
    requisitionId: null
  });

  const handleViewDetails = (requisitionId: string) => {
    setPdfPreview({ open: true, requisitionId });
  };


  const { data: requisitions, isLoading } = useQuery({
    queryKey: ["requisitions-director-approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requisitions")
        .select(`
          *,
          creator:users!created_by(name, email)
        `)
        .eq("status", "director_review")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: initialRequisitions, isLoading: initialLoading } = useQuery({
    queryKey: ["initial-requisitions-director-approval"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;
      if (!user) throw new Error("Not authenticated");

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("division")
        .eq("id", user.id)
        .single();

      if (userError) throw userError;

      const userDivision = (userData?.division as string | null) || null;

      const { data, error } = await supabase
        .from("job_requisitions")
        .select(`
          *,
          creator:users!created_by(name, email, division)
        `)
        .in("status", ["initial_request_submitted", "initial_request_chief_review"])
        .or("initial_request_approved.is.null,initial_request_approved.eq.false")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!userDivision) return data || [];

      return (data || []).filter((r) => {
        const reqDivisionCode = getDivisionCode(r.unit_section_division as string | null);
        return reqDivisionCode === userDivision;
      });
    },
  });

  // Fetch pending review committee approvals
  const { data: pendingCommittees, isLoading: committeesLoading } = useQuery({
    queryKey: ["review-committees-director-approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          id,
          title,
          notice_no,
          review_committee_status,
          review_committee_sent_for_approval_at,
          review_committee_sent_by
        `)
        .eq("review_committee_status", "pending_approval")
        .order("review_committee_sent_for_approval_at", { ascending: false });

      if (error) throw error;

      // Fetch sender details and committee members for each job
      if (data && data.length > 0) {
        const senderIds = data.map(d => d.review_committee_sent_by).filter(Boolean);
        const { data: senders } = await supabase
          .from("users")
          .select("id, name, email")
          .in("id", senderIds);

        // Fetch committee members for all jobs
        const jobIds = data.map(d => d.id);
        const { data: committeeMembers } = await supabase
          .from("job_review_committee_members")
          .select(`
            job_id,
            role,
            user:users(id, name, email, current_grade)
          `)
          .in("job_id", jobIds);

        // Sort committee members by role
        const roleOrder = { "Chair": 1, "Member": 2, "Staff Representative": 3 };
        
        return data.map(job => ({
          ...job,
          sender: senders?.find(s => s.id === job.review_committee_sent_by),
          committee_members: (committeeMembers || [])
            .filter(m => m.job_id === job.id)
            .sort((a, b) => (roleOrder[a.role as keyof typeof roleOrder] || 99) - (roleOrder[b.role as keyof typeof roleOrder] || 99))
        }));
      }

      return data;
    },
  });

  const approveInitialRequestMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("job_requisitions")
        .update({
          initial_request_approved: approved,
          initial_request_approved_at: new Date().toISOString(),
          initial_request_approved_by: (await supabase.auth.getUser()).data.user?.id,
          status: approved ? "initial_request_approved" : "rejected"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["initial-requisitions-director-approval"] });
      toast.success("Initial request updated successfully");
    },
    onError: () => {
      toast.error("Failed to update initial request");
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("job_requisitions")
        .update({
          director_approval: approved,
          director_approved_at: new Date().toISOString(),
          director_approved_by: (await supabase.auth.getUser()).data.user?.id,
          status: approved ? "approved" : "rejected"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions-director-approval"] });
      toast.success("Requisition updated successfully");
    },
    onError: () => {
      toast.error("Failed to update requisition");
    },
  });

  const approveCommitteeMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("jobs")
        .update({
          review_committee_approved: approved,
          review_committee_approved_at: new Date().toISOString(),
          review_committee_approved_by: (await supabase.auth.getUser()).data.user?.id,
          review_committee_status: approved ? "approved" : "rejected"
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-committees-director-approval"] });
      toast.success("Review committee updated successfully");
    },
    onError: () => {
      toast.error("Failed to update review committee");
    },
  });

  const handleApproval = (id: string, approved: boolean) => {
    approveMutation.mutate({ id, approved });
  };

  const handleCommitteeApproval = (id: string, approved: boolean) => {
    approveCommitteeMutation.mutate({ id, approved });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Director Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve initial requisitions, position descriptions and review committees
          </p>
        </div>

        {/* Initial Requisition Approvals Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Initial Requisition Approvals</h3>

          {initialLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid gap-4">
              {initialRequisitions?.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      No initial requisitions pending your approval
                    </p>
                  </CardContent>
                </Card>
              ) : (
                initialRequisitions?.map((requisition: any) => (
                  <Card key={requisition.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle>{requisition.position_title}</CardTitle>
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {requisition.grade && (
                              <Badge variant="outline">{requisition.grade}</Badge>
                            )}
                            {requisition.nature_of_position && (
                              <Badge variant="outline">{requisition.nature_of_position}</Badge>
                            )}
                            <Badge variant="secondary">Initial Request</Badge>
                          </div>
                        </div>
                        <Badge variant="secondary">Pending Chief Approval</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {requisition.unit_section_division && (
                          <div>
                            <p className="text-sm font-medium">Unit/Section/Division</p>
                            <p className="text-sm text-muted-foreground">
                              {requisition.unit_section_division}
                            </p>
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">Duty Station</p>
                          <p className="text-sm text-muted-foreground">
                            {requisition.duty_station || "Not specified"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Created By</p>
                          <p className="text-sm text-muted-foreground">
                            {requisition.creator?.name ||
                              requisition.creator?.email ||
                              "Unknown User"}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Created Date</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(requisition.created_at), "dd/MM/yyyy")}
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-between items-center gap-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(requisition.id)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          View Details
                        </Button>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() =>
                              approveInitialRequestMutation.mutate({
                                id: requisition.id,
                                approved: true,
                              })
                            }
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              approveInitialRequestMutation.mutate({
                                id: requisition.id,
                                approved: false,
                              })
                            }
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </div>

        {/* Position Description Approvals Section */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Position Description Approvals</h3>

          {isLoading ? (
            <div>Loading...</div>
          ) : (
            <div className="grid gap-4">
              {requisitions?.length === 0 ? (
                <Card>
                  <CardContent className="p-6">
                    <p className="text-center text-muted-foreground">
                      No position descriptions pending your approval
                    </p>
                  </CardContent>
                </Card>
              ) : (
              requisitions?.map((requisition) => (
                <Card key={requisition.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{requisition.position_title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{requisition.grade}</Badge>
                          <Badge variant="outline">{requisition.nature_of_position}</Badge>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending Director Approval</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Reference Number</p>
                        <p className="text-sm text-muted-foreground">{requisition.reference_number}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Unit/Section/Division</p>
                        <p className="text-sm text-muted-foreground">{requisition.unit_section_division}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Duty Station</p>
                        <p className="text-sm text-muted-foreground">
                          {(() => {
                            try {
                              const remoteRegion = (requisition as any).comments?.remote_region;
                              if (typeof requisition.duty_station === 'string') {
                                const parsed = JSON.parse(requisition.duty_station);
                                if (Array.isArray(parsed)) {
                                  const formatted = parsed.map((station: string) => 
                                    station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                                  );
                                  return formatted.join(', ');
                                }
                                return String(parsed);
                              } else if (Array.isArray(requisition.duty_station)) {
                                const formatted = (requisition.duty_station as string[]).map((station: string) => 
                                  station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                                );
                                return formatted.join(', ');
                              } else {
                                return String(requisition.duty_station || 'Not specified');
                              }
                            } catch {
                              return String(requisition.duty_station || 'Not specified');
                            }
                          })()}
                        </p>
                      </div>
                      {requisition.nature_of_position === 'Individual Consultant' && (requisition as any).comments?.consultancy_level && (
                        <div>
                          <p className="text-sm font-medium">Consultancy Level</p>
                          <p className="text-sm text-muted-foreground">
                            {(requisition as any).comments.consultancy_level}
                          </p>
                        </div>
                      )}
                      {requisition.nature_of_position === 'Intern' && (requisition as any).intern_modality && (
                        <div>
                          <p className="text-sm font-medium">Modality</p>
                          <p className="text-sm text-muted-foreground">
                            {(requisition as any).intern_modality}
                          </p>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium">Created By</p>
                        <p className="text-sm text-muted-foreground">
                          {(requisition as any).creator?.name || (requisition as any).creator?.email || 'Unknown User'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created Date</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(requisition.created_at), "dd/MM/yyyy")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Chief Approved</p>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">✓ Approved</Badge>
                      </div>
                      {requisition.chief_of_division_approved_at && (
                        <div>
                          <p className="text-sm font-medium">Chief Approved Date</p>
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(requisition.chief_of_division_approved_at), "dd/MM/yyyy")}
                          </p>
                        </div>
                      )}
                    </div>

                    {requisition.hr_change_summary && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">HR Changes Summary:</p>
                        <p className="text-sm text-blue-800">{requisition.hr_change_summary}</p>
                      </div>
                    )}

                    {/* Show clean position description */}
                    {requisition.final_clean_version && (
                      <div className="mb-3 space-y-4 border border-border rounded-lg p-4">
                        <h3 className="font-semibold text-lg pb-2 border-b">Position Description</h3>
                        
                        {((requisition.final_clean_version as any)?.purpose_of_position || requisition.purpose_of_position) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Purpose of Position:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.purpose_of_position || requisition.purpose_of_position || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.objectives_of_programme || requisition.objectives_of_programme) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Objectives of Programme:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.objectives_of_programme || requisition.objectives_of_programme || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.main_duties_responsibilities || requisition.main_duties_responsibilities) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Main Duties and Responsibilities:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.main_duties_responsibilities || requisition.main_duties_responsibilities || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.essential_education || requisition.essential_education) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Essential Education:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_education || requisition.essential_education || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Desirable Education:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Essential Experience:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        {((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience) && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Desirable Experience:</h4>
                            <ReactMarkdown 
                              components={{
                                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3 border-b pb-1">{children}</h1>,
                                h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3 border-b pb-1">{children}</h2>,
                                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 mt-2">{children}</h3>,
                                ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                                ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                                li: ({ children }) => <li className="text-sm">{children}</li>,
                                p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                                strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                              }}
                            >
                              {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience || '')}
                            </ReactMarkdown>
                          </div>
                        )}

                        <div className="prose prose-sm max-w-none">
                          <h4 className="text-base font-semibold mb-2">Mandatory Competencies:</h4>
                          <p className="text-sm text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                          <ul className="list-disc ml-5 space-y-1 my-2">
                            <li className="text-sm"><strong className="font-semibold">Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                            <li className="text-sm"><strong className="font-semibold">Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                            <li className="text-sm"><strong className="font-semibold">Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                            <li className="text-sm"><strong className="font-semibold">Creating an empowering and motivating environment (for Supervisory positions only):</strong> Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                          </ul>
                        </div>

                        {requisition.global_competencies && Array.isArray(requisition.global_competencies) && (requisition.global_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Global Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.global_competencies as any[]).map((comp, idx) => (
                                <li key={idx} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.core_competencies && Array.isArray(requisition.core_competencies) && (requisition.core_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Core Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.core_competencies as any[]).map((comp, idx) => {
                                const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                                const definition = (typeof comp === 'object' && comp.description)
                                  ? `${competencyName}: ${comp.description}`
                                  : getCoreCompetencyDefinition(competencyName);
                                const [name, ...description] = definition.split(':');

                                return (
                                  <li key={idx} className="text-sm">
                                    <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {requisition.management_competencies && Array.isArray(requisition.management_competencies) && (requisition.management_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Management Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.management_competencies as any[]).map((comp, idx) => {
                                const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                                const definition = (typeof comp === 'object' && comp.description)
                                  ? `${competencyName}: ${comp.description}`
                                  : getManagementCompetencyDefinition(competencyName);
                                const [name, ...description] = definition.split(':');

                                return (
                                  <li key={idx} className="text-sm">
                                    <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {requisition.leadership_competencies && Array.isArray(requisition.leadership_competencies) && (requisition.leadership_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Leadership Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.leadership_competencies as any[]).map((comp, idx) => {
                                const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                                const definition = (typeof comp === 'object' && comp.description)
                                  ? `${competencyName}: ${comp.description}`
                                  : getLeadershipCompetencyDefinition(competencyName);
                                const [name, ...description] = definition.split(':');

                                return (
                                  <li key={idx} className="text-sm">
                                    <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {requisition.language_requirements && Object.keys(requisition.language_requirements).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Language Requirements:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {Object.entries(requisition.language_requirements as Record<string, any>)
                                .filter(([key, value]) => {
                                  // Skip internal fields
                                  if (['additional_languages', 'local_language_advantage', 'un_language_advantage'].includes(key)) {
                                    return false;
                                  }
                                  // Only show if value is a non-empty string
                                  if (typeof value === 'string') {
                                    const cleanValue = value.trim().toLowerCase();
                                    // Skip empty, placeholder, or self-referencing values
                                    if (cleanValue === '' || 
                                        cleanValue === 'not specified' || 
                                        cleanValue.includes('not specified') ||
                                        cleanValue === key.toLowerCase() ||
                                        cleanValue.includes(key.toLowerCase())) {
                                      return false;
                                    }
                                    return true;
                                  }
                                  return false;
                                })
                                .map(([lang, level]) => {
                                  const languageLabels: Record<string, string> = {
                                    'english': 'English',
                                    'french': 'French',
                                    'spanish': 'Spanish',
                                    'arabic': 'Arabic',
                                    'chinese': 'Chinese',
                                    'russian': 'Russian'
                                  };
                                  const label = languageLabels[lang.toLowerCase()] || lang.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                  return (
                                    <li key={lang} className="text-sm">
                                      <strong className="font-semibold">{label}:</strong> {level}
                                    </li>
                                  );
                                })}
                               {(requisition.language_requirements as any).additional_languages && 
                                Array.isArray((requisition.language_requirements as any).additional_languages) &&
                                (requisition.language_requirements as any).additional_languages.length > 0 &&
                                (requisition.language_requirements as any).additional_languages.filter((lang: any) => {
                                  if (typeof lang === 'object' && lang.name) {
                                    const cleanName = lang.name.trim().toLowerCase();
                                    return cleanName !== 'not specified' && cleanName !== '' && !cleanName.includes('not specified');
                                  }
                                  if (typeof lang === 'string') {
                                    const cleanLang = lang.trim().toLowerCase();
                                    return cleanLang !== 'not specified' && cleanLang !== '' && !cleanLang.includes('not specified');
                                  }
                                  return false;
                                }).map((lang: any, idx: number) => {
                                  const name = typeof lang === 'object' && lang.name ? lang.name : String(lang);
                                  const level = typeof lang === 'object' && lang.level ? lang.level : '';
                                  
                                  // Format level text to match English formatting
                                  let formattedLevel = level;
                                  if (level) {
                                    const levelLower = level.toLowerCase();
                                    if (levelLower === 'expert') {
                                      formattedLevel = 'Expert knowledge is required';
                                    } else if (levelLower === 'intermediate') {
                                      formattedLevel = 'Intermediate knowledge is required';
                                    } else if (levelLower === 'beginner') {
                                      formattedLevel = 'Beginner knowledge is required';
                                    }
                                  }
                                  
                                  return (
                                    <li key={`additional-${idx}`} className="text-sm">
                                      <strong className="font-semibold">{name}:</strong> {formattedLevel}
                                    </li>
                                  );
                                })}
                              {(requisition.language_requirements as any).un_language_advantage === true && (
                                <li className="text-sm">Knowledge of another UN language is an advantage</li>
                              )}
                              {(requisition.language_requirements as any).local_language_advantage === true && (
                                <li className="text-sm">Knowledge of the local language is an advantage</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproval(requisition.id, true)}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleApproval(requisition.id, false)}
                        disabled={approveMutation.isPending}
                      >
                        Reject
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleViewDetails(requisition.id)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        View Position Description
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
        </div>

        {/* Review Committee Approvals Section */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Review Committee Approvals</h3>
          {committeesLoading ? (
            <div>Loading...</div>
          ) : pendingCommittees && pendingCommittees.length > 0 ? (
            <div className="grid gap-4">
              {pendingCommittees.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">{job.notice_no}</Badge>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending Director Approval</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Sent By</p>
                        <p className="text-sm text-muted-foreground">
                          {(job as any).sender?.name || (job as any).sender?.email || 'Unknown User'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Sent Date</p>
                        <p className="text-sm text-muted-foreground">
                          {job.review_committee_sent_for_approval_at 
                            ? format(new Date(job.review_committee_sent_for_approval_at), "dd/MM/yyyy")
                            : 'N/A'
                          }
                        </p>
                      </div>
                    </div>

                    {/* Committee Members */}
                    {(job as any).committee_members && (job as any).committee_members.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium mb-2">Committee Members</p>
                        <div className="space-y-2">
                          {(job as any).committee_members.map((member: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded-md">
                              <div>
                                <p className="text-sm font-medium">{member.user?.name}</p>
                                <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {member.user?.current_grade && (
                                  <Badge variant="outline" className="text-xs">
                                    {member.user.current_grade}
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-xs">
                                  {member.role}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleCommitteeApproval(job.id, true)}
                        disabled={approveCommitteeMutation.isPending}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => handleCommitteeApproval(job.id, false)}
                        disabled={approveCommitteeMutation.isPending}
                      >
                        Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-center text-muted-foreground">
                  No review committee compositions pending your approval
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Position Description View Dialog */}
      <Dialog open={pdfPreview.open} onOpenChange={(open) => setPdfPreview({ open, requisitionId: null })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Position Description
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {(() => {
              const requisition = requisitions?.find(r => r.id === pdfPreview.requisitionId);
              if (!requisition) return null;

              return (
                <div className="space-y-6 p-6">
                  {/* Position Information */}
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-bold mb-4">{requisition.position_title}</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-semibold">Grade:</span> {requisition.grade}
                      </div>
                      <div>
                        <span className="font-semibold">Nature:</span> {requisition.nature_of_position}
                      </div>
                      <div>
                        <span className="font-semibold">Unit/Division:</span> {requisition.unit_section_division}
                      </div>
                      <div>
                        <span className="font-semibold">Duty Station:</span>{' '}
                        {(() => {
                          try {
                            const remoteRegion = (requisition as any).comments?.remote_region;
                            if (typeof requisition.duty_station === 'string') {
                              const parsed = JSON.parse(requisition.duty_station);
                              if (Array.isArray(parsed)) {
                                const formatted = parsed.map((station: string) => 
                                  station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                                );
                                return formatted.join(', ');
                              }
                              return String(parsed);
                            } else if (Array.isArray(requisition.duty_station)) {
                              const formatted = (requisition.duty_station as string[]).map((station: string) => 
                                station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                              );
                              return formatted.join(', ');
                            } else {
                              return String(requisition.duty_station || 'Not specified');
                            }
                          } catch {
                            return String(requisition.duty_station || 'Not specified');
                          }
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Purpose of Position */}
                  {((requisition.final_clean_version as any)?.purpose_of_position || requisition.purpose_of_position) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Purpose of the Position</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.purpose_of_position || requisition.purpose_of_position || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Objectives of Programme */}
                  {((requisition.final_clean_version as any)?.objectives_of_programme || requisition.objectives_of_programme) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Objectives of the Programme</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.objectives_of_programme || requisition.objectives_of_programme || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Main Duties and Responsibilities */}
                  {((requisition.final_clean_version as any)?.main_duties_responsibilities || requisition.main_duties_responsibilities) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Main Duties and Responsibilities</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            h1: ({ children }) => <h1 className="text-lg font-semibold mb-2 mt-3">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-base font-semibold mb-2 mt-3">{children}</h2>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal ml-5 space-y-1 my-2">{children}</ol>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.main_duties_responsibilities || requisition.main_duties_responsibilities || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Essential Education */}
                  {((requisition.final_clean_version as any)?.essential_education || requisition.essential_education) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Essential Education</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_education || requisition.essential_education || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Desirable Education */}
                  {((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Desirable Education</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Essential Experience */}
                  {((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Essential Experience</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Desirable Experience */}
                  {((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Desirable Experience</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Competencies */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Mandatory Competencies</h3>
                    <p className="text-sm text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                    <ul className="list-disc ml-5 space-y-1 my-2">
                      <li className="text-sm"><strong className="font-semibold">Teamwork:</strong> Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.</li>
                      <li className="text-sm"><strong className="font-semibold">Communicating:</strong> Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.</li>
                      <li className="text-sm"><strong className="font-semibold">Respecting and promoting individual and cultural differences:</strong> Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.</li>
                      <li className="text-sm"><strong className="font-semibold">Creating an empowering and motivating environment (for Supervisory positions only):</strong> Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.</li>
                    </ul>
                  </div>

                  {/* Global Competencies */}
                  {requisition.global_competencies && Array.isArray(requisition.global_competencies) && (requisition.global_competencies as any[]).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Global Competencies</h3>
                      <ul className="list-disc ml-5 space-y-1 my-2">
                        {(requisition.global_competencies as any[]).map((comp, idx) => (
                          <li key={`global-${idx}`} className="text-sm">{comp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Core Competencies */}
                  {requisition.core_competencies && Array.isArray(requisition.core_competencies) && (requisition.core_competencies as any[]).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Core Competencies</h3>
                      <ul className="list-disc ml-5 space-y-1 my-2">
                        {(requisition.core_competencies as any[]).map((comp, idx) => {
                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                          const definition = (typeof comp === 'object' && comp.description)
                            ? `${competencyName}: ${comp.description}`
                            : getCoreCompetencyDefinition(competencyName);
                          const [name, ...description] = definition.split(':');

                          return (
                            <li key={`core-${idx}`} className="text-sm">
                              <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Management Competencies */}
                  {requisition.management_competencies && Array.isArray(requisition.management_competencies) && (requisition.management_competencies as any[]).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Management Competencies</h3>
                      <ul className="list-disc ml-5 space-y-1 my-2">
                        {(requisition.management_competencies as any[]).map((comp, idx) => {
                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                          const definition = (typeof comp === 'object' && comp.description)
                            ? `${competencyName}: ${comp.description}`
                            : getManagementCompetencyDefinition(competencyName);
                          const [name, ...description] = definition.split(':');

                          return (
                            <li key={`mgmt-${idx}`} className="text-sm">
                              <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Leadership Competencies */}
                  {requisition.leadership_competencies && Array.isArray(requisition.leadership_competencies) && (requisition.leadership_competencies as any[]).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Leadership Competencies</h3>
                      <ul className="list-disc ml-5 space-y-1 my-2">
                        {(requisition.leadership_competencies as any[]).map((comp, idx) => {
                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp;
                          const definition = (typeof comp === 'object' && comp.description)
                            ? `${competencyName}: ${comp.description}`
                            : getLeadershipCompetencyDefinition(competencyName);
                          const [name, ...description] = definition.split(':');

                          return (
                            <li key={`lead-${idx}`} className="text-sm">
                              <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Language Requirements */}
                  {requisition.language_requirements && Object.keys(requisition.language_requirements).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Language Requirements</h3>
                      <ul className="list-disc ml-5 space-y-1 my-2">
                        {Object.entries(requisition.language_requirements as Record<string, any>)
                          .filter(([key, value]) => {
                            // Skip internal fields
                            if (['additional_languages', 'local_language_advantage', 'un_language_advantage'].includes(key)) {
                              return false;
                            }
                            // Only show if value is a non-empty string
                            if (typeof value === 'string') {
                              const cleanValue = value.trim().toLowerCase();
                              // Skip empty, placeholder, or self-referencing values
                              if (cleanValue === '' || 
                                  cleanValue === 'not specified' || 
                                  cleanValue.includes('not specified') ||
                                  cleanValue === key.toLowerCase() ||
                                  cleanValue.includes(key.toLowerCase())) {
                                return false;
                              }
                              return true;
                            }
                            return false;
                          })
                          .map(([lang, level]) => {
                            const languageLabels: Record<string, string> = {
                              'english': 'English',
                              'french': 'French',
                              'spanish': 'Spanish',
                              'arabic': 'Arabic',
                              'chinese': 'Chinese',
                              'russian': 'Russian'
                            };
                            const label = languageLabels[lang.toLowerCase()] || lang.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                            return (
                              <li key={lang} className="text-sm">
                                <strong className="font-semibold">{label}:</strong> {level}
                              </li>
                            );
                          })}
                        {(requisition.language_requirements as any).additional_languages && 
                         Array.isArray((requisition.language_requirements as any).additional_languages) &&
                         (requisition.language_requirements as any).additional_languages.length > 0 &&
                         (requisition.language_requirements as any).additional_languages.filter((lang: any) => {
                           if (typeof lang === 'object' && lang.name) {
                             const cleanName = lang.name.trim().toLowerCase();
                             return cleanName !== 'not specified' && cleanName !== '' && !cleanName.includes('not specified');
                           }
                           if (typeof lang === 'string') {
                             const cleanLang = lang.trim().toLowerCase();
                             return cleanLang !== 'not specified' && cleanLang !== '' && !cleanLang.includes('not specified');
                           }
                           return false;
                         }).map((lang: any, idx: number) => {
                           const name = typeof lang === 'object' && lang.name ? lang.name : String(lang);
                           const level = typeof lang === 'object' && lang.level ? lang.level : '';
                           
                           // Format level text to match English formatting
                           let formattedLevel = level;
                           if (level) {
                             const levelLower = level.toLowerCase();
                             if (levelLower === 'expert') {
                               formattedLevel = 'Expert knowledge is required';
                             } else if (levelLower === 'intermediate') {
                               formattedLevel = 'Intermediate knowledge is required';
                             } else if (levelLower === 'beginner') {
                               formattedLevel = 'Beginner knowledge is required';
                             }
                           }
                           
                           return (
                             <li key={`additional-${idx}`} className="text-sm">
                               <strong className="font-semibold">{name}:</strong> {formattedLevel}
                             </li>
                           );
                         })}
                        {(requisition.language_requirements as any).un_language_advantage === true && (
                          <li className="text-sm">Knowledge of another UN language is an advantage</li>
                        )}
                        {(requisition.language_requirements as any).local_language_advantage === true && (
                          <li className="text-sm">Knowledge of the local language is an advantage</li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
          
          {/* Action Buttons in Modal */}
          {pdfPreview.requisitionId && (
            <div className="flex gap-2 p-4 border-t bg-background">
              <Button
                onClick={() => {
                  handleApproval(pdfPreview.requisitionId!, true);
                  setPdfPreview({ open: false, requisitionId: null });
                }}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleApproval(pdfPreview.requisitionId!, false);
                  setPdfPreview({ open: false, requisitionId: null });
                }}
                disabled={approveMutation.isPending}
              >
                Reject
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}