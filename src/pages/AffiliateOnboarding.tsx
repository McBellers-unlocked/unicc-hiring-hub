import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, User, Mail, Calendar, Clock, RefreshCw, FileText, Rocket, Briefcase, UserPlus, Building2 } from 'lucide-react';
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
import { LaunchPRDialog } from '@/components/affiliate/LaunchPRDialog';
import { LinkJobDialog } from '@/components/affiliate/LinkJobDialog';
import { LinkVendorDialog } from '@/components/affiliate/LinkVendorDialog';
import { LinkWorkerDialog } from '@/components/affiliate/LinkWorkerDialog';

interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  affiliate_type: string | null;
  division: string | null;
  unit: string | null;
  line_manager: string | null;
  job_title: string | null;
  duty_station: string | null;
  first_incumbency_date: string | null;
  gender: string | null;
}

interface ContractRecord {
  id: string;
  samsaran_pr: string | null;
  samsaran_po: string | null;
  gsm_reg_number: string | null;
  gsm_po: string | null;
  start_date: string | null;
  end_date: string | null;
  unit_price: number | null;
  unit: string | null;
  currency: string | null;
  days_worked: number | null;
}

export default function AffiliateOnboarding() {
  const { id, recordNumber } = useParams<{ id: string; recordNumber: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeStage, setActiveStage] = useState<string>(LIFECYCLE_STAGES[0].key);
  const [showLaunchPR, setShowLaunchPR] = useState(false);
  const [prLaunched, setPrLaunched] = useState(false);
  const [showLinkJob, setShowLinkJob] = useState(false);
  const [jobLinked, setJobLinked] = useState(false);
  const [showLinkVendor, setShowLinkVendor] = useState(false);
  const [vendorLinked, setVendorLinked] = useState(false);
  const [showLinkWorker, setShowLinkWorker] = useState(false);
  const [workerLinked, setWorkerLinked] = useState(false);

  const { data: affiliate, isLoading: affiliateLoading } = useQuery({
    queryKey: ['affiliate', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, affiliate_type, division, unit, line_manager, job_title')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as AffiliateUser;
    },
    enabled: !!id,
  });

  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: ['affiliate-contract-record', id, recordNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_contract_history')
        .select('id, record_number, samsaran_pr, samsaran_po, gsm_reg_number, gsm_po, start_date, end_date, unit_price, unit, currency, days_worked')
        .eq('record_number', recordNumber!)
        .maybeSingle();
      if (error) throw error;
      return data as (ContractRecord & { record_number: string }) | null;
    },
    enabled: !!recordNumber,
  });

  const contractInfo = contract ? {
    daysToOnboard: contract.start_date 
      ? differenceInDays(parseISO(contract.start_date), new Date())
      : null,
    startDate: contract.start_date,
    endDate: contract.end_date,
  } : null;

  const { data: checklist, isLoading: checklistLoading, refetch: refetchChecklist } = useQuery({
    queryKey: ['affiliate-lifecycle-checklist', id, recordNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_lifecycle_checklists')
        .select('*')
        .eq('user_id', id!)
        .eq('contract_record_id', recordNumber!);
      if (error) throw error;
      return (data || []) as ChecklistItem[];
    },
    enabled: !!id && !!recordNumber,
  });

  const initializeChecklist = useMutation({
    mutationFn: async () => {
      if (!affiliate || !user || !contract) return;
      const items: any[] = [];
      for (const stage of LIFECYCLE_STAGES) {
        const stageItems = DEFAULT_CHECKLIST_ITEMS[stage.key as LifecycleStageKey] || [];
        for (const item of stageItems) {
          items.push({
            user_id: affiliate.id,
            contract_cycle_start: contract.start_date,
            contract_cycle_end: contract.end_date,
            next_contract_start: contract.start_date,
            samsaran_pr: contract.samsaran_pr || null,
            contract_record_id: recordNumber,
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

  const activeStageItems = checklist?.filter(item => item.stage === activeStage) || [];

  if (affiliateLoading || contractLoading) {
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
            <h1 className="text-2xl font-bold">Onboarding Management</h1>
            <p className="text-muted-foreground">First contract workflow</p>
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
              
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  onClick={() => !jobLinked && setShowLinkJob(true)}
                  className={jobLinked ? 'bg-green-600 hover:bg-green-600 text-white cursor-default' : ''}
                  disabled={jobLinked}
                >
                  <Briefcase className="w-5 h-5 mr-2" />
                  {jobLinked ? 'Job Linked' : 'Create/Link Job'}
                </Button>
                <Button size="lg" onClick={() => console.log('Create/Link Worker')}>
                  <UserPlus className="w-5 h-5 mr-2" />
                  Create/Link Worker
                </Button>
                <Button
                  size="lg"
                  onClick={() => !vendorLinked && setShowLinkVendor(true)}
                  className={vendorLinked ? 'bg-green-600 hover:bg-green-600 text-white cursor-default' : ''}
                  disabled={vendorLinked}
                >
                  <Building2 className="w-5 h-5 mr-2" />
                  {vendorLinked ? 'Vendor Linked' : 'Create/Link Vendor'}
                </Button>
                <Button
                  onClick={() => !prLaunched && setShowLaunchPR(true)}
                  size="lg"
                  className={prLaunched ? 'bg-green-600 hover:bg-green-600 text-white cursor-default' : ''}
                  disabled={prLaunched}
                >
                  <Rocket className="w-5 h-5 mr-2" />
                  {prLaunched ? 'PR Launched' : 'Launch PR'}
                </Button>
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

            <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Record #</p>
                  <p className="font-medium font-mono">{recordNumber || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Samsaran PR</p>
                  <p className="font-medium font-mono">{contract?.samsaran_pr || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="font-medium">
                    {contract?.start_date 
                      ? format(parseISO(contract.start_date), 'dd MMM yyyy')
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className="font-medium">
                    {contract?.end_date 
                      ? format(parseISO(contract.end_date), 'dd MMM yyyy')
                      : 'Not set'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Days to Onboard</p>
                  <p className="font-medium text-lg">
                    {contractInfo?.daysToOnboard !== null && contractInfo?.daysToOnboard !== undefined
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
        <LinkJobDialog
          open={showLinkJob}
          onOpenChange={setShowLinkJob}
          affiliateJobTitle={affiliate.job_title}
          onJobCreated={() => setJobLinked(true)}
        />
        <LinkVendorDialog
          open={showLinkVendor}
          onOpenChange={setShowLinkVendor}
          onVendorCreated={() => setVendorLinked(true)}
        />
        <LaunchPRDialog
          open={showLaunchPR}
          onOpenChange={setShowLaunchPR}
          onSubmitted={() => setPrLaunched(true)}
          recordNumber={recordNumber || ''}
          affiliateName={affiliate.name}
          affiliateUnit={affiliate.unit}
          affiliateManager={affiliate.line_manager}
          contract={contract ? {
            start_date: contract.start_date,
            end_date: contract.end_date,
            unit_price: contract.unit_price,
            unit: contract.unit,
            currency: contract.currency,
            days_worked: contract.days_worked,
          } : null}
        />
      </div>
    </Layout>
  );
}
