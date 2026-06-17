import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  jobId: string;
  count?: number;
  focusCompetencyIds?: string[];
  focusRequirementIds?: string[];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }


  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.jobId) {
      return new Response(JSON.stringify({ error: 'jobId is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const count = Math.min(Math.max(body.count ?? 5, 1), 12);

    const [{ data: job }, { data: reqs }, { data: comps }] = await Promise.all([
      supabase.from('jobs').select('title, level, position_title, nature_of_position').eq('id', body.jobId).maybeSingle(),
      supabase.from('job_requirements').select('id, title, category, description').eq('job_id', body.jobId).order('category'),
      supabase.from('job_competencies').select('id, competency_name, competency_type, description').eq('job_id', body.jobId).order('competency_type'),
    ]);

    if (!job) {
      return new Response(JSON.stringify({ error: 'Job not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build bullet-level requirement list
    type ReqBullet = { id: string; reqId: string; category: string; reqTitle: string; bullet: string };
    const bullets: ReqBullet[] = [];
    for (const r of (reqs || [])) {
      if (r.category !== 'Essential Criteria' && r.category !== 'Desirable Criteria') continue;
      if (!r.description) continue;
      const lines = String(r.description).split('\n').map((l: string) => l.trim()).filter(Boolean);
      const dashes = lines.filter(l => l.startsWith('-')).map(l => l.substring(1).trim());
      const finalBullets = dashes.length > 0 ? dashes : lines;
      finalBullets.forEach((b, idx) => {
        bullets.push({ id: `${r.id}:${idx}`, reqId: r.id, category: r.category, reqTitle: r.title, bullet: b });
      });
    }

    const focusReqSet = new Set(body.focusRequirementIds || []);
    const focusCompSet = new Set(body.focusCompetencyIds || []);
    const usableBullets = focusReqSet.size > 0 ? bullets.filter(b => focusReqSet.has(b.id)) : bullets;
    const usableComps = focusCompSet.size > 0 ? (comps || []).filter((c: any) => focusCompSet.has(c.id)) : (comps || []);

    const compLines = usableComps.map((c: any, i: number) =>
      `C${i + 1}. id=${c.id} | type=${c.competency_type} | name=${c.competency_name}${c.description ? ` — ${c.description.slice(0, 200)}` : ''}`
    ).join('\n');
    const reqLines = usableBullets.map((b, i) =>
      `R${i + 1}. id=${b.id} | ${b.category} | ${b.reqTitle}: ${b.bullet.slice(0, 240)}`
    ).join('\n');

    const systemPrompt = `You are a UN/UNICC HR interview specialist generating competency-based interview questions in the STAR / behavioural format.

Output STRICT JSON: { "questions": [ { "question_text": string, "requirement_ids": string[], "competency_ids": string[], "estimated_minutes": number } ] }

Rules:
- Generate exactly ${count} questions.
- Each question must explicitly assess at least one listed competency id or requirement id (use the exact ids provided).
- Prefer behavioural ("Tell us about a time when...") and situational questions.
- Cover a balanced spread across the provided competencies and requirements; do not stack on a single one.
- Keep each question to 1-3 sentences. estimated_minutes between 3 and 6.
- Do not invent ids. Only use ids exactly as listed below.
- No preamble, no commentary, JSON only.`;

    const userPrompt = `Position: ${job.position_title || job.title} ${job.level ? `(grade ${job.level})` : ''}
${job.nature_of_position ? `Nature: ${job.nature_of_position}` : ''}

Competencies:
${compLines || '(none)'}

Requirements / skills to assess:
${reqLines || '(none)'}

Generate the JSON now.`;

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (aiRes.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limited. Please try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (aiRes.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Add credits to your workspace.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error('AI gateway error', aiRes.status, errText);
      return new Response(JSON.stringify({ error: `AI error ${aiRes.status}` }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await aiRes.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    let parsed: any = {};
    try {
      let txt = content.trim();
      if (txt.includes('```')) {
        const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (m) txt = m[1].trim();
      }
      parsed = JSON.parse(txt);
    } catch (e) {
      console.error('JSON parse failed', e, content);
      return new Response(JSON.stringify({ error: 'AI returned non-JSON response' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const validReqIds = new Set(bullets.map(b => b.id));
    const validCompIds = new Set((comps || []).map((c: any) => c.id));

    const rawList = Array.isArray(parsed.questions) ? parsed.questions : [];
    const questions = rawList.map((q: any) => ({
      question_text: String(q.question_text || '').trim(),
      requirement_ids: Array.isArray(q.requirement_ids) ? q.requirement_ids.filter((id: any) => validReqIds.has(id)) : [],
      competency_ids: Array.isArray(q.competency_ids) ? q.competency_ids.filter((id: any) => validCompIds.has(id)) : [],
      estimated_minutes: Math.min(Math.max(Number(q.estimated_minutes) || 4, 2), 10),
    })).filter((q: any) => q.question_text.length > 5);

    return new Response(JSON.stringify({ questions }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-interview-questions error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
