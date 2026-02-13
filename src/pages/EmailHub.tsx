import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Mail, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CustomDatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

const affiliateEmails = [
  'Rate confirmation to IC',
  'General documentation to IC',
  'One HR conformity',
];

const EmailHub = () => {
  const { toast } = useToast();

  // Wizard state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);

  // Form fields
  const [toEmail, setToEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [rate, setRate] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const resetWizard = () => {
    setWizardStep(1);
    setToEmail('');
    setCandidateName('');
    setRate('');
    setDate(null);
    setSubject('');
    setBody('');
    setSending(false);
  };

  const handleDraftEmail = (label: string) => {
    if (label === 'Rate confirmation to IC') {
      resetWizard();
      setDialogOpen(true);
    } else {
      toast({ title: 'Coming soon', description: `Draft email for "${label}" is not yet implemented.` });
    }
  };

  const step1Valid = toEmail.trim() !== '' && candidateName.trim() !== '' && rate.trim() !== '' && date !== null;

  const goToStep2 = () => {
    const formattedDate = date ? format(date, 'dd/MM/yyyy') : '';
    setSubject(`Rate confirmation ${candidateName}`);
    setBody(`Dear ${candidateName},\n\nThis is to confirm your rate will be ${rate}.\n\nPlease accept by ${formattedDate}.`);
    setWizardStep(2);
  };

  const handleSend = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-talent-email', {
        body: {
          recipients: [{ name: candidateName, email: toEmail }],
          subject,
          body,
        },
      });
      if (error) throw error;
      if (data?.failureCount > 0) {
        toast({ title: 'Partial failure', description: data.errors?.join(', ') || 'Some emails failed to send.', variant: 'destructive' });
      } else {
        toast({ title: 'Email sent', description: `Rate confirmation sent to ${toEmail}.` });
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send email.', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 space-y-6">
        <h1 className="text-3xl font-bold">Email Hub</h1>

        <Card>
          <CardHeader>
            <CardTitle>Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No items configured yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Staff Recruitment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">No items configured yet.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Affiliate Recruitment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {affiliateEmails.map((label) => (
              <div key={label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <span className="text-sm font-medium">{label}</span>
                <Button variant="outline" size="sm" onClick={() => handleDraftEmail(label)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Draft Email
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 && 'Rate Confirmation — Fill Details'}
              {wizardStep === 2 && 'Rate Confirmation — Email Preview'}
              {wizardStep === 3 && 'Rate Confirmation — Summary'}
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[60vh] space-y-4 py-2">
            {wizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="toEmail">To (email)</Label>
                  <Input id="toEmail" type="email" placeholder="recipient@example.com" value={toEmail} onChange={(e) => setToEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateName">Candidate Name</Label>
                  <Input id="candidateName" placeholder="Jane Doe" value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rate">Rate</Label>
                  <Input id="rate" placeholder="e.g. $500/day" value={rate} onChange={(e) => setRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Date</Label>
                  <CustomDatePicker selected={date} onChange={setDate} placeholderText="Pick a date" />
                </div>
              </>
            )}

            {wizardStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="body">Body</Label>
                  <Textarea id="body" rows={8} value={body} onChange={(e) => setBody(e.target.value)} />
                </div>
              </>
            )}

            {wizardStep === 3 && (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">To:</span>
                  <p>{toEmail}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Subject:</span>
                  <p>{subject}</p>
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Body:</span>
                  <p className="whitespace-pre-wrap">{body}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {wizardStep > 1 && (
              <Button variant="outline" onClick={() => setWizardStep((s) => (s - 1) as 1 | 2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {wizardStep < 3 && (
              <Button disabled={wizardStep === 1 && !step1Valid} onClick={() => wizardStep === 1 ? goToStep2() : setWizardStep(3)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {wizardStep === 3 && (
              <Button disabled={sending} onClick={handleSend}>
                <Send className="h-4 w-4 mr-1" /> {sending ? 'Sending…' : 'Send'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmailHub;
