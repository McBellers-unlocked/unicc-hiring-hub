import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calendar, 
  User, 
  Activity, 
  MessageSquare, 
  Eye,
  CheckCircle,
  XCircle,
  ArrowRight,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface DatabaseStageEvent {
  id: string;
  at: string;
  from_stage: string | null;
  to_stage: string;
  reason: string | null;
  by_user: string | null;
  users?: {
    name: string;
    email: string;
  };
}

interface DatabaseAuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  at: string;
  before: any;
  after: any;
  metadata: any;
  users?: {
    name: string;
    email: string;
  };
}

interface ApplicationAuditViewerProps {
  applicationId: string;
  candidateName: string;
  submittedAt: string;
}

// Timeline event types
interface BaseTimelineEvent {
  id: string;
  at: string;
  description: string;
  actor: string;
  icon: React.ReactElement;
}

interface ApplicationTimelineEvent extends BaseTimelineEvent {
  type: 'application';
}

interface StageTimelineEvent extends BaseTimelineEvent {
  type: 'stage';
  reason?: string;
  fromStage?: string;
  toStage?: string;
}

interface AuditTimelineEvent extends BaseTimelineEvent {
  type: 'audit';
  metadata?: any;
}

type TimelineEvent = ApplicationTimelineEvent | StageTimelineEvent | AuditTimelineEvent;

export const ApplicationAuditViewer: React.FC<ApplicationAuditViewerProps> = ({
  applicationId,
  candidateName,
  submittedAt
}) => {
  const [stageEvents, setStageEvents] = useState<DatabaseStageEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<DatabaseAuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplicationAuditData();
  }, [applicationId]);

  const fetchApplicationAuditData = async () => {
    setLoading(true);
    try {
      // Fetch stage events
      const { data: stageEventsData, error: stageError } = await supabase
        .from('stage_events')
        .select(`
          *,
          users(name, email)
        `)
        .eq('application_id', applicationId)
        .order('at', { ascending: true });

      if (stageError) throw stageError;

      // Fetch audit logs related to this application
      const { data: auditData, error: auditError } = await supabase
        .from('audit_logs')
        .select(`
          *,
          users(name, email)
        `)
        .eq('entity_id', applicationId)
        .order('at', { ascending: true });

      if (auditError) throw auditError;

      setStageEvents(stageEventsData || []);
      setAuditLogs(auditData || []);
    } catch (error) {
      console.error('Error fetching application audit data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      'Application': 'bg-blue-100 text-blue-800 border-blue-200',
      'Screening': 'bg-cyan-100 text-cyan-800 border-cyan-200',
      'Longlist': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Shortlist': 'bg-purple-100 text-purple-800 border-purple-200',
      'Pre-Recorded Video': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Panel Interview': 'bg-orange-100 text-orange-800 border-orange-200',
      'Recommended': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Offer': 'bg-green-100 text-green-800 border-green-200',
      'Roster': 'bg-teal-100 text-teal-800 border-teal-200',
      'Rejected': 'bg-red-100 text-red-800 border-red-200'
    } as const;

    return (
      <Badge className={`${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800 border-gray-200'} border`}>
        {status}
      </Badge>
    );
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'STAGE_CHANGE':
        return <ArrowRight className="w-4 h-4 text-blue-600" />;
      case 'INSERT':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'UPDATE':
        return <Activity className="w-4 h-4 text-orange-600" />;
      case 'DELETE':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'VIEW':
        return <Eye className="w-4 h-4 text-purple-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const formatActionDescription = (log: DatabaseAuditLogEntry) => {
    switch (log.action) {
      case 'INSERT':
        return 'Application created';
      case 'UPDATE':
        return 'Application updated';
      case 'AUTO_SCORING_TRIGGERED':
        return 'AI scoring initiated';
      case 'EMAIL_SENT':
        return `Email sent: ${log.after?.subject || 'Notification'}`;
      default:
        return log.action.toLowerCase().replace('_', ' ');
    }
  };

  // Combine and sort all events chronologically
  const allEvents: TimelineEvent[] = [
    // Add initial application submission
    {
      id: 'initial',
      type: 'application',
      at: submittedAt,
      description: 'Application submitted',
      actor: candidateName,
      icon: <CheckCircle className="w-4 h-4 text-green-600" />
    } as ApplicationTimelineEvent,
    // Add stage events
    ...stageEvents.map(event => ({
      id: event.id,
      type: 'stage',
      at: event.at,
      description: `Status changed${event.from_stage ? ` from ${event.from_stage}` : ''} to ${event.to_stage}`,
      actor: event.users?.name || 'System',
      reason: event.reason || undefined,
      fromStage: event.from_stage || undefined,
      toStage: event.to_stage,
      icon: <ArrowRight className="w-4 h-4 text-blue-600" />
    } as StageTimelineEvent)),
    // Add relevant audit events
    ...auditLogs
      .filter(log => !['INSERT', 'UPDATE'].includes(log.action) || log.action === 'AUTO_SCORING_TRIGGERED')
      .map(log => ({
        id: log.id,
        type: 'audit',
        at: log.at,
        description: formatActionDescription(log),
        actor: log.users?.name || 'System',
        metadata: log.metadata,
        icon: getActionIcon(log.action)
      } as AuditTimelineEvent))
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">Loading audit trail...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Application Journey & Audit Trail
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete timeline of {candidateName}'s application progress and all system interactions
        </p>
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-4">
            {allEvents.map((event, index) => (
              <div key={event.id} className="relative">
                {/* Timeline line */}
                {index < allEvents.length - 1 && (
                  <div className="absolute left-6 top-12 w-0.5 h-8 bg-border" />
                )}
                
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-background border-2 border-border flex items-center justify-center">
                    {event.icon}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm">{event.description}</h4>
                        {event.type === 'stage' && event.toStage && (
                          <div className="flex items-center gap-1">
                            {event.fromStage && (
                              <>
                                {getStatusBadge(event.fromStage)}
                                <ArrowRight className="w-3 h-3 text-muted-foreground" />
                              </>
                            )}
                            {getStatusBadge(event.toStage)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(event.at), { addSuffix: true })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <User className="w-3 h-3" />
                      <span>by {event.actor}</span>
                      <span>•</span>
                      <Calendar className="w-3 h-3" />
                      <span>{format(new Date(event.at), 'PPp')}</span>
                    </div>
                    
                    {/* Reason/Comment for stage events */}
                    {event.type === 'stage' && event.reason && (
                      <div className="mt-2 p-3 bg-muted/50 rounded-md border">
                        <div className="flex items-start gap-2">
                          <MessageSquare className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Rationale:</p>
                            <p className="text-sm">{event.reason}</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Metadata for audit events */}
                    {event.type === 'audit' && event.metadata && Object.keys(event.metadata).length > 0 && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        <details className="cursor-pointer">
                          <summary className="hover:text-foreground">Additional details</summary>
                          <pre className="mt-1 p-2 bg-muted/30 rounded text-xs overflow-x-auto">
                            {JSON.stringify(event.metadata, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                </div>
                
                {index < allEvents.length - 1 && <Separator className="my-4" />}
              </div>
            ))}
            
            {allEvents.length === 1 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No additional events yet - this application was just submitted.</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};