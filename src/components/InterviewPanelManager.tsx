import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, AlertTriangle, CheckCircle2, Users2, MapPin, Flag, Building2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface PanelMember {
  id: string;
  user_id: string;
  panel_role: string;
  user: {
    id: string;
    name: string;
    email: string;
    gender?: string;
    duty_station?: string;
    nationality?: string;
    division?: string;
  };
}

interface StaffUser {
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

interface InterviewPanelManagerProps {
  jobId: string;
}

const PANEL_ROLES = [
  'Hiring Manager',
  'Additional Panel Member',
  'Subject Matter Expert',
  'HR Rep'
];

export function InterviewPanelManager({ jobId }: InterviewPanelManagerProps) {
  const { toast } = useToast();
  const [panelMembers, setPanelMembers] = useState<PanelMember[]>([]);
  const [availableStaff, setAvailableStaff] = useState<StaffUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [jobId]);

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchPanelMembers(),
        fetchAvailableStaff(),
        validatePanel()
      ]);
    } catch (error) {
      console.error('Error loading panel data:', error);
      toast({
        title: "Error",
        description: "Failed to load panel data",
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
        user:users (
          id,
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

  const fetchAvailableStaff = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, gender, duty_station, nationality, division')
      .like('email', '%@unicc.org')
      .order('name');

    if (error) throw error;
    if (data) setAvailableStaff(data);
  };

  const validatePanel = async () => {
    try {
      const { data, error } = await supabase.rpc('validate_panel_composition', {
        p_job_id: jobId
      });

      if (error) {
        console.error('Validation error:', error);
        return;
      }
      
      if (data) {
        // Cast the data as unknown first to avoid type conflicts
        setValidation(data as unknown as ValidationResult);
      }
    } catch (error) {
      console.error('Panel validation failed:', error);
    }
  };

  const addPanelMember = async () => {
    if (!selectedUserId || !selectedRole) {
      toast({
        title: "Validation Error",
        description: "Please select both a staff member and a role",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);
      const { error } = await supabase
        .from('job_interview_panel_members')
        .insert([{
          job_id: jobId,
          user_id: selectedUserId,
          panel_role: selectedRole as 'Hiring Manager' | 'Additional Panel Member' | 'Subject Matter Expert' | 'HR Rep'
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Panel member added successfully",
      });

      setSelectedUserId('');
      setSelectedRole('');
      await loadData();
    } catch (error: any) {
      console.error('Error adding panel member:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add panel member",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
    return <Card><CardContent className="p-6">Loading panel...</CardContent></Card>;
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'Hiring Manager': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'HR Rep': return 'bg-green-100 text-green-800 border-green-300';
      case 'Subject Matter Expert': return 'bg-purple-100 text-purple-800 border-purple-300';
      case 'Additional Panel Member': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return '';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users2 className="w-5 h-5" />
          Interview Panel Composition
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Select panel members ensuring gender balance, diversity in duty stations, nationalities, and divisions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Validation Messages */}
        {validation && (
          <div className="space-y-2">
            {validation.issues.map((issue, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{issue.message}</AlertDescription>
              </Alert>
            ))}
            {validation.warnings.map((warning, idx) => (
              <Alert key={idx}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning.message}</AlertDescription>
              </Alert>
            ))}
            {validation.valid && panelMembers.length > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Panel composition meets all requirements
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Summary Stats */}
        {validation && panelMembers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Users2 className="w-4 h-4" />
                Members
              </div>
              <div className="text-2xl font-bold">{validation.summary.total_members}</div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <MapPin className="w-4 h-4" />
                Duty Stations
              </div>
              <div className="text-sm font-medium">
                {validation.summary.duty_stations.filter(s => s).join(', ') || 'None'}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Flag className="w-4 h-4" />
                Nationalities
              </div>
              <div className="text-sm font-medium">
                {validation.summary.nationalities.filter(n => n).join(', ') || 'None'}
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Building2 className="w-4 h-4" />
                Divisions
              </div>
              <div className="text-sm font-medium">
                {validation.summary.divisions.filter(d => d).join(', ') || 'None'}
              </div>
            </div>
          </div>
        )}

        {/* Current Panel Members */}
        {panelMembers.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-medium text-sm">Current Panel Members</h3>
            <div className="space-y-2">
              {panelMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div className="flex items-center gap-3 flex-1">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        {member.user.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium">{member.user.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                        <span>{member.user.email}</span>
                        {member.user.gender && (
                          <Badge variant="outline" className="text-xs">
                            {member.user.gender}
                          </Badge>
                        )}
                        {member.user.duty_station && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {member.user.duty_station}
                          </Badge>
                        )}
                        {member.user.nationality && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Flag className="w-3 h-3" />
                            {member.user.nationality}
                          </Badge>
                        )}
                        {member.user.division && (
                          <Badge variant="outline" className="text-xs flex items-center gap-1">
                            <Building2 className="w-3 h-3" />
                            {member.user.division}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge className={getRoleBadgeColor(member.panel_role)}>
                      {member.panel_role}
                    </Badge>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removePanelMember(member.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Panel Member */}
        <div className="space-y-3 border-t pt-6">
          <h3 className="font-medium text-sm">Add Panel Member</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff member" />
              </SelectTrigger>
              <SelectContent>
                {availableStaff.map((staff) => (
                  <SelectItem key={staff.id} value={staff.id}>
                    <div className="flex flex-col">
                      <span>{staff.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {staff.duty_station && `${staff.duty_station} • `}
                        {staff.nationality && `${staff.nationality} • `}
                        {staff.division && staff.division}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                {PANEL_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={addPanelMember} disabled={saving || !selectedUserId || !selectedRole}>
              <Plus className="w-4 h-4 mr-2" />
              Add Member
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
