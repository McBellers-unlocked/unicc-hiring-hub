import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Search, Upload, Calendar, AlertTriangle, CheckCircle, Clock, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format, differenceInDays, parseISO } from 'date-fns';

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
  variant: 'default' | 'secondary' | 'destructive' | 'outline'; 
  daysRemaining: number | null;
  isNotYetActive: boolean;
  isContractBreak: boolean;
  isNoData: boolean;
} => {
  // Case 1: Contract hasn't started yet
  if (startDate) {
    const daysUntilStart = differenceInDays(parseISO(startDate), new Date());
    if (daysUntilStart > 0) {
      // They have worked before → Contract break
      if (firstIncumbencyDate) {
        return { 
          status: 'Non-active: Contract break', 
          variant: 'secondary',
          daysRemaining: null,
          isNotYetActive: true,
          isContractBreak: true,
          isNoData: false
        };
      }
      // New hire starting soon
      return { 
        status: `Starts ${format(parseISO(startDate), 'dd MMM yyyy')}`, 
        variant: 'outline', 
        daysRemaining: null,
        isNotYetActive: true,
        isContractBreak: false,
        isNoData: false
      };
    }
  }
  
  // Case 2: No start date AND no first incumbency date → No data
  if (!startDate && !firstIncumbencyDate) {
    return { 
      status: 'Non-active', 
      variant: 'destructive',
      daysRemaining: null,
      isNotYetActive: false,
      isContractBreak: false,
      isNoData: true
    };
  }
  
  // Case 3: Check end date for expiry status
  if (!endDate) return { status: 'No end date', variant: 'outline', daysRemaining: null, isNotYetActive: false, isContractBreak: false, isNoData: false };
  
  const days = differenceInDays(parseISO(endDate), new Date());
  
  if (days < 0) return { status: 'Expired', variant: 'destructive', daysRemaining: days, isNotYetActive: false, isContractBreak: false, isNoData: false };
  if (days <= 30) return { status: `${days}d remaining`, variant: 'destructive', daysRemaining: days, isNotYetActive: false, isContractBreak: false, isNoData: false };
  if (days <= 90) return { status: `${days}d remaining`, variant: 'secondary', daysRemaining: days, isNotYetActive: false, isContractBreak: false, isNoData: false };
  return { status: 'Active', variant: 'default', daysRemaining: days, isNotYetActive: false, isContractBreak: false, isNoData: false };
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
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [divisionFilter, setDivisionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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
      (statusFilter === 'expiring' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining <= 90 && contractStatus.daysRemaining >= 0) ||
      (statusFilter === 'expired' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining < 0) ||
      (statusFilter === 'active' && contractStatus.daysRemaining !== null && contractStatus.daysRemaining > 90);

    return matchesSearch && matchesType && matchesDivision && matchesStatus;
  }) || [];

  // Calculate stats
  const stats = {
    total: affiliates?.length || 0,
    ics: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'IC').length || 0,
    interns: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'INTERN').length || 0,
    unvs: affiliates?.filter(a => a.affiliate_type?.toUpperCase() === 'UNV').length || 0,
    expiring30: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.daysRemaining !== null && status.daysRemaining >= 0 && status.daysRemaining <= 30;
    }).length || 0,
    expiring90: affiliates?.filter(a => {
      const status = getContractStatus(a.contract_start_date, a.contract_end_date, a.first_incumbency_date);
      return status.daysRemaining !== null && status.daysRemaining >= 0 && status.daysRemaining <= 90;
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
          <Button asChild className="mt-4 md:mt-0">
            <Link to="/admin/import-affiliates">
              <Upload className="w-4 h-4 mr-2" />
              Import Affiliates
            </Link>
          </Button>
        </div>

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
          <Card className={stats.expiring30 > 0 ? 'border-destructive/50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-destructive">{stats.expiring30}</div>
              <p className="text-xs text-muted-foreground">Expiring in 30d</p>
            </CardContent>
          </Card>
          <Card className={stats.expiring90 > 0 ? 'border-yellow-500/50' : ''}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.expiring90}</div>
              <p className="text-xs text-muted-foreground">Expiring in 90d</p>
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
                  <SelectItem value="active">Active (&gt;90d)</SelectItem>
                  <SelectItem value="expiring">Expiring (≤90d)</SelectItem>
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
              <span>Affiliate Personnel ({filteredAffiliates.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : filteredAffiliates.length === 0 ? (
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
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Division</TableHead>
                      <TableHead>Job Title</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contract End</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAffiliates.map((affiliate) => {
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
                            {affiliate.contract_end_date ? (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {format(parseISO(affiliate.contract_end_date), 'dd MMM yyyy')}
                                </span>
                              </div>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={contractStatus.variant}>
                              {contractStatus.isContractBreak && <Clock className="h-3 w-3 mr-1" />}
                              {contractStatus.isNoData && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {contractStatus.isNotYetActive && !contractStatus.isContractBreak && <Clock className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && contractStatus.variant === 'destructive' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && contractStatus.variant === 'secondary' && <Clock className="h-3 w-3 mr-1" />}
                              {!contractStatus.isNotYetActive && !contractStatus.isNoData && contractStatus.variant === 'default' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {contractStatus.status}
                            </Badge>
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
