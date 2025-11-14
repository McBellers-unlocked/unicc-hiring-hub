import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, X, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ReviewCommitteeManagerProps {
  jobId: string;
}

export function ReviewCommitteeManager({ jobId }: ReviewCommitteeManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState("Member");

  // Fetch all staff users
  const { data: staffUsers } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["Admin", "HR Assistant", "Chief of HR", "Hiring Manager"])
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch current review committee members
  const { data: committeeMembers, isLoading } = useQuery({
    queryKey: ["review-committee-members", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_review_committee_members")
        .select(`
          id,
          role,
          created_at,
          user:users(id, name, email, role)
        `)
        .eq("job_id", jobId)
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
  });

  const addMemberMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("job_review_committee_members")
        .insert({
          job_id: jobId,
          user_id: selectedUserId,
          role: selectedRole,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-committee-members", jobId] });
      setSelectedUserId("");
      setSelectedRole("Member");
      toast({
        title: "Success",
        description: "Review committee member added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("job_review_committee_members")
        .delete()
        .eq("id", memberId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-committee-members", jobId] });
      toast({
        title: "Success",
        description: "Review committee member removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const availableUsers = staffUsers?.filter(
    (user) => !committeeMembers?.some((member) => member.user?.id === user.id)
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Review Committee
        </CardTitle>
        <CardDescription>
          Manage review committee members who will have access to the review pack
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add Member Form */}
        <div className="flex flex-col gap-4 p-4 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Add Committee Member</h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {availableUsers?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Member">Member</SelectItem>
                <SelectItem value="Chair">Chair</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={() => addMemberMutation.mutate()}
              disabled={!selectedUserId || addMemberMutation.isPending}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Current Members List */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="font-medium">Current Committee Members</h4>
            {committeeMembers && committeeMembers.length > 0 && (
              <Badge variant="secondary">{committeeMembers.length}</Badge>
            )}
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : committeeMembers && committeeMembers.length > 0 ? (
            <div className="space-y-2">
              {committeeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{member.user?.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {member.user?.email} • {member.user?.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={member.role === "Chair" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMemberMutation.mutate(member.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Alert>
              <AlertDescription>
                No review committee members assigned yet. Add members above to get started.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
