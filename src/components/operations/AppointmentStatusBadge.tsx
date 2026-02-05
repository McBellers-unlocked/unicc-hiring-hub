import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Link2, Link2Off, AlertCircle } from 'lucide-react';

interface AppointmentStatusBadgeProps {
  status: string;
  tentativeDate?: string | null;
  noticeDaysRequired?: number;
}

interface UserLinkBadgeProps {
  userId?: string | null;
  email?: string | null;
}

export const calculateDaysToNotify = (
  tentativeDate: string | null | undefined,
  noticeDaysRequired: number = 30
): number | null => {
  if (!tentativeDate) return null;
  
  const targetDate = parseISO(tentativeDate);
  const notifyByDate = new Date(targetDate);
  notifyByDate.setDate(notifyByDate.getDate() - noticeDaysRequired);
  
  return differenceInDays(notifyByDate, new Date());
};

export const getStatusInfo = (
  status: string,
  daysToNotify: number | null
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
  
  // In progress - check days
  if (daysToNotify !== null && daysToNotify < 0) {
    return { 
      label: `${Math.abs(daysToNotify)}d overdue`, 
      variant: 'destructive',
      pulse: true 
    };
  }
  if (daysToNotify !== null && daysToNotify <= 7) {
    return { label: `${daysToNotify}d remaining`, variant: 'secondary' };
  }
  
  return { label: 'In progress', variant: 'outline' };
};

export const AppointmentStatusBadge = ({ 
  status, 
  tentativeDate, 
  noticeDaysRequired = 30 
}: AppointmentStatusBadgeProps) => {
  const daysToNotify = calculateDaysToNotify(tentativeDate, noticeDaysRequired);
  const statusInfo = getStatusInfo(status, daysToNotify);
  
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
