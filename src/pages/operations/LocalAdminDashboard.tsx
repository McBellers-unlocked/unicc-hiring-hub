import React, { useState, useMemo } from 'react';
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
import { useAuth } from '@/hooks/useAuth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { Building2, Search, ArrowRightLeft, LogOut, LogIn, RefreshCw, ChevronDown, ChevronRight, AlertTriangle, ArrowRight } from 'lucide-react';

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
  job_title: string | null;
  contract_type: string | null;
  supervisor: string | null;
  event_type: string | null;
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
  job_title: string | null;
  contract_type: string | null;
  supervisor: string | null;
}

interface HrTransfer {
  id: string;
  last_name: string;
  first_name: string;
  operation_type: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  grade: string | null;
  duty_station: string | null;
  section_unit: string | null;
  job_title: string | null;
  contract_type: string | null;
  supervisor: string | null;
  new_duty_station: string | null;
  new_section_unit: string | null;
  new_supervisor: string | null;
  new_job_title: string | null;
  new_grade: string | null;
  new_contract_type: string | null;
  change_types: string[] | null;
}

const TRANSFER_TYPES = ['Transfer', 'Transfer (CB)', 'Reassignment'];
const CB_SEPARATION_TYPES = ['Separation (CB)'];
const CB_APPOINTMENT_TYPES = ['Appointment (CB)'];

const LOCAL_ADMIN_STATION_MAP: Record<string, string> = {
  'requeni@unicc.org': 'Valencia',
  'ruiz@unicc.org': 'Valencia',
  'dutruel@unicc.org': 'Geneva',
  'normand-quinet@unicc.org': 'Geneva',
  'cavaglieri@unicc.org': 'Geneva',
  'argentieri@unicc.org': 'Brindisi',
  'valenti@unicc.org': 'Brindisi',
  'petrocelli@unicc.org': 'Rome',
  'mesfin@unicc.org': 'New York',
  'lee@unicc.org': 'New York',
};

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
  const { user } = useAuth();
  const lockedStation = user?.email
    ? LOCAL_ADMIN_STATION_MAP[user.email.toLowerCase()] ?? null
    : null;
  const [dutyStation, setDutyStation] = useState<string>(lockedStation ?? 'all');
  const [search, setSearch] = useState('');
  const [expandedArrivalIds, setExpandedArrivalIds] = useState<Set<string>>(new Set());
  const [expandedDepartureIds, setExpandedDepartureIds] = useState<Set<string>>(new Set());
  const [expandedTransferIds, setExpandedTransferIds] = useState<Set<string>>(new Set());
  const [expandedCBIds, setExpandedCBIds] = useState<Set<string>>(new Set());

  const toggleArrival = (id: string) =>
    setExpandedArrivalIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleDeparture = (id: string) =>
    setExpandedDepartureIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleTransfer = (id: string) =>
    setExpandedTransferIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const toggleCB = (id: string) =>
    setExpandedCBIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });


  const { data: separations = [], isLoading: loadingSep } = useQuery({
    queryKey: ['local-admin-separations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_separations')
        .select('id, last_name, first_name, operation_type, status, tentative_date, effective_date, grade, duty_station, section_unit, linked_appointment_id, job_title, contract_type, supervisor, event_type')
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
        .select('id, last_name, first_name, operation_type, status, tentative_date, effective_date, grade, duty_station, section_unit, linked_separation_id, job_title, contract_type, supervisor')
        .neq('status', 'Completed')
        .order('tentative_date', { ascending: true });
      if (error) throw error;
      return data as HrAppointment[];
    },
  });

  const { data: hrTransfers = [], isLoading: loadingTr } = useQuery({
    queryKey: ['local-admin-hr-transfers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hr_transfers')
        .select('id, last_name, first_name, operation_type, status, start_date, end_date, grade, duty_station, section_unit, job_title, contract_type, supervisor, new_duty_station, new_section_unit, new_supervisor, new_job_title, new_grade, new_contract_type, change_types')
        .neq('status', 'Completed')
        .order('start_date', { ascending: true });
      if (error) throw error;
      return data as HrTransfer[];
    },
  });

  const isLoading = loadingSep || loadingApt || loadingTr;

  // Collect unique duty stations from all tables
  const dutyStations = useMemo(() => {
    const set = new Set<string>();
    separations.forEach(s => s.duty_station && set.add(s.duty_station));
    appointments.forEach(a => a.duty_station && set.add(a.duty_station));
    hrTransfers.forEach(t => {
      if (t.duty_station) set.add(t.duty_station);
      if (t.new_duty_station) set.add(t.new_duty_station);
    });
    return [...set].sort();
  }, [separations, appointments, hrTransfers]);

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

  // 2. Transfers – merge hr_appointments transfers + hr_transfers records
  const appointmentTransfers = useMemo(() =>
    appointments
      .filter(a => TRANSFER_TYPES.includes(a.operation_type))
      .filter(a => matchesFilters(a.last_name, a.first_name, a.duty_station)),
    [appointments, dutyStation, search]
  );

  const filteredHrTransfers = useMemo(() =>
    hrTransfers.filter(t => {
      if (dutyStation !== 'all' && t.duty_station !== dutyStation && t.new_duty_station !== dutyStation) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!`${t.last_name} ${t.first_name}`.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
    [hrTransfers, dutyStation, search]
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

  const totalTransfers = appointmentTransfers.length + filteredHrTransfers.length;

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
              {lockedStation ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-muted text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Station:</span>
                  <span className="font-medium">{lockedStation}</span>
                </div>
              ) : (
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
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <LogIn className="h-4 w-4 text-green-600" /> Arrivals
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{arrivals.length}</p></CardContent>
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
                <ArrowRightLeft className="h-4 w-4 text-purple-500" /> Transfers
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalTransfers}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-orange-500" /> Contract Breaks
              </CardTitle>
            </CardHeader>
            <CardContent><p className="text-2xl font-bold">{contractBreaks.length}</p></CardContent>
          </Card>
        </div>

        {isLoading && <p className="text-muted-foreground text-center py-8">Loading…</p>}

        {/* Arrivals */}
        {!isLoading && (
          <SectionCard title="Arrivals" icon={<LogIn className="h-5 w-5 text-green-600" />} count={arrivals.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Last Name</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Type of Contract</TableHead>
                  <TableHead>Division / Unit</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Duty Station</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrivals.length === 0 ? (
                  <EmptyRow cols={9} />
                ) : arrivals.map(a => (
                  <React.Fragment key={a.id}>
                    <TableRow key={a.id} className="cursor-pointer" onClick={() => toggleArrival(a.id)}>
                      <TableCell className="font-medium">{a.last_name}</TableCell>
                      <TableCell>{a.first_name}</TableCell>
                      <TableCell>{a.grade ?? '—'}</TableCell>
                      <TableCell>
                        {a.contract_type
                          ? <Badge variant="outline">{a.contract_type}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{a.section_unit ?? '—'}</TableCell>
                      <TableCell>{formatDate(a.tentative_date)}</TableCell>
                      <TableCell className="text-muted-foreground">—</TableCell>
                      <TableCell>{a.duty_station ?? '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleArrival(a.id); }}>
                          {expandedArrivalIds.has(a.id)
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedArrivalIds.has(a.id) && (
                      <TableRow key={`${a.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={9} className="py-3 px-6">
                          <div className="grid grid-cols-3 gap-6 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Job Title / Function</p>
                              <p className="font-medium">{a.job_title ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Supervisor</p>
                              <p className="font-medium">{a.supervisor ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Index Number</p>
                              <p className="font-medium text-muted-foreground">—</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
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
                  <TableHead>Last Name</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Type of Contract</TableHead>
                  <TableHead>Division / Unit</TableHead>
                  <TableHead>Departure Date</TableHead>
                  <TableHead>Duty Station</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departures.length === 0 ? (
                  <EmptyRow cols={8} />
                ) : departures.map(s => (
                  <React.Fragment key={s.id}>
                    <TableRow className="cursor-pointer" onClick={() => toggleDeparture(s.id)}>
                      <TableCell className="font-medium">{s.last_name}</TableCell>
                      <TableCell>{s.first_name}</TableCell>
                      <TableCell>{s.grade ?? '—'}</TableCell>
                      <TableCell>
                        {s.contract_type
                          ? <Badge variant="outline">{s.contract_type}</Badge>
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>{s.section_unit ?? '—'}</TableCell>
                      <TableCell>{formatDate(s.tentative_date)}</TableCell>
                      <TableCell>{s.duty_station ?? '—'}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleDeparture(s.id); }}>
                          {expandedDepartureIds.has(s.id)
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedDepartureIds.has(s.id) && (
                      <TableRow key={`${s.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={8} className="py-3 px-6">
                          <div className="grid grid-cols-2 gap-6 text-sm">
                            <div>
                              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Job Title / Function</p>
                              <p className="font-medium">{s.job_title ?? '—'}</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Supervisor</p>
                              <p className="font-medium">{s.supervisor ?? '—'}</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </SectionCard>
        )}

        {/* Transfers */}
        {!isLoading && (
          <SectionCard title="Transfers" icon={<ArrowRightLeft className="h-5 w-5 text-purple-500" />} count={totalTransfers}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Last Name</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Duty Station</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Changes</TableHead>
                  <TableHead>Location Move</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {totalTransfers === 0 ? (
                  <EmptyRow cols={8} />
                ) : (
                  <>
                    {appointmentTransfers.map(a => (
                      <TableRow key={`apt-${a.id}`}>
                        <TableCell className="font-medium">{a.last_name}</TableCell>
                        <TableCell>{a.first_name}</TableCell>
                        <TableCell>{a.duty_station ?? '—'}</TableCell>
                        <TableCell>{formatDate(a.tentative_date)}</TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell><Badge variant="outline">{a.operation_type}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">—</TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                    {filteredHrTransfers.map(t => {
                      const cts = t.change_types || [];
                      const hasDutyChange = cts.includes('duty_station');
                      const isExpanded = expandedTransferIds.has(t.id);

                      const CHANGE_LABELS: Record<string, { label: string; color: string }> = {
                        duty_station:  { label: 'Duty Station', color: 'bg-amber-100 text-amber-800 border-amber-300' },
                        supervisor:    { label: 'Supervisor',   color: 'bg-blue-100 text-blue-800 border-blue-300' },
                        unit_division: { label: 'Unit/Division', color: 'bg-purple-100 text-purple-800 border-purple-300' },
                        job_title:     { label: 'Job Title',    color: 'bg-green-100 text-green-800 border-green-300' },
                        grade:         { label: 'Grade',        color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
                        contract_type: { label: 'Contract Type', color: 'bg-rose-100 text-rose-800 border-rose-300' },
                      };

                      const changeRows = [
                        { key: 'duty_station',  label: 'Duty Station',   from: t.duty_station,   to: t.new_duty_station },
                        { key: 'supervisor',    label: 'Supervisor',     from: t.supervisor,     to: t.new_supervisor },
                        { key: 'unit_division', label: 'Unit / Division', from: t.section_unit,  to: t.new_section_unit },
                        { key: 'job_title',     label: 'Job Title',      from: t.job_title,      to: t.new_job_title },
                        { key: 'grade',         label: 'Grade',          from: t.grade,          to: t.new_grade },
                        { key: 'contract_type', label: 'Contract Type',  from: t.contract_type,  to: t.new_contract_type },
                      ].filter(r => cts.includes(r.key));

                      return (
                        <React.Fragment key={`tr-${t.id}`}>
                          <TableRow className="cursor-pointer" onClick={() => toggleTransfer(t.id)}>
                            <TableCell className="font-medium">{t.last_name}</TableCell>
                            <TableCell>{t.first_name}</TableCell>
                            <TableCell>{t.duty_station ?? '—'}</TableCell>
                            <TableCell>{formatDate(t.start_date)}</TableCell>
                            <TableCell>{formatDate(t.end_date)}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {cts.length === 0
                                  ? <span className="text-muted-foreground text-sm">—</span>
                                  : cts.map(ct => {
                                    const cfg = CHANGE_LABELS[ct];
                                    if (!cfg) return null;
                                    return (
                                      <span key={ct} className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                                        {cfg.label}
                                      </span>
                                    );
                                  })
                                }
                              </div>
                            </TableCell>
                            <TableCell>
                              {hasDutyChange && t.new_duty_station ? (
                                <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  {t.duty_station} <ArrowRight className="h-3 w-3" /> {t.new_duty_station}
                                </span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleTransfer(t.id); }}>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </Button>
                            </TableCell>
                          </TableRow>
                          {isExpanded && (
                            <TableRow key={`tr-${t.id}-detail`} className="bg-muted/30 hover:bg-muted/30">
                              <TableCell colSpan={8} className="py-4 px-6">
                                {hasDutyChange && t.new_duty_station && (
                                  <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                    <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                                    <span>
                                      <strong>Duty station change:</strong> Administrative assistants at both{' '}
                                      <strong>{t.duty_station}</strong> and <strong>{t.new_duty_station}</strong>{' '}
                                      must coordinate check-out and check-in actions.
                                    </span>
                                  </div>
                                )}
                                {changeRows.length > 0 ? (
                                  <div className="rounded-md border overflow-hidden text-sm">
                                    <table className="w-full">
                                      <thead>
                                        <tr className="bg-muted/50">
                                          <th className="text-left px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground font-medium w-1/4">What Changed</th>
                                          <th className="text-left px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground font-medium w-5/12">Current Value</th>
                                          <th className="text-left px-4 py-2 text-xs uppercase tracking-wide text-muted-foreground font-medium w-5/12">New Value</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {changeRows.map((row, i) => (
                                          <tr key={row.key} className={i % 2 === 0 ? 'bg-background' : 'bg-muted/20'}>
                                            <td className="px-4 py-2.5 font-medium text-muted-foreground">{row.label}</td>
                                            <td className="px-4 py-2.5">{row.from ?? <span className="text-muted-foreground">—</span>}</td>
                                            <td className="px-4 py-2.5">
                                              <span className="inline-flex items-center gap-1.5">
                                                <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                                <span className="font-medium">{row.to ?? <span className="text-muted-foreground font-normal">—</span>}</span>
                                              </span>
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No specific changes recorded.</p>
                                )}
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </>
                )}
              </TableBody>
            </Table>
          </SectionCard>
        )}

        {!isLoading && (
          <SectionCard title="Contract Breaks / Secondment / Loan / Long-term Leave" icon={<RefreshCw className="h-5 w-5 text-orange-500" />} count={contractBreaks.length}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Last Name</TableHead>
                  <TableHead>First Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Break Type</TableHead>
                  <TableHead>Division / Unit</TableHead>
                  <TableHead>Last Day of Contract</TableHead>
                  <TableHead>Contract Break</TableHead>
                  <TableHead>Duty Station</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {contractBreaks.length === 0 ? (
                  <EmptyRow cols={9} />
                ) : contractBreaks.map(({ sep, apt }) => {
                  const isExpanded = expandedCBIds.has(sep.id);
                  return (
                    <React.Fragment key={sep.id}>
                      <TableRow className="cursor-pointer" onClick={() => toggleCB(sep.id)}>
                        <TableCell className="font-medium">{sep.last_name}</TableCell>
                        <TableCell>{sep.first_name}</TableCell>
                        <TableCell>{sep.grade ?? '—'}</TableCell>
                        <TableCell><CBTypeBadge type={sep.event_type} /></TableCell>
                        <TableCell>{sep.section_unit ?? '—'}</TableCell>
                        <TableCell>{formatDate(sep.tentative_date)}</TableCell>
                        <TableCell>
                          {apt ? (
                            <span className="inline-flex items-center gap-1 text-sm font-medium text-amber-700">
                              {formatDate(sep.tentative_date)}
                              <ArrowRight className="h-3 w-3" />
                              {formatDate(apt.tentative_date)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>{sep.duty_station ?? '—'}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={e => { e.stopPropagation(); toggleCB(sep.id); }}>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${sep.id}-cb-detail`} className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={9} className="py-3 px-6">
                            <div className="grid grid-cols-3 gap-6 text-sm mb-3">
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Job Title / Function</p>
                                <p className="font-medium">{sep.job_title ?? '—'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">Supervisor</p>
                                <p className="font-medium">{sep.supervisor ?? '—'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground text-xs uppercase tracking-wide mb-1">New Contract Start</p>
                                <p className="font-medium">{apt ? formatDate(apt.tentative_date) : '—'}</p>
                              </div>
                            </div>
                            <div className="rounded-md border border-dashed px-4 py-2.5 text-xs text-muted-foreground">
                              <strong>New contract expiry date:</strong> — (not currently stored in the database; will display once that field is added)
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </SectionCard>
        )}
      </div>
    </Layout>
  );
};

/* ── helper components ── */

const CB_TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  'Secondment':      { label: 'Secondment',      className: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
  'Loan':            { label: 'Loan',             className: 'bg-purple-100 text-purple-700 border border-purple-200' },
  'Long-term Leave': { label: 'Long-term Leave',  className: 'bg-teal-100 text-teal-700 border border-teal-200' },
};

const CBTypeBadge = ({ type }: { type: string | null }) => {
  if (!type || !CB_TYPE_CONFIG[type]) return <span className="text-muted-foreground">—</span>;
  const { label, className } = CB_TYPE_CONFIG[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
};

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
