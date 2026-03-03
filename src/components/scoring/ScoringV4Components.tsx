import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertTriangle, Copy, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EvidenceQuote {
  source: string;
  quote: string;
}

interface VerifierResult {
  valid: boolean;
  issues: string[];
  confidence_adjustment: number;
}

interface SubRequirementScore {
  id: string;
  text: string;
  type: 'deterministic' | 'llm';
  demonstrated: boolean;
  evidence: EvidenceQuote[];
  missing: string | null;
  confidence: number;
  flags: string[];
  verification?: VerifierResult;
}

interface CriterionScoreV4 {
  criterionId: string;
  criterionText: string;
  type: string;
  score: number;
  passed: boolean;
  confidence: number;
  subrequirements: SubRequirementScore[];
  recombine_logic: string;
  details?: {
    required?: string;
    candidateHas?: string;
  };
}

// Status flag component
function StatusFlag({ flags, confidence }: { flags: string[]; confidence: number }) {
  if (flags.includes('VERIFIER_INVALIDATED') || flags.includes('CRITICAL_NO_EVIDENCE')) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        CRITICAL
      </Badge>
    );
  }
  if (flags.includes('AI_PARSE_FAILURE') || flags.includes('UNKNOWN_DETERMINISTIC')) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        ERROR
      </Badge>
    );
  }
  if (flags.includes('REVIEW') || confidence < 0.6) {
    return (
      <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 hover:bg-amber-600">
        REVIEW
      </Badge>
    );
  }
  return (
    <Badge className="text-[10px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-700">
      OK
    </Badge>
  );
}

// Evidence quote display with copy button
function EvidenceDisplay({ evidence, onHighlight }: {
  evidence: EvidenceQuote[];
  onHighlight?: (quote: string) => void;
}) {
  const { toast } = useToast();

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Evidence quote copied to clipboard' });
  };

  if (!evidence || evidence.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No evidence quotes available</p>;
  }

  return (
    <div className="space-y-1.5">
      {evidence.map((e, i) => (
        <div key={i} className="flex items-start gap-1.5 group">
          <span className="text-muted-foreground text-xs mt-0.5">•</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs leading-relaxed">
              <span className="italic">"{e.quote}"</span>
              <span className="text-muted-foreground ml-1">({e.source.replace('_', ' ')})</span>
            </p>
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={() => copyToClipboard(e.quote)}
              title="Copy quote"
            >
              <Copy className="h-3 w-3" />
            </Button>
            {onHighlight && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => onHighlight(e.quote)}
                title="Highlight in source"
              >
                <Search className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Reviewer feedback buttons
function ReviewerFeedback({ applicationId, criterion, existingFeedback }: {
  applicationId: string;
  criterion: CriterionScoreV4;
  existingFeedback?: { reviewer_decision: string } | null;
}) {
  const [decision, setDecision] = useState<string | null>(existingFeedback?.reviewer_decision || null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async (newDecision: string) => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: 'Error', description: 'You must be logged in', variant: 'destructive' });
        return;
      }

      const { error } = await supabase
        .from('scoring_review_feedback')
        .upsert({
          application_id: applicationId,
          criterion_id: criterion.criterionId,
          ai_demonstrated: criterion.passed,
          ai_confidence: criterion.confidence,
          ai_evidence: criterion.subrequirements.flatMap(s => s.evidence) as any,
          ai_verified: criterion.subrequirements.every(s => !s.flags.includes('VERIFIER_INVALIDATED')),
          criterion_text: criterion.criterionText,
          reviewer_decision: newDecision as any,
          reviewer_id: user.id,
        }, { onConflict: 'application_id,criterion_id,reviewer_id' });

      if (error) throw error;
      setDecision(newDecision);
      toast({ title: 'Feedback saved' });
    } catch (err) {
      console.error('Feedback error:', err);
      toast({ title: 'Error', description: 'Failed to save feedback', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 mt-2">
      <span className="text-xs text-muted-foreground mr-1">Review:</span>
      <Button
        variant={decision === 'agree' ? 'default' : 'outline'}
        size="sm"
        className="h-6 text-xs px-2"
        disabled={saving}
        onClick={() => submitFeedback('agree')}
      >
        <CheckCircle className="h-3 w-3 mr-1" />
        Agree
      </Button>
      <Button
        variant={decision === 'disagree' ? 'destructive' : 'outline'}
        size="sm"
        className="h-6 text-xs px-2"
        disabled={saving}
        onClick={() => submitFeedback('disagree')}
      >
        <XCircle className="h-3 w-3 mr-1" />
        Disagree
      </Button>
      <Button
        variant={decision === 'needs_review' ? 'secondary' : 'outline'}
        size="sm"
        className="h-6 text-xs px-2"
        disabled={saving}
        onClick={() => submitFeedback('needs_review')}
      >
        <AlertTriangle className="h-3 w-3 mr-1" />
        Review
      </Button>
    </div>
  );
}

// Sub-requirement detail display
function SubRequirementDisplay({ sub, onHighlight }: {
  sub: SubRequirementScore;
  onHighlight?: (quote: string) => void;
}) {
  return (
    <div className={`ml-4 border-l-2 pl-3 py-1.5 ${
      sub.demonstrated
        ? 'border-l-emerald-400'
        : 'border-l-destructive'
    }`}>
      <div className="flex items-center gap-2 mb-1">
        {sub.demonstrated ? (
          <CheckCircle className="h-3.5 w-3.5 text-emerald-600 flex-shrink-0" />
        ) : (
          <XCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
        )}
        <span className="text-xs font-medium flex-1">[{sub.id}] {sub.text}</span>
        <StatusFlag flags={sub.flags} confidence={sub.confidence} />
        <Badge variant="outline" className="text-[10px]">
          {sub.type === 'deterministic' ? 'DET' : 'AI'} · {Math.round(sub.confidence * 100)}%
        </Badge>
      </div>

      <div className="ml-5">
        <EvidenceDisplay evidence={sub.evidence} onHighlight={onHighlight} />
        {sub.missing && (
          <p className="text-xs text-destructive mt-1">Missing: {sub.missing}</p>
        )}
        {sub.verification && !sub.verification.valid && (
          <div className="text-xs text-destructive mt-1 bg-destructive/10 p-1.5 rounded">
            ⚠ Verification failed: {sub.verification.issues.join('; ')}
          </div>
        )}
      </div>
    </div>
  );
}

export {
  StatusFlag,
  EvidenceDisplay,
  ReviewerFeedback,
  SubRequirementDisplay,
};
export type {
  EvidenceQuote,
  VerifierResult,
  SubRequirementScore,
  CriterionScoreV4,
};
