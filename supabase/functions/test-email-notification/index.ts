import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  console.log("Received test email request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Sending test email to verify domain setup");

    const emailResponse = await resend.emails.send({
      from: "UNICC Jobs <recruitment@unicconnect.org>",
      to: ["valente@unicc.org"],
      subject: "Test Email - Domain Verification Check",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">Test Email - Domain Verification</h1>
          
          <p>This is a test email to verify that the unicc.org domain is properly configured with Resend.</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="margin-top: 0;">Domain Test</h2>
            <p><strong>From:</strong> UNICC Jobs &lt;noreply@unicc.org&gt;</p>
            <p><strong>To:</strong> valente@unicc.org</p>
            <p><strong>Status:</strong> Testing domain verification</p>
          </div>
          
          <p>If you receive this email, the domain verification was successful!</p>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This is a test email from the UNICC Job Management System.
          </p>
        </div>
      `,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({
      success: true,
      message: "Test email sent successfully",
      emailResponse
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in test-email-notification function:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);