import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Attachment {
  filename: string;
  text: string;
}

interface RequestBody {
  positionTitle: string;
  natureOfPosition?: string;
  gradeLevel?: string;
  dutyStation?: string;
  unitSectionDivision?: string;
  objectivesOfProgramme?: string;
  attachments?: Attachment[];
}

const MAX_PER_FILE = 15000;
const MAX_TOTAL_CONTEXT = 40000;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
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
    if (!body.positionTitle || body.positionTitle.trim().length < 2) {
      return new Response(JSON.stringify({ error: 'positionTitle is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Build attachment context from pre-extracted text
    let attachmentContext = '';
    if (Array.isArray(body.attachments) && body.attachments.length > 0) {
      const parts: string[] = [];
      let total = 0;
      for (const att of body.attachments) {
        const text = (att.text || '').trim();
        if (!text) continue;
        const truncated = text.slice(0, MAX_PER_FILE);
        const block = `--- Attached JD: ${att.filename} ---\n${truncated}\n`;
        if (total + block.length > MAX_TOTAL_CONTEXT) break;
        parts.push(block);
        total += block.length;
      }
      attachmentContext = parts.join('\n');
    }

    const ctx: string[] = [
      `Position Title: ${body.positionTitle}`,
    ];
    if (body.natureOfPosition) ctx.push(`Nature of Position: ${body.natureOfPosition}`);
    if (body.gradeLevel) ctx.push(`Grade/Level: ${body.gradeLevel}`);
    if (body.dutyStation) ctx.push(`Duty Station: ${body.dutyStation}`);
    if (body.unitSectionDivision) ctx.push(`Unit/Section/Division: ${body.unitSectionDivision}`);
    if (body.objectivesOfProgramme) ctx.push(`Programme Objectives: ${body.objectivesOfProgramme}`);

    const systemPrompt = `You are an HR specialist drafting UN/UNICC position descriptions. Write in a professional UN tone, third person, present tense. Be specific and concise.

Output STRICT JSON with exactly two keys:
- "purpose_of_position": 2-4 sentences explaining the context and main purpose of the position.
- "main_duties_responsibilities": Markdown text with a bulleted list of 6-10 duties. Structure each bullet to answer WHAT (active verb), WHY (purpose and scope), HOW (process and tasks). Use a single sentence or two per bullet.

Rules:
- Ground content in any attached job descriptions when provided; otherwise infer from the position title, nature, and grade.
- Do not invent specific project, client, donor, or person names.
- Where a supervisor reference is needed, use the literal placeholder "[SUPERVISOR TITLE]".
- Do not include headings, preambles, or commentary outside the JSON.`;

    const userPrompt = `Context:\n${ctx.join('\n')}\n\n${attachmentContext ? `Reference job descriptions:\n${attachmentContext}\n\n` : ''}Generate the purpose_of_position and main_duties_responsibilities JSON now.`;

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
    let parsed: { purpose_of_position?: string; main_duties_responsibilities?: string } = {};
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

    return new Response(JSON.stringify({
      purpose_of_position: parsed.purpose_of_position || '',
      main_duties_responsibilities: parsed.main_duties_responsibilities || '',
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-position-description error', e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
