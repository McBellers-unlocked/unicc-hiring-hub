import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  status: string;
  created_at: string;
  hr_reviewed: boolean;
  hr_reviewed_at: string | null;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string | null;
  finance_controller_approval: boolean;
  finance_controller_approved_at: string | null;
  chief_of_division_approval: boolean;
  chief_of_division_approved_at: string | null;
  deputy_director_approval: boolean;
  deputy_director_approved_at: string | null;
  director_approval: boolean;
  director_approved_at: string | null;
  pdf_url?: string;
  converted_to_job_id?: string;
}

export default function JobRequisitions() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchRequisitions();
    }
  }, [user]);

  const fetchRequisitions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequisitions(data || []);
    } catch (error) {
      console.error('Error fetching requisitions:', error);
      toast({
        title: "Error",
        description: "Failed to fetch position descriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (requisition: JobRequisition) => {
    if (requisition.converted_to_job_id) {
      return <Badge variant="default" className="bg-green-500">Converted to Job</Badge>;
    }
    
    switch (requisition.status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'hr_review':
        return <Badge variant="default" className="bg-orange-500">HR Review</Badge>;
      case 'hr_amendments':
        return <Badge variant="destructive">Requires Amendments</Badge>;
      case 'hiring_manager_review':
        return <Badge variant="default" className="bg-blue-500">Manager Review</Badge>;
      case 'chief_division_review':
        return <Badge variant="default" className="bg-purple-500">Chief Review</Badge>;
      case 'director_review':
        return <Badge variant="default" className="bg-amber-500">Director Review</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="outline">Unknown Status</Badge>;
    }
  };

  const getApprovalProgress = (requisition: JobRequisition) => {
    const steps = [
      { 
        label: "Submission", 
        approved: true,
        completedAt: requisition.created_at
      },
      { 
        label: "HR Review", 
        approved: requisition.hr_reviewed,
        completedAt: requisition.hr_reviewed_at
      },
      { 
        label: "Hiring Manager Approval", 
        approved: requisition.hiring_manager_confirmed_hr_changes,
        completedAt: requisition.hiring_manager_confirmed_at
      },
      { 
        label: "Chief Approval", 
        approved: requisition.chief_of_division_approval,
        completedAt: requisition.chief_of_division_approved_at
      },
      { 
        label: "Director Approval", 
        approved: requisition.director_approval,
        completedAt: requisition.director_approved_at
      },
    ];

    return (
      <div className="flex space-x-2 mt-2">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center text-xs">
            <div className="flex items-center">
              {step.approved ? (
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
              ) : (
                <Clock className="h-4 w-4 text-gray-400 mr-1" />
              )}
              <span className={step.approved ? "text-green-700" : "text-gray-500"}>
                {step.label}
              </span>
            </div>
            {step.approved && step.completedAt && (
              <span className="text-xs text-muted-foreground mt-1">
                {new Date(step.completedAt).toLocaleDateString()}
              </span>
            )}
            {index < steps.length - 1 && <span className="mx-2 mt-2">→</span>}
          </div>
        ))}
      </div>
    );
  };

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground">Please log in to view job requisitions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!userRoles.some(role => ['Admin', 'HR Assistant', 'Hiring Manager'].includes(role))) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-muted-foreground">You don't have permission to view job requisitions.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">PD Pipeline</h1>
          <p className="text-muted-foreground">Manage position descriptions and approvals</p>
        </div>
        {userRoles.some(role => ['Admin', 'Hiring Manager'].includes(role)) && (
          <Button onClick={() => navigate('/requisitions/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Position Description
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4">
          {requisitions.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold">No Position Descriptions Found</p>
                  <p className="text-muted-foreground mb-4">Get started by creating your first position description.</p>
                  {userRoles.some(role => ['Admin', 'Hiring Manager'].includes(role)) && (
                    <Button onClick={() => navigate('/requisitions/new')}>
                      Create Position Description
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            requisitions.map((requisition) => (
              <Card key={requisition.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {requisition.position_title || 'Untitled Position'}
                        {getStatusBadge(requisition)}
                      </CardTitle>
                      <CardDescription>
                        Ref: {requisition.reference_number} • Created {format(new Date(requisition.created_at), 'MMM dd, yyyy')}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/requisitions/${requisition.id}`)}
                      >
                        View Details
                      </Button>
                      {requisition.pdf_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(requisition.pdf_url, '_blank')}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          PDF
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">
                      Approval Progress:
                    </div>
                    {getApprovalProgress(requisition)}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}