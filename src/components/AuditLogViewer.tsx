import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Filter, Calendar, User, Activity } from 'lucide-react';
import { format } from 'date-fns';

interface AuditLogEntry {
  id: string;
  actor_id: string;
  action: string;
  entity: string;
  entity_id: string;
  at: string;
  before: any;
  after: any;
  users?: {
    name: string;
    email: string;
  };
}

export const AuditLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterEntity, setFilterEntity] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const ITEMS_PER_PAGE = 50;

  useEffect(() => {
    fetchAuditLogs();
  }, [page, searchTerm, filterAction, filterEntity]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('audit_logs')
        .select(`
          *,
          users(name, email)
        `, { count: 'exact' })
        .order('at', { ascending: false })
        .range((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE - 1);

      if (searchTerm) {
        query = query.or(`entity.ilike.%${searchTerm}%,action.ilike.%${searchTerm}%`);
      }

      if (filterAction !== 'all') {
        query = query.eq('action', filterAction);
      }

      if (filterEntity !== 'all') {
        query = query.eq('entity', filterEntity);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      setLogs(data || []);
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INSERT': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'STAGE_CHANGE': return 'bg-purple-100 text-purple-800';
      case 'EMAIL_SENT': return 'bg-yellow-100 text-yellow-800';
      case 'PERMISSION_CHANGE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatEntityName = (entity: string) => {
    return entity.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const renderChangeDetails = (log: AuditLogEntry) => {
    if (!log.before && !log.after) return null;

    if (log.action === 'STAGE_CHANGE' && log.before && log.after) {
      return (
        <div className="text-xs text-muted-foreground mt-1">
          Status: {log.before.status} → {log.after.status}
        </div>
      );
    }

    if (log.action === 'INSERT' && log.after) {
      const keys = Object.keys(log.after).slice(0, 3);
      return (
        <div className="text-xs text-muted-foreground mt-1">
          Created: {keys.join(', ')}...
        </div>
      );
    }

    if (log.action === 'UPDATE' && log.before && log.after) {
      const changedFields = Object.keys(log.after).filter(key => 
        JSON.stringify(log.before[key]) !== JSON.stringify(log.after[key])
      );
      
      if (changedFields.length > 0) {
        return (
          <div className="text-xs text-muted-foreground mt-1">
            Changed: {changedFields.slice(0, 3).join(', ')}
            {changedFields.length > 3 && '...'}
          </div>
        );
      }
    }

    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Audit Log
        </CardTitle>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
          </div>
          
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="INSERT">Insert</SelectItem>
              <SelectItem value="UPDATE">Update</SelectItem>
              <SelectItem value="DELETE">Delete</SelectItem>
              <SelectItem value="STAGE_CHANGE">Stage Change</SelectItem>
              <SelectItem value="EMAIL_SENT">Email Sent</SelectItem>
              <SelectItem value="PERMISSION_CHANGE">Permission Change</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              <SelectItem value="applications">Applications</SelectItem>
              <SelectItem value="jobs">Jobs</SelectItem>
              <SelectItem value="users">Users</SelectItem>
              <SelectItem value="panel_interviews">Panel Interviews</SelectItem>
              <SelectItem value="feedback_form_responses">Feedback</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">Loading audit logs...</div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        {format(new Date(log.at), 'MMM dd, HH:mm:ss')}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">
                            {log.users?.name || 'System'}
                          </div>
                          {log.users?.email && (
                            <div className="text-xs text-muted-foreground">
                              {log.users.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={getActionBadgeColor(log.action)}>
                        {log.action}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div>
                        <div className="font-medium">{formatEntityName(log.entity)}</div>
                        <div className="text-xs text-muted-foreground font-mono">
                          {log.entity_id.slice(0, 8)}...
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {renderChangeDetails(log)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};