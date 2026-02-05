import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  UserPlus, 
  UserMinus, 
  Pause, 
  ArrowLeftRight,
  Eye
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export interface UpcomingEvent {
  id: string;
  category: 'appointment' | 'separation_exit' | 'separation_cb' | 'transfer';
  name: string;
  date: string;
  location: string;
  type: string;
  isInternational?: boolean;
  grade?: string;
}

interface UpcomingEventsTableProps {
  events: UpcomingEvent[];
  title?: string;
  showCategory?: boolean;
}

const categoryConfig = {
  appointment: {
    label: 'Appointment',
    icon: UserPlus,
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  },
  separation_exit: {
    label: 'Exit',
    icon: UserMinus,
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  },
  separation_cb: {
    label: 'Contract Break',
    icon: Pause,
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  },
  transfer: {
    label: 'Transfer',
    icon: ArrowLeftRight,
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  },
};

export default function UpcomingEventsTable({ 
  events, 
  title = "Upcoming Events",
  showCategory = true 
}: UpcomingEventsTableProps) {
  const navigate = useNavigate();

  const handleView = (event: UpcomingEvent) => {
    if (event.category === 'appointment' || event.category === 'transfer') {
      navigate('/operations/appointments');
    } else {
      navigate('/operations/separations');
    }
  };

  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No upcoming events
      </div>
    );
  }

  return (
    <div>
      {title && <h3 className="font-semibold mb-4">{title}</h3>}
      <Table>
        <TableHeader>
          <TableRow>
            {showCategory && <TableHead>Category</TableHead>}
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const config = categoryConfig[event.category];
            const Icon = config.icon;
            
            return (
              <TableRow key={`${event.category}-${event.id}`}>
                {showCategory && (
                  <TableCell>
                    <Badge className={config.color} variant="outline">
                      <Icon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {event.name}
                  {event.isInternational && event.grade?.startsWith('P') && (
                    <Badge variant="outline" className="ml-2 text-xs">
                      P-Staff
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  {event.date ? format(parseISO(event.date), 'dd MMM yyyy') : '-'}
                </TableCell>
                <TableCell>{event.location || '-'}</TableCell>
                <TableCell>{event.type || '-'}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleView(event)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
