import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface PDReminderRequest {
  requisitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId }: PDReminderRequest = await req.json();
    console.log("Processing PD reminder for requisition:", requisitionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    if (authHeader) {
      const { data: { user } } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
      userId = user?.id || null;
    }

    // Fetch requisition details with creator info
    const { data: requisition, error: reqError } = await supabase
      .from("job_requisitions")
      .select(`
        *,
        creator:created_by(id, name, email)
      `)
      .eq("id", requisitionId)
      .single();

    if (reqError || !requisition) {
      console.error("Error fetching requisition:", reqError);
      return new Response(
        JSON.stringify({ error: "Requisition not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requisition is in the right state
    if (!requisition.initial_request_approved) {
      return new Response(
        JSON.stringify({ error: "Requisition has not been approved yet" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (requisition.status !== "initial_request_approved") {
      return new Response(
        JSON.stringify({ error: "Requisition is not in initial_request_approved state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get email template from system_settings
    const { data: templateData, error: templateError } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "email_template_pd_reminder")
      .single();

    if (templateError || !templateData) {
      console.error("Error fetching email template:", templateError);
      return new Response(
        JSON.stringify({ error: "Email template not found" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const template = JSON.parse(templateData.value);

    // Prepare template variables
    const approvalDate = new Date(requisition.initial_request_approved_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    // Use the production app URL from environment or fall back to Lovable deployed URL
    const appUrl = Deno.env.get("APP_URL") || "https://unicc-hireflow.lovable.app";
    const pdLink = `${appUrl}/requisitions/${requisitionId}`;

    const variables = {
      hiringManagerName: requisition.creator?.name || "Hiring Manager",
      positionTitle: requisition.position_title || "Position",
      referenceNumber: requisition.reference_number || "N/A",
      approvalDate,
      pdLink
    };

    // Replace variables in template
    let htmlBody = template.html_body;
    let textBody = template.text_body;
    let subject = template.subject;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      htmlBody = htmlBody.replaceAll(placeholder, value);
      textBody = textBody.replaceAll(placeholder, value);
      subject = subject.replaceAll(placeholder, value);
    });

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: `${template.from_name} <${template.from_email}>`,
      to: [requisition.creator?.email || ""],
      cc: ["valente@unicc.org", "mattvalente85@gmail.com"],
      reply_to: "recruitment@unicconnect.org",
      subject: subject,
      html: htmlBody,
      text: textBody,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      return new Response(
        JSON.stringify({ 
          error: emailResponse.error.message || "Failed to send email",
          details: emailResponse.error 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse.data);

    // Log the email send
    const { error: logError } = await supabase
      .from("email_send_log")
      .insert({
        template_slug: "pd_reminder",
        recipient_email: requisition.creator?.email || "",
        recipient_name: requisition.creator?.name || "",
        subject: subject,
        variables: variables,
        sent_by: userId,
        status: "sent",
        requisition_id: requisitionId
      });

    if (logError) {
      console.error("Error logging email send:", logError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Reminder sent successfully",
        emailId: emailResponse.id 
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-pd-reminder function:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
