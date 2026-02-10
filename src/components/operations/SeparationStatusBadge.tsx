import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface SeparationStatusBadgeProps {
  status: string;
  tentativeDate?: string | null;
}

export const calculateDaysUntilSeparation = (
  tentativeDate: string | null | undefined
): number | null => {
  if (!tentativeDate) return null;
  
  const separationDate = parseISO(tentativeDate);
  const today = new Date();
  
  // Normalize both dates to start of day for accurate day comparison
  today.setHours(0, 0, 0, 0);
  const normalizedSeparationDate = new Date(separationDate);
  normalizedSeparationDate.setHours(0, 0, 0, 0);
  
  return differenceInDays(normalizedSeparationDate, today);
};

export const getSeparationStatusInfo = (
  status: string,
  daysUntilSeparation: number | null
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
  
  // In progress - check days until separation date
  if (daysUntilSeparation !== null && daysUntilSeparation < 0) {
    // Separation date has passed but still "In progress"
    return { 
      label: `${Math.abs(daysUntilSeparation)}d overdue`, 
      variant: 'destructive',
      pulse: true 
    };
  }
  if (daysUntilSeparation !== null && daysUntilSeparation <= 7) {
    return { label: `${daysUntilSeparation}d remaining`, variant: 'secondary' };
  }
  
  return { label: 'In progress', variant: 'outline' };
};

export const SeparationStatusBadge = ({ 
  status, 
  tentativeDate
}: SeparationStatusBadgeProps) => {
  const daysUntilSeparation = calculateDaysUntilSeparation(tentativeDate);

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
  if (daysUntilSeparation !== null && daysUntilSeparation < 0) {
    return (
      <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
        <AlertCircle className="w-3 h-3 mr-1" />
        {Math.abs(daysUntilSeparation)}d overdue
      </Badge>
    );
  }

  if (daysUntilSeparation !== null && daysUntilSeparation <= 7) {
    return (
      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
        {daysUntilSeparation}d remaining
      </Badge>
    );
  }

  return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In progress</Badge>;
};

export const SeparationTypeBadge = ({ type }: { type: string }) => {
  const getTypeStyle = () => {
    switch (type) {
      case 'Resignation':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'Separation - Retirement':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'Separation (CB)':
      case 'Individual Consultancy (CB)':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'Separation':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'Internship Separation':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'UNV - Separation':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300';
      case 'Canceled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'Individual Consultancy Separation':
      case 'Individual Consultancy Extension':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300';
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

export const ReasonBadge = ({ reason }: { reason: string | null | undefined }) => {
  if (!reason) return null;
  
  const isVoluntary = reason.toLowerCase().includes('voluntary') && !reason.toLowerCase().includes('non');
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs',
        isVoluntary 
          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
          : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800'
      )}
    >
      {reason}
    </Badge>
  );
};
