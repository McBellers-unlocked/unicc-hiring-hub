import { useState } from 'react';
import { ChecklistItem, LIFECYCLE_STAGES, getStageStatus, getStageTextColorClass } from '@/lib/affiliateLifecycleConfig';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, AlertTriangle, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AffiliateLifecycleChecklistProps {
  stageKey: string;
  items: ChecklistItem[];
  daysToOnboard: number;
  onToggleItem: (itemId: string, completed: boolean) => void;
  onUpdateNotes: (itemId: string, notes: string) => void;
}

export function AffiliateLifecycleChecklist({
  stageKey,
  items,
  daysToOnboard,
  onToggleItem,
  onUpdateNotes,
}: AffiliateLifecycleChecklistProps) {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  
  const stage = LIFECYCLE_STAGES.find(s => s.key === stageKey);
  if (!stage) return null;
  
  const status = getStageStatus(stageKey, daysToOnboard, items);
  const completedCount = items.filter(item => item.completed).length;
  
  const toggleNotes = (itemId: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };
  
  const getStatusBadge = () => {
    switch (status) {
      case 'complete':
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <Check className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        );
      case 'overdue':
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Overdue
          </Badge>
        );
      case 'pending':
      default:
        return (
          <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
            <Clock className="h-3 w-3 mr-1" />
            In Progress
          </Badge>
        );
    }
  };
  
  return (
    <Card className={cn(
      'transition-all',
      status === 'overdue' && 'border-red-300 bg-red-50/50',
      status === 'complete' && 'border-green-300 bg-green-50/50'
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className={cn('text-lg', getStageTextColorClass(status))}>
              {stage.label}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              Day {stage.dayMarker}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {completedCount}/{items.length}
            </span>
            {getStatusBadge()}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{stage.description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No checklist items for this stage</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="space-y-2">
              <div className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={(checked) => onToggleItem(item.id, checked as boolean)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <label className={cn(
                      'text-sm font-medium cursor-pointer',
                      item.completed && 'line-through text-muted-foreground'
                    )}>
                      {item.item_label}
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => toggleNotes(item.id)}
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      {expandedNotes.has(item.id) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  {item.completed && item.completed_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Completed {format(parseISO(item.completed_at), 'dd MMM yyyy HH:mm')}
                    </p>
                  )}
                </div>
              </div>
              
              {expandedNotes.has(item.id) && (
                <div className="ml-7">
                  <Textarea
                    placeholder="Add notes..."
                    value={item.notes || ''}
                    onChange={(e) => onUpdateNotes(item.id, e.target.value)}
                    className="text-sm min-h-20"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
