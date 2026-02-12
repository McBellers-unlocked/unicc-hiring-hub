import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Building2, Search, ArrowRightLeft, LogOut, LogIn, RefreshCw } from 'lucide-react';

interface HrSeparation {
  id: string;
  last_name: string;
  first_name: string;
  operation_type: string;
  status: string;
  tentative_date: string | null;
  effective_date: string | null;
  grade: string | null;
  duty_station: string | null;
  section_unit: string | null;
  linked_appointment_id: string | null;
}

interface HrAppointment {
  id: string;
  last_name: string;
  first_name: string;
  operation_type: string;
  status: string;
  tentative_date: string | null;
  effective_date: string | null;
  grade: string | null;
  duty_station: string | null;
  section_unit: string | null;
  linked_separation_id: string | null;
}

const TRANSFER_TYPES = ['Transfer', 'Transfer (CB)', 'Reassignment'];
const CB_SEPARATION_TYPES = ['Separation (CB)'];
const CB_APPOINTMENT_TYPES = ['Appointment (CB)'];

const formatDate = (d: string | null) => {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd MMM yyyy'); } catch { return '—'; }
};

const StatusBadge = ({ status }: { status: string }) => {
  const variant = status === 'Completed' ? 'default'
    : status === 'In progress' ? 'secondary'
    : 'outline';
  return <Badge variant={variant}>{status}</Badge>;
};

const LocalAdminDashboard = () => {
  const [dutyStation, setDutyStation] = useState<string>('all');
  const [search, setSearch] = useState('');

  const { data: separations = [], isLoading: loadingSep } = useQuery({
    queryKey: ['local-admin-separations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_separations')
        .select('id, last_name, first_name, operation_type, status, tentative_date, effective_date, grade, duty_station, section_unit, linked_appointment_id')
        .neq('status', 'Completed')
        .order('tentative_date', { ascending: true });
      if (error) throw error;
      return data as HrSeparation[];
    },
  });

  const { data: appointments = [], isLoading: loadingApt } = useQuery({
    queryKey: ['local-admin-appointments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_appointments')
        .select('id, last_name, first_name, operation_type, status, tentative_date, effective_date, grade, duty_station, section_unit, linked_separation_id')
        .neq('status', 'Completed')
        .order('tentative_date', { ascending: true });
      if (error) throw error;
      return data as HrAppointment[];
    },
  });

  const isLoading = loadingSep || loadingApt;

  // Collect unique duty stations from both tables
  const dutyStations = useMemo(() => {
    const set = new Set<string>();
    separations.forEach(s => s.duty_station && set.add(s.duty_station));
    appointments.forEach(a => a.duty_station && set.add(a.duty_station));
    return [...set].sort();
  }, [separations, appointments]);

  // Shared filter function
  const matchesFilters = (lastName: string, firstName: string, ds: string | null) => {
    if (dutyStation !== 'all' && ds !== dutyStation) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!`${lastName} ${firstName}`.toLowerCase().includes(q)) return false;
    }
    return true;
  };

  // 1. Contract Breaks – pair separation(CB) with linked appointment(CB)
  const contractBreaks = useMemo(() => {
    const aptMap = new Map(appointments.map(a => [a.id, a]));
    return separations
      .filter(s => CB_SEPARATION_TYPES.includes(s.operation_type))
      .filter(s => matchesFilters(s.last_name, s.first_name, s.duty_station))
      .map(s => ({
        sep: s,
        apt: s.linked_appointment_id ? aptMap.get(s.linked_appointment_id) ?? null : null,
      }));
  }, [separations, appointments, dutyStation, search]);

  // 2. Transfers
  const transfers = useMemo(() =>
    appointments
      .filter(a => TRANSFER_TYPES.includes(a.operation_type))
      .filter(a => matchesFilters(a.last_name, a.first_name, a.duty_station)),
    [appointments, dutyStation, search]
  );

  // 3. Departures (non-CB separations)
  const departures = useMemo(() =>
    separations
      .filter(s => !CB_SEPARATION_TYPES.includes(s.operation_type))
      .filter(s => matchesFilters(s.last_name, s.first_name, s.duty_station)),
    [separations, dutyStation, search]
  );

  // 4. Arrivals (non-CB, non-transfer appointments)
  const arrivals = useMemo(() =>
    appointments
      .filter(a => !CB_APPOINTMENT_TYPES.includes(a.operation_type) && !TRANSFER_TYPES.includes(a.operation_type))
      .filter(a => matchesFilters(a.last_name, a.first_name, a.duty_station)),
    [appointments, dutyStation, search]
  );

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Building2 className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Local Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Upcoming staff movements – arrivals, departures, contract breaks &amp; transfers
            </p>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name…"
                  className="pl-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={dutyStation} onValueChange={setDutyStation}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Duty Station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Duty Stations</SelectItem>
                  {dutyStations.map(ds => (
                    <SelectItem key={ds} value={ds}>{ds}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-orange-500" /> Contract Breaks
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{contractBreaks.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-purple-500" /> Transfers
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{transfers.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LogOut className="h-4 w-4 text-destructive" /> Departures
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{departures.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LogIn className="h-4 w-4 text-green-600" /> Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{arrivals.length}</p></CardContent>
          </Card>
        </div>

        {isLoading && <p className="text-muted-foreground text-center py-8">Loading…</p>}

        {/* Contract Breaks */}
        {!isLoading && (
          <SectionCard title="Contract Breaks" icon={<RefreshCw className="h-5 w-5 text-orange-500" />} count={contractBreaks.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Section / Unit</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Return Date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractBreaks.length === 0 ? (
                  <EmptyRow cols={6} />
                ) : contractBreaks.map(({ sep, apt }) => (
                  <TableRow key={sep.id}>
                    <TableCell className="font-medium">{sep.last_name}, {sep.first_name}</TableCell>
                    <TableCell>{sep.grade ?? '—'}</TableCell>
                    <TableCell>{sep.section_unit ?? '—'}</TableCell>
                    <TableCell>{formatDate(sep.tentative_date)}</TableCell>
                    <TableCell>{apt ? formatDate(apt.tentative_date) : '—'}</TableCell>
                    <TableCell><StatusBadge status={sep.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}

        {/* Transfers */}
        {!isLoading && (
          <SectionCard title="Transfers" icon={<ArrowRightLeft className="h-5 w-5 text-purple-500" />} count={transfers.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Section / Unit</TableHead>
                  <TableHead>Duty Station</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.length === 0 ? (
                  <EmptyRow cols={7} />
                ) : transfers.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.last_name}, {a.first_name}</TableCell>
                    <TableCell>{a.grade ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{a.operation_type}</Badge></TableCell>
                    <TableCell>{formatDate(a.tentative_date)}</TableCell>
                    <TableCell>{a.section_unit ?? '—'}</TableCell>
                    <TableCell>{a.duty_station ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}

        {/* Departures */}
        {!isLoading && (
          <SectionCard title="Departures" icon={<LogOut className="h-5 w-5 text-destructive" />} count={departures.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Section / Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.length === 0 ? (
                  <EmptyRow cols={6} />
                ) : departures.map(s => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.last_name}, {s.first_name}</TableCell>
                    <TableCell>{s.grade ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{s.operation_type}</Badge></TableCell>
                    <TableCell>{formatDate(s.tentative_date)}</TableCell>
                    <TableCell>{s.section_unit ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}

        {/* Arrivals */}
        {!isLoading && (
          <SectionCard title="Arrivals" icon={<LogIn className="h-5 w-5 text-green-600" />} count={arrivals.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Arrival Date</TableHead>
                  <TableHead>Section / Unit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivals.length === 0 ? (
                  <EmptyRow cols={6} />
                ) : arrivals.map(a => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.last_name}, {a.first_name}</TableCell>
                    <TableCell>{a.grade ?? '—'}</TableCell>
                    <TableCell><Badge variant="outline">{a.operation_type}</Badge></TableCell>
                    <TableCell>{formatDate(a.tentative_date)}</TableCell>
                    <TableCell>{a.section_unit ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}
      </div>
    </Layout>
  );
};

/* ── helper components ── */

const SectionCard = ({ title, icon, count, children }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode }) => (
  <Card>
    <CardHeader className="pb-3">
      <CardTitle className="text-lg flex items-center gap-2">
        {icon} {title}
        <Badge variant="secondary" className="ml-auto">{count}</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-0">{children}</CardContent>
  </Card>
);

const EmptyRow = ({ cols }: { cols: number }) => (
  <TableRow>
    <TableCell colSpan={cols} className="text-center py-6 text-muted-foreground">
      No records found
    </TableCell>
  </TableRow>
);

export default LocalAdminDashboard;
