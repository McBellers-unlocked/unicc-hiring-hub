import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays, differenceInDays, parseISO, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/Layout";
import StatsCard from "@/components/dashboard/StatsCard";
import UpcomingEventsTable, { UpcomingEvent } from "@/components/operations/UpcomingEventsTable";
import InternationalExitsAlert from "@/components/operations/InternationalExitsAlert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  UserPlus,
  UserMinus,
  ArrowLeftRight,
  FileCheck,
  AlertTriangle,
  Calendar,
  ChevronRight,
} from "lucide-react";

interface HRAppointment {
  id: string;
  last_name: string;
  first_name: string;
  tentative_date: string;
  duty_station: string;
  operation_type: string;
  status: string;
  is_international: boolean;
  grade: string;
}

interface HRSeparation {
  id: string;
  last_name: string;
  first_name: string;
  tentative_date: string;
  duty_station: string;
  separation_type: string;
  event_type: string;
  status: string;
  is_international: boolean;
  grade: string;
}

interface DashboardStats {
  appointmentsThisWeek: number;
  separationsThisWeek: number;
  transfersThisWeek: number;
  extensionsThisWeek: number;
  overdueAppointments: HRAppointment[];
  overdueSeparations: HRSeparation[];
  upcomingEvents: UpcomingEvent[];
  internationalExits: Array<{
    id: string;
    name: string;
    tentative_date: string;
    duty_station: string;
    grade: string;
    daysUntil: number;
  }>;
}

const TRANSFER_TYPES = ['Transfer', 'Transfer (CB)', 'Reassignment'];

export default function HROperationsDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    appointmentsThisWeek: 0,
    separationsThisWeek: 0,
    transfersThisWeek: 0,
    extensionsThisWeek: 0,
    overdueAppointments: [],
    overdueSeparations: [],
    upcomingEvents: [],
    internationalExits: [],
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    const today = startOfDay(new Date());
    const todayStr = format(today, 'yyyy-MM-dd');
    const weekFromNow = format(addDays(today, 7), 'yyyy-MM-dd');
    const ninetyDaysFromNow = format(addDays(today, 90), 'yyyy-MM-dd');

    try {
      // Fetch appointments
      const { data: appointments } = await supabase
        .from('hr_appointments')
        .select('*')
        .in('status', ['Not started', 'In progress']);

      // Fetch separations
      const { data: separations } = await supabase
        .from('hr_separations')
        .select('*')
        .in('status', ['Not started', 'In progress']);

      const appointmentsList = (appointments || []) as HRAppointment[];
      const separationsList = (separations || []) as HRSeparation[];

      // Calculate stats
      const appointmentsThisWeek = appointmentsList.filter(a => 
        a.tentative_date && 
        a.tentative_date >= todayStr && 
        a.tentative_date <= weekFromNow &&
        !TRANSFER_TYPES.includes(a.operation_type)
      ).length;

      const transfersThisWeek = appointmentsList.filter(a =>
        a.tentative_date &&
        a.tentative_date >= todayStr &&
        a.tentative_date <= weekFromNow &&
        TRANSFER_TYPES.includes(a.operation_type)
      ).length;

      const separationsThisWeek = separationsList.filter(s =>
        s.tentative_date &&
        s.tentative_date >= todayStr &&
        s.tentative_date <= weekFromNow
      ).length;

      // Overdue items
      const overdueAppointments = appointmentsList.filter(a =>
        a.tentative_date && a.tentative_date < todayStr
      );

      const overdueSeparations = separationsList.filter(s =>
        s.tentative_date && s.tentative_date < todayStr
      );

      // Upcoming events this week
      const upcomingEvents: UpcomingEvent[] = [];

      appointmentsList
        .filter(a => a.tentative_date && a.tentative_date >= todayStr && a.tentative_date <= weekFromNow)
        .forEach(a => {
          const isTransfer = TRANSFER_TYPES.includes(a.operation_type);
          upcomingEvents.push({
            id: a.id,
            category: isTransfer ? 'transfer' : 'appointment',
            name: `${a.last_name?.toUpperCase() || ''} ${a.first_name || ''}`.trim(),
            date: a.tentative_date,
            location: a.duty_station || '',
            type: a.operation_type || 'Newcomer',
            isInternational: a.is_international,
            grade: a.grade,
          });
        });

      separationsList
        .filter(s => s.tentative_date && s.tentative_date >= todayStr && s.tentative_date <= weekFromNow)
        .forEach(s => {
          const isContractBreak = s.separation_type === 'ContractBreak' || s.event_type === 'ContractBreak';
          upcomingEvents.push({
            id: s.id,
            category: isContractBreak ? 'separation_cb' : 'separation_exit',
            name: `${s.last_name?.toUpperCase() || ''} ${s.first_name || ''}`.trim(),
            date: s.tentative_date,
            location: s.duty_station || '',
            type: s.separation_type || s.event_type || 'Exit',
            isInternational: s.is_international,
            grade: s.grade,
          });
        });

      // Sort by date
      upcomingEvents.sort((a, b) => a.date.localeCompare(b.date));

      // International P-staff exits in next 90 days
      const internationalExits = separationsList
        .filter(s => 
          s.is_international && 
          s.grade?.startsWith('P') &&
          s.tentative_date &&
          s.tentative_date >= todayStr &&
          s.tentative_date <= ninetyDaysFromNow &&
          (s.separation_type === 'Exit' || s.event_type === 'Exit' || (!s.separation_type && !s.event_type))
        )
        .map(s => ({
          id: s.id,
          name: `${s.last_name?.toUpperCase() || ''} ${s.first_name || ''}`.trim(),
          tentative_date: s.tentative_date,
          duty_station: s.duty_station || '',
          grade: s.grade || '',
          daysUntil: differenceInDays(parseISO(s.tentative_date), today),
        }))
        .sort((a, b) => a.daysUntil - b.daysUntil);

      setStats({
        appointmentsThisWeek,
        separationsThisWeek,
        transfersThisWeek,
        extensionsThisWeek: 0, // Placeholder until table exists
        overdueAppointments,
        overdueSeparations,
        upcomingEvents,
        internationalExits,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOverdue = stats.overdueAppointments.length + stats.overdueSeparations.length;

  return (
    <Layout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">HR Operations Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of upcoming appointments, separations, transfers, and extensions
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </>
          ) : (
            <>
              <StatsCard
                title="Appointments This Week"
                value={stats.appointmentsThisWeek}
                icon={UserPlus}
                subtitle="New hires & returns"
                onClick={() => navigate('/operations/appointments')}
              />
              <StatsCard
                title="Separations This Week"
                value={stats.separationsThisWeek}
                icon={UserMinus}
                subtitle="Exits & contract breaks"
                alert={stats.separationsThisWeek > 0}
                onClick={() => navigate('/operations/separations')}
              />
              <StatsCard
                title="Transfers This Week"
                value={stats.transfersThisWeek}
                icon={ArrowLeftRight}
                subtitle="Location & contract changes"
                onClick={() => navigate('/operations/appointments')}
              />
              <StatsCard
                title="Extensions Due"
                value={stats.extensionsThisWeek}
                icon={FileCheck}
                subtitle="Coming soon"
                onClick={() => navigate('/operations/contract-extensions')}
              />
            </>
          )}
        </div>

        {/* Urgent Actions */}
        {!loading && totalOverdue > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Overdue Items Require Attention</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-2">
                {stats.overdueAppointments.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span>
                      <Badge variant="destructive" className="mr-2">
                        {stats.overdueAppointments.length}
                      </Badge>
                      Overdue appointments (start date passed)
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/operations/appointments')}
                    >
                      View <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
                {stats.overdueSeparations.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span>
                      <Badge variant="destructive" className="mr-2">
                        {stats.overdueSeparations.length}
                      </Badge>
                      Overdue separations (separation date passed)
                    </span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate('/operations/separations')}
                    >
                      View <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming This Week - Takes 2 columns */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming This Week
              </CardTitle>
              <CardDescription>
                All HR operations scheduled for the next 7 days
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                </div>
              ) : (
                <UpcomingEventsTable 
                  events={stats.upcomingEvents} 
                  title=""
                />
              )}
            </CardContent>
          </Card>

          {/* International Exits Alert - Takes 1 column */}
          <div className="space-y-6">
            {!loading && stats.internationalExits.length > 0 && (
              <InternationalExitsAlert exits={stats.internationalExits} />
            )}

            {/* Quick Access Cards */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Quick Access</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/operations/appointments')}
                >
                  <UserPlus className="h-6 w-6 mb-2 text-blue-600" />
                  <span className="text-sm font-medium">Appointments</span>
                  <span className="text-xs text-muted-foreground">Manage new hires</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/operations/separations')}
                >
                  <UserMinus className="h-6 w-6 mb-2 text-red-600" />
                  <span className="text-sm font-medium">Separations</span>
                  <span className="text-xs text-muted-foreground">Manage exits</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/operations/contract-extensions')}
                >
                  <FileCheck className="h-6 w-6 mb-2 text-green-600" />
                  <span className="text-sm font-medium">Extensions</span>
                  <span className="text-xs text-muted-foreground">Coming soon</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-4 flex flex-col items-center justify-center"
                  onClick={() => navigate('/operations/loans-secondments')}
                >
                  <ArrowLeftRight className="h-6 w-6 mb-2 text-purple-600" />
                  <span className="text-sm font-medium">Transfers</span>
                  <span className="text-xs text-muted-foreground">Location changes</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
