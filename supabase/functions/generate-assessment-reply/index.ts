import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateReplyRequest {
  thread_message_id: string;
  email_id: string;
  slot_id: string;
  candidate_response: string;
  candidate_name: string;
  candidate_email: string;
  reply_mode: "ai" | "pre_written";
  reply_style?: string;
  reply_ai_prompt?: string;
  reply_pre_written?: string;
  original_email: {
    sender_name: string;
    sender_email: string;
    subject: string;
    body: string;
  };
}

// Process template variables in content
function processTemplateVariables(
  content: string,
  candidateName: string,
  candidateEmail: string
): string {
  if (!content) return content;
  const firstName = candidateName?.trim().split(/\s+/)[0] || candidateName || "";
  return content
    .replace(/\{\{candidate_first_name\}\}/gi, firstName)
    .replace(/\{\{candidate_name\}\}/gi, candidateName || "")
    .replace(/\{\{candidate_email\}\}/gi, candidateEmail || "");
}

const REPLY_STYLE_PROMPTS: Record<string, string> = {
  clarification: "Ask for clarification on specific points. Request more details or ask probing follow-up questions about their proposed approach.",
  new_info: "Provide new relevant information that wasn't in the original email. This could be additional context, a policy update, or new constraints they should consider.",
  push_back: "Politely push back on their response. Express concerns, raise potential issues with their approach, or suggest considering alternative perspectives.",
  escalate: "Indicate that the matter needs escalation. Mention that a senior colleague or executive has become involved and ask for urgent follow-up.",
  urgency: "Express increased urgency. Communicate that timelines have shortened or that immediate action is now required.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const payload: GenerateReplyRequest = await req.json();
    console.log("Generate reply request:", JSON.stringify(payload, null, 2));

    const {
      thread_message_id,
      email_id,
      slot_id,
      candidate_response,
      candidate_name,
      candidate_email,
      reply_mode,
      reply_style,
      reply_ai_prompt,
      reply_pre_written,
      original_email,
    } = payload;

    // Process template variables in original email body for AI context
    const processedEmailBody = processTemplateVariables(
      original_email.body,
      candidate_name,
      candidate_email
    );

    let replyContent: string;

    if (reply_mode === "pre_written" && reply_pre_written) {
      // Use pre-written reply and process template variables
      replyContent = processTemplateVariables(reply_pre_written, candidate_name, candidate_email);
      console.log("Using pre-written reply");
    } else {
      // Generate AI reply using OpenAI
      const openAIKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAIKey) {
        throw new Error("OPENAI_API_KEY not configured");
      }

      const styleInstructions = reply_style ? REPLY_STYLE_PROMPTS[reply_style] : REPLY_STYLE_PROMPTS.clarification;
      // Process template variables in custom AI prompt
      const processedAiPrompt = reply_ai_prompt 
        ? processTemplateVariables(reply_ai_prompt, candidate_name, candidate_email)
        : "";
      const customPrompt = processedAiPrompt ? `\n\nAdditional instructions: ${processedAiPrompt}` : "";

      const systemPrompt = `You are ${original_email.sender_name} (${original_email.sender_email}), responding to an email thread in a professional UN/international organization context.

Your task: Generate a realistic follow-up email reply based on the candidate's response.

Style guidance: ${styleInstructions}${customPrompt}

Important guidelines:
- Stay in character as the original sender
- Keep the response professional, concise (2-3 short paragraphs max)
- Reference specific points from the candidate's response
- Maintain the original urgency level
- Do not resolve the issue completely - leave room for the candidate to respond again
- Use professional email conventions (greeting, body, sign-off)
- Sign with your name: ${original_email.sender_name}`;

      const userPrompt = `Original email subject: ${original_email.subject}

Original email body:
${processedEmailBody}

Candidate's name: ${candidate_name}

Candidate's response:
${candidate_response}

Generate a follow-up reply email. Address the candidate by their first name if appropriate.`;

      console.log("Calling OpenAI for AI-generated reply...");
      
      const openAIResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openAIKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!openAIResponse.ok) {
        const errorText = await openAIResponse.text();
        console.error("OpenAI API error:", errorText);
        throw new Error(`OpenAI API error: ${openAIResponse.status}`);
      }

      const aiData = await openAIResponse.json();
      replyContent = aiData.choices[0]?.message?.content || "Thank you for your response. I will review and get back to you.";
      console.log("AI generated reply successfully");
    }

    // Calculate random delay for scheduling (delay is in minutes, passed from frontend)
    // The reply will be scheduled for the future
    const { data: existingThread, error: threadError } = await supabase
      .from("assessment_email_threads")
      .select("scheduled_for")
      .eq("id", thread_message_id)
      .single();

    if (threadError) {
      console.error("Error fetching thread message:", threadError);
    }

    // Insert the system reply into the email threads table
    const { data: insertedReply, error: insertError } = await supabase
      .from("assessment_email_threads")
      .insert({
        slot_id,
        original_email_id: email_id,
        parent_message_id: thread_message_id,
        sender_type: "system_reply",
        sender_name: original_email.sender_name,
        sender_email: original_email.sender_email,
        content: replyContent,
        is_read: false,
        scheduled_for: new Date().toISOString(), // Already scheduled by frontend timing
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting reply:", insertError);
      throw insertError;
    }

    console.log("Reply inserted successfully:", insertedReply.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        reply_id: insertedReply.id,
        content: replyContent 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error: any) {
    console.error("Error in generate-assessment-reply:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});
