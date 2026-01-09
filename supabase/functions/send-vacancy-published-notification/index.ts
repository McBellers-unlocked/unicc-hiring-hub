import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VacancyPublishedRequest {
  jobId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received vacancy published notification request");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId }: VacancyPublishedRequest = await req.json();

    if (!jobId) {
      throw new Error("Job ID is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("id, title, slug, closing_date, org_unit, grade, location, type")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message || "Job not found"}`);
    }

    // Find linked requisition and hiring manager
    const { data: requisition, error: reqError } = await supabase
      .from("job_requisitions")
      .select("id, reference_number, created_by, users!job_requisitions_created_by_fkey(name, email)")
      .eq("converted_to_job_id", jobId)
      .single();

    if (reqError || !requisition) {
      console.log("No linked requisition found for job:", jobId);
      return new Response(
        JSON.stringify({ success: false, message: "No linked requisition found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const hiringManager = requisition.users as { name: string; email: string } | null;
    if (!hiringManager?.email) {
      console.log("No hiring manager email found for requisition:", requisition.id);
      return new Response(
        JSON.stringify({ success: false, message: "No hiring manager email found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Format dates
    const publicationDate = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const closingDate = job.closing_date
      ? new Date(job.closing_date).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "To be confirmed";

    // Build job URL
    const siteUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://staging.unicconnect.org";
    const jobUrl = `${siteUrl}/jobs/${job.slug || job.id}`;

    // Format location
    let locationDisplay = "Remote";
    if (job.location) {
      try {
        const locations = JSON.parse(job.location);
        locationDisplay = Array.isArray(locations) ? locations.join(", ") : job.location;
      } catch {
        locationDisplay = job.location;
      }
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "UNICC Recruitment <recruitment@unicconnect.org>",
      to: [hiringManager.email],
      subject: `Your Vacancy is Now Live: ${job.title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f8fafc;">
          <!-- Header -->
          <div style="background-color: #0066cc; padding: 24px; text-align: center;">
            <img src="https://staging.unicconnect.org/email-assets/unicc_logo.jpg" alt="UNICC" style="height: 50px;" />
          </div>
          
          <!-- Main Content -->
          <div style="padding: 32px 24px; background-color: #ffffff;">
            <h1 style="color: #1a1a1a; font-size: 24px; margin: 0 0 16px 0; text-align: center;">
              🎉 Your Vacancy is Now Live!
            </h1>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Dear ${hiringManager.name || "Hiring Manager"},
            </p>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              Great news! Your vacancy has been published and is now accepting applications.
            </p>
            
            <!-- Success Banner -->
            <div style="background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <div style="display: flex; align-items: center;">
                <span style="color: #10b981; font-size: 20px; margin-right: 12px;">✓</span>
                <div>
                  <div style="color: #065f46; font-weight: 600;">Vacancy Published</div>
                  <div style="color: #047857; font-size: 14px;">Published on ${publicationDate}</div>
                </div>
              </div>
            </div>
            
            <!-- Position Details -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h2 style="color: #1a1a1a; font-size: 18px; margin: 0 0 16px 0;">
                📋 ${job.title}
              </h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Grade:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${job.grade || "To be confirmed"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Location:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${locationDisplay}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Type:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 500;">${job.type || "Staff"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Closing Date:</td>
                  <td style="padding: 8px 0; color: #1a1a1a; font-size: 14px; font-weight: 600;">${closingDate}</td>
                </tr>
              </table>
            </div>
            
            <!-- Share CTA -->
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 16px; text-align: center;">
              Help us find great candidates! Share this vacancy with your professional network and on LinkedIn.
            </p>
            
            <div style="text-align: center; margin-bottom: 24px;">
              <a href="${jobUrl}" style="display: inline-block; background-color: #0066cc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 16px;">
                View & Share Vacancy →
              </a>
            </div>
            
            <p style="color: #64748b; font-size: 12px; text-align: center; margin-bottom: 24px; word-break: break-all;">
              ${jobUrl}
            </p>
            
            <!-- Next Steps Box -->
            <div style="background-color: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <h3 style="color: #1e40af; font-size: 16px; margin: 0 0 12px 0;">
                📌 What Happens Next?
              </h3>
              <ul style="color: #1e40af; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>HR will manage all incoming applications</li>
                <li>Applications close on <strong>${closingDate}</strong></li>
                <li>HR will contact you shortly after the closing date to begin the review process</li>
              </ul>
            </div>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
              Best regards,<br/>
              <strong>UNICC Talent Acquisition Team</strong>
            </p>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f1f5f9; padding: 20px 24px; text-align: center;">
            <p style="color: #64748b; font-size: 12px; margin: 0;">
              This is an automated message from the UNICC Recruitment System.<br/>
              Please do not reply directly to this email.
            </p>
          </div>
        </div>
      `,
    });

    console.log("Vacancy published notification sent successfully:", emailResponse);

    // Log to email_send_log
    await supabase.from("email_send_log").insert({
      recipient_email: hiringManager.email,
      recipient_name: hiringManager.name,
      subject: `Your Vacancy is Now Live: ${job.title}`,
      template_slug: "vacancy-published",
      status: "sent",
      sent_at: new Date().toISOString(),
      variables: {
        job_id: job.id,
        job_title: job.title,
        closing_date: closingDate,
        job_url: jobUrl,
      },
    });

    return new Response(
      JSON.stringify({ success: true, message: "Notification sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-vacancy-published-notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
