import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
  availableFrom: string;
  availableUntil: string;
  timeLimitMinutes: number;
  accessToken: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth guard: require authenticated HR staff
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { candidateName, candidateEmail, assessmentTitle, availableFrom, availableUntil, timeLimitMinutes, accessToken }: InviteRequest = await req.json();

    console.log(`Sending assessment invite to ${candidateEmail} for ${assessmentTitle}`);

    const availableFromDate = new Date(availableFrom);
    const availableUntilDate = new Date(availableUntil);
    
    const formattedOpenDate = availableFromDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedOpenTime = availableFromDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
    
    const formattedCloseDate = availableUntilDate.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const formattedCloseTime = availableUntilDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    // Calculate hours difference for display
    const hoursWindow = Math.round((availableUntilDate.getTime() - availableFromDate.getTime()) / (1000 * 60 * 60));

    // Use production URL or fallback
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://staging.unicconnect.org";
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
    <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" alt="UNIQTalent Logo" style="height: 60px;">
  </div>
  
  <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Written Assessment Invitation</h1>
  
  <p>Dear ${candidateName},</p>
  
  <p>You have been invited to complete a written assessment as part of your application process.</p>
  
  <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0;">
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">${assessmentTitle}</h2>
    <p style="margin: 10px 0;"><strong>Assessment Opens:</strong> ${formattedOpenDate} at ${formattedOpenTime}</p>
    <p style="margin: 10px 0;"><strong>Must Start By:</strong> ${formattedCloseDate} at ${formattedCloseTime}</p>
    <p style="margin: 10px 0;"><strong>Time to Complete:</strong> ${timeLimitMinutes} minutes (once started)</p>
  </div>
  
  <div style="background-color: #fffbeb; border: 1px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 8px;">
    <h3 style="color: #92400e; font-size: 16px; margin-top: 0;">⚠️ Important - Two-Stage Timing:</h3>
    <ol style="padding-left: 20px; margin-bottom: 0; color: #78350f;">
      <li style="margin-bottom: 8px;">The assessment will become available at <strong>${formattedOpenTime} on ${formattedOpenDate}</strong></li>
      <li style="margin-bottom: 8px;">You have <strong>${hoursWindow} hours</strong> from that time to start the assessment</li>
      <li style="margin-bottom: 8px;">Once you click "Start", you will have <strong>${timeLimitMinutes} minutes</strong> to complete it</li>
      <li style="margin-bottom: 0;">The assessment <strong>must be completed in one sitting</strong> - you cannot pause or come back later</li>
    </ol>
  </div>
  
  <h3 style="color: #2d3748;">Before You Begin:</h3>
  <ul style="padding-left: 20px;">
    <li>Ensure you have a stable internet connection</li>
    <li>Find a quiet environment where you won't be interrupted</li>
    <li>Make sure you have ${timeLimitMinutes} uninterrupted minutes available</li>
    <li>The assessment runs in fullscreen mode</li>
    <li>Your responses will be auto-saved every 30 seconds</li>
    <li>You may submit early if you complete before the time limit</li>
  </ul>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${assessmentLink}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">Access Assessment</a>
  </div>
  
  <p style="font-size: 14px; color: #718096;">
    <strong>Note:</strong> This link is unique to you. Please do not share it with others. You can use the link to check when the assessment opens and to start when ready.
  </p>
  
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  
  <p style="font-size: 14px; color: #718096;">
    If you have any questions or technical difficulties, please contact the HR team.
  </p>
  
  <p style="font-size: 14px; color: #718096;">
    Best regards,<br>
    UNIQTalent Human Resources
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
        from: "UNIQTalent <recruitment@unicconnect.org>",
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
