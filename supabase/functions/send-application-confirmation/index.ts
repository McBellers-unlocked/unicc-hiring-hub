import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ApplicationConfirmationRequest {
  candidateName: string;
  candidateEmail: string;
  jobTitle: string;
  jobNoticeNo: string;
  closingDate: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, jobTitle, jobNoticeNo, closingDate }: ApplicationConfirmationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "UNICC Recruitment <recruitment@unicc.org>",
      to: [candidateEmail],
      subject: `Application Confirmation - ${jobTitle} (${jobNoticeNo})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #0066cc; padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">UNICC</h1>
            <p style="color: white; margin: 5px 0 0 0;">United Nations International Computing Centre</p>
          </div>
          
          <div style="padding: 30px 20px;">
            <h2 style="color: #333;">Application Received</h2>
            
            <p>Dear ${candidateName},</p>
            
            <p>Thank you for your interest in joining UNICC. We have successfully received your application for the following position:</p>
            
            <div style="background-color: #f8f9fa; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0;">
              <strong>Position:</strong> ${jobTitle}<br>
              <strong>Notice No:</strong> ${jobNoticeNo}<br>
              <strong>Closing Date:</strong> ${closingDate}
            </div>
            
            <p>Your application will be reviewed by our recruitment team. We will contact you if your profile matches our requirements and you are selected for the next stage of the selection process.</p>
            
            <p>Please note that due to the high volume of applications we receive, we are only able to contact candidates who are selected for further consideration.</p>
            
            <p>Thank you for your interest in UNICC and we wish you all the best with your application.</p>
            
            <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
              <p style="color: #666; font-size: 14px;">
                Best regards,<br>
                UNICC Recruitment Team<br>
                <a href="https://www.unicc.org" style="color: #0066cc;">www.unicc.org</a>
              </p>
            </div>
          </div>
        </div>
      `,
    });

    console.log("Application confirmation email sent successfully:", emailResponse);

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