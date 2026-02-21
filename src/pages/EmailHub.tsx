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
  'Offer Acceptance',
  'OneHR approval',
  'General documentation to IC',
  'One HR conformity',
];

const staffEmails: string[] = [];

const EmailHub = () => {
  const { toast } = useToast();

  // Rate Confirmation wizard state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);
  const [toEmail, setToEmail] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // Offer Acceptance wizard state
  const [offerDialogOpen, setOfferDialogOpen] = useState(false);
  const [offerWizardStep, setOfferWizardStep] = useState<1 | 2 | 3>(1);
  const [offerSending, setOfferSending] = useState(false);
  const [offerToEmail, setOfferToEmail] = useState('');
  const [offerCandidateName, setOfferCandidateName] = useState('');
  const [offerPositionTitle, setOfferPositionTitle] = useState('');
  const [offerVacancyNumber, setOfferVacancyNumber] = useState('');
  const [offerDeadline, setOfferDeadline] = useState<Date | null>(null);
  const [offerStartDate, setOfferStartDate] = useState<Date | null>(null);
  const [offerCurrency, setOfferCurrency] = useState('');
  const [offerRate, setOfferRate] = useState('');
  const [offerSubject, setOfferSubject] = useState('');
  const [offerBody, setOfferBody] = useState('');

  const resetWizard = () => {
    setWizardStep(1);
    setToEmail('');
    setCandidateName('');
    setSubject('');
    setBody('');
    setSending(false);
  };

  const resetOfferWizard = () => {
    setOfferWizardStep(1);
    setOfferToEmail('');
    setOfferCandidateName('');
    setOfferPositionTitle('');
    setOfferVacancyNumber('');
    setOfferDeadline(null);
    setOfferStartDate(null);
    setOfferCurrency('');
    setOfferRate('');
    setOfferSubject('');
    setOfferBody('');
    setOfferSending(false);
  };

  const handleDraftEmail = (label: string) => {
    if (label === 'OneHR approval') {
      resetWizard();
      setDialogOpen(true);
    } else if (label === 'Offer Acceptance') {
      resetOfferWizard();
      setOfferDialogOpen(true);
    } else {
      toast({ title: 'Coming soon', description: `Draft email for "${label}" is not yet implemented.` });
    }
  };

  // Rate Confirmation helpers
  const step1Valid = toEmail.trim() !== '' && candidateName.trim() !== '';

  const goToStep2 = () => {
    setSubject(`Use of OneHR background verification services Request for consent - ${candidateName}`);
    setBody(`Dear ${candidateName},\n\nTo continue with your onboarding formalities, we will request the United Nations Global Centre for Human Resources Services ("the OneHR Centre") for background verification. The OneHR Centre conducts 4 types of background verification:\n•\tEmployment record verification\n•\tAcademic record verification\n•\tQualitative reference checks\n•\tMisconduct verification\n\nThis background verification should be completed as soon as possible, and usually within 3 weeks. Receiving the clearance from OneHR is one of the requirements for receiving the UNICC Individual consultancy contract.\n\nWe would appreciate if you could <b>confirm your agreement to the background verification process through OneHR by replying to this email</b>. OneHR will then contact you directly with further instructions.\n\nIn order to prepare this verification, could you <b>please send us copy of your passport and the most recent updated version of the PHF</b> as soon as possible.\n\nPlease note that the OneHR Centre is not part of WHO. You will be in touch with a OneHR focal point. However, should you have any questions, we invite you to visit the OneHR FAQ page (https://onehr.un.org/faq-frequently-asked-questions) or you may also contact hraffiliatemanagement@unicc.org.\n\nBest regards,`);
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

  // Offer Acceptance helpers
  const offerStep1Valid = offerToEmail.trim() !== '' && offerCandidateName.trim() !== '' && offerPositionTitle.trim() !== '' && offerVacancyNumber.trim() !== '' && offerDeadline !== null && offerStartDate !== null && offerCurrency.trim() !== '' && offerRate.trim() !== '';

  const goToOfferStep2 = () => {
    const formattedDeadline = offerDeadline ? format(offerDeadline, 'd MMMM yyyy') : '';
    const formattedStartDate = offerStartDate ? format(offerStartDate, 'd MMMM yyyy') : '';
    setOfferSubject(`UNICC Individual Consultancy - ${offerVacancyNumber} - ${offerPositionTitle} - ${offerCandidateName}`);
    setOfferBody(`Dear ${offerCandidateName},\n\nI am pleased to inform you that you have been selected for the individual consultancy position of ${offerPositionTitle} with UNICC. Congratulations! 😊\n\nPlease note that in the following days you will receive two emails containing necessary actions from your side:\n\n- OneHR verification process and details\n- WHO forms and Non-Disclosure Agreement to complete\n\nWe will work towards onboarding you on <b>${formattedStartDate}</b>. As discussed with your manager, your daily rate will be <b>${offerCurrency} ${offerRate}</b>. Please note that, before the date, you will need to ensure your eligibility as per:\n\n- Being a citizen or having the right to work on your place of residence\n- Engaging with UNICC on a freelancer modality. This includes performing any relevant declarations towards the country you reside on. Please note that any possible taxes or contributions tied to the freelancer process are the responsibility of the Individual Consultant\n- Providing us with the documentation related to OneHR verification process and WHO required documentation. Both will be shortly shared with you in separate emails.\n\nKindly confirm whether you accept this offer by <b>${formattedDeadline}</b>.\n\nShould you have any questions on the process, feel free to contact me.\n\nBest regards,`);
    setOfferWizardStep(2);
  };

  const handleOfferSend = async () => {
    setOfferSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-bulk-talent-email', {
        body: {
          recipients: [{ name: offerCandidateName, email: offerToEmail }],
          subject: offerSubject,
          body: offerBody,
          cc: ['hraffiliatemanagement@unicc.org'],
        },
      });
      if (error) throw error;
      if (data?.failureCount > 0) {
        toast({ title: 'Partial failure', description: data.errors?.join(', ') || 'Some emails failed to send.', variant: 'destructive' });
      } else {
        toast({ title: 'Email sent', description: `Offer acceptance sent to ${offerToEmail}.` });
      }
      setOfferDialogOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to send email.', variant: 'destructive' });
    } finally {
      setOfferSending(false);
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

      {/* Rate Confirmation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {wizardStep === 1 && 'OneHR Approval — Fill Details'}
              {wizardStep === 2 && 'OneHR Approval — Email Preview'}
              {wizardStep === 3 && 'OneHR Approval — Summary'}
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
                <div><span className="font-medium text-muted-foreground">To:</span><p>{toEmail}</p></div>
                <div><span className="font-medium text-muted-foreground">Subject:</span><p>{subject}</p></div>
                <div><span className="font-medium text-muted-foreground">Body:</span><p className="whitespace-pre-wrap">{body}</p></div>
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

      {/* Offer Acceptance Dialog */}
      <Dialog open={offerDialogOpen} onOpenChange={(open) => { if (!open) setOfferDialogOpen(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {offerWizardStep === 1 && 'Offer Acceptance — Fill Details'}
              {offerWizardStep === 2 && 'Offer Acceptance — Email Preview'}
              {offerWizardStep === 3 && 'Offer Acceptance — Summary'}
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[60vh] space-y-4 py-2">
            {offerWizardStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="offerToEmail">To (email)</Label>
                  <Input id="offerToEmail" type="email" placeholder="recipient@example.com" value={offerToEmail} onChange={(e) => setOfferToEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerCandidateName">Candidate Name</Label>
                  <Input id="offerCandidateName" placeholder="Jane Doe" value={offerCandidateName} onChange={(e) => setOfferCandidateName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerVacancyNumber">Vacancy Number</Label>
                  <Input id="offerVacancyNumber" placeholder="e.g. VA/2026/001" value={offerVacancyNumber} onChange={(e) => setOfferVacancyNumber(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerPositionTitle">Position Title</Label>
                  <Input id="offerPositionTitle" placeholder="e.g. IT Consultant" value={offerPositionTitle} onChange={(e) => setOfferPositionTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <CustomDatePicker selected={offerStartDate} onChange={setOfferStartDate} placeholderText="Pick a start date" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerCurrency">Currency</Label>
                  <Input id="offerCurrency" placeholder="e.g. USD" value={offerCurrency} onChange={(e) => setOfferCurrency(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerRate">Daily Rate</Label>
                  <Input id="offerRate" placeholder="e.g. 500" value={offerRate} onChange={(e) => setOfferRate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Response Deadline</Label>
                  <CustomDatePicker selected={offerDeadline} onChange={setOfferDeadline} placeholderText="Pick a deadline" />
                </div>
              </>
            )}
            {offerWizardStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="offerSubject">Subject</Label>
                  <Input id="offerSubject" value={offerSubject} onChange={(e) => setOfferSubject(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="offerBody">Body</Label>
                  <Textarea id="offerBody" rows={10} value={offerBody} onChange={(e) => setOfferBody(e.target.value)} />
                </div>
              </>
            )}
            {offerWizardStep === 3 && (
              <div className="space-y-3 text-sm">
                <div><span className="font-medium text-muted-foreground">To:</span><p>{offerToEmail}</p></div>
                <div><span className="font-medium text-muted-foreground">CC:</span><p>hraffiliatemanagement@unicc.org</p></div>
                <div><span className="font-medium text-muted-foreground">Subject:</span><p>{offerSubject}</p></div>
                <div><span className="font-medium text-muted-foreground">Body:</span><p className="whitespace-pre-wrap">{offerBody}</p></div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            {offerWizardStep > 1 && (
              <Button variant="outline" onClick={() => setOfferWizardStep((s) => (s - 1) as 1 | 2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            )}
            {offerWizardStep < 3 && (
              <Button disabled={offerWizardStep === 1 && !offerStep1Valid} onClick={() => offerWizardStep === 1 ? goToOfferStep2() : setOfferWizardStep(3)}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
            {offerWizardStep === 3 && (
              <Button disabled={offerSending} onClick={handleOfferSend}>
                <Send className="h-4 w-4 mr-1" /> {offerSending ? 'Sending…' : 'Send'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default EmailHub;
