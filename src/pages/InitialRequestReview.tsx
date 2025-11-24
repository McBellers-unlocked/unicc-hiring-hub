import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { CheckCircle2, XCircle, Eye, Calendar, MapPin, Briefcase, UserCheck } from 'lucide-react';
import { format } from 'date-fns';
import { getAssignedChief } from '@/lib/chiefAssignment';

interface InitialRequest {
  id: string;
  position_title: string;
  nature_of_position: string;
  temporary_duration: string | null;
  consultant_duration: string | null;
  intern_modality: string | null;
  grade: string | null;
  duty_station: string;
  unit_section_division: string | null;
  brief_outline: string;
  funding_status: string;
  funding_comments: string | null;
  created_at: string;
  created_by: string;
  creator_name?: string;
  comments?: any;
}

export default function InitialRequestReview() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, userRoles } = useAuth();
  
  const [requests, setRequests] = useState<InitialRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<InitialRequest | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [comments, setComments] = useState('');
  const [processing, setProcessing] = useState(false);

  // For now, treating 'Hiring Manager' as potential Chief of Division
  // In production, you'd want a specific 'Chief of Division' role
  const hasAccess = userRoles.includes('Admin') || userRoles.includes('Hiring Manager');

  useEffect(() => {
    if (!hasAccess) {
      navigate('/');
      return;
    }
    fetchRequests();
  }, [hasAccess]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_requisitions')
        .select(`
          *,
          users:created_by (
            name
          )
        `)
        .in('status', ['initial_request_submitted', 'initial_request_chief_review'])
        .or('initial_request_approved.is.null,initial_request_approved.eq.false')
        .order('created_at', { ascending: false});

      if (error) throw error;

      const formattedData = data?.map((req: any) => ({
        ...req,
        creator_name: req.users?.name || 'Unknown',
      })) || [];

      setRequests(formattedData);
    } catch (error: any) {
      toast({
        title: "Error loading requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (request: InitialRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setComments('');
  };

  const closeDialog = () => {
    setSelectedRequest(null);
    setActionType(null);
    setComments('');
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setProcessing(true);

      if (actionType === 'approve') {
        // Approve the request - mark as Chief approved
        const { error } = await supabase
          .from('job_requisitions')
          .update({
            chief_of_division_approval: true,
            chief_of_division_approved_by: user?.id,
            chief_of_division_approved_at: new Date().toISOString(),
            initial_request_approved: true,
            initial_request_approved_by: user?.id,
            initial_request_approved_at: new Date().toISOString(),
            status: 'initial_request_approved',
          })
          .eq('id', selectedRequest.id);

        if (error) throw error;

        toast({
          title: "Request Approved",
          description: "HR will notify the hiring manager to create the full position description",
        });
      } else {
        // Reject the request
        const { error } = await supabase
          .from('job_requisitions')
          .update({
            status: 'initial_request_rejected',
            initial_request_submitted: false,
            initial_request_approved: false,
            comments: JSON.stringify([
              {
                user_id: user?.id,
                comment: comments,
                timestamp: new Date().toISOString(),
                action: 'rejected_initial_request',
              }
            ]),
          })
          .eq('id', selectedRequest.id);

        if (error) throw error;

        toast({
          title: "Request Rejected",
          description: "The hiring manager has been notified with your feedback",
        });
      }

      closeDialog();
      fetchRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const getDurationDisplay = (request: InitialRequest) => {
    if (request.temporary_duration) return request.temporary_duration;
    if (request.consultant_duration) return request.consultant_duration;
    return null;
  };

  if (!hasAccess) {
    return null;
  }

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Initial Request Review - Chief of Division</h1>
          <p className="text-muted-foreground">
            Review and approve initial position requests from hiring managers in your division
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading requests...</div>
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No pending initial requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => {
              const duration = getDurationDisplay(request);
              const locations = request.duty_station ? JSON.parse(request.duty_station) : [];
              const remoteRegion = (request as any).comments?.remote_region;
              const assignedChief = getAssignedChief(request.unit_section_division);
              
              return (
                <Card key={request.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-xl">{request.position_title}</CardTitle>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Briefcase className="w-4 h-4" />
                            {request.nature_of_position}
                            {duration && ` - ${duration}`}
                          </div>
                          {request.grade && (
                            <Badge variant="outline">Grade {request.grade}</Badge>
                          )}
                        </div>
                        {assignedChief && (
                          <div className="flex items-center gap-1 text-sm mt-2">
                            <UserCheck className="w-4 h-4 text-primary" />
                            <span className="font-medium">Assigned to:</span>
                            <span className="text-muted-foreground">{assignedChief.name} ({assignedChief.division})</span>
                          </div>
                        )}
                      </div>
                      <Badge variant="secondary">Pending Review</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Location */}
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium mb-1">Location</p>
                        <div className="flex flex-wrap gap-1">
                          {locations.map((loc: string) => (
                            <Badge key={loc} variant="outline">
                              {loc === 'Remote' && remoteRegion ? `Remote (${remoteRegion})` : loc}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Consultancy Level */}
                    {request.nature_of_position === 'Individual Consultant' && request.comments && typeof request.comments === 'object' && (request.comments as any).consultancy_level && (
                      <div>
                        <p className="text-sm font-medium mb-1">Consultancy Level</p>
                        <Badge variant="outline">{(request.comments as any).consultancy_level}</Badge>
                      </div>
                    )}

                    {/* Intern Modality */}
                    {request.nature_of_position === 'Intern' && request.intern_modality && (
                      <div>
                        <p className="text-sm font-medium mb-1">Modality</p>
                        <Badge variant="outline">{request.intern_modality}</Badge>
                      </div>
                    )}

                    {/* Brief Outline */}
                    <div>
                      <p className="text-sm font-medium mb-1">Brief Outline</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {request.brief_outline}
                      </p>
                    </div>

                    {/* Funding */}
                    <div>
                      <p className="text-sm font-medium mb-1">Funding Status</p>
                      <p className="text-sm text-muted-foreground">{request.funding_status}</p>
                      {request.funding_comments && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          {request.funding_comments}
                        </p>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 pt-4 border-t text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(request.created_at), 'MMM d, yyyy')}
                      </div>
                      <div>Requested by: {request.creator_name}</div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        onClick={() => openDialog(request, 'approve')}
                        variant="default"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        onClick={() => openDialog(request, 'reject')}
                        variant="destructive"
                        size="sm"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => navigate(`/requisitions/initial/${request.id}`)}
                        variant="outline"
                        size="sm"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Action Dialog */}
        <Dialog open={!!selectedRequest && !!actionType} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === 'approve' ? 'Approve Initial Request' : 'Reject Initial Request'}
              </DialogTitle>
              <DialogDescription>
                {actionType === 'approve' 
                  ? 'This will mark the initial request as approved by Chief of Division. HR can then notify the hiring manager to proceed with creating the full position description.'
                  : 'Please provide feedback for the hiring manager about why this request is being rejected.'}
              </DialogDescription>
            </DialogHeader>
            
            {actionType === 'reject' && (
              <div className="space-y-2">
                <Label htmlFor="comments">Comments *</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Explain why this request is being rejected..."
                  rows={4}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={processing}>
                Cancel
              </Button>
              <Button
                onClick={handleAction}
                disabled={processing || (actionType === 'reject' && !comments.trim())}
                variant={actionType === 'approve' ? 'default' : 'destructive'}
              >
                {processing ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
