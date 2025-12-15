import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BATCH_SIZE = 50;

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY is not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { skillIds, forceAll = false } = await req.json();

    // Fetch skills to categorize
    let query = supabase
      .from('skill_definitions')
      .select('id, name, category, skill_type, status')
      .eq('is_active', true);

    if (skillIds && skillIds.length > 0) {
      query = query.in('id', skillIds);
    } else if (!forceAll) {
      // Only process skills that haven't been AI reviewed
      query = query.or('ai_reviewed_at.is.null,ai_review_pending.eq.true');
    }

    const { data: skills, error: fetchError } = await query;
    if (fetchError) throw fetchError;

    if (!skills || skills.length === 0) {
      return new Response(JSON.stringify({ message: 'No skills to process', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing ${skills.length} skills in batches of ${BATCH_SIZE}`);

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
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Classify these skills:\n${JSON.stringify(skillList, null, 2)}` }
            ],
            temperature: 0.2,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error: ${response.status} - ${errorText}`);
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

      } catch (batchError) {
        console.error(`Error processing batch: ${batchError}`);
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchError.message}`);
      }

      // Rate limiting delay between batches
      if (i + BATCH_SIZE < skills.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
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

    return new Response(JSON.stringify({
      message: 'Skills categorized successfully',
      totalProcessed: skills.length,
      classified: results.length,
      updated,
      errors: errors.length > 0 ? errors : undefined,
      summary: {
        byCategory: categorySummary,
        byStatus: statusSummary,
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in categorize-skills:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
