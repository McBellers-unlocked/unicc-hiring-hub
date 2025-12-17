import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { format } from "date-fns";
import ReactMarkdown from "react-markdown";
import { fixMarkdownFormatting } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, UserCheck, Eye } from "lucide-react";
import { getAssignedChief } from "@/lib/chiefAssignment";
import { useNavigate } from "react-router-dom";

export default function ChiefOfDivisionView() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pdfPreview, setPdfPreview] = useState<{ open: boolean; requisitionId: string | null; pdfUrl: string | null; loading: boolean }>({
    open: false,
    requisitionId: null,
    pdfUrl: null,
    loading: false
  });
  const [approvalDialog, setApprovalDialog] = useState<{
    open: boolean;
    requisitionId: string | null;
    action: 'approve' | 'reject' | null;
    comments: string;
    isInitialRequest: boolean;
  }>({
    open: false,
    requisitionId: null,
    action: null,
    comments: '',
    isInitialRequest: false,
  });

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ["requisitions-chief-approval"],
    queryFn: async () => {
      // Get current user's division
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: userData } = await supabase
        .from("users")
        .select("division")
        .eq("id", user.id)
        .single();

      const userDivision = userData?.division;

      // Fetch both full PD approvals and initial requests
      const [fullPDResult, initialRequestsResult] = await Promise.all([
        // Full PD approvals - requisitions ready for chief approval after HR review
        supabase
          .from("job_requisitions")
          .select(`
            *,
            creator:users!created_by(name, email, division)
          `)
          .eq("hr_final_review_completed", true)
          .in("status", ["chief_of_division_review", "chief_division_review"])
          .or("chief_of_division_approval.is.null,chief_of_division_approval.eq.false")
          .order("created_at", { ascending: false }),
        
        // Initial requests pending approval - exclude already approved ones
        supabase
          .from("job_requisitions")
          .select(`
            *,
            creator:users!created_by(name, email, division)
          `)
          .in("status", ["initial_request_submitted", "initial_request_chief_review"])
          .or("initial_request_approved.is.null,initial_request_approved.eq.false")
          .order("created_at", { ascending: false })
      ]);

      if (fullPDResult.error) throw fullPDResult.error;
      if (initialRequestsResult.error) throw initialRequestsResult.error;
      
      // Filter requisitions based on the requisition's unit/division
      // Allow division overrides for specific chiefs (e.g. Milena covers MS and OP)
      const chiefDivisionOverrides: Record<string, string[]> = {
        'grecuccio@unicc.org': ['MS', 'OP'],
      };

      const userEmail = user.email?.toLowerCase() || null;
      let divisionsToShow: string[] = [];

      if (userEmail && chiefDivisionOverrides[userEmail]) {
        divisionsToShow = chiefDivisionOverrides[userEmail];
      } else if (userDivision === 'MS') {
        // Chiefs of MS also see OP requisitions
        divisionsToShow = ['MS', 'OP'];
      } else if (userDivision) {
        divisionsToShow = [userDivision];
      }
      
      // Helper to extract division from unit_section_division field
      const getDivisionFromUnit = (unitName: string | null): string | null => {
        if (!unitName) return null;
        const upper = unitName.toUpperCase();
        // CS division - check first to avoid conflicts with CSA
        if (upper.includes('CSI') || upper.includes('CSO') || upper.includes('CSA') || 
            upper.includes('CSE') || upper.includes('CSN') || upper.includes('CSS') || 
            upper.includes('CSR') || upper.includes('CISO') || upper.includes('CYBER')) return 'CS';
        if (upper.includes('MS') || upper.includes('MSHT')) return 'MS';
        // DD before DO to avoid matching "Development" as DO
        if (upper.includes('DD') || upper.includes('DDC') || upper.includes('DIGITAL DEVELOPMENT')) return 'DD';
        if (upper.includes('DO') || upper.includes('DOP') || upper.includes('DDAM')) return 'DO';
        if (upper.includes('OP')) return 'OP';
        if (upper.includes('DS')) return 'DS';
        return null;
      };
      
      const filterByDivision = (reqs: any[]) => {
        if (divisionsToShow.length === 0) return reqs;
        
        return reqs.filter(r => {
          // Extract division from unit_section_division field
          const reqDivision = getDivisionFromUnit(r.unit_section_division);
          if (reqDivision && divisionsToShow.includes(reqDivision)) {
            return true;
          }
          
          return false;
        });
      };
      
      // Combine and separate the two types
      const fullPDs = filterByDivision(fullPDResult.data || []).map(r => ({ ...r, isInitialRequest: false }));
      const initialRequests = filterByDivision(initialRequestsResult.data || []).map(r => ({ ...r, isInitialRequest: true }));
      
      // Debug: Log to check creator data structure
      console.log('Initial Requests Data:', initialRequests.map(r => ({ 
        id: r.id, 
        title: r.position_title,
        created_by: r.created_by,
        creator: r.creator,
        creatorType: typeof r.creator,
        creatorIsArray: Array.isArray(r.creator)
      })));
      
      return { initialRequests, fullPDs };
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved, isInitialRequest, comments }: { id: string; approved: boolean; isInitialRequest?: boolean; comments?: string }) => {
      const user = (await supabase.auth.getUser()).data.user;
      const updateData: any = {
        chief_of_division_approved_at: new Date().toISOString(),
        chief_of_division_approved_by: user?.id,
      };

      if (isInitialRequest) {
        // For initial requests
        updateData.chief_of_division_approval = approved;
        updateData.initial_request_approved = approved;
        updateData.initial_request_approved_by = user?.id;
        updateData.initial_request_approved_at = new Date().toISOString();
        updateData.status = approved ? 'initial_request_approved' : 'initial_request_rejected';
        
        // Preserve existing comment metadata (consultancy_level, remote_region, etc.)
        // while adding approval comments to approval_history
        const { data: existingRequisition } = await supabase
          .from("job_requisitions")
          .select("comments")
          .eq("id", id)
          .single();
        
        const existingComments = existingRequisition?.comments || {};
        const existingMetadata = typeof existingComments === 'object' && !Array.isArray(existingComments)
          ? (existingComments as Record<string, any>)
          : {};
        const metadataHistory = (existingMetadata as any).approval_history;
        const existingApprovalHistory: any[] = Array.isArray(existingComments) 
          ? existingComments 
          : (Array.isArray(metadataHistory) ? metadataHistory : []);

        const newComment = comments ? [{
          user_id: user?.id,
          comment: comments,
          timestamp: new Date().toISOString(),
          action: approved ? 'approved_initial_request' : 'rejected_initial_request',
        }] : [];

        updateData.comments = {
          ...existingMetadata,
          approval_history: [...existingApprovalHistory, ...newComment]
        };
      } else {
        // For full PD approvals
        updateData.chief_of_division_approval = approved;
        updateData.status = approved ? 'director_review' : 'rejected';
        
        if (comments) {
          updateData.chief_hr_comments = comments;
        }
      }

      const { error } = await supabase
        .from("job_requisitions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
      
      return { id, approved, isInitialRequest };
    },
    onSuccess: async (data) => {
      // Immediately refetch to ensure UI updates
      await queryClient.invalidateQueries({ queryKey: ["requisitions-chief-approval"] });
      await queryClient.refetchQueries({ queryKey: ["requisitions-chief-approval"] });
      
      toast.success("Requisition updated successfully");
    },
    onError: () => {
      toast.error("Failed to update requisition");
    },
  });

  const handleApproval = (id: string, approved: boolean, isInitialRequest?: boolean) => {
    setApprovalDialog({
      open: true,
      requisitionId: id,
      action: approved ? 'approve' : 'reject',
      comments: '',
      isInitialRequest: !!isInitialRequest,
    });
  };
  
  const confirmApproval = () => {
    if (!approvalDialog.requisitionId || !approvalDialog.action) return;
    
    approveMutation.mutate({
      id: approvalDialog.requisitionId,
      approved: approvalDialog.action === 'approve',
      isInitialRequest: approvalDialog.isInitialRequest,
      comments: approvalDialog.comments
    });
    
    setApprovalDialog({ open: false, requisitionId: null, action: null, comments: '', isInitialRequest: false });
  };

  const handleViewDetails = async (requisitionId: string) => {
    const requisition = requisitions?.initialRequests?.find((r: any) => r.id === requisitionId) || 
                       requisitions?.fullPDs?.find((r: any) => r.id === requisitionId);
    if (requisition) {
      setPdfPreview({ 
        open: true, 
        requisitionId, 
        pdfUrl: null, 
        loading: false 
      });
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Chief of Division - Approvals</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve initial requisitions and full position descriptions for your division
          </p>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="space-y-8">
            {/* Initial Request Approvals Section */}
            <div>
              <h2 className="text-2xl font-semibold mb-4">Requisition Approvals</h2>
              <div className="grid gap-4">
                {requisitions?.initialRequests?.length === 0 ? (
                  <Card>
                    <CardContent className="p-6">
                      <p className="text-center text-muted-foreground">
                        No initial requisitions pending your approval
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  requisitions?.initialRequests?.map((requisition: any) => {
                    const assignedChief = getAssignedChief(requisition.unit_section_division);
                    
                    return (
                <Card key={requisition.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle>{requisition.position_title}</CardTitle>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          {requisition.grade && <Badge variant="outline">{requisition.grade}</Badge>}
                          {requisition.nature_of_position && <Badge variant="outline">{requisition.nature_of_position}</Badge>}
                          {requisition.isInitialRequest && <Badge className="bg-yellow-500">Initial Request</Badge>}
                        </div>
                        {assignedChief && (
                          <div className="flex items-center gap-1 text-sm mt-2 text-muted-foreground">
                            <UserCheck className="w-4 h-4 text-primary" />
                            <span className="font-medium">Assigned to:</span>
                            <span>{assignedChief.name} ({assignedChief.division})</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">Pending Chief Approval</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {requisition.isInitialRequest ? (
                      // Initial Request View
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                                    const formatted = requisition.duty_station.map((station: string) => 
                                      station === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : station
                                    );
                                    return formatted.join(', ');
                                  }
                                  return 'Not specified';
                                } catch {
                                  return 'Not specified';
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
                      {requisition.nature_of_position === 'Intern' && requisition.intern_modality && (
                        <div>
                          <p className="text-sm font-medium">Modality</p>
                          <p className="text-sm text-muted-foreground">
                            {requisition.intern_modality}
                          </p>
                        </div>
                      )}
                          <div>
                            <p className="text-sm font-medium">Created By</p>
                            <p className="text-sm text-muted-foreground">
                              {requisition.creator?.name || requisition.creator?.email || 'Unknown User'}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium">Created Date</p>
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(requisition.created_at), "dd/MM/yyyy")}
                            </p>
                          </div>
                        </div>
                        
                        {requisition.brief_outline && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Brief Outline:</p>
                            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{requisition.brief_outline}</p>
                          </div>
                        )}
                        
                        {requisition.funding_status && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-2">Funding Status:</p>
                            <p className="text-sm text-muted-foreground">{requisition.funding_status}</p>
                            {requisition.funding_comments && (
                              <p className="text-sm text-muted-foreground mt-1 italic">{requisition.funding_comments}</p>
                            )}
                          </div>
                        )}
                        
                        <div className="flex gap-2 pt-2">
                          <Button
                            onClick={() => navigate(`/requisitions/initial/${requisition.slug || requisition.id}?view=true`)}
                            variant="outline"
                            size="sm"
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Full Request
                          </Button>
                          <Button
                            onClick={() => handleApproval(requisition.id, true, true)}
                            disabled={approveMutation.isPending}
                            size="sm"
                          >
                            Approve Initial Request
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => handleApproval(requisition.id, false, true)}
                            disabled={approveMutation.isPending}
                            size="sm"
                          >
                            Reject
                          </Button>
                        </div>
                      </div>
                       ) : (
                        // Full PD View (existing code)
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                              <p className="text-sm font-medium">HR Reviewed</p>
                              <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">✓ Reviewed</Badge>
                            </div>
                          </div>

                          {requisition.hr_change_summary && (
                            <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                              <p className="text-sm font-medium text-blue-900">HR Review Note:</p>
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

                        {requisition.language_requirements && Object.keys(requisition.language_requirements).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Language Requirements:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {Object.entries(requisition.language_requirements as Record<string, any>)
                                .filter(([key, value]) => {
                                  if (key === 'additional_languages') return false;
                                  if (typeof value === 'string' && value.trim() !== '') return true;
                                  if (typeof value === 'boolean' && value === true) return true;
                                  return false;
                                })
                                .map(([lang, level]) => {
                                  if (typeof level === 'boolean') {
                                    if (lang === 'un_language_advantage') {
                                      return <li key={lang} className="text-sm">Knowledge of another UN language is an advantage</li>;
                                    }
                                    if (lang === 'local_language_advantage') {
                                      return <li key={lang} className="text-sm">Knowledge of the local language is an advantage</li>;
                                    }
                                  }
                                  return (
                                    <li key={lang} className="text-sm">
                                      <strong className="font-semibold">{lang.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {level}
                                    </li>
                                  );
                                })}
                              {(requisition.language_requirements as any).additional_languages && 
                               Array.isArray((requisition.language_requirements as any).additional_languages) &&
                               (requisition.language_requirements as any).additional_languages.length > 0 &&
                               (requisition.language_requirements as any).additional_languages.map((lang: string, idx: number) => (
                                 <li key={`additional-${idx}`} className="text-sm">{lang}</li>
                               ))}
                            </ul>
                          </div>
                        )}

                        {requisition.global_competencies && Array.isArray(requisition.global_competencies) && (requisition.global_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Global Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.global_competencies as any[]).map((comp, idx) => (
                                <li key={`global-${idx}`} className="text-sm">{comp}</li>
                              ))}
                            </ul>
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

                        {requisition.core_competencies && Array.isArray(requisition.core_competencies) && (requisition.core_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Core Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.core_competencies as any[]).map((comp, idx) => (
                                <li key={`core-${idx}`} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.management_competencies && Array.isArray(requisition.management_competencies) && (requisition.management_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Management Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.management_competencies as any[]).map((comp, idx) => (
                                <li key={`mgmt-${idx}`} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.leadership_competencies && Array.isArray(requisition.leadership_competencies) && (requisition.leadership_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Leadership Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.leadership_competencies as any[]).map((comp, idx) => (
                                <li key={`lead-${idx}`} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                       </div>
                      )}

                       <div className="flex gap-2 mt-4">
                         <Button
                           onClick={() => handleApproval(requisition.id, true, false)}
                           disabled={approveMutation.isPending}
                           className="bg-green-600 hover:bg-green-700"
                         >
                           Approve
                         </Button>
                         <Button
                           variant="destructive"
                           onClick={() => handleApproval(requisition.id, false, false)}
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
                     </div>
                   )}
                  </CardContent>
                 </Card>
              );
              })
            )}
          </div>
        </div>

        {/* Position Description Approvals Section */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">Position Description Approvals</h2>
          <div className="grid gap-4">
            {requisitions?.fullPDs?.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    No position descriptions pending your approval
                  </p>
                </CardContent>
              </Card>
            ) : (
              requisitions?.fullPDs?.map((requisition: any) => (
                <Card key={requisition.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{requisition.position_title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          {requisition.grade && <Badge variant="outline">{requisition.grade}</Badge>}
                          {requisition.nature_of_position && <Badge variant="outline">{requisition.nature_of_position}</Badge>}
                          <Badge className="bg-blue-500">Full Position Description</Badge>
                        </div>
                      </div>
                      <Badge variant="secondary">Pending Chief Approval</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                          <p className="text-sm font-medium">HR Reviewed</p>
                          <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-200">✓ Reviewed</Badge>
                        </div>
                      </div>

                      {requisition.hr_change_summary && (
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-sm font-medium text-blue-900">HR Review Note:</p>
                          <p className="text-sm text-blue-800">{requisition.hr_change_summary}</p>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button
                          onClick={() => handleApproval(requisition.id, true, false)}
                          disabled={approveMutation.isPending}
                        >
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleApproval(requisition.id, false, false)}
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
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    )}
  </div>

      {/* Position Description View Dialog */}
      <Dialog open={pdfPreview.open} onOpenChange={(open) => setPdfPreview({ open, requisitionId: null, pdfUrl: null, loading: false })}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Position Description
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {(() => {
              const requisition = requisitions?.initialRequests?.find((r: any) => r.id === pdfPreview.requisitionId) || 
                             requisitions?.fullPDs?.find((r: any) => r.id === pdfPreview.requisitionId);
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
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.objectives_of_programme || requisition.objectives_of_programme || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Main Duties */}
                  {((requisition.final_clean_version as any)?.main_duties_responsibilities || requisition.main_duties_responsibilities) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Main Duties and Responsibilities</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
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

                  {/* Experience */}
                  {((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Essential Experience</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_experience || requisition.essential_experience || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Desirable Experience</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown 
                          components={{
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_experience || requisition.desirable_experience || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {((requisition.final_clean_version as any)?.essential_education || requisition.essential_education) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Essential Education</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.essential_education || requisition.essential_education || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education) && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Desirable Education</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown
                          components={{
                            ul: ({ children }) => <ul className="list-disc ml-5 space-y-1 my-2">{children}</ul>,
                            li: ({ children }) => <li className="text-sm">{children}</li>,
                            p: ({ children }) => <p className="mb-2 text-sm">{children}</p>,
                            strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                          }}
                        >
                          {fixMarkdownFormatting((requisition.final_clean_version as any)?.desirable_education || requisition.desirable_education || '')}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Mandatory Competencies */}
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Mandatory Competencies</h3>
                    <p className="text-sm text-muted-foreground mb-2">These competencies are automatically included for all positions:</p>
                    <ul className="list-disc ml-5 space-y-1">
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
                      <ul className="list-disc ml-5 space-y-1">
                        {(requisition.global_competencies as any[]).map((comp, idx) => {
                          const getDefinition = (compName: string) => {
                            const globalCompetencies = [
                              'Integrity: Acts in accordance with organizational values. Takes responsibility for actions and decisions',
                              'Customer orientation: Provides excellent service in a professional and caring manner',
                            ];
                            return globalCompetencies.find((def) => def.startsWith(compName)) || compName;
                          };

                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp.competency_name || comp;
                          const definition = getDefinition(competencyName);
                          const [name, ...description] = definition.split(':');

                          return (
                            <li key={`global-${idx}`} className="text-sm">
                              <strong className="font-semibold">{name}:</strong> {description.join(':').trim()}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}

                  {/* Core Competencies */}
                  {requisition.core_competencies && Array.isArray(requisition.core_competencies) && (requisition.core_competencies as any[]).length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Core Competencies</h3>
                      <ul className="list-disc ml-5 space-y-1">
                        {(requisition.core_competencies as any[]).map((comp, idx) => {
                          const getDefinition = (compName: string) => {
                            const coreCompetencies = [
                              'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
                              'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
                              'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
                              "Setting an example: Acts within UNICC's / WHO's professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.",
                            ];
                            return coreCompetencies.find((def) => def.startsWith(compName)) || compName;
                          };

                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp.competency_name || comp;
                          const definition = getDefinition(competencyName);
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
                      <ul className="list-disc ml-5 space-y-1">
                        {(requisition.management_competencies as any[]).map((comp, idx) => {
                          const getDefinition = (compName: string) => {
                            const managementCompetencies = [
                              "Ensuring effective use of resources: Identifies priorities in accordance with UNICC's strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.",
                              "Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.",
                            ];
                            return managementCompetencies.find((def) => def.startsWith(compName)) || compName;
                          };

                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp.competency_name || comp;
                          const definition = getDefinition(competencyName);
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
                      <ul className="list-disc ml-5 space-y-1">
                        {(requisition.leadership_competencies as any[]).map((comp, idx) => {
                          const getDefinition = (compName: string) => {
                            const leadershipCompetencies = [
                              'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
                              'Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.',
                              "Promoting UNICC's position: Positions UNICC as a leader in ICT services. Gains support for UNICC's mission. Coordinates plans and communicates in a way that attracts support from intended audiences.",
                            ];
                            return leadershipCompetencies.find((def) => def.startsWith(compName)) || compName;
                          };

                          const competencyName = typeof comp === 'string' ? comp : comp.name || comp.competency_name || comp;
                          const definition = getDefinition(competencyName);
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
                  {requisition.language_requirements && (
                    <div>
                      <h3 className="text-lg font-semibold mb-2">Language Requirements</h3>
                      <ul className="list-disc ml-5 space-y-1">
                        {(requisition.language_requirements as any).english && (
                          <li className="text-sm"><strong>English:</strong> {(requisition.language_requirements as any).english}</li>
                        )}
                        {Array.isArray((requisition.language_requirements as any).additional_languages) &&
                          (requisition.language_requirements as any).additional_languages.length > 0 &&
                          (requisition.language_requirements as any).additional_languages.map((lang: any, idx: number) => {
                            if (typeof lang === 'string') {
                              return <li key={idx} className="text-sm">{lang}</li>;
                            } else if (typeof lang === 'object' && lang !== null) {
                              const languageName = lang.name || lang.language || '';
                              const level = lang.level || '';
                              if (languageName && level) {
                                return <li key={idx} className="text-sm"><strong>{languageName}:</strong> {level}</li>;
                              }
                            }
                            return null;
                          })}
                        {(requisition.language_requirements as any).un_language_advantage && (
                          <li className="text-sm">Knowledge of another UN language is an advantage</li>
                        )}
                        {(requisition.language_requirements as any).local_language_advantage && (
                          <li className="text-sm">Knowledge of the local language of the duty station is an advantage</li>
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
                  handleApproval(pdfPreview.requisitionId!, true, false);
                  setPdfPreview({ open: false, requisitionId: null, pdfUrl: null, loading: false });
                }}
                disabled={approveMutation.isPending}
                className="bg-green-600 hover:bg-green-700"
              >
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  handleApproval(pdfPreview.requisitionId!, false, false);
                  setPdfPreview({ open: false, requisitionId: null, pdfUrl: null, loading: false });
                }}
                disabled={approveMutation.isPending}
              >
                Reject
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approval/Rejection Dialog */}
      <Dialog open={approvalDialog.open} onOpenChange={(open) => !open && setApprovalDialog({ open: false, requisitionId: null, action: null, comments: '', isInitialRequest: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {approvalDialog.isInitialRequest 
                ? (approvalDialog.action === 'approve' ? 'Approve Initial Request' : 'Reject Initial Request')
                : (approvalDialog.action === 'approve' ? 'Approve Position Description' : 'Reject Position Description')}
            </DialogTitle>
            <DialogDescription>
              {approvalDialog.isInitialRequest
                ? (approvalDialog.action === 'approve' 
                  ? 'Please provide any comments for this approval. HR will notify the hiring manager to proceed with creating the full position description.'
                  : 'Please explain why this request is being rejected. The hiring manager will be notified with your feedback.')
                : (approvalDialog.action === 'approve'
                  ? 'Please provide any comments for this approval. The position description will proceed to the Director for final approval.'
                  : 'Please explain why this position description is being rejected. HR and the hiring manager will be notified with your feedback.')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="approval-comments">
                Comments {approvalDialog.action === 'reject' && '*'}
              </Label>
              <Textarea
                id="approval-comments"
                value={approvalDialog.comments}
                onChange={(e) => setApprovalDialog(prev => ({ ...prev, comments: e.target.value }))}
                placeholder={approvalDialog.action === 'approve' 
                  ? "Add any comments or instructions (optional)..." 
                  : "Explain why this request is being rejected..."}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setApprovalDialog({ open: false, requisitionId: null, action: null, comments: '', isInitialRequest: false })}
              disabled={approveMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmApproval}
              disabled={approveMutation.isPending || (approvalDialog.action === 'reject' && !approvalDialog.comments.trim())}
              variant={approvalDialog.action === 'approve' ? 'default' : 'destructive'}
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                approvalDialog.action === 'approve' ? 'Approve' : 'Reject'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}