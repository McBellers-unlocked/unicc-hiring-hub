import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { jobId } = await req.json();
    console.log("Generating feedback template for job:", jobId);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('title')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Fetch competencies
    const { data: competencies, error: competenciesError } = await supabase
      .from('job_competencies')
      .select('*')
      .eq('job_id', jobId)
      .order('competency_type, order_index');

    if (competenciesError) throw competenciesError;

    // Fetch requirements
    const { data: requirements, error: requirementsError } = await supabase
      .from('job_requirements')
      .select('*')
      .eq('job_id', jobId)
      .order('category, order_index');

    if (requirementsError) throw requirementsError;

    // Fetch interview questions
    const { data: questions, error: questionsError } = await supabase
      .from('job_interview_questions')
      .select('*')
      .eq('job_id', jobId)
      .order('order_index');

    if (questionsError) throw questionsError;

    // Helper function to parse bullet points from description
    const parseBulletPoints = (description: string): string[] => {
      if (!description) return [];
      return description
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.startsWith('- ') || line.startsWith('• '))
        .map(line => line.replace(/^[-•]\s*/, '').trim())
        .filter(line => line.length > 0);
    };

    // Helper function to get linked questions for a criterion
    const getLinkedQuestions = (requirementId?: string, competencyId?: string) => {
      return questions
        ?.filter(q => 
          (requirementId && q.requirement_id === requirementId) ||
          (competencyId && q.competency_id === competencyId)
        )
        .map(q => q.question_text) || [];
    };

    // Build sections
    const sections = [];

    // Section 1: COMPETENCIES AND SOFT-SKILLS (40% weight)
    if (competencies && competencies.length > 0) {
      const competencyCriteria = competencies.map(comp => ({
        id: comp.id,
        name: comp.competency_name,
        description: comp.description || '',
        weight: comp.weight || 1,
        is_essential: comp.competency_type === 'Mandatory' || comp.competency_type === 'Core',
        linked_questions: getLinkedQuestions(undefined, comp.id)
      }));

      sections.push({
        title: "COMPETENCIES AND SOFT-SKILLS",
        weight: 40,
        criteria: competencyCriteria
      });
    }

    // Section 2: ESSENTIAL CRITERIA (40% weight) - Only Essential Experience, not Education
    const essentialExperienceReqs = requirements?.filter(r => 
      r.category === 'Essential Criteria'
    ) || [];

    if (essentialExperienceReqs.length > 0) {
      const essentialCriteria: any[] = [];
      
      essentialExperienceReqs.forEach(req => {
        const bullets = parseBulletPoints(req.description);
        if (bullets.length > 0) {
          // Create a criterion for each bullet point
          bullets.forEach((bullet, index) => {
            essentialCriteria.push({
              id: `${req.id}-${index}`,
              name: bullet,
              description: '',
              weight: 1,
              is_essential: true,
              linked_questions: getLinkedQuestions(req.id)
            });
          });
        } else if (req.title) {
          // Fallback: use title if no bullets found
          essentialCriteria.push({
            id: req.id,
            name: req.title,
            description: req.description || '',
            weight: req.weight || 1,
            is_essential: true,
            linked_questions: getLinkedQuestions(req.id)
          });
        }
      });

      if (essentialCriteria.length > 0) {
        sections.push({
          title: "ESSENTIAL CRITERIA",
          weight: 40,
          criteria: essentialCriteria
        });
      }
    }

    // Section 3: OVERALL FIT (20% weight)
    const overallAssessment = requirements?.filter(r => 
      r.category === 'Overall Assessment'
    ) || [];

    if (overallAssessment.length > 0) {
      const overallCriteria = overallAssessment.map(req => ({
        id: req.id,
        name: req.title,
        description: req.description || 'Holistic assessment of cultural fit, values alignment, and long-term potential',
        weight: req.weight || 1,
        is_essential: true,
        linked_questions: []
      }));

      sections.push({
        title: "OVERALL FIT",
        weight: 20,
        criteria: overallCriteria
      });
    }

    if (sections.length === 0) {
      return new Response(
        JSON.stringify({ error: "No competencies or requirements found for this job" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const templateName = `${job.title} - Interview Feedback`;

    // Check if template already exists for this job
    const { data: existingTemplate } = await supabase
      .from('feedback_form_templates')
      .select('id')
      .eq('job_id', jobId)
      .eq('auto_generated', true)
      .maybeSingle();

    if (existingTemplate) {
      // Update existing template
      const { error: updateError } = await supabase
        .from('feedback_form_templates')
        .update({
          name: templateName,
          sections: sections,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id);

      if (updateError) throw updateError;

      console.log("Updated existing feedback template:", existingTemplate.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Feedback template updated successfully",
          templateId: existingTemplate.id
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } else {
      // Create new template
      const { data: newTemplate, error: insertError } = await supabase
        .from('feedback_form_templates')
        .insert({
          name: templateName,
          sections: sections,
          job_id: jobId,
          auto_generated: true
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log("Created new feedback template:", newTemplate.id);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Feedback template created successfully",
          templateId: newTemplate.id
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

  } catch (error: any) {
    console.error("Error in generate-feedback-template function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});