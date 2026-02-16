import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OssNotifyRequest {
  staffName: string;
  staffEmail: string;
  skillName: string;
  skillCategory: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { staffName, staffEmail, skillName, skillCategory, userId }: OssNotifyRequest = await req.json();

    console.log(`Sending OSS skill notification for ${staffName} - ${skillName}`);

    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://staging.unicconnect.org";
    const profileLink = `${baseUrl}/candidate-profile/${userId}`;
    const dateAdded = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Open Source Skill Added</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <img src="https://staging.unicconnect.org/assets/unicc_logo.jpg" alt="UNICC Logo" style="height: 60px;">
  </div>
  
  <h1 style="color: #1a365d; font-size: 24px; margin-bottom: 20px;">Open Source Skill Added</h1>
  
  <p>Dear OSPO Team,</p>
  
  <p><strong>${staffName}</strong> (${staffEmail}) has added the open source skill <strong>${skillName}</strong> (${skillCategory}) to their profile.</p>
  
  <div style="background-color: #f7fafc; border-left: 4px solid #3182ce; padding: 20px; margin: 20px 0;">
    <h2 style="color: #2d3748; font-size: 18px; margin-top: 0;">Skill Details</h2>
    <p style="margin: 10px 0;"><strong>Skill:</strong> ${skillName}</p>
    <p style="margin: 10px 0;"><strong>Category:</strong> ${skillCategory}</p>
    <p style="margin: 10px 0;"><strong>Staff Member:</strong> ${staffName}</p>
    <p style="margin: 10px 0;"><strong>Date Added:</strong> ${dateAdded}</p>
  </div>
  
  <div style="text-align: center; margin: 30px 0;">
    <a href="${profileLink}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold;">View Profile</a>
  </div>
  
  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
  
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
        from: "UNICC Talent <recruitment@unicconnect.org>",
        to: ["ospo@unicc.org"],
        cc: ["martinezm@unicc.org", "bennette@unicc.org"],
        subject: `OSS Skill Added: ${skillName} — ${staffName}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await res.json();
    console.log("OSS notification sent successfully:", data);

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending OSS notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
