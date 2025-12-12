import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, User, Mail, Sparkles } from "lucide-react";
import { format } from "date-fns";
import { processEmailVariables, TemplateVariables } from "@/lib/emailTemplateVariables";

interface ThreadMessage {
  id: string;
  sender_type: "original" | "candidate" | "system_reply";
  sender_name: string;
  sender_email: string;
  content: string;
  created_at: string;
  is_read: boolean;
  is_new?: boolean;
}

interface EmailThreadProps {
  originalEmail: {
    id: string;
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
  };
  threadMessages: ThreadMessage[];
  currentResponse: string;
  onResponseChange: (value: string) => void;
  onSendResponse: () => void;
  isSending?: boolean;
  candidateName?: string;
  candidateEmail?: string;
}

export function EmailThread({
  originalEmail,
  threadMessages,
  currentResponse,
  onResponseChange,
  onSendResponse,
  isSending = false,
  candidateName = "You",
  candidateEmail = "",
}: EmailThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasNewMessage, setHasNewMessage] = useState(false);

  // Template variables for processing email content
  const templateVars: TemplateVariables = {
    candidate_name: candidateName,
    candidate_email: candidateEmail,
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
    
    // Check for unread system replies
    const unreadReplies = threadMessages.filter(
      (m) => m.sender_type === "system_reply" && !m.is_read
    );
    setHasNewMessage(unreadReplies.length > 0);
  }, [threadMessages]);

  const getMessageStyles = (senderType: string) => {
    switch (senderType) {
      case "original":
        return "bg-muted border-l-4 border-l-primary";
      case "candidate":
        return "bg-primary/5 border-l-4 border-l-emerald-500 ml-8";
      case "system_reply":
        return "bg-amber-50 border-l-4 border-l-amber-500 dark:bg-amber-950/30";
      default:
        return "bg-muted";
    }
  };

  const getSenderIcon = (senderType: string) => {
    switch (senderType) {
      case "original":
        return <Mail className="w-4 h-4" />;
      case "candidate":
        return <User className="w-4 h-4" />;
      case "system_reply":
        return <Sparkles className="w-4 h-4 text-amber-500" />;
      default:
        return <Mail className="w-4 h-4" />;
    }
  };

  // Combine original email with thread messages
  const allMessages: ThreadMessage[] = [
    {
      id: "original",
      sender_type: "original",
      sender_name: originalEmail.sender_name,
      sender_email: originalEmail.sender_email,
      content: processEmailVariables(originalEmail.body, templateVars),
      created_at: new Date().toISOString(),
      is_read: true,
    },
    ...threadMessages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg) => ({
        ...msg,
        // Process template variables in system replies (AI might include them)
        content:
          msg.sender_type === "system_reply"
            ? processEmailVariables(msg.content, templateVars)
            : msg.content,
      })),
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Thread messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {allMessages.map((message, index) => (
            <div
              key={message.id}
              className={`p-4 rounded-lg transition-all ${getMessageStyles(message.sender_type)} ${
                message.is_new ? "animate-pulse ring-2 ring-amber-400" : ""
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {getSenderIcon(message.sender_type)}
                <span className="font-medium text-sm">
                  {message.sender_type === "candidate" ? candidateName : message.sender_name}
                </span>
                {message.sender_type !== "candidate" && (
                  <span className="text-xs text-muted-foreground">
                    &lt;{message.sender_email}&gt;
                  </span>
                )}
                {message.sender_type === "system_reply" && !message.is_read && (
                  <Badge className="bg-amber-500 text-white text-xs ml-auto">NEW</Badge>
                )}
                {index > 0 && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(message.created_at), "HH:mm")}
                  </span>
                )}
              </div>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Response input */}
      <div className="p-4 border-t bg-background">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-medium">Your Reply</span>
          {hasNewMessage && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs ml-auto">
              New message received - scroll up to view
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Textarea
            value={currentResponse}
            onChange={(e) => onResponseChange(e.target.value)}
            placeholder="Type your response..."
            className="flex-1 min-h-[120px] resize-none"
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">
            Auto-saved every 30 seconds
          </p>
          <Button
            size="sm"
            onClick={onSendResponse}
            disabled={!currentResponse.trim() || isSending}
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Sending..." : "Send Reply"}
          </Button>
        </div>
      </div>
    </div>
  );
}
