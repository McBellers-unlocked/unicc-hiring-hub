import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Recipient {
  name: string;
  email: string;
  position?: string;
}

interface BulkEmailRequest {
  recipients: Recipient[];
  subject: string;
  body: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, subject, body }: BulkEmailRequest = await req.json();

    console.log(`Sending bulk email to ${recipients.length} recipients`);
    console.log(`Subject: ${subject}`);

    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    if (!subject || !body) {
      throw new Error("Subject and body are required");
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Send emails one by one with personalization
    for (const recipient of recipients) {
      try {
        // Replace placeholders
        const personalizedBody = body
          .replace(/\{\{name\}\}/g, recipient.name || "there")
          .replace(/\{\{position\}\}/g, recipient.position || "Staff Member");

        const personalizedHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; line-height: 1.6;">
            ${personalizedBody.split('\n').map(line => line.trim() === '' ? '<br/>' : `<p style="margin: 0 0 2px 0;">${line}</p>`).join('')}
          </div>
        `;

        console.log(`Sending email to: ${recipient.email}`);

        const emailResponse = await resend.emails.send({
          from: "UNICC Talent <recruitment@unicconnect.org>",
          to: [recipient.email],
          subject: subject,
          html: personalizedHtml,
        });

        if (emailResponse.error) {
          console.error(`Error sending to ${recipient.email}:`, emailResponse.error);
          errors.push(`${recipient.email}: ${emailResponse.error.message}`);
          failureCount++;
        } else {
          console.log(`Successfully sent to ${recipient.email}`);
          successCount++;
        }
      } catch (emailError: any) {
        console.error(`Exception sending to ${recipient.email}:`, emailError);
        errors.push(`${recipient.email}: ${emailError.message}`);
        failureCount++;
      }
    }

    console.log(`Bulk email complete: ${successCount} success, ${failureCount} failures`);

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        successCount,
        failureCount,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-bulk-talent-email function:", error);
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
