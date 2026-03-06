import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface JobAlertRequest {
  email: string;
  job: {
    id: string;
    title: string;
    location: string;
    category: string;
    type: string;
    notice_no: string;
    closing_date: string;
    slug: string;
  };
  alert_id: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Send job alert function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, job, alert_id }: JobAlertRequest = await req.json();
    console.log("Sending job alert to:", email, "for job:", job.title);

    // Extract cities from location string
    const cities = job.location 
      ? job.location.split(',').map((loc, index) => {
          if (index % 2 === 0) return loc.trim(); // Every even index is a city
          return null;
        }).filter(Boolean)
      : [];

    const getDisplayType = (type: string) => {
      if (!type) return '';
      if (type.toLowerCase().includes('fixed') || type.toLowerCase().includes('term')) {
        return 'Staff - Fixed term';
      }
      if (type.toLowerCase().includes('temporary') || type.toLowerCase().includes('temp')) {
        return 'Staff - Temporary';
      }
      if (type.toLowerCase().includes('consultant')) {
        return 'Consultant';
      }
      if (type.toLowerCase().includes('intern')) {
        return 'Intern';
      }
      return type;
    };

    const jobUrl = `https://66a1e0bc-1a9e-4295-8718-83774fc48d72.sandbox.lovable.dev/jobs/${job.slug || job.id}`;
    const unsubscribeUrl = `https://66a1e0bc-1a9e-4295-8718-83774fc48d72.sandbox.lovable.dev/unsubscribe?alert_id=${alert_id}`;

    const emailResponse = await resend.emails.send({
      from: "UNIQTalent <recruitment@unicconnect.org>",
      to: [email],
      cc: ["valente@unicc.org"],
      subject: `New Job Alert: ${job.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; margin-bottom: 20px;">New Job Alert</h1>
          
          <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin-top: 0;">${job.title}</h2>
            ${job.notice_no ? `<p><strong>Notice No:</strong> ${job.notice_no}</p>` : ''}
            ${cities.length > 0 ? `<p><strong>Location:</strong> ${cities.join(', ')}</p>` : ''}
            ${job.category ? `<p><strong>Category:</strong> ${job.category}</p>` : ''}
            ${job.type ? `<p><strong>Type:</strong> ${getDisplayType(job.type)}</p>` : ''}
            ${job.closing_date ? `<p><strong>Closing Date:</strong> ${new Date(job.closing_date).toLocaleDateString()}</p>` : ''}
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${jobUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
              View Job Details
            </a>
          </div>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
          
          <div style="color: #64748b; font-size: 14px; text-align: center;">
            <p>You're receiving this email because you signed up for job alerts at UNIQTalent.</p>
            <p>
              <a href="${unsubscribeUrl}" style="color: #64748b;">Unsubscribe from this alert</a>
            </p>
          </div>
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

    console.log("Job alert email sent successfully:", emailResponse.data);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-job-alert function:", error);
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