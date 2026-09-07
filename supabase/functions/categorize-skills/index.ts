import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 25;

interface SkillClassification {
  id: string;
  name: string;
  category: string;
  status: string;
  skill_type: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { skillIds, forceAll = false, limit = 100 } = await req.json();

    // First, count total unprocessed skills
    let countQuery = supabase
      .from('skill_definitions')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    if (!forceAll) {
      countQuery = countQuery.is('ai_suggested_category', null);
    }

    const { count: totalUnprocessed } = await countQuery;

    // Fetch skills to categorize (with limit)
    let query = supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, status')
      .eq('is_active', true);

    if (skillIds && skillIds.length > 0) {
      query = query.in('id', skillIds);
    } else if (!forceAll) {
      query = query.is('ai_suggested_category', null);
    }

    query = query.limit(limit);

    const { data: skills, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ 
        message: 'No skills to process', 
        processed: 0,
        remaining: 0,
        hasMore: false,
        totalSkills: totalUnprocessed || 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${skills.length} skills in batches of ${BATCH_SIZE} (${totalUnprocessed} total unprocessed)`);

    const systemPrompt = `You are a skills taxonomy expert for IT and organizational management. Classify each skill into exactly one category and assign a lifecycle status.

CATEGORIES (choose exactly one):
- Behavioral: Soft skills - interpersonal, communication, teamwork, leadership, resilience, emotional intelligence, conflict resolution, mentoring, coaching, negotiation, adaptability, time management, problem-solving (non-technical), critical thinking, creativity
- Technical & Domain: Technologies, programming languages, frameworks, platforms, cloud services, security tools, databases, AI/ML, DevOps tools, networking, infrastructure, domain-specific knowledge (finance, healthcare IT, etc.)
- Methods & Processes: Methodologies and frameworks - ITIL, Agile, Scrum, Kanban, Lean, Six Sigma, project management, service management, change management, risk management, quality assurance processes, DevOps practices (as methodology)
- Certifications & Licenses: Externally validated credentials with exams - CISSP, CISM, PMP, CCNA, CCNP, AWS certifications, Azure certifications, ITIL Foundation, CompTIA, TOGAF, etc.

SKILL TYPE:
- proficiency: Skills measured on a 1-5 scale (most skills)
- credential: Binary yes/no skills (certifications, licenses)

STATUS (based on 2024 IT industry trends):
- new: Very recent skills (introduced last 1-2 years) - e.g., specific AI tools, newest cloud services
- emerging: Growing rapidly, becoming mainstream - e.g., FinOps, Platform Engineering, AI/ML adoption
- established: Widely adopted and expected - e.g., AWS, Azure, Python, Agile, ITIL
- legacy: Still used but declining - e.g., COBOL, older frameworks, deprecated tools
- retired: Obsolete, rarely needed - e.g., very old technologies no longer in use

Return a JSON array with this exact structure:
[{"id": "uuid", "name": "skill name", "category": "Category Name", "status": "status", "skill_type": "proficiency|credential"}]

Be consistent: All certifications should be category "Certifications & Licenses" and skill_type "credential".`;

    const results: SkillClassification[] = [];
    let errors: string[] = [];

    // Process in batches
    for (let i = 0; i < skills.length; i += BATCH_SIZE) {
      const batch = skills.slice(i, i + BATCH_SIZE);
      const skillList = batch.map(s => ({ id: s.id, name: s.name, current_category: s.category }));

      console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(skills.length / BATCH_SIZE)}`);

      try {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Classify these skills:\n${JSON.stringify(skillList, null, 2)}` }
            ],
          }),
        });

        if (response.status === 429) {
          console.error('Rate limited by Lovable AI');
          return new Response(JSON.stringify({ 
            error: 'Rate limited - please wait and try again',
            retryAfter: 10 
          }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (response.status === 402) {
          console.error('Payment required for Lovable AI');
          return new Response(JSON.stringify({ 
            error: 'Payment required - please add credits to your workspace' 
          }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Lovable AI error: ${response.status} - ${errorText}`);
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: API error ${response.status}`);
          continue;
        }

        const data = await response.json();
        const content = data.choices[0]?.message?.content;

        if (!content) {
          errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: No content in response`);
          continue;
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonContent = content;
        if (content.includes('```')) {
          const match = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          jsonContent = match ? match[1].trim() : content;
        }

        const classifications: SkillClassification[] = JSON.parse(jsonContent);
        results.push(...classifications);

      } catch (batchError: any) {
        console.error(`Error processing batch: ${batchError}`);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`);
      }
    }

    console.log(`Classified ${results.length} skills, updating database...`);

    // Update skills with AI suggestions (pending review)
    let updated = 0;
    for (const classification of results) {
      const { error: updateError } = await supabase
        .from('skill_definitions')
        .update({
          ai_suggested_category: classification.category,
          ai_suggested_status: classification.status,
          ai_review_pending: true,
        })
        .eq('id', classification.id);

      if (updateError) {
        console.error(`Error updating skill ${classification.id}: ${updateError.message}`);
      } else {
        updated++;
      }
    }

    // Generate summary
    const categorySummary = results.reduce((acc, r) => {
      acc[r.category] = (acc[r.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusSummary = results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const remaining = Math.max(0, (totalUnprocessed || 0) - results.length);

    return new Response(JSON.stringify({
      message: 'Skills categorized successfully',
      processed: results.length,
      updated,
      remaining,
      hasMore: remaining > 0,
      totalSkills: totalUnprocessed || 0,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        byCategory: categorySummary,
        byStatus: statusSummary,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in categorize-skills:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
