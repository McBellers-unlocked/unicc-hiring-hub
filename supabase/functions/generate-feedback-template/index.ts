import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GenerateFeedbackTemplateRequest {
  jobId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId }: GenerateFeedbackTemplateRequest = await req.json();

    console.log("Generating feedback template for job:", jobId);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('title')
      .eq('id', jobId)
      .single();

    if (jobError) throw jobError;

    // Fetch all interview questions for this job
    const { data: questions, error: questionsError } = await supabase
      .from('job_interview_questions')
      .select('*')
      .eq('job_id', jobId)
      .order('order_index');

    if (questionsError) throw questionsError;

    if (!questions || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "No interview questions found for this job" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Group questions by category
    const groupedQuestions = questions.reduce((acc: Record<string, any[]>, question) => {
      if (!acc[question.question_category]) {
        acc[question.question_category] = [];
      }
      acc[question.question_category].push(question);
      return acc;
    }, {});

    // Build feedback template sections
    const sections = Object.entries(groupedQuestions).map(([category, categoryQuestions]) => ({
      title: category,
      questions: categoryQuestions.map((q: any) => ({
        id: `question_${q.id}`,
        label: q.question_text,
        type: 'rating',
        required: true,
        options: {
          max: 5,
          min: 1,
          competency: q.competency
        }
      }))
    }));

    // Add overall recommendation section
    sections.push({
      title: "Overall Assessment",
      questions: [
        {
          id: "overall_score",
          label: "Overall Performance Score",
          type: "rating",
          required: true,
          options: {
            max: 5,
            min: 1
          }
        },
        {
          id: "recommendation",
          label: "Recommendation",
          type: "select",
          required: true,
          options: {
            choices: [
              "Highly Recommend",
              "Recommend",
              "Recommend with Reservations",
              "Do Not Recommend"
            ]
          }
        },
        {
          id: "comments",
          label: "Additional Comments",
          type: "textarea",
          required: false,
          options: {}
        }
      ]
    });

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
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
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
        {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

  } catch (error: any) {
    console.error("Error in generate-feedback-template function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
