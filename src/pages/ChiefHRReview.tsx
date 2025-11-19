import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Eye,
  Calendar,
  Building,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { ChiefHRReviewDialog } from "@/components/ChiefHRReviewDialog";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  status: string;
  created_at: string;
  hr_reviewed_at: string | null;
  chief_hr_reviewed: boolean;
  chief_hr_reviewed_at: string | null;
  hr_internal_status: string;
  duty_station: string;
}

export default function ChiefHRReview() {
  const [requisitions, setRequisitions] = useState<JobRequisition[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const isAdmin = userRoles.includes('Admin');
  const isHR = userRoles.includes('HR Assistant');
  const isChiefHR = userRoles.includes('Chief of HR');

  useEffect(() => {
    if (!isAdmin && !isHR && !isChiefHR) {
      navigate('/');
      return;
    }
    fetchRequisitions();
  }, [isAdmin, isHR, isChiefHR, navigate]);

  const fetchRequisitions = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('status', 'hr_review')
        .eq('hr_internal_status', 'pending_chief_review')
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


  if (loading) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded"></div>
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
          <h1 className="text-3xl font-bold">Chief HR Review</h1>
          <p className="text-muted-foreground">Review position descriptions pending Chief HR approval</p>
        </div>

        {requisitions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
              <p className="text-muted-foreground">No position descriptions pending Chief HR review</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requisitions.map((requisition) => (
              <Card key={requisition.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-lg">{requisition.position_title}</CardTitle>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          Pending Chief HR Review
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {requisition.reference_number}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          {requisition.grade} - {requisition.unit_section_division}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Submitted: {new Date(requisition.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
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
                        View Details
                      </Button>
                      
                      <ChiefHRReviewDialog
                        requisitionId={requisition.id}
                        onComplete={fetchRequisitions}
                      />
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Duty Station:</span>
                        <p className="font-medium">
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
                      {(requisition as any).nature_of_position === 'Individual Consultant' && (requisition as any).comments?.consultancy_level && (
                        <div>
                          <span className="text-muted-foreground">Consultancy Level:</span>
                          <p className="font-medium">{(requisition as any).comments.consultancy_level}</p>
                        </div>
                      )}
                      {(requisition as any).nature_of_position === 'Intern' && (requisition as any).intern_modality && (
                        <div>
                          <span className="text-muted-foreground">Modality:</span>
                          <p className="font-medium">{(requisition as any).intern_modality}</p>
                        </div>
                      )}
                      {requisition.hr_reviewed_at && (
                        <div>
                          <span className="text-muted-foreground">HR Reviewed:</span>
                          <p className="font-medium">
                            {new Date(requisition.hr_reviewed_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

      </div>
    </Layout>
  );
}
