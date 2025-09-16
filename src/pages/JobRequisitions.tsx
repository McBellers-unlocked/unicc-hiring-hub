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
  finance_controller_approval: boolean;
  chief_of_division_approval: boolean;
  deputy_director_approval: boolean;
  director_approval: boolean;
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
        description: "Failed to fetch job requisitions",
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
    
    if (requisition.director_approval) {
      return <Badge variant="default" className="bg-blue-500">Director Approved</Badge>;
    }
    
    const approvals = [
      requisition.finance_controller_approval,
      requisition.chief_of_division_approval,
      requisition.deputy_director_approval,
    ];
    
    const approvedCount = approvals.filter(Boolean).length;
    
    if (approvedCount === 3) {
      return <Badge variant="default" className="bg-amber-500">Awaiting Director</Badge>;
    }
    
    if (approvedCount > 0) {
      return <Badge variant="secondary">Partially Approved ({approvedCount}/3)</Badge>;
    }
    
    return <Badge variant="outline">Pending Approval</Badge>;
  };

  const getApprovalProgress = (requisition: JobRequisition) => {
    const steps = [
      { label: "Finance Controller", approved: requisition.finance_controller_approval },
      { label: "Chief of Division", approved: requisition.chief_of_division_approval },
      { label: "Deputy Director", approved: requisition.deputy_director_approval },
      { label: "Director", approved: requisition.director_approval },
    ];

    return (
      <div className="flex space-x-2 mt-2">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center text-xs">
            {step.approved ? (
              <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <Clock className="h-4 w-4 text-gray-400 mr-1" />
            )}
            <span className={step.approved ? "text-green-700" : "text-gray-500"}>
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="mx-2">→</span>}
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
          <h1 className="text-3xl font-bold">Job Requisitions</h1>
          <p className="text-muted-foreground">Manage position requests and approvals</p>
        </div>
        {userRoles.some(role => ['Admin', 'Hiring Manager'].includes(role)) && (
          <Button onClick={() => navigate('/requisitions/new')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Requisition
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
                  <p className="text-lg font-semibold">No Requisitions Found</p>
                  <p className="text-muted-foreground mb-4">Get started by creating your first job requisition.</p>
                  {userRoles.some(role => ['Admin', 'Hiring Manager'].includes(role)) && (
                    <Button onClick={() => navigate('/requisitions/new')}>
                      Create Requisition
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