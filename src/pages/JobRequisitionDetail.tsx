import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, Briefcase, CheckCircle, Clock, MessageSquare, Download } from "lucide-react";
import { format } from "date-fns";

interface JobRequisition {
  id: string;
  reference_number: string;
  position_title: string;
  grade: string;
  unit_section_division: string;
  duty_station: string;
  nature_of_position: string;
  start_date: string;
  positions_available: number;
  purpose_of_position: string;
  objectives_of_programme: string;
  main_duties_responsibilities: string;
  essential_experience: string;
  desirable_experience: string;
  essential_education: string;
  desirable_education: string;
  language_requirements: any;
  status: string;
  created_at: string;
  finance_controller_approval: boolean;
  chief_of_division_approval: boolean;
  deputy_director_approval: boolean;
  director_approval: boolean;
  hr_reviewed: boolean;
  hr_reviewed_by: string;
  hr_reviewed_at: string;
  hr_comments: string;
  hiring_manager_confirmed_hr_changes: boolean;
  hiring_manager_confirmed_at: string;
  pdf_url: string;
  converted_to_job_id: string;
  comments: any;
  created_by: string;
  hr_original_data: any;
  hr_changes: any;
  hr_change_summary: string;
}

export default function JobRequisitionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, userRoles } = useAuth();
  const { toast } = useToast();
  const [requisition, setRequisition] = useState<JobRequisition | null>(null);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [addingComment, setAddingComment] = useState(false);

  useEffect(() => {
    if (id) {
      fetchRequisition();
    }
  }, [id]);

  const fetchRequisition = async () => {
    try {
      const { data, error } = await supabase
        .from('job_requisitions')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setRequisition(data);
    } catch (error) {
      console.error('Error fetching requisition:', error);
      toast({
        title: "Error",
        description: "Failed to fetch requisition details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim() || !requisition) return;

    try {
      setAddingComment(true);
      const comments = Array.isArray(requisition.comments) ? requisition.comments : [];
      comments.push({
        id: Date.now(),
        text: newComment,
        author: user?.email,
        timestamp: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('job_requisitions')
        .update({ comments })
        .eq('id', requisition.id);

      if (error) throw error;

      setRequisition({ ...requisition, comments });
      setNewComment("");
      
      toast({
        title: "Success",
        description: "Comment added successfully",
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    } finally {
      setAddingComment(false);
    }
  };

  const generatePDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-requisition-pdf', {
        body: { requisitionId: id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "PDF generated successfully",
      });

      if (data?.pdfUrl) {
        window.open(data.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "Error",
        description: "Failed to generate PDF",
        variant: "destructive",
      });
    }
  };

  const convertToJob = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('convert-requisition-to-job', {
        body: { requisitionId: id }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: data.message || "Successfully converted to job posting",
      });

      if (data?.jobId) {
        navigate(`/admin/jobs/${data.jobId}/edit`);
      }
    } catch (error) {
      console.error('Error converting to job:', error);
      toast({
        title: "Error",
        description: "Failed to convert to job posting",
        variant: "destructive",
      });
    }
  };

  const acceptHRChanges = async () => {
    try {
      const { error } = await supabase
        .from('job_requisitions')
        .update({
          hiring_manager_confirmed_hr_changes: true,
          hiring_manager_confirmed_at: new Date().toISOString(),
          status: 'hiring_manager_review'
        })
        .eq('id', requisition?.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "HR changes accepted successfully",
      });

      fetchRequisition(); // Refresh the data
    } catch (error) {
      console.error('Error accepting HR changes:', error);
      toast({
        title: "Error",
        description: "Failed to accept HR changes",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!requisition) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-lg font-semibold">Requisition Not Found</p>
              <p className="text-muted-foreground">The requested job requisition could not be found.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = () => {
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

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={() => navigate('/requisitions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Requisitions
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{requisition.position_title}</h1>
            {getStatusBadge()}
          </div>
          <p className="text-muted-foreground">
            Ref: {requisition.reference_number} • Created {format(new Date(requisition.created_at), 'MMM dd, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          {((requisition.status === 'hr_amendments') || 
            (requisition.status === 'hiring_manager_review' && requisition.hr_reviewed && !requisition.hiring_manager_confirmed_hr_changes)) && 
           requisition.created_by === user?.id && (
            <Button onClick={acceptHRChanges} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Accept HR Changes
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate(`/requisitions/${requisition.id}/edit`)}>
            Edit
          </Button>
          <Button variant="outline" onClick={generatePDF}>
            <FileText className="h-4 w-4 mr-2" />
            Generate PDF
          </Button>
          {requisition.director_approval && !requisition.converted_to_job_id && (
            <Button onClick={convertToJob}>
              <Briefcase className="h-4 w-4 mr-2" />
              Convert to Job
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Position Information */}
        <Card>
          <CardHeader>
            <CardTitle>Position Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Grade</label>
                <p>{requisition.grade}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Unit/Section/Division</label>
                <p>{requisition.unit_section_division}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Duty Station</label>
                <p>{requisition.duty_station}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Nature of Position</label>
                <p>{requisition.nature_of_position}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Start Date</label>
                <p>{requisition.start_date ? format(new Date(requisition.start_date), 'MMM dd, yyyy') : 'Not specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Number of Positions</label>
                <p>{requisition.positions_available}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Position Description */}
        <Card>
          <CardHeader>
            <CardTitle>Position Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Purpose of the Position</label>
              <p className="mt-1 whitespace-pre-wrap">{requisition.purpose_of_position}</p>
            </div>
            
            {requisition.objectives_of_programme && (
              <div>
                <label className="text-sm font-medium text-muted-foreground">Objectives of the Programme</label>
                <p className="mt-1 whitespace-pre-wrap">{requisition.objectives_of_programme}</p>
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-muted-foreground">Main Duties and Responsibilities</label>
              <p className="mt-1 whitespace-pre-wrap">{requisition.main_duties_responsibilities}</p>
            </div>
          </CardContent>
        </Card>

        {/* Requirements */}
        <Card>
          <CardHeader>
            <CardTitle>Requirements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Essential Experience</label>
                <p className="mt-1 whitespace-pre-wrap">{requisition.essential_experience}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desirable Experience</label>
                <p className="mt-1 whitespace-pre-wrap">{requisition.desirable_experience || 'None specified'}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Essential Education</label>
                <p className="mt-1 whitespace-pre-wrap">{requisition.essential_education}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Desirable Education</label>
                <p className="mt-1 whitespace-pre-wrap">{requisition.desirable_education || 'None specified'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Approval Status */}
        <Card>
          <CardHeader>
            <CardTitle>Approval Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {requisition.finance_controller_approval ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.finance_controller_approval ? "text-green-700" : "text-gray-500"}>
                  Finance Controller Approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                {requisition.chief_of_division_approval ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.chief_of_division_approval ? "text-green-700" : "text-gray-500"}>
                  Chief of Division Approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                {requisition.deputy_director_approval ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.deputy_director_approval ? "text-green-700" : "text-gray-500"}>
                  Deputy Director Approval
                </span>
              </div>
              <div className="flex items-center gap-3">
                {requisition.director_approval ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <Clock className="h-5 w-5 text-gray-400" />
                )}
                <span className={requisition.director_approval ? "text-green-700" : "text-gray-500"}>
                  Director Approval
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* HR Review Section */}
        {requisition.hr_reviewed && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-800">
                <MessageSquare className="h-5 w-5" />
                HR Review & Amendments
              </CardTitle>
              <CardDescription className="text-amber-700">
                Reviewed on {requisition.hr_reviewed_at ? format(new Date(requisition.hr_reviewed_at), 'MMM dd, yyyy') : 'Recently'}
                {requisition.hiring_manager_confirmed_hr_changes && (
                  <span className="ml-2 inline-flex items-center gap-1 text-green-700">
                    <CheckCircle className="h-4 w-4" />
                    Changes accepted by hiring manager
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {requisition.hr_change_summary && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Summary of Changes:</h4>
                  <p className="whitespace-pre-wrap text-amber-700">
                    {requisition.hr_change_summary}
                  </p>
                </div>
              )}
              
              {Array.isArray(requisition.hr_changes) && requisition.hr_changes.length > 0 && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-3">Detailed Changes:</h4>
                  <div className="space-y-3">
                    {requisition.hr_changes.map((change: any, index: number) => (
                      <div key={index} className="border-l-4 border-amber-400 pl-4">
                        <div className="font-medium text-amber-800">{change.label}</div>
                        <div className="text-sm space-y-1 mt-1">
                          <div>
                            <span className="text-red-600 font-medium">Original:</span>
                            <span className="text-red-600 ml-2">{change.originalValue || '(empty)'}</span>
                          </div>
                          <div>
                            <span className="text-green-600 font-medium">Modified:</span>
                            <span className="text-green-600 ml-2">{change.newValue || '(empty)'}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {requisition.hr_comments && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <h4 className="font-medium text-amber-800 mb-2">Additional Comments:</h4>
                  <p className="whitespace-pre-wrap text-amber-700">
                    {requisition.hr_comments}
                  </p>
                </div>
              )}
              
              {!requisition.hr_change_summary && !requisition.hr_changes && !requisition.hr_comments && (
                <div className="bg-white p-4 rounded-lg border border-amber-200">
                  <p className="text-amber-700">
                    HR has reviewed this requisition. Please confirm you are happy with any changes made and accept to proceed to the next approval stage.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Comments Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Comments & Feedback
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.isArray(requisition.comments) && requisition.comments.length > 0 && (
              <div className="space-y-3">
                {requisition.comments.map((comment: any) => (
                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">{comment.author}</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(comment.timestamp), 'MMM dd, yyyy HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.text}</p>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-2">
              <Textarea
                placeholder="Add a comment or feedback..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button 
                onClick={addComment} 
                disabled={!newComment.trim() || addingComment}
                size="sm"
              >
                Add Comment
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}