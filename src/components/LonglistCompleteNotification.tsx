import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Send, Loader2, X, Mail, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface LonglistCompleteNotificationProps {
  jobId: string;
  jobTitle: string;
  longlistStats: {
    tier1: number;
    tier2: number;
    eligible: number;
    rejected: number;
    total: number;
  };
  hasVideoStage: boolean;
  onDismiss: () => void;
}

export function LonglistCompleteNotification({
  jobId,
  jobTitle,
  longlistStats,
  hasVideoStage,
  onDismiss
}: LonglistCompleteNotificationProps) {
  const { toast } = useToast();
  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState<{ email: string; sentAt: string } | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Check if notification was already sent
  useEffect(() => {
    const checkExistingNotification = async () => {
      setCheckingStatus(true);
      try {
        const { data, error } = await supabase
          .from('email_send_log')
          .select('recipient_email, sent_at')
          .eq('template_slug', 'longlist-complete')
          .eq('status', 'sent')
          .contains('variables', { jobId })
          .order('sent_at', { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          setSentInfo({
            email: data[0].recipient_email,
            sentAt: data[0].sent_at
          });
        }
      } catch (err) {
        console.error('Error checking notification status:', err);
      } finally {
        setCheckingStatus(false);
      }
    };

    checkExistingNotification();
  }, [jobId]);

  const handleSendNotification = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-longlist-complete-notification', {
        body: { jobId, longlistStats, hasVideoStage }
      });

      if (error) throw error;

      if (data.emailsSent && data.emailsSent.length > 0) {
        toast({
          title: "Notification Sent",
          description: `Email sent to ${data.emailsSent.join(', ')}`,
        });
        setSentInfo({
          email: data.emailsSent.join(', '),
          sentAt: new Date().toISOString()
        });
      } else if (data.errors && data.errors.length > 0) {
        throw new Error(data.errors.join(', '));
      } else {
        throw new Error('No emails were sent');
      }
    } catch (err: any) {
      console.error('Error sending notification:', err);
      toast({
        title: "Error",
        description: err.message || "Failed to send notification",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  if (checkingStatus) {
    return null;
  }

  // Already sent state
  if (sentInfo) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50 dark:bg-green-950/30 dark:border-green-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/50 p-2">
              <Mail className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Notification Sent
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                The Hiring Manager has been notified to review the longlist for {jobTitle}.
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Sent to {sentInfo.email} on {format(new Date(sentInfo.sentAt), 'MMM d, yyyy \'at\' h:mm a')}
              </p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSendNotification}
                disabled={sending}
                className="text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400 dark:border-green-700"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Resend
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Ready to send state
  return (
    <Card className="mb-6 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-800">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-blue-100 dark:bg-blue-900/50 p-2">
            <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              Longlisting Complete
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              All applications have been processed. Ready to notify the Hiring Manager.
            </p>
            
            {/* Stats summary */}
            <div className="flex flex-wrap gap-3 mt-3">
              {longlistStats.tier1 > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">
                  {longlistStats.tier1} Tier 1
                </span>
              )}
              {longlistStats.tier2 > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                  {longlistStats.tier2} Tier 2
                </span>
              )}
              {longlistStats.eligible > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300">
                  {longlistStats.eligible} Eligible
                </span>
              )}
              {longlistStats.rejected > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300">
                  {longlistStats.rejected} Rejected
                </span>
              )}
            </div>

            {/* Next step hint */}
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
              The Hiring Manager will be asked to move candidates to Pre-Recorded Video Interview 
              or directly to Shortlist (for panel interviews).
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onDismiss}
              className="text-blue-600 hover:text-blue-800 hover:bg-blue-100 dark:text-blue-400 dark:hover:text-blue-200"
            >
              Dismiss
            </Button>
            <Button 
              onClick={handleSendNotification}
              disabled={sending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Notify Hiring Manager
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
