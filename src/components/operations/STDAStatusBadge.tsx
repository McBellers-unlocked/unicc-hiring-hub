import { Badge } from '@/components/ui/badge';
import { differenceInDays, differenceInWeeks, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

interface STDAStatusBadgeProps {
  status: string;
  endDate?: string | null;
}

export const STDAStatusBadge = ({ status, endDate }: STDAStatusBadgeProps) => {
  // Calculate days until STDA ends
  const daysUntilEnd = endDate ? differenceInDays(parseISO(endDate), new Date()) : null;
  const isEndingSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 56; // 8 weeks
  const isEnded = daysUntilEnd !== null && daysUntilEnd < 0;

  if (status === 'Completed') {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
  }

  if (status === 'Cancelled') {
    return <Badge variant="outline" className="text-muted-foreground">Cancelled</Badge>;
  }

  if (isEnded && status !== 'Completed') {
    return (
      <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/20">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Ended
      </Badge>
    );
  }

  if (isEndingSoon && status !== 'Completed') {
    const weeksLeft = Math.ceil(daysUntilEnd / 7);
    let colorClass = 'bg-yellow-100 text-yellow-800'; // 4-8 weeks
    if (daysUntilEnd <= 14) {
      colorClass = 'bg-red-100 text-red-800'; // < 2 weeks
    } else if (daysUntilEnd <= 28) {
      colorClass = 'bg-orange-100 text-orange-800'; // 2-4 weeks
    }

    return (
      <Badge className={`${colorClass} hover:${colorClass}`}>
        <Clock className="h-3 w-3 mr-1" />
        {daysUntilEnd} days left
      </Badge>
    );
  }

  if (status === 'In progress') {
    return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">In Progress</Badge>;
  }

  if (status === 'Not started') {
    return <Badge variant="outline">Not Started</Badge>;
  }

  return <Badge variant="outline">{status}</Badge>;
};

interface OperationTypeBadgeProps {
  type: string;
}

export const OperationTypeBadge = ({ type }: OperationTypeBadgeProps) => {
  const getTypeColor = () => {
    switch (type) {
      case 'STDA':
        return 'bg-purple-100 text-purple-800';
      case 'OIC':
        return 'bg-indigo-100 text-indigo-800';
      case 'Reassignment':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={`${getTypeColor()} hover:${getTypeColor()}`}>
      {type}
    </Badge>
  );
};

interface UserLinkBadgeProps {
  isLinked: boolean;
}

export const UserLinkBadge = ({ isLinked }: UserLinkBadgeProps) => {
  if (isLinked) {
    return (
      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
        Linked
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-muted-foreground">
      Not Linked
    </Badge>
  );
};

export const calculateDaysUntilEnd = (endDate: string | null): number | null => {
  if (!endDate) return null;
  return differenceInDays(parseISO(endDate), new Date());
};

export const calculateWeeksUntilEnd = (endDate: string | null): number | null => {
  if (!endDate) return null;
  return differenceInWeeks(parseISO(endDate), new Date());
};

// Badge for users who are currently on STDA
export const STDAUserBadge = () => {
  return (
    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
      STDA
    </Badge>
  );
};
