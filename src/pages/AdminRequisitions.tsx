import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Eye,
  Calendar,
  User,
  Building
} from "lucide-react";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  status: string;
  created_at: string;
  created_by: string;
  hr_reviewed: boolean;
  hr_reviewed_at: string | null;
  hr_reviewed_by: string | null;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string | null;
  chief_of_division_approval: boolean;
  director_approval: boolean;
  deputy_director_approval: boolean;
  finance_controller_approval: boolean;
}

export default function AdminRequisitions() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');

  useEffect(() => {
    if (!isAdmin && !isHR) {
      navigate('/');
      return;
    }
    fetchRequisitions();
  }, [isAdmin, isHR, navigate]);

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
        description: "Failed to fetch requisitions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleHRReview = async (requisitionId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hr_reviewed: true,
          hr_reviewed_at: new Date().toISOString(),
          hr_reviewed_by: user?.id,
          status: approved ? 'hiring_manager_review' : 'hr_amendments'
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Requisition ${approved ? 'approved' : 'sent back for amendments'}`,
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const handleHiringManagerConfirmation = async (requisitionId: string) => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          status: 'chief_division_review'
        })
        .eq('id', requisitionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Requisition sent to Chief of Division for approval",
      });

      fetchRequisitions();
    } catch (error) {
      console.error('Error updating requisition:', error);
      toast({
        title: "Error",
        description: "Failed to update requisition",
        variant: "destructive",
      });
    }
  };

  const getStatusInfo = (requisition: JobRequisition) => {
    switch (requisition.status) {
      case 'draft':
        return { label: 'Draft', color: 'secondary', icon: Clock };
      case 'hr_review':
        return { label: 'HR Review', color: 'warning', icon: AlertCircle };
      case 'hr_amendments':
        return { label: 'HR Amendments', color: 'destructive', icon: XCircle };
      case 'hiring_manager_review':
        return { label: 'Manager Review', color: 'info', icon: Clock };
      case 'chief_division_review':
        return { label: 'Chief Review', color: 'info', icon: Clock };
      case 'director_review':
        return { label: 'Director Review', color: 'info', icon: Clock };
      case 'approved':
        return { label: 'Approved', color: 'success', icon: CheckCircle2 };
      case 'rejected':
        return { label: 'Rejected', color: 'destructive', icon: XCircle };
      default:
        return { label: requisition.status, color: 'secondary', icon: AlertCircle };
    }
  };

  const getStatusVariant = (color: string) => {
    switch (color) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'destructive': return 'destructive';
      case 'info': return 'outline';
      default: return 'secondary';
    }
  };

  const filterRequisitions = (status: string) => {
    switch (status) {
      case 'pending-hr':
        return requisitions.filter(r => r.status === 'hr_review');
      case 'amendments':
        return requisitions.filter(r => r.status === 'hr_amendments');
      case 'manager-confirmation':
        return requisitions.filter(r => r.status === 'hiring_manager_review');
      case 'in-progress':
        return requisitions.filter(r => 
          ['chief_division_review', 'director_review'].includes(r.status)
        );
      case 'completed':
        return requisitions.filter(r => ['approved', 'rejected'].includes(r.status));
      default:
        return requisitions;
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Manage Requisitions</h1>
          <p className="text-muted-foreground">Review and approve job requisitions</p>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Requisitions</TabsTrigger>
            <TabsTrigger value="pending-hr">
              Pending HR Review
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('pending-hr').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="amendments">
              Amendments Required
              <Badge variant="destructive" className="ml-2">
                {filterRequisitions('amendments').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="manager-confirmation">
              Manager Confirmation
              <Badge variant="secondary" className="ml-2">
                {filterRequisitions('manager-confirmation').length}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="in-progress">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>

          {(['all', 'pending-hr', 'amendments', 'manager-confirmation', 'in-progress', 'completed'] as const).map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="space-y-4">
              {filterRequisitions(tabValue).length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No requisitions found</p>
                  </CardContent>
                </Card>
              ) : (
                filterRequisitions(tabValue).map((requisition) => {
                  const statusInfo = getStatusInfo(requisition);
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={requisition.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <CardTitle className="text-lg">{requisition.position_title}</CardTitle>
                              <Badge variant={getStatusVariant(statusInfo.color)} className="flex items-center gap-1">
                                <StatusIcon className="h-3 w-3" />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <CardDescription className="flex items-center gap-4">
                              <span className="flex items-center gap-1">
                                <FileText className="h-4 w-4" />
                                {requisition.reference_number}
                              </span>
                              <span className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {requisition.grade}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {new Date(requisition.created_at).toLocaleDateString()}
                              </span>
                            </CardDescription>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/requisitions/${requisition.id}`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            
                            {requisition.status === 'hr_review' && (isAdmin || isHR) && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleHRReview(requisition.id, false)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Request Changes
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => handleHRReview(requisition.id, true)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Approve
                                </Button>
                              </div>
                            )}

                            {requisition.status === 'hiring_manager_review' && (isAdmin || isHR) && (
                              <Button
                                size="sm"
                                onClick={() => handleHiringManagerConfirmation(requisition.id)}
                              >
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Send to Chief Review
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Unit/Division:</span>
                            <span>{requisition.unit_section_division}</span>
                          </div>
                          
                          {requisition.hr_reviewed && (
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">HR Reviewed:</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3 text-green-600" />
                                {requisition.hr_reviewed_at && new Date(requisition.hr_reviewed_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 pt-2">
                            {requisition.chief_of_division_approval && (
                              <Badge variant="outline" className="text-xs">Chief Approved</Badge>
                            )}
                            {requisition.director_approval && (
                              <Badge variant="outline" className="text-xs">Director Approved</Badge>
                            )}
                            {requisition.deputy_director_approval && (
                              <Badge variant="outline" className="text-xs">Deputy Director Approved</Badge>
                            )}
                            {requisition.finance_controller_approval && (
                              <Badge variant="outline" className="text-xs">Finance Approved</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Layout>
  );
}