import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface GeneratedQuestion {
  question_text: string;
  requirement_ids: string[];
  competency_ids: string[];
  estimated_minutes: number;
}

interface Props {
  jobId: string;
  disabled?: boolean;
  disabledReason?: string;
  onAdd: (questions: GeneratedQuestion[]) => void;
}

export function AIGenerateInterviewQuestions({ jobId, disabled, disabledReason, onAdd }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeneratedQuestion[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const generate = async () => {
    setLoading(true);
    setResults([]);
    setSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke('generate-interview-questions', {
        body: { jobId, count },
      });
      if (error) throw error;
      const qs = (data?.questions || []) as GeneratedQuestion[];
      if (qs.length === 0) {
        toast({ title: 'No suggestions returned', description: 'Try again or adjust requirements/competencies.', variant: 'destructive' });
      }
      setResults(qs);
      setSelected(new Set(qs.map((_, i) => i)));
    } catch (e: any) {
      console.error(e);
      toast({ title: 'Generation failed', description: e?.message || 'AI generation failed', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    const picked = results.filter((_, i) => selected.has(i));
    if (picked.length === 0) {
      toast({ title: 'Nothing selected', variant: 'destructive' });
      return;
    }
    onAdd(picked);
    toast({ title: `Added ${picked.length} question${picked.length === 1 ? '' : 's'}` });
    setOpen(false);
    setResults([]);
  };

  const toggle = (i: number) => {
    const n = new Set(selected);
    if (n.has(i)) n.delete(i); else n.add(i);
    setSelected(n);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? disabledReason : 'Generate questions with AI'}
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Generate with AI
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Generate interview questions with AI</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-end gap-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">Number of questions</label>
                <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {[3, 5, 8, 10].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={generate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                {results.length > 0 ? 'Regenerate' : 'Generate'}
              </Button>
            </div>

            {results.length > 0 && (
              <div className="overflow-y-auto max-h-[50vh] border rounded-md divide-y">
                {results.map((q, i) => (
                  <div key={i} className="p-3 flex gap-3">
                    <Checkbox checked={selected.has(i)} onCheckedChange={() => toggle(i)} className="mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="text-sm">{q.question_text}</div>
                      <div className="flex flex-wrap gap-1">
                        {q.competency_ids.map((id) => <Badge key={id} variant="secondary" className="text-xs">Competency</Badge>)}
                        {q.requirement_ids.map((id) => <Badge key={id} variant="outline" className="text-xs">Skill</Badge>)}
                        <Badge variant="outline" className="text-xs">{q.estimated_minutes} min</Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={apply} disabled={results.length === 0 || selected.size === 0}>
              Add {selected.size > 0 ? selected.size : ''} to interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
