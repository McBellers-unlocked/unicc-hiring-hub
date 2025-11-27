import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Mail, FileEdit, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

// Unified activity event interface
interface UnifiedActivityEvent {
  id: string;
  timestamp: string;
  type: 'audit' | 'email';
  action: string;
  actor_name?: string;
  actor_email?: string;
  entity?: string;
  entity_id?: string;
  // Audit-specific
  before?: any;
  after?: any;
  metadata?: any;
  // Email-specific
  recipient_email?: string;
  recipient_name?: string;
  subject?: string;
  status?: string;
  template_slug?: string;
  error_message?: string;
  application_id?: string;
  requisition_id?: string;
}

interface UnifiedActivityViewerProps {
  filters?: {
    startDate?: string;
    endDate?: string;
    jobId?: string;
  };
}

export const UnifiedActivityViewer: React.FC<UnifiedActivityViewerProps> = ({ filters }) => {
  const [events, setEvents] = useState<UnifiedActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    fetchUnifiedActivity();
  }, [searchTerm, filterType, filterAction, page, filters]);

  const fetchUnifiedActivity = async () => {
    setLoading(true);
    try {
      let auditEvents: UnifiedActivityEvent[] = [];
      let emailEvents: UnifiedActivityEvent[] = [];

      // Fetch audit logs if needed
      if (filterType === 'all' || filterType === 'audit') {
        let auditQuery = supabase
          .from('audit_logs')
          .select('*, users(name, email)', { count: 'exact' })
          .order('at', { ascending: false });

        if (filterAction !== 'all') {
          auditQuery = auditQuery.eq('action', filterAction);
        }

        if (filters?.startDate) {
          auditQuery = auditQuery.gte('at', filters.startDate);
        }
        if (filters?.endDate) {
          auditQuery = auditQuery.lte('at', filters.endDate);
        }

        const { data: auditData } = await auditQuery;

        auditEvents = (auditData || []).map(log => ({
          id: log.id,
          timestamp: log.at,
          type: 'audit' as const,
          action: log.action,
          actor_name: log.users?.name,
          actor_email: log.users?.email,
          entity: log.entity,
          entity_id: log.entity_id,
          before: log.before,
          after: log.after,
          metadata: log.metadata,
        }));
      }

      // Fetch email logs if needed
      if (filterType === 'all' || filterType === 'email') {
        let emailQuery = supabase
          .from('email_send_log')
          .select('*, users(name, email)', { count: 'exact' })
          .order('sent_at', { ascending: false });

        if (filters?.startDate) {
          emailQuery = emailQuery.gte('sent_at', filters.startDate);
        }
        if (filters?.endDate) {
          emailQuery = emailQuery.lte('sent_at', filters.endDate);
        }

        const { data: emailData } = await emailQuery;

        emailEvents = (emailData || []).map(email => ({
          id: email.id,
          timestamp: email.sent_at || email.created_at,
          type: 'email' as const,
          action: 'EMAIL_SENT',
          actor_name: email.users?.name,
          actor_email: email.users?.email,
          recipient_email: email.recipient_email,
          recipient_name: email.recipient_name,
          subject: email.subject,
          status: email.status,
          template_slug: email.template_slug,
          error_message: email.error_message,
          application_id: email.application_id,
          requisition_id: email.requisition_id,
        }));
      }

      // Merge and sort by timestamp
      const merged = [...auditEvents, ...emailEvents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      // Apply search filter
      const filtered = searchTerm
        ? merged.filter(event => {
            const searchLower = searchTerm.toLowerCase();
            return (
              event.action.toLowerCase().includes(searchLower) ||
              event.actor_name?.toLowerCase().includes(searchLower) ||
              event.actor_email?.toLowerCase().includes(searchLower) ||
              event.recipient_email?.toLowerCase().includes(searchLower) ||
              event.subject?.toLowerCase().includes(searchLower) ||
              event.entity?.toLowerCase().includes(searchLower)
            );
          })
        : merged;

      // Pagination
      setTotalPages(Math.ceil(filtered.length / pageSize));
      const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize);

      setEvents(paginated);
    } catch (error) {
      console.error('Error fetching unified activity:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    const colors: Record<string, string> = {
      'EMAIL_SENT': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      'STAGE_CHANGE': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      'INSERT': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      'UPDATE': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      'DELETE': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      'PERMISSION_CHANGE': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    };
    return colors[action] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  };

  const getStatusBadgeColor = (status: string) => {
    return status === 'sent' 
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  };

  const formatEntityName = (entity?: string) => {
    if (!entity) return '';
    return entity
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const renderEventDetails = (event: UnifiedActivityEvent) => {
    if (event.type === 'email') {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{event.subject}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            To: {event.recipient_name || event.recipient_email}
            {event.recipient_name && (
              <span className="ml-1">({event.recipient_email})</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getStatusBadgeColor(event.status || 'sent')}>
              {event.status || 'sent'}
            </Badge>
            {event.template_slug && (
              <span className="text-xs text-muted-foreground">
                Template: {event.template_slug}
              </span>
            )}
          </div>
          {event.error_message && (
            <div className="text-sm text-red-600 dark:text-red-400">
              Error: {event.error_message}
            </div>
          )}
          {(event.requisition_id || event.application_id) && (
            <div className="text-xs text-muted-foreground">
              {event.requisition_id && `Requisition ID: ${event.requisition_id}`}
              {event.application_id && `Application ID: ${event.application_id}`}
            </div>
          )}
        </div>
      );
    }

    // Audit event rendering
    if (event.action === 'STAGE_CHANGE') {
      return (
        <div className="flex items-center gap-2">
          <span>{event.before?.stage || 'Unknown'}</span>
          <ArrowRight className="h-4 w-4" />
          <span className="font-medium">{event.after?.stage || 'Unknown'}</span>
          {event.after?.reason && (
            <span className="text-sm text-muted-foreground ml-2">
              ({event.after.reason})
            </span>
          )}
        </div>
      );
    }

    if (event.action === 'INSERT' && event.entity) {
      return (
        <div className="text-sm">
          Created new {formatEntityName(event.entity).toLowerCase()}
        </div>
      );
    }

    if (event.action === 'UPDATE' && event.entity) {
      return (
        <div className="text-sm">
          Updated {formatEntityName(event.entity).toLowerCase()}
        </div>
      );
    }

    return (
      <div className="text-sm text-muted-foreground">
        {event.entity && `${formatEntityName(event.entity)} - `}
        {event.action}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <Input
            placeholder="Search activity..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="max-w-sm"
          />
          <Select value={filterType} onValueChange={(value) => {
            setFilterType(value);
            setPage(0);
          }}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Activity</SelectItem>
              <SelectItem value="email">Emails Sent</SelectItem>
              <SelectItem value="audit">Data Changes</SelectItem>
            </SelectContent>
          </Select>
          {filterType === 'audit' && (
            <Select value={filterAction} onValueChange={(value) => {
              setFilterAction(value);
              setPage(0);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                <SelectItem value="INSERT">Insert</SelectItem>
                <SelectItem value="UPDATE">Update</SelectItem>
                <SelectItem value="DELETE">Delete</SelectItem>
                <SelectItem value="STAGE_CHANGE">Stage Change</SelectItem>
                <SelectItem value="PERMISSION_CHANGE">Permission Change</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading activity...</div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Timestamp</TableHead>
                    <TableHead className="w-[200px]">Actor</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No activity found
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="text-sm">
                          {format(new Date(event.timestamp), 'MMM d, yyyy HH:mm')}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">
                              {event.actor_name || 'System'}
                            </span>
                            {event.actor_email && (
                              <span className="text-xs text-muted-foreground">
                                {event.actor_email}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={getActionBadgeColor(event.action)}>
                            {event.type === 'email' ? (
                              <Mail className="h-3 w-3 mr-1" />
                            ) : (
                              <FileEdit className="h-3 w-3 mr-1" />
                            )}
                            {event.action.replace(/_/g, ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{renderEventDetails(event)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Page {page + 1} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                    disabled={page === totalPages - 1}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
