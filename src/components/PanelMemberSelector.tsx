import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Users, AlertCircle, CheckCircle2, X, Plus } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface PanelMember {
  id: string;
  user_id: string;
  panel_role: string;
  user: {
    name: string;
    email: string;
    gender?: string;
    duty_station?: string;
    nationality?: string;
    division?: string;
  };
}

interface AvailableUser {
  id: string;
  name: string;
  email: string;
  gender?: string;
  duty_station?: string;
  nationality?: string;
  division?: string;
}

interface ValidationResult {
  valid: boolean;
  issues: Array<{ type: string; message: string }>;
  warnings: Array<{ type: string; message: string }>;
  summary: {
    total_members: number;
    gender_diversity: number;
    duty_stations: string[];
    nationalities: string[];
    divisions: string[];
  };
}

interface PanelMemberSelectorProps {
  jobId: string;
}

const PANEL_ROLES = [
  'Hiring Manager',
  'Additional Panel Member',
  'Subject Matter Expert',
  'HR Rep'
];

export function PanelMemberSelector({ jobId }: PanelMemberSelectorProps) {
  const { toast } = useToast();
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState<{ userId: string; role: string }>({
    userId: '',
    role: ''
  });

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPanelMembers(),
        fetchAvailableUsers()
      ]);
      await validatePanel();
    } catch (error) {
      console.error('Error loading panel data:', error);
      toast({
        title: "Error",
        description: "Failed to load panel member data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPanelMembers = async () => {
    const { data, error } = await supabase
      .from('job_interview_panel_members')
      .select(`
        id,
        user_id,
        panel_role,
        user:users!job_interview_panel_members_user_id_fkey (
          name,
          email,
          gender,
          duty_station,
          nationality,
          division
        )
      `)
      .eq('job_id', jobId);

    if (error) throw error;
    if (data) setPanelMembers(data as any);
  };

  const fetchAvailableUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, gender, duty_station, nationality, division')
      .like('email', '%@unicc.org')
      .order('name');

    if (error) throw error;
    if (data) setAvailableUsers(data);
  };

  const validatePanel = async () => {
    const { data, error } = await supabase.rpc('validate_panel_composition', {
      p_job_id: jobId
    });

    if (error) {
      console.error('Validation error:', error);
      return;
    }
    
    if (data && typeof data === 'object') {
      setValidation(data as unknown as ValidationResult);
    }
  };

  const addPanelMember = async () => {
    if (!newMember.userId || !newMember.role) {
      toast({
        title: "Validation Error",
        description: "Please select both a user and a role",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdding(true);
      const { error } = await supabase
        .from('job_interview_panel_members')
        .insert([{
          job_id: jobId,
          user_id: newMember.userId,
          panel_role: newMember.role as 'Hiring Manager' | 'Additional Panel Member' | 'Subject Matter Expert' | 'HR Rep'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel member added successfully",
      });

      setNewMember({ userId: '', role: '' });
      await loadData();
    } catch (error: any) {
      console.error('Error adding panel member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add panel member",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  const removePanelMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('job_interview_panel_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel member removed",
      });

      await loadData();
    } catch (error) {
      console.error('Error removing panel member:', error);
      toast({
        title: "Error",
        description: "Failed to remove panel member",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <Card><CardContent className="p-6">Loading panel members...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Interview Panel
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Select panel members for this interview
            </p>
          </div>
          {validation && (
            <Badge variant={validation.valid ? "default" : "destructive"}>
              {validation.valid ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> Valid</>
              ) : (
                <><AlertCircle className="w-3 h-3 mr-1" /> Issues Found</>
              )}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Validation Messages */}
        {validation && (
          <div className="space-y-2">
            {validation.issues.map((issue, index) => (
              <Alert key={`issue-${index}`} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
            {validation.warnings.map((warning, index) => (
              <Alert key={`warning-${index}`}>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{warning.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Panel Summary */}
        {validation && validation.summary.total_members > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-muted/30 rounded-lg">
            <div>
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="font-semibold">{validation.summary.total_members}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Duty Stations</p>
              <p className="font-semibold text-xs">
                {validation.summary.duty_stations?.filter(s => s).join(', ') || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Nationalities</p>
              <p className="font-semibold text-xs">
                {validation.summary.nationalities?.filter(n => n).join(', ') || 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Divisions</p>
              <p className="font-semibold text-xs">
                {validation.summary.divisions?.filter(d => d).join(', ') || 'N/A'}
              </p>
            </div>
          </div>
        )}

        {/* Current Panel Members */}
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Current Panel Members</h3>
          {panelMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No panel members assigned yet</p>
          ) : (
            <div className="space-y-2">
              {panelMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{member.user.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{member.panel_role}</Badge>
                      {member.user.gender && (
                        <Badge variant="secondary" className="text-xs">{member.user.gender}</Badge>
                      )}
                      {member.user.duty_station && (
                        <Badge variant="secondary" className="text-xs">{member.user.duty_station}</Badge>
                      )}
                      {member.user.nationality && (
                        <Badge variant="secondary" className="text-xs">{member.user.nationality}</Badge>
                      )}
                      {member.user.division && (
                        <Badge variant="secondary" className="text-xs">{member.user.division}</Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePanelMember(member.id)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Panel Member */}
        <div className="space-y-2 pt-4 border-t">
          <h3 className="text-sm font-medium">Add Panel Member</h3>
          <div className="flex gap-2">
            <Select
              value={newMember.userId}
              onValueChange={(value) => setNewMember({ ...newMember, userId: value })}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select user..." />
              </SelectTrigger>
              <SelectContent>
                {availableUsers
                  .filter(u => !panelMembers.some(pm => pm.user_id === u.id))
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex flex-col">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {user.duty_station && `${user.duty_station} • `}
                          {user.gender && `${user.gender} • `}
                          {user.nationality}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>

            <Select
              value={newMember.role}
              onValueChange={(value) => setNewMember({ ...newMember, role: value })}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select role..." />
              </SelectTrigger>
              <SelectContent>
                {PANEL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              onClick={addPanelMember}
              disabled={adding || !newMember.userId || !newMember.role}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
