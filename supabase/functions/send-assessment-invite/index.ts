import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  slotId: string;
  candidateName: string;
  candidateEmail: string;
  assessmentTitle: string;
  scheduledStart: string;
  accessToken: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateName, candidateEmail, assessmentTitle, scheduledStart, accessToken }: InviteRequest = await req.json();

    console.log(`Sending assessment invite to ${candidateEmail} for ${assessmentTitle}`);

    const scheduledDate = new Date(scheduledStart);
    const formattedDate = scheduledDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedTime = scheduledDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Use production URL or fallback
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://unicconnect.lovable.app";
    const assessmentLink = `${baseUrl}/assessment/${accessToken}`;

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Written Assessment Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" alt="UNICC Logo" style="height: 60px;">
  </div>
  
  <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Written Assessment Invitation</h1>
  
  <p>Dear ${candidateName},</p>
  
  <p>You have been invited to complete a written assessment as part of your application process at UNICC.</p>
  
  <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0;">
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">${assessmentTitle}</h2>
    <p style="margin: 10px 0;"><strong>Scheduled Date:</strong> ${formattedDate}</p>
    <p style="margin: 10px 0;"><strong>Scheduled Time:</strong> ${formattedTime}</p>
  </div>
  
  <h3 style="color: #2d3748;">Important Instructions:</h3>
  <ul style="padding-left: 20px;">
    <li>Please ensure you have a stable internet connection</li>
    <li>Find a quiet environment where you won't be interrupted</li>
    <li>Once you start, the timer cannot be paused</li>
    <li>Your responses will be auto-saved every 30 seconds</li>
    <li>You may submit early if you complete before the time limit</li>
  </ul>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${assessmentLink}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">Access Assessment</a>
  </div>
  
  <p style="font-size: 14px; color: #718096;">
    <strong>Note:</strong> This link is unique to you. Please do not share it with others.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  
  <p style="font-size: 14px; color: #718096;">
    If you have any questions or technical difficulties, please contact the HR team.
  </p>
  
  <p style="font-size: 14px; color: #718096;">
    Best regards,<br>
    UNICC Human Resources
  </p>
</body>
</html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "UNICC Recruitment <recruitment@unicconnect.org>",
        to: [candidateEmail],
        subject: `Written Assessment Invitation: ${assessmentTitle}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await res.json();
    console.log("Email sent successfully:", data);

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending assessment invite:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
