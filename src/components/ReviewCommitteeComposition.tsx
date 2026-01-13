import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Users, UserPlus, X, Send, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";

interface ReviewCommitteeCompositionProps {
  jobId: string;
}

const REQUIRED_ROLES = [
  { value: "Chair", label: "Chair", count: 1 },
  { value: "Member", label: "Member", count: 2 },
  { value: "Staff Representative", label: "Staff Representative", count: 1 },
];

// ExCo members who can be Chair
const EXCO_MEMBERS = [
  " Sameer Chauhan",
  "Milena GRECUCCIO",
  "Tima SONI",
  "Anish SETHI",
  "Marco LIUZZI"
];

// Staff representatives eligible for Staff Representative role
const STAFF_REPRESENTATIVES = [
  "Victor Manuel BENET ANCHEL",
  "Lyle Gregory MCFADYEN",
  "Elena RIVAS RUZAFA",
  "Paloma BAHILO ALPUENTE",
  "Gabriella ANDRIUZZI",
  "Rosa ALIANELLI",
  "Daniela D'AMELIO",
  "Nicholas Hedges"
];

export function ReviewCommitteeComposition({ jobId }: ReviewCommitteeCompositionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRole, setSelectedRole] = useState("Member");

  // Fetch all staff users
  const { data: staffUsers } = useQuery({
    queryKey: ["staff-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .in("role", ["Admin", "HR Assistant", "Chief of HR", "Hiring Manager", "Panel Member"])
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch current review committee members
  const { data: rawCommitteeMembers, isLoading } = useQuery({
    queryKey: ["review-committee-members", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_review_committee_members")
        .select(`
          id,
          role,
          created_at,
          user:users(id, name, email, role, current_grade, gender, division)
        `)
        .eq("job_id", jobId)
        .order("created_at");
      
      if (error) throw error;
      return data;
    },
  });

  // Sort committee members by role priority: Chair, Members, Staff Representative
  const committeeMembers = rawCommitteeMembers?.sort((a, b) => {
    const roleOrder = { "Chair": 1, "Member": 2, "Staff Representative": 3 };
    return (roleOrder[a.role as keyof typeof roleOrder] || 99) - (roleOrder[b.role as keyof typeof roleOrder] || 99);
  });

  // Fetch job to check committee status
  const { data: job } = useQuery({
    queryKey: ["job-committee-status", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("review_committee_status, review_committee_approved, review_committee_is_resubmission")
        .eq("id", jobId)
        .single();
      
      if (error) throw error;
      return data as { 
        review_committee_status: string | null; 
        review_committee_approved: boolean | null;
        review_committee_is_resubmission: boolean | null;
      };
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

      // If committee was already approved, reset status and mark as resubmission
      if (job?.review_committee_approved === true) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            review_committee_status: "draft",
            review_committee_approved: false,
            review_committee_is_resubmission: true,
          })
          .eq("id", jobId);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-committee-members", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-committee-status", jobId] });
      setSelectedUserId("");
      setSelectedRole("Member");
      
      if (job?.review_committee_approved === true) {
        toast({
          title: "Composition Changed",
          description: "Committee will need re-approval by the Director",
        });
      } else {
        toast({
          title: "Success",
          description: "Review committee member added successfully",
        });
      }
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

      // If committee was already approved, reset status and mark as resubmission
      if (job?.review_committee_approved === true) {
        const { error: updateError } = await supabase
          .from("jobs")
          .update({
            review_committee_status: "draft",
            review_committee_approved: false,
            review_committee_is_resubmission: true,
          })
          .eq("id", jobId);
        
        if (updateError) throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["review-committee-members", jobId] });
      queryClient.invalidateQueries({ queryKey: ["job-committee-status", jobId] });
      
      if (job?.review_committee_approved === true) {
        toast({
          title: "Composition Changed",
          description: "Committee will need re-approval by the Director",
        });
      } else {
        toast({
          title: "Success",
          description: "Review committee member removed successfully",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendForApprovalMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("jobs")
        .update({
          review_committee_status: "pending_approval",
          review_committee_sent_for_approval_at: new Date().toISOString(),
          review_committee_sent_by: user.id,
          // Preserve resubmission flag if it was set
        })
        .eq("id", jobId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-committee-status", jobId] });
      const isResubmission = job?.review_committee_is_resubmission;
      toast({
        title: "Success",
        description: isResubmission 
          ? "Composition change sent for Director re-approval" 
          : "Review committee sent for Director approval",
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

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({
        title: "Error",
        description: "Please select a user",
        variant: "destructive",
      });
      return;
    }

    // Validate role eligibility
    const selectedUser = staffUsers?.find(u => u.id === selectedUserId);
    if (!selectedUser) {
      toast({
        title: "Error",
        description: "Selected user not found",
        variant: "destructive",
      });
      return;
    }

    const validationError = validateRoleEligibility(selectedUser, selectedRole);
    if (validationError) {
      toast({
        title: "Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    addMemberMutation.mutate();
  };

  // Validate if a user is eligible for a specific role
  const validateRoleEligibility = (user: any, role: string): string | null => {
    if (role === "Chair") {
      if (!EXCO_MEMBERS.includes(user.name)) {
        return "Chair can only be occupied by ExCo members";
      }
    } else if (role === "Member") {
      const grade = user.current_grade;
      if (grade !== "P4" && grade !== "P5") {
        return "Members can only be P4 or P5 grade staff";
      }
    } else if (role === "Staff Representative") {
      if (!STAFF_REPRESENTATIVES.includes(user.name)) {
        return "Staff Representative can only be elected staff representatives";
      }
    }
    return null;
  };

  // Check if committee composition is valid for approval
  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (!committeeMembers) return errors;

    // Check role eligibility
    committeeMembers.forEach((member) => {
      const error = validateRoleEligibility(member.user, member.role);
      if (error) {
        errors.push(`${member.user?.name} (${member.role}): ${error}`);
      }
    });

    // Check gender balance (must be 2 men and 2 women)
    const genderCounts = committeeMembers.reduce((acc, member) => {
      const gender = member.user?.gender?.toLowerCase();
      if (gender === 'male' || gender === 'man') {
        acc['male'] = (acc['male'] || 0) + 1;
      } else if (gender === 'female' || gender === 'woman') {
        acc['female'] = (acc['female'] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    if (committeeMembers.length === 4) {
      if (genderCounts['male'] !== 2 || genderCounts['female'] !== 2) {
        errors.push('Committee must be gender-balanced: 2 men and 2 women');
      }
    }

    // Check division conflict (members should not be in same division as chair)
    const chair = committeeMembers.find(m => m.role === 'Chair');
    if (chair && chair.user?.division) {
      const chairDivision = chair.user.division;
      const membersInSameDivision = committeeMembers.filter(
        m => m.role !== 'Chair' && m.user?.division === chairDivision
      );
      
      if (membersInSameDivision.length > 0) {
        membersInSameDivision.forEach(member => {
          errors.push(
            `${member.user?.name} (${member.role}) should not be in the same reporting line as the Chair (${chairDivision})`
          );
        });
      }
    }

    return errors;
  };

  const validationErrors = getValidationErrors();
  const hasValidationErrors = validationErrors.length > 0;

  const handleRemoveMember = (memberId: string) => {
    removeMemberMutation.mutate(memberId);
  };

  // Check if all required roles are filled
  const getRoleCounts = () => {
    const counts: Record<string, number> = {};
    committeeMembers?.forEach((member) => {
      counts[member.role] = (counts[member.role] || 0) + 1;
    });
    return counts;
  };

  const roleCounts = getRoleCounts();
  const isCommitteeComplete = REQUIRED_ROLES.every(
    (req) => (roleCounts[req.value] || 0) >= req.count
  );

  const canSendForApproval = 
    isCommitteeComplete && 
    !hasValidationErrors &&
    (!job?.review_committee_status || job.review_committee_status === "draft");

  const isPendingOrApproved = 
    job?.review_committee_status === "pending_approval" || 
    job?.review_committee_approved === true;

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Review Committee Composition
          </CardTitle>
          <CardDescription>
            Select committee members for the review committee. Required: 1 Chair, 2 Members, 1 Staff Representative
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Status Badge */}
          {job?.review_committee_status && job.review_committee_status !== "draft" && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <Badge variant={
                  job.review_committee_status === "pending_approval" ? "secondary" :
                  job.review_committee_approved ? "default" : "destructive"
                }>
                  {job.review_committee_status === "pending_approval" ? "Pending Director Approval" :
                   job.review_committee_approved ? "Approved" : job.review_committee_status}
                </Badge>
              </AlertDescription>
            </Alert>
          )}

          {/* Role Requirements Status */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Role Requirements</h4>
            <div className="grid grid-cols-2 gap-2">
              {REQUIRED_ROLES.map((req) => {
                const current = roleCounts[req.value] || 0;
                const isFilled = current >= req.count;
                return (
                  <div key={req.value} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm">{req.label}</span>
                    <Badge variant={isFilled ? "default" : "secondary"}>
                      {current}/{req.count}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Member Section - Always show to allow dynamic changes */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Role</label>
                <Select value={selectedRole} onValueChange={(value) => {
                  setSelectedRole(value);
                  setSelectedUserId(""); // Clear staff selection when role changes
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUIRED_ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Select Staff Member</label>
                <Select 
                  value={selectedUserId} 
                  onValueChange={setSelectedUserId}
                  disabled={!selectedRole}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedRole ? "Select a staff member" : "Select a role first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers
                      ?.filter((user) => {
                        // Filter users based on selected role
                        if (selectedRole === "Chair") {
                          return EXCO_MEMBERS.includes(user.name);
                        } else if (selectedRole === "Member") {
                          return user.current_grade === "P4" || user.current_grade === "P5";
                        } else if (selectedRole === "Staff Representative") {
                          return STAFF_REPRESENTATIVES.includes(user.name);
                        }
                        return true;
                      })
                      .map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleAddMember} disabled={addMemberMutation.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add to Committee
            </Button>
          </div>

          {/* Current Committee Members */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Current Committee Members</h4>
            {committeeMembers && committeeMembers.length > 0 ? (
              <div className="space-y-2">
                {committeeMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 border rounded"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{member.role}</Badge>
                      <div>
                        <p className="font-medium">{member.user?.name}</p>
                        <p className="text-sm text-muted-foreground">{member.user?.email}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={removeMemberMutation.isPending}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <Alert>
                <AlertDescription>
                  No committee members added yet. Add members to complete the committee composition.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Validation Success */}
          {isCommitteeComplete && !hasValidationErrors && !isPendingOrApproved && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-semibold">Committee composition meets all policy requirements</p>
                <p className="text-sm mt-1">All required roles are filled and validated. Ready to send for Director approval.</p>
              </AlertDescription>
            </Alert>
          )}

          {/* Send for Approval Button */}
          {canSendForApproval && (
            <div className="pt-4 border-t">
              <Button
                onClick={() => sendForApprovalMutation.mutate()}
                disabled={sendForApprovalMutation.isPending}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Send for Director Approval
              </Button>
            </div>
          )}

          {hasValidationErrors && !isPendingOrApproved && (
            <Alert variant="destructive">
              <AlertDescription>
                <div className="space-y-1">
                  <p className="font-semibold">Committee composition validation errors:</p>
                  <ul className="list-disc list-inside text-sm">
                    {validationErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {!isCommitteeComplete && !hasValidationErrors && !isPendingOrApproved && (
            <Alert>
              <AlertDescription>
                Complete the committee composition by adding all required roles before sending for approval.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
