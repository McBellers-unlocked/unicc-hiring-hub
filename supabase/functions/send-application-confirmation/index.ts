import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@4.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ApplicationConfirmationRequest {
  candidateEmail: string;
  candidateFirstName: string;
  positionTitle: string;
  applicationId: string;
  jobId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateEmail, candidateFirstName, positionTitle, applicationId, jobId }: ApplicationConfirmationRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const candidatePortalLink = "https://staging.unicconnect.org/my-applications";

    const emailResponse = await resend.emails.send({
      from: "UNICC Recruitment <recruitment@unicconnect.org>",
      to: [candidateEmail],
      subject: `Thank You for Applying to ${positionTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" 
               alt="UNICC Logo" 
               style="max-width: 200px; margin-bottom: 20px;" />
          
          <h1 style="color: #0066cc;">Thank You for Applying</h1>
          
          <p>Hi ${candidateFirstName},</p>
          
          <p>Thank you for your interest in the <strong>${positionTitle}</strong> position at UNICC. We're happy to confirm that we've received your application.</p>
          
          <p>Our team will now review your materials carefully. If your profile aligns with what we're looking for, we'll be in touch about the next steps in the selection process. Either way, you'll hear from us as soon as we have an update.</p>
          
          <p>In the meantime, you can log into your candidate portal anytime to view the status of your application:</p>
          
          <a href="${candidatePortalLink}" 
             style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px;">
            View My Applications →
          </a>
          
          <p>Thank you again for taking the time to apply – we appreciate it.</p>
          
          <p style="margin-top: 30px; color: #333;">
            Wishing you all the best,<br><br>
            <strong>UNICC Talent Acquisition Team</strong>
          </p>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from the UNICC Recruitment System.
          </p>
        </div>
      `,
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

    console.log("Application confirmation email sent successfully:", emailResponse.data);

    // Log the email send event
    await supabase.from("email_send_log").insert({
      application_id: applicationId,
      recipient_email: candidateEmail,
      recipient_name: candidateFirstName,
      subject: `Thank You for Applying to ${positionTitle}`,
      template_slug: "application_confirmation",
      status: "sent",
      sent_at: new Date().toISOString(),
      variables: {
        application_id: applicationId,
        job_id: jobId,
        position_title: positionTitle,
        candidate_first_name: candidateFirstName,
      },
    });

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending application confirmation email:", error);
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