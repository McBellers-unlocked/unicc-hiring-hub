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

export default function ChiefOfDivisionView() {
  const queryClient = useQueryClient();

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ["requisitions-chief-approval"],
    queryFn: async () => {
      // Fetch both full PD approvals and initial requests
      const [fullPDResult, initialRequestsResult] = await Promise.all([
        // Full PD approvals
        supabase
          .from("job_requisitions")
          .select(`
            *,
            creator:users!created_by(name, email)
          `)
          .eq("hr_final_review_completed", true)
          .eq("status", "chief_of_division_review")
          .or("chief_of_division_approval.is.null,chief_of_division_approval.eq.false")
          .order("created_at", { ascending: false }),
        
        // Initial requests pending approval
        supabase
          .from("job_requisitions")
          .select(`
            *,
            creator:users!created_by(name, email)
          `)
          .in("status", ["initial_request_submitted", "initial_request_chief_review"])
          .or("initial_request_approved.is.null,initial_request_approved.eq.false")
          .order("created_at", { ascending: false })
      ]);

      if (fullPDResult.error) throw fullPDResult.error;
      if (initialRequestsResult.error) throw initialRequestsResult.error;
      
      // Combine and mark which are initial requests
      const fullPDs = (fullPDResult.data || []).map(r => ({ ...r, isInitialRequest: false }));
      const initialRequests = (initialRequestsResult.data || []).map(r => ({ ...r, isInitialRequest: true }));
      
      return [...initialRequests, ...fullPDs];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved, isInitialRequest }: { id: string; approved: boolean; isInitialRequest?: boolean }) => {
      const updateData: any = {
        chief_of_division_approved_at: new Date().toISOString(),
        chief_of_division_approved_by: (await supabase.auth.getUser()).data.user?.id,
      };

      if (isInitialRequest) {
        // For initial requests
        updateData.chief_of_division_approval = approved;
        updateData.initial_request_approved = approved;
        updateData.initial_request_approved_by = (await supabase.auth.getUser()).data.user?.id;
        updateData.initial_request_approved_at = new Date().toISOString();
        updateData.status = approved ? 'initial_request_approved' : 'initial_request_rejected';
      } else {
        // For full PD approvals
        updateData.chief_of_division_approval = approved;
        updateData.status = approved ? 'director_review' : 'rejected';
      }

      const { error } = await supabase
        .from("job_requisitions")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions-chief-approval"] });
      toast.success("Requisition updated successfully");
    },
    onError: () => {
      toast.error("Failed to update requisition");
    },
  });

  const handleApproval = (id: string, approved: boolean, isInitialRequest?: boolean) => {
    approveMutation.mutate({ id, approved, isInitialRequest });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">Chief of Division - Requisition Approvals</h1>
          <Badge variant="secondary">Test View</Badge>
        </div>

        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="grid gap-4">
            {requisitions?.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <p className="text-center text-muted-foreground">
                    No requisitions pending your approval
                  </p>
                </CardContent>
              </Card>
            ) : (
              requisitions?.map((requisition: any) => (
                <Card key={requisition.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle>{requisition.position_title}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          {requisition.grade && <Badge variant="outline">{requisition.grade}</Badge>}
                          {requisition.nature_of_position && <Badge variant="outline">{requisition.nature_of_position}</Badge>}
                          {requisition.isInitialRequest && <Badge className="bg-yellow-500">Initial Request</Badge>}
                        </div>
                      </div>
                      <Badge variant="secondary">Pending Chief Approval</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {requisition.isInitialRequest ? (
                      // Initial Request View
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm font-medium">Duty Station</p>
                            <p className="text-sm text-muted-foreground">
                              {(() => {
                                try {
                                  if (typeof requisition.duty_station === 'string') {
                                    const parsed = JSON.parse(requisition.duty_station);
                                    return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                                  } else if (Array.isArray(requisition.duty_station)) {
                                    return requisition.duty_station.join(', ');
                                  }
                                  return 'Not specified';
                                } catch {
                                  return 'Not specified';
                                }
                              })()}
                            </p>
                          </div>
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
                                    if (typeof requisition.duty_station === 'string') {
                                      const parsed = JSON.parse(requisition.duty_station);
                                      return Array.isArray(parsed) ? parsed.join(', ') : String(parsed);
                                    } else if (Array.isArray(requisition.duty_station)) {
                                      return (requisition.duty_station as string[]).join(', ');
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
                                <li key={idx} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.core_competencies && Array.isArray(requisition.core_competencies) && (requisition.core_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Core Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.core_competencies as any[]).map((comp, idx) => (
                                <li key={idx} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.management_competencies && Array.isArray(requisition.management_competencies) && (requisition.management_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Management Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.management_competencies as any[]).map((comp, idx) => (
                                <li key={idx} className="text-sm">{comp}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {requisition.leadership_competencies && Array.isArray(requisition.leadership_competencies) && (requisition.leadership_competencies as any[]).length > 0 && (
                          <div className="prose prose-sm max-w-none">
                            <h4 className="text-base font-semibold mb-2">Leadership Competencies:</h4>
                            <ul className="list-disc ml-5 space-y-1 my-2">
                              {(requisition.leadership_competencies as any[]).map((comp, idx) => (
                                <li key={idx} className="text-sm">{comp}</li>
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
                           onClick={() => window.open(`/requisitions/${requisition.id}`, '_blank')}
                         >
                           View Details
                         </Button>
                       </div>
                     </div>
                   )}
                 </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}