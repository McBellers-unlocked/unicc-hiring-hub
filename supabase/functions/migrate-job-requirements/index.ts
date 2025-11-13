import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequirementItem {
  title: string;
  description?: string;
  weight?: number;
}

interface CompetencyItem {
  name: string;
  description?: string;
  type: 'Core' | 'Management' | 'Leadership' | 'Mandatory';
}

interface LanguageItem {
  language: string;
  level: 'Basic' | 'Working' | 'Expert';
  isEssential: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { jobId } = await req.json();

    console.log('Migrating job:', jobId);

    // Fetch job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, requirements_md, competencies, language_requirements')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error('Job not found');
    }

    // Parse using OpenAI
    const prompt = `Parse the following job posting data into structured JSON format.

REQUIREMENTS (markdown):
${job.requirements_md || 'None'}

COMPETENCIES (text):
${job.competencies || 'None'}

LANGUAGE REQUIREMENTS (text):
${job.language_requirements || 'None'}

Return a JSON object with this structure:
{
  "essentialCriteria": [{"title": "...", "description": "..."}],
  "desirableCriteria": [{"title": "...", "description": "..."}],
  "essentialEducation": [{"title": "...", "description": "..."}],
  "desirableEducation": [{"title": "..."}],
  "competencies": [{"name": "...", "description": "...", "type": "Core|Management|Leadership|Mandatory"}],
  "languages": [{"language": "...", "level": "Basic|Working|Expert", "isEssential": true|false}]
}

Extract each bullet point as a separate item. For criteria, the title should be a short summary, and description contains the full text. For education, extract degree requirements.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a job posting parser. Return only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
      }),
    });

    const openaiData = await openaiResponse.json();
    let content = openaiData.choices[0].message.content;
    
    // Strip markdown code block formatting if present
    content = content.trim();
    if (content.startsWith('```json')) {
      content = content.slice(7); // Remove ```json
    }
    if (content.startsWith('```')) {
      content = content.slice(3); // Remove ```
    }
    if (content.endsWith('```')) {
      content = content.slice(0, -3); // Remove trailing ```
    }
    
    const parsed = JSON.parse(content.trim());

    // Insert Essential Criteria
    if (parsed.essentialCriteria?.length > 0) {
      const { error } = await supabase.from('job_requirements').insert(
        parsed.essentialCriteria.map((item: RequirementItem, idx: number) => ({
          job_id: jobId,
          category: 'Essential Criteria',
          title: item.title,
          description: item.description,
          weight: item.weight || 1,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting essential criteria:', error);
    }

    // Insert Desirable Criteria
    if (parsed.desirableCriteria?.length > 0) {
      const { error } = await supabase.from('job_requirements').insert(
        parsed.desirableCriteria.map((item: RequirementItem, idx: number) => ({
          job_id: jobId,
          category: 'Desirable Criteria',
          title: item.title,
          description: item.description,
          weight: item.weight || 1,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting desirable criteria:', error);
    }

    // Insert Essential Education
    if (parsed.essentialEducation?.length > 0) {
      const { error } = await supabase.from('job_requirements').insert(
        parsed.essentialEducation.map((item: RequirementItem, idx: number) => ({
          job_id: jobId,
          category: 'Essential Education',
          title: item.title,
          description: item.description,
          weight: 1,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting essential education:', error);
    }

    // Insert Desirable Education
    if (parsed.desirableEducation?.length > 0) {
      const { error } = await supabase.from('job_requirements').insert(
        parsed.desirableEducation.map((item: RequirementItem, idx: number) => ({
          job_id: jobId,
          category: 'Desirable Education',
          title: item.title,
          description: item.description,
          weight: 1,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting desirable education:', error);
    }

    // Insert Competencies
    if (parsed.competencies?.length > 0) {
      const { error } = await supabase.from('job_competencies').insert(
        parsed.competencies.map((item: CompetencyItem, idx: number) => ({
          job_id: jobId,
          competency_type: item.type,
          competency_name: item.name,
          description: item.description,
          weight: 1,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting competencies:', error);
    }

    // Always insert Overall Assessment items
    const overallAssessmentItems = [
      {
        job_id: jobId,
        category: 'Overall Assessment',
        title: 'Overall fit to the organization',
        description: 'Holistic assessment of cultural fit, values alignment, and long-term potential within the organization',
        weight: 1,
        order_index: 0
      },
      {
        job_id: jobId,
        category: 'Overall Assessment',
        title: 'Potential',
        description: 'Assessment of growth potential and capacity to exceed role requirements',
        weight: 1,
        order_index: 1
      }
    ];

    const { error: overallError } = await supabase
      .from('job_requirements')
      .insert(overallAssessmentItems);
    
    if (overallError) console.error('Error inserting overall assessment:', overallError);

    // Insert Languages
    if (parsed.languages?.length > 0) {
      const { error } = await supabase.from('job_language_requirements').insert(
        parsed.languages.map((item: LanguageItem, idx: number) => ({
          job_id: jobId,
          language: item.language,
          level: item.level,
          is_essential: item.isEssential,
          order_index: idx,
        }))
      );
      if (error) console.error('Error inserting languages:', error);
    }

    return new Response(
      JSON.stringify({ success: true, parsed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
