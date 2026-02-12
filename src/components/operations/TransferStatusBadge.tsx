import { Badge } from '@/components/ui/badge';
import { differenceInDays, parseISO } from 'date-fns';
import { AlertTriangle, Clock } from 'lucide-react';

interface TransferStatusBadgeProps {
  status: string;
  endDate?: string | null;
}

export const TransferStatusBadge = ({ status, endDate }: TransferStatusBadgeProps) => {
  const daysUntilEnd = endDate ? differenceInDays(parseISO(endDate), new Date()) : null;
  const isEndingSoon = daysUntilEnd !== null && daysUntilEnd >= 0 && daysUntilEnd <= 56;
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
    let colorClass = 'bg-yellow-100 text-yellow-800';
    if (daysUntilEnd <= 14) colorClass = 'bg-red-100 text-red-800';
    else if (daysUntilEnd <= 28) colorClass = 'bg-orange-100 text-orange-800';
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
  if (status === 'Pending action (UNICC)') {
    return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending (UNICC)</Badge>;
  }
  if (status === 'Pending Action (External)') {
    return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Pending (External)</Badge>;
  }
  if (status === 'Follow up') {
    return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Follow Up</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
};

interface TransferTypeBadgeProps {
  type: string;
}

export const TransferTypeBadge = ({ type }: TransferTypeBadgeProps) => {
  const getColor = () => {
    switch (type) {
      case 'Reassignment': return 'bg-cyan-100 text-cyan-800';
      case 'STDA': return 'bg-purple-100 text-purple-800';
      case 'STDA Extension': return 'bg-violet-100 text-violet-800';
      case 'OIC': return 'bg-indigo-100 text-indigo-800';
      case 'OIC Extension': return 'bg-blue-100 text-blue-800';
      case 'Transfer': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  return <Badge className={`${getColor()} hover:${getColor()}`}>{type}</Badge>;
};

export const TransferUserLinkBadge = ({ isLinked }: { isLinked: boolean }) => {
  if (isLinked) {
    return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Linked</Badge>;
  }
  return <Badge variant="outline" className="text-muted-foreground">Not Linked</Badge>;
};

export const calculateDaysUntilEnd = (endDate: string | null): number | null => {
  if (!endDate) return null;
  return differenceInDays(parseISO(endDate), new Date());
};
