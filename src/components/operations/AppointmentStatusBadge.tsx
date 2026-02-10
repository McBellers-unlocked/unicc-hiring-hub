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

  if (status === 'Completed') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
  }

  if (status === 'Cancelled') {
    return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
  }

  if (status === 'Not started') {
    return <Badge variant="outline">Not started</Badge>;
  }

  // In progress states
  if (daysUntilStart !== null && daysUntilStart < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <AlertCircle className="w-3 h-3 mr-1" />
        {Math.abs(daysUntilStart)}d overdue
      </Badge>
    );
  }

  if (daysUntilStart !== null && daysUntilStart <= 7) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        {daysUntilStart}d remaining
      </Badge>
    );
  }

  return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In progress</Badge>;
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
