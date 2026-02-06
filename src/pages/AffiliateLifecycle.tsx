import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Calendar, Clock, RefreshCw } from 'lucide-react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { toast } from 'sonner';
import { AffiliateLifecycleTimeline } from '@/components/affiliate/AffiliateLifecycleTimeline';
import { AffiliateLifecycleChecklist } from '@/components/affiliate/AffiliateLifecycleChecklist';
import { 
  LIFECYCLE_STAGES, 
  DEFAULT_CHECKLIST_ITEMS, 
  ChecklistItem,
  LifecycleStageKey 
} from '@/lib/affiliateLifecycleConfig';
import { useAuth } from '@/hooks/useAuth';

interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  affiliate_type: string | null;
  division: string | null;
  unit: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  first_incumbency_date: string | null;
}

export default function AffiliateLifecycle() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState<string>(LIFECYCLE_STAGES[0].key);

  // Fetch affiliate data
  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ['affiliate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, affiliate_type, division, unit, contract_start_date, contract_end_date, first_incumbency_date')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as AffiliateUser;
    },
    enabled: !!id,
  });

  // Calculate contract break info
  const contractInfo = affiliate ? {
    isContractBreak: affiliate.contract_start_date && affiliate.first_incumbency_date 
      ? differenceInDays(parseISO(affiliate.contract_start_date), new Date()) > 0 
      : false,
    daysToOnboard: affiliate.contract_start_date 
      ? differenceInDays(parseISO(affiliate.contract_start_date), new Date())
      : null,
    breakStart: affiliate.contract_end_date,
    breakEnd: affiliate.contract_start_date,
  } : null;

  // Fetch or create checklist items
  const { data: checklist, isLoading: checklistLoading, refetch: refetchChecklist } = useQuery({
    queryKey: ['affiliate-lifecycle-checklist', id, affiliate?.contract_end_date],
    queryFn: async () => {
      if (!affiliate) return [];
      
      const { data, error } = await supabase
        .from('affiliate_lifecycle_checklists')
        .select('*')
        .eq('user_id', id)
        .eq('next_contract_start', affiliate.contract_start_date || '');

      if (error) throw error;
      return (data || []) as ChecklistItem[];
    },
    enabled: !!affiliate,
  });

  // Initialize checklist items if empty
  const initializeChecklist = useMutation({
    mutationFn: async () => {
      if (!affiliate || !user) return;
      
      const items: Omit<ChecklistItem, 'id' | 'created_at' | 'updated_at'>[] = [];
      
      for (const stage of LIFECYCLE_STAGES) {
        const stageItems = DEFAULT_CHECKLIST_ITEMS[stage.key as LifecycleStageKey] || [];
        for (const item of stageItems) {
          items.push({
            user_id: affiliate.id,
            contract_cycle_start: affiliate.first_incumbency_date,
            contract_cycle_end: affiliate.contract_end_date,
            next_contract_start: affiliate.contract_start_date,
            stage: stage.key,
            item_key: item.key,
            item_label: item.label,
            completed: false,
            completed_at: null,
            completed_by: null,
            notes: null,
          });
        }
      }

      const { error } = await supabase
        .from('affiliate_lifecycle_checklists')
        .insert(items);

      if (error) throw error;
    },
    onSuccess: () => {
      refetchChecklist();
      toast.success('Checklist initialized');
    },
    onError: (error) => {
      console.error('Error initializing checklist:', error);
      toast.error('Failed to initialize checklist');
    },
  });

  // Toggle checklist item
  const toggleItem = useMutation({
    mutationFn: async ({ itemId, completed }: { itemId: string; completed: boolean }) => {
      const { error } = await supabase
        .from('affiliate_lifecycle_checklists')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          completed_by: completed ? user?.id : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-lifecycle-checklist'] });
    },
    onError: (error) => {
      console.error('Error updating item:', error);
      toast.error('Failed to update item');
    },
  });

  // Update notes
  const updateNotes = useMutation({
    mutationFn: async ({ itemId, notes }: { itemId: string; notes: string }) => {
      const { error } = await supabase
        .from('affiliate_lifecycle_checklists')
        .update({
          notes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', itemId);

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error updating notes:', error);
      toast.error('Failed to update notes');
    },
  });

  // Get items for active stage
  const activeStageItems = checklist?.filter(item => item.stage === activeStage) || [];

  if (affiliateLoading) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-48 w-full" />
        </div>
      </Layout>
    );
  }

  if (!affiliate) {
    return (
      <Layout>
        <div className="container mx-auto py-8 px-4">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Affiliate not found</p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/admin/affiliate-personnel">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Affiliates
              </Link>
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button asChild variant="outline" size="sm">
            <Link to="/admin/affiliate-personnel">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Lifecycle Management</h1>
            <p className="text-muted-foreground">Contract onboarding workflow</p>
          </div>
        </div>

        {/* Affiliate Info Card */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{affiliate.name}</h2>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {affiliate.email}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-4">
                {affiliate.affiliate_type && (
                  <Badge variant="outline">{affiliate.affiliate_type}</Badge>
                )}
                {affiliate.division && (
                  <Badge variant="secondary">{affiliate.division}</Badge>
                )}
              </div>
            </div>

            {/* Contract Break Info */}
            {contractInfo && (
              <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Contract End Date</p>
                    <p className="font-medium">
                      {contractInfo.breakStart 
                        ? format(parseISO(contractInfo.breakStart), 'dd MMM yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">New Contract Start</p>
                    <p className="font-medium">
                      {contractInfo.breakEnd 
                        ? format(parseISO(contractInfo.breakEnd), 'dd MMM yyyy')
                        : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Days to Onboard</p>
                    <p className="font-medium text-lg">
                      {contractInfo.daysToOnboard !== null 
                        ? contractInfo.daysToOnboard > 0 
                          ? `${contractInfo.daysToOnboard} days`
                          : contractInfo.daysToOnboard === 0
                            ? 'Today!'
                            : `${Math.abs(contractInfo.daysToOnboard)} days ago`
                        : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Onboarding Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <AffiliateLifecycleTimeline
              daysToOnboard={contractInfo?.daysToOnboard ?? 0}
              checklist={checklist || []}
              activeStage={activeStage}
              onStageClick={setActiveStage}
            />
          </CardContent>
        </Card>

        {/* Checklist Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Checklist Items</h3>
            {checklist && checklist.length === 0 && (
              <Button 
                onClick={() => initializeChecklist.mutate()}
                disabled={initializeChecklist.isPending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${initializeChecklist.isPending ? 'animate-spin' : ''}`} />
                Initialize Checklist
              </Button>
            )}
          </div>

          {checklistLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : checklist && checklist.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No checklist items found for this contract cycle.</p>
                <p className="text-sm mt-2">Click "Initialize Checklist" to create default items.</p>
              </CardContent>
            </Card>
          ) : (
            <AffiliateLifecycleChecklist
              stageKey={activeStage}
              items={activeStageItems}
              daysToOnboard={contractInfo?.daysToOnboard ?? 0}
              onToggleItem={(itemId, completed) => toggleItem.mutate({ itemId, completed })}
              onUpdateNotes={(itemId, notes) => updateNotes.mutate({ itemId, notes })}
            />
          )}
        </div>
      </div>
    </Layout>
  );
}
