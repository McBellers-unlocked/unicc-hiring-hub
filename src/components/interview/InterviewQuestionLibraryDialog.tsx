import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LibraryItem {
  id: string;
  question_text: string;
  competency_names: string[];
  requirement_titles: string[];
  estimated_minutes: number | null;
  usage_count: number;
  last_used_at: string;
}

interface Props {
  onAdd: (items: LibraryItem[]) => void;
}

export function InterviewQuestionLibraryDialog({ onAdd }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('interview_questions_library' as any)
          .select('*')
          .order('last_used_at', { ascending: false })
          .limit(500);
        if (error) throw error;
        setItems((data as any) || []);
      } catch (e: any) {
        console.error(e);
        toast({ title: 'Failed to load library', description: e?.message, variant: 'destructive' });
      } finally {
        setLoading(false);
      }
    })();
  }, [open, toast]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(i =>
      i.question_text.toLowerCase().includes(q) ||
      (i.competency_names || []).some(c => c.toLowerCase().includes(q)) ||
      (i.requirement_titles || []).some(r => r.toLowerCase().includes(q))
    );
  }, [items, search]);

  const toggle = (id: string) => {
    const n = new Set(selected);
    if (n.has(id)) n.delete(id); else n.add(id);
    setSelected(n);
  };

  const apply = () => {
    const picked = items.filter(i => selected.has(i.id));
    if (picked.length === 0) {
      toast({ title: 'Nothing selected', variant: 'destructive' });
      return;
    }
    onAdd(picked);
    toast({ title: `Added ${picked.length} question${picked.length === 1 ? '' : 's'}` });
    setOpen(false);
    setSelected(new Set());
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <BookOpen className="w-4 h-4 mr-2" />
        Question Library
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Interview Questions Library</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              placeholder="Search by question text, competency or skill…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <div className="overflow-y-auto max-h-[55vh] border rounded-md divide-y">
              {loading ? (
                <div className="p-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {items.length === 0 ? 'Library is empty. Save questions on a job to start building it.' : 'No matches.'}
                </div>
              ) : filtered.map(item => (
                <div key={item.id} className="p-3 flex gap-3">
                  <Checkbox checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} className="mt-1" />
                  <div className="flex-1 space-y-1">
                    <div className="text-sm">{item.question_text}</div>
                    <div className="flex flex-wrap gap-1">
                      {(item.competency_names || []).slice(0, 6).map(c => (
                        <Badge key={`c-${c}`} variant="secondary" className="text-xs">{c}</Badge>
                      ))}
                      {(item.requirement_titles || []).slice(0, 6).map(r => (
                        <Badge key={`r-${r}`} variant="outline" className="text-xs">{r}</Badge>
                      ))}
                      <Badge variant="outline" className="text-xs">used {item.usage_count}×</Badge>
                      {item.estimated_minutes ? <Badge variant="outline" className="text-xs">{item.estimated_minutes} min</Badge> : null}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={apply} disabled={selected.size === 0}>
              Add {selected.size > 0 ? selected.size : ''} to interview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
