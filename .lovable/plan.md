

## Switch AI Model to `openai/gpt-5` for Faster Scoring

### Current State
- Pipeline v4.0 is **working correctly** — scores are being saved (3/8 passed, 4/8 passed, etc.)
- Currently using `google/gemini-3-flash-preview`
- Each candidate takes ~25-30 seconds due to multiple sequential LLM calls (decomposer + evaluator per criterion + verifier)
- There are also `recombine_logic` parser warnings for parenthesized tokens like `(S2` — the fallback works but is suboptimal

### Change
One-line change in `supabase/functions/score-application/index.ts`:

```typescript
// Line 15: change from
const MODEL = 'google/gemini-3-flash-preview';
// to
const MODEL = 'openai/gpt-5';
```

`openai/gpt-5` is generally faster at structured output / tool calling and may reduce per-candidate scoring time. It is more expensive per token but the payloads are small.

### Bonus Fix: Recombine Logic Parser
The logs show repeated warnings like `Invalid token in recombine_logic: "(S2"`. The tokenizer is splitting on whitespace but not handling parentheses attached to identifiers (e.g., `(S1 AND S2)` tokenizes as `["(S1", "AND", "S2)"]`). A small fix to split parentheses into separate tokens would eliminate these warnings and enable proper `OR` / grouping support.

### Files to Modify
| File | Change |
|---|---|
| `supabase/functions/score-application/index.ts` | Change MODEL constant to `openai/gpt-5`; fix recombine_logic tokenizer to handle parentheses |

