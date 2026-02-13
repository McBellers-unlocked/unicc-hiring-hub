import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Users, Search, Upload, Calendar, AlertTriangle, CheckCircle, Clock, Building2, UserPlus, MoreHorizontal, Pencil, ClipboardList, FileSpreadsheet, ArrowUp, ArrowDown, ArrowUpDown, Download } from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { AffiliateForm, AffiliateFormData } from '@/components/affiliate/AffiliateForm';
import { cn } from '@/lib/utils';

// Sorting types
type SortDirection = 'asc' | 'desc' | null;
type SortField = 'name' | 'affiliate_type' | 'division' | 'job_title' | 'duty_station' | 'first_incumbency_date' | 'status';

// Sortable table head component
interface SortableTableHeadProps {
  field: SortField;
  currentField: SortField | null;
  direction: SortDirection;
  onSort: (field: SortField) => void;
  children: React.ReactNode;
  className?: string;
}

const SortableTableHead = ({ 
  field, 
  currentField, 
  direction, 
  onSort, 
  children,
  className 
}: SortableTableHeadProps) => {
  const isActive = currentField === field;
  
  return (
    <TableHead 
      className={cn("cursor-pointer select-none hover:bg-muted/50 transition-colors", className)}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {isActive ? (
          direction === 'asc' ? (
            <ArrowUp className="h-3 w-3" />
          ) : (
            <ArrowDown className="h-3 w-3" />
          )
        ) : (
          <ArrowUpDown className="h-3 w-3 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  );
};

interface AffiliateUser {
  id: string;
  name: string;
  email: string;
  affiliate_type: string | null;
  division: string | null;
  unit: string | null;
  duty_station: string | null;
  job_title: string | null;
  line_manager: string | null;
  contract_start_date: string | null;
  contract_end_date: string | null;
  current_grade: string | null;
  staff_number: string | null;
  first_incumbency_date: string | null;
}

const getContractStatus = (
  startDate: string | null,
  endDate: string | null,
  firstIncumbencyDate: string | null
): { 
  status: string; 
  colorClass: string;
  daysRemaining: number | null;
  isNotYetActive: boolean;
  isContractBreak: boolean;
  isNoData: boolean;
  isCritical: boolean;
} => {
  // Color classes for each status
  const colors = {
    active: 'bg-green-100 text-green-700 border-green-200',
    noData: 'bg-gray-800 text-white border-gray-700',
    startingSoon: 'bg-purple-100 text-purple-700 border-purple-200',
    contractBreak: 'bg-amber-100 text-amber-700 border-amber-200',
    expiring60: 'bg-purple-100 text-purple-700 border-purple-200',
    expiring30: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-gradient-to-r from-red-500 via-red-300 to-red-500 bg-[length:200%_100%] animate-pulse text-white border-red-400',
    expired: 'bg-red-100 text-red-700 border-red-200',
    noEndDate: 'bg-gray-100 text-gray-600 border-gray-200',
  };

  // Case 1: Contract hasn't started yet
  if (startDate) {
    const daysUntilStart = differenceInDays(parseISO(startDate), new Date());
    if (daysUntilStart > 0) {
      // They have worked before → Contract break
      if (firstIncumbencyDate) {
        return { 
          status: 'Contract Break', 
          colorClass: colors.contractBreak,
          daysRemaining: null,
          isNotYetActive: true,
          isContractBreak: true,
          isNoData: false,
          isCritical: false
        };
      }
      // New hire starting soon (within 60 days shows purple)
      return { 
        status: `Starts ${format(parseISO(startDate), 'dd MMM yyyy')}`, 
        colorClass: daysUntilStart <= 60 ? colors.startingSoon : colors.noEndDate,
        daysRemaining: null,
        isNotYetActive: true,
        isContractBreak: false,
        isNoData: false,
        isCritical: false
      };
    }
  }
  
  // Case 2: No start date AND no first incumbency date → No data
  if (!startDate && !firstIncumbencyDate) {
    return { 
      status: 'No Data', 
      colorClass: colors.noData,
      daysRemaining: null,
      isNotYetActive: false,
      isContractBreak: false,
      isNoData: true,
      isCritical: false
    };
  }
  
  // Case 3: Check end date for expiry status
  if (!endDate) {
    return { 
      status: 'No end date', 
      colorClass: colors.noEndDate,
      daysRemaining: null, 
      isNotYetActive: false, 
      isContractBreak: false, 
      isNoData: false,
      isCritical: false
    };
  }
  
  const days = differenceInDays(parseISO(endDate), new Date());
  
  // Expired
  if (days < 0) {
    return { 
      status: 'Expired', 
      colorClass: colors.expired,
      daysRemaining: days, 
      isNotYetActive: false, 
      isContractBreak: false, 
      isNoData: false,
      isCritical: false
    };
  }
  
  // Critical: 0-14 days (striped gradient)
  if (days <= 14) {
    return { 
      status: `${days}d remaining`, 
      colorClass: colors.critical,
      daysRemaining: days, 
      isNotYetActive: false, 
      isContractBreak: false, 
      isNoData: false,
      isCritical: true
    };
  }
  
  // Warning: 15-30 days (amber)
  if (days <= 30) {
    return { 
      status: `${days}d remaining`, 
      colorClass: colors.expiring30,
      daysRemaining: days, 
      isNotYetActive: false, 
      isContractBreak: false, 
      isNoData: false,
      isCritical: false
    };
  }
  
  // Attention: 31-60 days (purple)
  if (days <= 60) {
    return { 
      status: `${days}d remaining`, 
      colorClass: colors.expiring60,
      daysRemaining: days, 
      isNotYetActive: false, 
      isContractBreak: false, 
      isNoData: false,
      isCritical: false
    };
  }
  
  // Active: >60 days (green)
  return { 
    status: 'Active', 
    colorClass: colors.active,
    daysRemaining: days, 
    isNotYetActive: false, 
    isContractBreak: false, 
    isNoData: false,
    isCritical: false
  };
};

const getAffiliateTypeBadge = (type: string | null) => {
  switch (type?.toUpperCase()) {
    case 'IC':
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">IC</Badge>;
    case 'INTERN':
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Intern</Badge>;
    case 'UNV':
      return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">UNV</Badge>;
    default:
      return <Badge variant="outline">{type || 'Unknown'}</Badge>;
  }
};

export default function AffiliatePersonnel() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  
  // Form dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingAffiliate, setEditingAffiliate] = useState<AffiliateUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const { data: affiliates, isLoading } = useQuery({
    queryKey: ['affiliate-personnel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, affiliate_type, division, unit, duty_station, job_title, line_manager, contract_start_date, contract_end_date, current_grade, staff_number, first_incumbency_date')
        .eq('personnel_type', 'Affiliate')
        .order('name');

      if (error) throw error;
      return data as AffiliateUser[];
    },
  });

  // Fetch latest contract history per affiliate
  const { data: contractHistoryData } = useQuery({
    queryKey: ['affiliate-contract-history-latest'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('affiliate_contract_history')
        .select('user_id, samsaran_pr, start_date, end_date')
        .order('start_date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Build lookup: user_id -> most recent contract record
  const contractHistoryMap = useMemo(() => {
    const map = new Map<string, { samsaran_pr: string | null; start_date: string | null; end_date: string | null }>();
    if (!contractHistoryData) return map;
    for (const row of contractHistoryData) {
      if (!map.has(row.user_id)) {
        map.set(row.user_id, { samsaran_pr: row.samsaran_pr, start_date: row.start_date, end_date: row.end_date });
      }
    }
    return map;
  }, [contractHistoryData]);

  // Get unique divisions for filter
  const divisions = [...new Set(affiliates?.map(a => a.division).filter(Boolean) || [])];

  // Filter affiliates
  const filteredAffiliates = affiliates?.filter(affiliate => {
    const matchesSearch = !search || 
      affiliate.name?.toLowerCase().includes(search.toLowerCase()) ||
      affiliate.email?.toLowerCase().includes(search.toLowerCase()) ||
      affiliate.job_title?.toLowerCase().includes(search.toLowerCase());

    const matchesType = typeFilter === 'all' || 
      affiliate.affiliate_type?.toUpperCase() === typeFilter.toUpperCase();

    const matchesDivision = divisionFilter === 'all' || 
      affiliate.division === divisionFilter;

    const contractStatus = getContractStatus(affiliate.contract_start_date, affiliate.contract_end_date, affiliate.first_incumbency_date);
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'not-started' && contractStatus.isNotYetActive && !contractStatus.isContractBreak) ||
      (statusFilter === 'contract-break' && contractStatus.isContractBreak) ||
      (statusFilter === 'no-data' && contractStatus.isNoData) ||
      (statusFilter === 'critical' && contractStatus.isCritical) ||
      (statusFilter === 'expiring' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining <= 60 && contractStatus.daysRemaining > 14) ||
      (statusFilter === 'expired' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining < 0) ||
      (statusFilter === 'active' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining > 60);

    return matchesSearch && matchesType && matchesDivision && matchesStatus;
  }) || [];

  // Sorting handler
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Cycle: asc -> desc -> null
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sorted affiliates
  const sortedAffiliates = useMemo(() => {
    if (!sortField || !sortDirection) return filteredAffiliates;
    
    return [...filteredAffiliates].sort((a, b) => {
      let valueA: any;
      let valueB: any;
      
      if (sortField === 'status') {
        // Sort by days remaining (calculated field)
        const statusA = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
        const statusB = getContractStatus(b.contract_start_date, b.contract_end_date, b.first_incumbency_date);
        valueA = statusA.daysRemaining ?? Infinity;
        valueB = statusB.daysRemaining ?? Infinity;
      } else {
        valueA = a[sortField];
        valueB = b[sortField];
      }
      
      // Handle nulls - push to end when ascending
      if (valueA == null && valueB == null) return 0;
      if (valueA == null) return sortDirection === 'asc' ? 1 : -1;
      if (valueB == null) return sortDirection === 'asc' ? -1 : 1;
      
      // Compare
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB)
          : valueB.localeCompare(valueA);
      }
      
      return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
    });
  }, [filteredAffiliates, sortField, sortDirection]);

  // Calculate stats
  const stats = {
    total: affiliates?.length || 0,
    ics: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'IC').length || 0,
    interns: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'INTERN').length || 0,
    unvs: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'UNV').length || 0,
    critical14: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.isCritical;
    }).length || 0,
    expiring60: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.daysRemaining !== null && status.daysRemaining > 14 && status.daysRemaining <= 60;
    }).length || 0,
    notYetStarted: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.isNotYetActive && !status.isContractBreak;
    }).length || 0,
    contractBreak: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.isContractBreak;
    }).length || 0,
    noData: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.isNoData;
    }).length || 0,
  };

  // Backfill first_incumbency_date for affiliates missing it
  const handleBackfillFirstIncumbency = async () => {
    setIsBackfilling(true);
    try {
      // Get all affiliates where first_incumbency_date is NULL but contract_start_date exists
      const { data: affiliatesToUpdate, error: fetchError } = await supabase
        .from('users')
        .select('id, contract_start_date')
        .eq('personnel_type', 'Affiliate')
        .is('first_incumbency_date', null)
        .not('contract_start_date', 'is', null);

      if (fetchError) throw fetchError;

      if (!affiliatesToUpdate || affiliatesToUpdate.length === 0) {
        toast.info('No affiliates need backfilling');
        return;
      }

      // Update each affiliate individually (Supabase doesn't support column-to-column updates)
      let successCount = 0;
      let errorCount = 0;

      for (const affiliate of affiliatesToUpdate) {
        const { error: updateError } = await supabase
          .from('users')
          .update({ first_incumbency_date: affiliate.contract_start_date })
          .eq('id', affiliate.id);

        if (updateError) {
          console.error(`Error updating ${affiliate.id}:`, updateError);
          errorCount++;
        } else {
          successCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['affiliate-personnel'] });
      
      if (errorCount > 0) {
        toast.warning(`Backfilled ${successCount} affiliates, ${errorCount} failed`);
      } else {
        toast.success(`Successfully backfilled ${successCount} affiliates with First Contract dates`);
      }
    } catch (error: any) {
      console.error('Error backfilling first_incumbency_date:', error);
      toast.error(error.message || 'Failed to backfill first contract dates');
    } finally {
      setIsBackfilling(false);
    }
  };

  // Form handlers
  const handleAddAffiliate = () => {
    setEditingAffiliate(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleEditAffiliate = (affiliate: AffiliateUser) => {
    setEditingAffiliate(affiliate);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: AffiliateFormData, existingUserId?: string) => {
    setIsSubmitting(true);
    try {
      if (formMode === 'edit' && editingAffiliate) {
        // Update existing affiliate
        const { error } = await supabase
          .from('users')
          .update({
            name: data.name,
            affiliate_type: data.affiliate_type,
            division: data.division || null,
            unit: data.unit || null,
            job_title: data.job_title || null,
            line_manager: data.line_manager || null,
            duty_station: data.duty_station || null,
            contract_start_date: data.contract_start_date || null,
            contract_end_date: data.contract_end_date || null,
            current_grade: data.current_grade || null,
            staff_number: data.staff_number || null,
            nationality: data.nationality || null,
            gender: data.gender || null,
            first_incumbency_date: data.first_incumbency_date || null,
          })
          .eq('id', editingAffiliate.id);

        if (error) throw error;
        toast.success('Affiliate updated successfully');
      } else if (existingUserId) {
        // Convert existing user to affiliate
        const { error } = await supabase
          .from('users')
          .update({
            personnel_type: 'Affiliate',
            affiliate_type: data.affiliate_type,
            division: data.division || null,
            unit: data.unit || null,
            job_title: data.job_title || null,
            line_manager: data.line_manager || null,
            duty_station: data.duty_station || null,
            contract_start_date: data.contract_start_date || null,
            contract_end_date: data.contract_end_date || null,
            current_grade: data.current_grade || null,
            staff_number: data.staff_number || null,
            nationality: data.nationality || null,
            gender: data.gender || null,
            first_incumbency_date: data.first_incumbency_date || null,
          })
          .eq('id', existingUserId);

        if (error) throw error;
        toast.success('Affiliate added successfully');
      } else {
        // Create new affiliate
        const { error } = await supabase
          .from('users')
          .insert([{
            id: crypto.randomUUID(),
            name: data.name,
            email: data.email,
            personnel_type: 'Affiliate',
            affiliate_type: data.affiliate_type,
            division: data.division || null,
            unit: data.unit || null,
            job_title: data.job_title || null,
            line_manager: data.line_manager || null,
            duty_station: data.duty_station || null,
            contract_start_date: data.contract_start_date || null,
            contract_end_date: data.contract_end_date || null,
            current_grade: data.current_grade || null,
            staff_number: data.staff_number || null,
            nationality: data.nationality || null,
            gender: data.gender || null,
            first_incumbency_date: data.first_incumbency_date || null,
          }]);

        if (error) throw error;
        toast.success('New affiliate created successfully');
      }

      queryClient.invalidateQueries({ queryKey: ['affiliate-personnel'] });
      setFormOpen(false);
    } catch (error: any) {
      console.error('Error saving affiliate:', error);
      toast.error(error.message || 'Failed to save affiliate');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Users className="h-8 w-8 text-primary" />
              Affiliate Personnel
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage Individual Consultants, Interns, and UN Volunteers
            </p>
          </div>
          <div className="flex gap-2 mt-4 md:mt-0 flex-wrap">
            <Button onClick={handleAddAffiliate}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Affiliate
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/affiliate-personnel/edit">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Bulk Edit
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/admin/import-affiliates">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Link>
            </Button>
            <Button variant="outline" onClick={() => {
              const headers = "Email Address,First name,Last name,Worker type,Division,Unit,Job title,Line manager,Duty station,Current Grade,Staff number,Nationality,Gender,First Incumbency Date,Samsaran PR,Samsaran PO,GSM Reg Number,GSM PO,Contract Start Date,Contract End Date";
              const blob = new Blob([headers + "\n"], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'affiliate_personnel_template.csv';
              a.click();
              URL.revokeObjectURL(url);
            }}>
              <Download className="w-4 h-4 mr-2" />
              Download template
            </Button>
            {stats.noData > 0 && (
              <Button 
                variant="outline" 
                onClick={handleBackfillFirstIncumbency}
                disabled={isBackfilling}
                className="border-amber-500 text-amber-700 hover:bg-amber-50"
              >
                <Calendar className="w-4 h-4 mr-2" />
                {isBackfilling ? 'Backfilling...' : 'Backfill First Contract Dates'}
              </Button>
            )}
          </div>
        </div>

        {/* Form Dialog */}
        <AffiliateForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleFormSubmit}
          initialData={editingAffiliate ? {
            id: editingAffiliate.id,
            name: editingAffiliate.name,
            email: editingAffiliate.email,
            affiliate_type: editingAffiliate.affiliate_type || '',
            division: editingAffiliate.division || '',
            unit: editingAffiliate.unit || '',
            job_title: editingAffiliate.job_title || '',
            line_manager: editingAffiliate.line_manager || '',
            duty_station: editingAffiliate.duty_station || '',
            contract_start_date: editingAffiliate.contract_start_date || '',
            contract_end_date: editingAffiliate.contract_end_date || '',
            current_grade: editingAffiliate.current_grade || '',
            staff_number: editingAffiliate.staff_number || '',
            first_incumbency_date: editingAffiliate.first_incumbency_date || '',
          } : undefined}
          isLoading={isSubmitting}
          mode={formMode}
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-9 gap-4 mb-8">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Affiliates</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-blue-600">{stats.ics}</div>
              <p className="text-xs text-muted-foreground">Consultants (IC)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{stats.interns}</div>
              <p className="text-xs text-muted-foreground">Interns</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.unvs}</div>
              <p className="text-xs text-muted-foreground">UN Volunteers</p>
            </CardContent>
          </Card>
          <Card className={stats.critical14 > 0 ? 'border-red-500 bg-red-50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-red-600">{stats.critical14}</div>
              <p className="text-xs text-muted-foreground">Critical (≤14d)</p>
            </CardContent>
          </Card>
          <Card className={stats.expiring60 > 0 ? 'border-purple-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-purple-600">{stats.expiring60}</div>
              <p className="text-xs text-muted-foreground">Expiring (15-60d)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-muted-foreground">{stats.notYetStarted}</div>
              <p className="text-xs text-muted-foreground">Starting Soon</p>
            </CardContent>
          </Card>
          <Card className={stats.contractBreak > 0 ? 'border-yellow-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.contractBreak}</div>
              <p className="text-xs text-muted-foreground">Contract Break</p>
            </CardContent>
          </Card>
          <Card className={stats.noData > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.noData}</div>
              <p className="text-xs text-muted-foreground">No Data</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or job title..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="IC">IC</SelectItem>
                  <SelectItem value="Intern">Intern</SelectItem>
                  <SelectItem value="UNV">UNV</SelectItem>
                </SelectContent>
              </Select>
              <Select value={divisionFilter} onValueChange={setDivisionFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Division" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Divisions</SelectItem>
                  {divisions.map(div => (
                    <SelectItem key={div} value={div!}>{div}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Contract Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="not-started">Not Yet Started</SelectItem>
                  <SelectItem value="contract-break">Contract Break</SelectItem>
                  <SelectItem value="no-data">No Data</SelectItem>
                  <SelectItem value="active">Active (&gt;60d)</SelectItem>
                  <SelectItem value="expiring">Expiring (15-60d)</SelectItem>
                  <SelectItem value="critical">Critical (≤14d)</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Affiliate Personnel ({sortedAffiliates.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : sortedAffiliates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {affiliates?.length === 0 ? (
                  <div className="space-y-4">
                    <Users className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p>No affiliate personnel found</p>
                    <Button asChild variant="outline">
                      <Link to="/admin/import-affiliates">Import Affiliates</Link>
                    </Button>
                  </div>
                ) : (
                  <p>No results match your filters</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead field="name" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Name
                      </SortableTableHead>
                      <SortableTableHead field="affiliate_type" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Type
                      </SortableTableHead>
                      <SortableTableHead field="division" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Division
                      </SortableTableHead>
                      <SortableTableHead field="job_title" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Job Title
                      </SortableTableHead>
                      <SortableTableHead field="duty_station" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Location
                      </SortableTableHead>
                      <SortableTableHead field="first_incumbency_date" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        First Contract
                      </SortableTableHead>
                      <SortableTableHead field="status" currentField={sortField} direction={sortDirection} onSort={handleSort}>
                        Status
                      </SortableTableHead>
                      <TableHead>Current PR</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>End Date</TableHead>
                      <TableHead className="w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAffiliates.map((affiliate) => {
                      const contractStatus = getContractStatus(affiliate.contract_start_date, affiliate.contract_end_date, affiliate.first_incumbency_date);
                      return (
                        <TableRow key={affiliate.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{affiliate.name}</p>
                              <p className="text-xs text-muted-foreground">{affiliate.email}</p>
                            </div>
                          </TableCell>
                          <TableCell>{getAffiliateTypeBadge(affiliate.affiliate_type)}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm">{affiliate.division || '-'}</span>
                            </div>
                            {affiliate.unit && (
                              <p className="text-xs text-muted-foreground">{affiliate.unit}</p>
                            )}
                          </TableCell>
                          <TableCell className="max-w-48 truncate" title={affiliate.job_title || ''}>
                            {affiliate.job_title || '-'}
                          </TableCell>
                          <TableCell>{affiliate.duty_station || '-'}</TableCell>
                          <TableCell>
                            {affiliate.first_incumbency_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(affiliate.first_incumbency_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge className={contractStatus.colorClass}>
                              {contractStatus.isContractBreak && <Clock className="h-3 w-3 mr-1" />}
                              {contractStatus.isNoData && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {contractStatus.isNotYetActive && !contractStatus.isContractBreak && <Clock className="h-3 w-3 mr-1" />}
                              {contractStatus.isCritical && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && !contractStatus.isCritical && contractStatus.daysRemaining !== null && contractStatus.daysRemaining < 0 && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && !contractStatus.isCritical && contractStatus.daysRemaining !== null && contractStatus.daysRemaining > 0 && contractStatus.daysRemaining <= 60 && <Clock className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && contractStatus.daysRemaining !== null && contractStatus.daysRemaining > 60 && <CheckCircle className="h-3 w-3 mr-1" />}
                              {contractStatus.status}
                            </Badge>
                          </TableCell>
                          {(() => {
                            const latest = contractHistoryMap.get(affiliate.id);
                            return (
                              <>
                                <TableCell>{latest?.samsaran_pr || '-'}</TableCell>
                                <TableCell>
                                  {latest?.start_date
                                    ? new Date(latest.start_date + 'T00:00:00').toLocaleDateString()
                                    : '-'}
                                </TableCell>
                                <TableCell>
                                  {latest?.end_date
                                    ? new Date(latest.end_date + 'T00:00:00').toLocaleDateString()
                                    : '-'}
                                </TableCell>
                              </>
                            );
                          })()}
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEditAffiliate(affiliate)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/affiliate-personnel/${affiliate.id}/lifecycle`}>
                                    <ClipboardList className="h-4 w-4 mr-2" />
                                    Manage Lifecycle
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem asChild>
                                  <Link to={`/admin/affiliate-history/${affiliate.id}`}>
                                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                                    Contract History
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
