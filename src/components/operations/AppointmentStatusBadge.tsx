import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link2, Link2Off, AlertCircle } from 'lucide-react';

interface AppointmentStatusBadgeProps {
  status: string;
  tentativeDate?: string | null;
}

interface UserLinkBadgeProps {
  userId?: string | null;
  email?: string | null;
}

export const calculateDaysUntilStart = (
  tentativeDate: string | null | undefined
): number | null => {
  if (!tentativeDate) return null;
  
  const startDate = parseISO(tentativeDate);
  const today = new Date();
  
  // Normalize both dates to start of day for accurate day comparison
  today.setHours(0, 0, 0, 0);
  const normalizedStartDate = new Date(startDate);
  normalizedStartDate.setHours(0, 0, 0, 0);
  
  return differenceInDays(normalizedStartDate, today);
};

export const getStatusInfo = (
  status: string,
  daysUntilStart: number | null
): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; pulse?: boolean } => {
  if (status === 'Completed') {
    return { label: 'Completed', variant: 'default' };
  }
  if (status === 'Cancelled') {
    return { label: 'Cancelled', variant: 'secondary' };
  }
  if (status === 'Not started') {
    return { label: 'Not started', variant: 'outline' };
  }
  
  // In progress - check days until start date
  if (daysUntilStart !== null && daysUntilStart < 0) {
    // Start date has passed but still "In progress"
    return { 
      label: `${Math.abs(daysUntilStart)}d overdue`, 
      variant: 'destructive',
      pulse: true 
    };
  }
  if (daysUntilStart !== null && daysUntilStart <= 7) {
    return { label: `${daysUntilStart}d remaining`, variant: 'secondary' };
  }
  
  return { label: 'In progress', variant: 'outline' };
};

export const AppointmentStatusBadge = ({ 
  status, 
  tentativeDate
}: AppointmentStatusBadgeProps) => {
  const daysUntilStart = calculateDaysUntilStart(tentativeDate);
  const statusInfo = getStatusInfo(status, daysUntilStart);
  
  return (
    <Badge 
      variant={statusInfo.variant}
      className={cn(
        statusInfo.pulse && 'animate-pulse',
        statusInfo.variant === 'default' && 'bg-green-600 hover:bg-green-700',
        statusInfo.variant === 'destructive' && 'bg-destructive'
      )}
    >
      {statusInfo.pulse && <AlertCircle className="w-3 h-3 mr-1" />}
      {statusInfo.label}
    </Badge>
  );
};

export const UserLinkBadge = ({ userId, email }: UserLinkBadgeProps) => {
  if (userId) {
    return (
      <Badge variant="outline" className="text-green-600 border-green-600">
        <Link2 className="w-3 h-3 mr-1" />
        Linked
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="text-muted-foreground">
      <Link2Off className="w-3 h-3 mr-1" />
      Pending
    </Badge>
  );
};

export const OperationTypeBadge = ({ type }: { type: string }) => {
  const getTypeStyle = () => {
    switch (type) {
      case 'Appointment':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Appointment (CB)':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Direct Appointment':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300';
      default:
        return '';
    }
  };
  
  return (
    <Badge variant="outline" className={cn('font-medium', getTypeStyle())}>
      {type}
    </Badge>
  );
};
