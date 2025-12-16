import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Brain, CheckCircle, XCircle, RefreshCw, Filter, ArrowRight, Sparkles, TrendingUp, Clock, Ban, Square } from 'lucide-react';

interface SkillDefinition {
  id: string;
  name: string;
  category: string;
  skill_type: string;
  status: string | null;
  ai_suggested_category: string | null;
  ai_suggested_status: string | null;
  ai_review_pending: boolean;
  ai_reviewed_at: string | null;
}

interface ProcessingProgress {
  processed: number;
  remaining: number;
  total: number;
}

const STATUS_CONFIG = {
  new: { label: 'New', icon: Sparkles, color: 'bg-blue-500' },
  emerging: { label: 'Emerging', icon: TrendingUp, color: 'bg-green-500' },
  established: { label: 'Established', icon: CheckCircle, color: 'bg-primary' },
  legacy: { label: 'Legacy', icon: Clock, color: 'bg-amber-500' },
  retired: { label: 'Retired', icon: Ban, color: 'bg-destructive' },
};

const CATEGORY_ORDER = ['Behavioral', 'Technical & Domain', 'Methods & Processes', 'Certifications & Licenses'];

export default function AdminSkillsReview() {
  const { user } = useAuth();
  const [skills, setSkills] = useState<SkillDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending');
  const [progress, setProgress] = useState<ProcessingProgress | null>(null);
  const shouldStopRef = useRef(false);

  useEffect(() => {
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, status, ai_suggested_category, ai_suggested_status, ai_review_pending, ai_reviewed_at')
      .eq('is_active', true)
      .order('name');

    if (error) {
      toast.error('Failed to fetch skills');
      console.error(error);
    } else {
      setSkills(data || []);
    }
    setLoading(false);
  };

  const filteredSkills = useMemo(() => {
    return skills.filter(skill => {
      if (filterStatus === 'pending' && !skill.ai_review_pending) return false;
      if (filterStatus === 'reviewed' && skill.ai_review_pending) return false;
      if (filterCategory !== 'all' && skill.category !== filterCategory) return false;
      return true;
    });
  }, [skills, filterCategory, filterStatus]);

  const pendingCount = skills.filter(s => s.ai_review_pending).length;

  const runAICategorization = async () => {
    setProcessing(true);
    shouldStopRef.current = false;
    let totalProcessed = 0;
    let hasMore = true;

    try {
      while (hasMore && !shouldStopRef.current) {
        const { data, error } = await supabase.functions.invoke('categorize-skills', {
          body: { limit: 100 }
        });

        if (error) {
          // Handle rate limit
          if (error.message?.includes('429') || error.status === 429) {
            toast.info('Rate limited - waiting 10 seconds...');
            await new Promise(r => setTimeout(r, 10000));
            continue;
          }
          // Handle payment required
          if (error.message?.includes('402') || error.status === 402) {
            toast.error('Please add credits to continue AI processing');
            break;
          }
          throw error;
        }

        totalProcessed += data.processed || 0;
        hasMore = data.hasMore || false;

        setProgress({
          processed: totalProcessed,
          remaining: data.remaining || 0,
          total: data.totalSkills || totalProcessed + (data.remaining || 0)
        });

        // Small delay between chunks to avoid overwhelming the API
        if (hasMore && !shouldStopRef.current) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      if (shouldStopRef.current) {
        toast.info(`Processing stopped. Processed ${totalProcessed} skills.`);
      } else {
        toast.success(`Completed! Processed ${totalProcessed} skills`);
      }

      fetchSkills();
    } catch (error: any) {
      toast.error('Failed to run AI categorization', { description: error.message });
    } finally {
      setProcessing(false);
      setProgress(null);
    }
  };

  const stopProcessing = () => {
    shouldStopRef.current = true;
  };

  const approveSelected = async () => {
    if (selectedSkills.size === 0) {
      toast.error('No skills selected');
      return;
    }

    setProcessing(true);
    try {
      const updates = Array.from(selectedSkills).map(async (skillId) => {
        const skill = skills.find(s => s.id === skillId);
        if (!skill?.ai_suggested_category && !skill?.ai_suggested_status) return;

        return supabase
          .from('skill_definitions')
          .update({
            category: skill.ai_suggested_category || skill.category,
            status: skill.ai_suggested_status || skill.status,
            ai_review_pending: false,
            ai_reviewed_at: new Date().toISOString(),
            ai_reviewed_by: user?.id,
          })
          .eq('id', skillId);
      });

      await Promise.all(updates);
      toast.success(`Approved ${selectedSkills.size} skills`);
      setSelectedSkills(new Set());
      fetchSkills();
    } catch (error: any) {
      toast.error('Failed to approve skills', { description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const rejectSelected = async () => {
    if (selectedSkills.size === 0) {
      toast.error('No skills selected');
      return;
    }

    setProcessing(true);
    try {
      const { error } = await supabase
        .from('skill_definitions')
        .update({
          ai_suggested_category: null,
          ai_suggested_status: null,
          ai_review_pending: false,
          ai_reviewed_at: new Date().toISOString(),
          ai_reviewed_by: user?.id,
        })
        .in('id', Array.from(selectedSkills));

      if (error) throw error;

      toast.success(`Rejected ${selectedSkills.size} suggestions`);
      setSelectedSkills(new Set());
      fetchSkills();
    } catch (error: any) {
      toast.error('Failed to reject suggestions', { description: error.message });
    } finally {
      setProcessing(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedSkills.size === filteredSkills.length) {
      setSelectedSkills(new Set());
    } else {
      setSelectedSkills(new Set(filteredSkills.map(s => s.id)));
    }
  };

  const toggleSkill = (skillId: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId);
    } else {
      newSelected.add(skillId);
    }
    setSelectedSkills(newSelected);
  };

  const getStatusBadge = (status: string | null) => {
    if (!status) return null;
    const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const hasChanges = (skill: SkillDefinition) => {
    return (skill.ai_suggested_category && skill.ai_suggested_category !== skill.category) ||
           (skill.ai_suggested_status && skill.ai_suggested_status !== skill.status);
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Skills Taxonomy Review</h1>
            <p className="text-muted-foreground">Review and approve AI-suggested skill categorizations</p>
          </div>
          <Button onClick={runAICategorization} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}
            Run AI Categorization
          </Button>
        </div>

        {/* Progress Card */}
        {processing && progress && (
          <Card className="border-primary">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="font-medium">Processing skills with Gemini Flash...</span>
                </div>
                <Button variant="destructive" size="sm" onClick={stopProcessing}>
                  <Square className="h-3 w-3 mr-1 fill-current" />
                  Stop
                </Button>
              </div>
              <Progress value={(progress.processed / progress.total) * 100} className="h-2" />
              <p className="text-sm text-muted-foreground mt-2">
                {progress.processed} of {progress.total} skills processed ({progress.remaining} remaining)
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Skills</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{skills.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reviewed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{skills.length - pendingCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Selected</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{selectedSkills.size}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Skills</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORY_ORDER.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={fetchSkills} disabled={processing}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="destructive" size="sm" onClick={rejectSelected} disabled={selectedSkills.size === 0 || processing}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject Selected
                </Button>
                <Button size="sm" onClick={approveSelected} disabled={selectedSkills.size === 0 || processing}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve Selected
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSkills.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No skills match your filters
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedSkills.size === filteredSkills.length && filteredSkills.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Skill Name</TableHead>
                      <TableHead>Current Category</TableHead>
                      <TableHead>AI Suggested</TableHead>
                      <TableHead>Current Status</TableHead>
                      <TableHead>AI Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSkills.map((skill) => (
                      <TableRow key={skill.id} className={hasChanges(skill) ? 'bg-amber-50 dark:bg-amber-950/20' : ''}>
                        <TableCell>
                          <Checkbox
                            checked={selectedSkills.has(skill.id)}
                            onCheckedChange={() => toggleSkill(skill.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{skill.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{skill.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {skill.ai_suggested_category && skill.ai_suggested_category !== skill.category ? (
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-amber-500" />
                              <Badge className="bg-amber-500">{skill.ai_suggested_category}</Badge>
                            </div>
                          ) : skill.ai_suggested_category ? (
                            <Badge variant="secondary">{skill.ai_suggested_category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(skill.status)}
                        </TableCell>
                        <TableCell>
                          {skill.ai_suggested_status && skill.ai_suggested_status !== skill.status ? (
                            <div className="flex items-center gap-2">
                              <ArrowRight className="h-4 w-4 text-amber-500" />
                              {getStatusBadge(skill.ai_suggested_status)}
                            </div>
                          ) : skill.ai_suggested_status ? (
                            getStatusBadge(skill.ai_suggested_status)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
