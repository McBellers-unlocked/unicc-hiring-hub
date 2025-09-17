import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Layout } from "@/components/Layout";
import { toast } from "sonner";
import { format } from "date-fns";

export default function ChiefOfDivisionView() {
  const queryClient = useQueryClient();

  const { data: requisitions, isLoading } = useQuery({
    queryKey: ["requisitions-chief-approval"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_requisitions")
        .select("*")
        .eq("hr_reviewed", true)
        .is("chief_of_division_approval", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, approved }: { id: string; approved: boolean }) => {
      const { error } = await supabase
        .from("job_requisitions")
        .update({
          chief_of_division_approval: approved,
          chief_of_division_approved_at: new Date().toISOString(),
          chief_of_division_approved_by: (await supabase.auth.getUser()).data.user?.id,
        })
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

  const handleApproval = (id: string, approved: boolean) => {
    approveMutation.mutate({ id, approved });
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
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
                      <Badge variant="secondary">Pending Chief Approval</Badge>
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
                        <p className="text-sm text-muted-foreground">{requisition.duty_station}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created By</p>
                        <p className="text-sm text-muted-foreground">{requisition.created_by}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Created Date</p>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(requisition.created_at), "PPP")}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">HR Reviewed</p>
                        <Badge variant="secondary">✓ Reviewed</Badge>
                      </div>
                    </div>

                    {requisition.hr_change_summary && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">HR Changes Summary:</p>
                        <p className="text-sm text-blue-800">{requisition.hr_change_summary}</p>
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
                        onClick={() => window.open(`/requisitions/${requisition.id}`, '_blank')}
                      >
                        View Details
                      </Button>
                    </div>
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