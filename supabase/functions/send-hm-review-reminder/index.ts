import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface HMReviewReminderRequest {
  requisitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId }: HMReviewReminderRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the requisition with creator details
    const { data: requisition, error: fetchError } = await supabase
      .from("job_requisitions")
      .select(`
        *,
        users!job_requisitions_created_by_fkey (
          name,
          email
        )
      `)
      .eq("id", requisitionId)
      .single();

    if (fetchError || !requisition) {
      console.error("Error fetching requisition:", fetchError);
      throw new Error("Requisition not found");
    }

    const hiringManager = (requisition as any).users;
    if (!hiringManager?.email) {
      throw new Error("Hiring manager information not found");
    }

    // Validate that chief HR has reviewed and status is appropriate
    if (!requisition.chief_hr_reviewed || requisition.status !== 'hiring_manager_review') {
      throw new Error("Requisition is not in the correct state for HM review reminder");
    }

    // Calculate days since Chief HR review
    const chiefHRReviewedDate = new Date(requisition.chief_hr_reviewed_at);
    const today = new Date();
    const daysSinceReview = Math.floor((today.getTime() - chiefHRReviewedDate.getTime()) / (1000 * 60 * 60 * 24));

    const reviewLink = `https://staging.unicconnect.org/requisitions/${requisitionId}/hm-review`;
    
    // Prepare email content
    const chiefHRCommentsSection = requisition.chief_hr_comments
      ? `
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #0066cc; margin-top: 0;">Chief HR Comments:</h3>
          <p style="margin: 0; white-space: pre-wrap;">${requisition.chief_hr_comments}</p>
        </div>
      `
      : '';

    // Send email
    const emailResponse = await resend.emails.send({
      from: "UNICC Recruitment <recruitment@unicconnect.org>",
      to: [hiringManager.email],
      cc: ["mattvalente85@gmail.com"],
      subject: `Reminder: Please Review and Finalize Position Description - ${requisition.position_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" 
               alt="UNICC Logo" 
               style="max-width: 200px; margin-bottom: 20px;" />
          <h1 style="color: #0066cc;">Reminder: Position Description Review Required</h1>
          
          <p>Dear ${hiringManager.name},</p>
          
          <p>This is a friendly reminder that your Position Description for <strong>${requisition.position_title}</strong> 
          has been awaiting your review for <strong>${daysSinceReview} day${daysSinceReview !== 1 ? 's' : ''}</strong>.</p>
          
          ${chiefHRCommentsSection}
          
          <p>The Chief of HR completed their review on <strong>${format(chiefHRReviewedDate, 'MMMM dd, yyyy')}</strong> 
          and is waiting for you to finalize the Position Description so we can proceed with the selection process.</p>
          
          <p><strong>Action Required:</strong></p>
          <ul>
            <li>Review any changes made by Chief HR</li>
            <li>Review and address any comments provided</li>
            <li>Confirm the final version of the Position Description</li>
          </ul>
          
          <p>Your timely response will help us move forward with the recruitment process.</p>
          
          <a 
            href="${reviewLink}" 
            style="display: inline-block; margin: 20px 0; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px;"
          >
            Review Position Description →
          </a>
          
          <p style="margin-top: 30px; color: #333;">
            Best regards,<br><br>
            <strong>UNICC Talent Acquisition team</strong>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from the UNICC Job Management System.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log the email send event
    await supabase.from("email_send_log").insert({
      requisition_id: requisitionId,
      recipient_email: hiringManager.email,
      recipient_name: hiringManager.name,
      subject: `Reminder: Please Review and Finalize Position Description - ${requisition.position_title}`,
      template_slug: "hm_review_reminder",
      status: "sent",
      sent_at: new Date().toISOString(),
      variables: {
        requisition_id: requisitionId,
        position_title: requisition.position_title,
        days_since_review: daysSinceReview,
        chief_hr_comments: requisition.chief_hr_comments,
      },
    });

    return new Response(
      JSON.stringify({ success: true, emailResponse }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in send-hm-review-reminder function:", error);
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

// Import format function for date formatting
function format(date: Date, formatStr: string): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${month} ${day}, ${year}`;
}
