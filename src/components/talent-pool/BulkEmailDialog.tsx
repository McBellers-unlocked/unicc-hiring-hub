import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, Loader2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Recipient {
  id: string;
  name: string;
  email: string;
  position?: string | null;
}

interface BulkEmailDialogProps {
  open: boolean;
  onClose: () => void;
  recipients: Recipient[];
  onRemoveRecipient: (id: string) => void;
}

export function BulkEmailDialog({
  open,
  onClose,
  recipients,
  onRemoveRecipient,
}: BulkEmailDialogProps) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState(
    `Dear {{name}},

I hope this message finds you well.

[Your message here]

Best regards`
  );
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter an email subject.",
        variant: "destructive",
      });
      return;
    }

    if (!body.trim()) {
      toast({
        title: "Message required",
        description: "Please enter an email message.",
        variant: "destructive",
      });
      return;
    }

    if (recipients.length === 0) {
      toast({
        title: "No recipients",
        description: "Please select at least one recipient.",
        variant: "destructive",
      });
      return;
    }

    setSending(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "send-bulk-talent-email",
        {
          body: {
            recipients: recipients.map((r) => ({
              name: r.name,
              email: r.email,
              position: r.position,
            })),
            subject,
            body,
          },
        }
      );

      if (error) throw error;

      toast({
        title: "Emails sent",
        description: `Successfully sent ${data.successCount} email${data.successCount !== 1 ? "s" : ""}.`,
      });

      // Reset form and close
      setSubject("");
      setBody(`Dear {{name}},

I hope this message finds you well.

[Your message here]

Best regards`);
      onClose();
    } catch (error: any) {
      console.error("Error sending emails:", error);
      toast({
        title: "Failed to send emails",
        description: error.message || "An error occurred while sending emails.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const previewBody = body
    .replace(/\{\{name\}\}/g, recipients[0]?.name || "John Doe")
    .replace(/\{\{position\}\}/g, recipients[0]?.position || "Staff Member");

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Send Bulk Email</DialogTitle>
          <DialogDescription>
            Compose an email to send to {recipients.length} selected staff member
            {recipients.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4">
          {/* Recipients */}
          <div className="space-y-2">
            <Label>Recipients ({recipients.length})</Label>
            <ScrollArea className="h-24 rounded-md border p-2">
              <div className="flex flex-wrap gap-2">
                {recipients.map((recipient) => (
                  <Badge
                    key={recipient.id}
                    variant="secondary"
                    className="gap-1 pr-1"
                  >
                    {recipient.name}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-destructive"
                      onClick={() => onRemoveRecipient(recipient.id)}
                    />
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Placeholders info */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use <code className="bg-muted px-1 rounded">{"{{name}}"}</code> and{" "}
              <code className="bg-muted px-1 rounded">{"{{position}}"}</code> to
              personalize each email.
            </AlertDescription>
          </Alert>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              placeholder="Enter email subject..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea
              id="body"
              placeholder="Compose your email..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="resize-none"
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label>Preview (first recipient)</Label>
            <div className="rounded-md border bg-muted/50 p-4 text-sm whitespace-pre-wrap">
              {previewBody}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send to {recipients.length} recipient{recipients.length !== 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
