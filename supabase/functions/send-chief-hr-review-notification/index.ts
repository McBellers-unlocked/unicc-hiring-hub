import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ChiefHRReviewRequest {
  requisitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received Chief HR review notification request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId }: ChiefHRReviewRequest = await req.json();

    console.log("Sending Chief HR review notification for:", requisitionId);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch requisition details with creator information
    const { data: requisition, error: reqError } = await supabase
      .from("job_requisitions")
      .select(`
        id,
        reference_number,
        position_title,
        unit_section_division,
        nature_of_position,
        chief_hr_comments,
        created_by,
        users!job_requisitions_created_by_fkey (
          name,
          email
        )
      `)
      .eq("id", requisitionId)
      .single();

    if (reqError || !requisition) {
      console.error("Error fetching requisition:", reqError);
      throw new Error("Requisition not found");
    }

    const hiringManager = (requisition as any).users;
    if (!hiringManager || !hiringManager.email) {
      throw new Error("Hiring manager information not found");
    }

    const reviewLink = `https://staging.unicconnect.org/requisitions/${requisitionId}/hm-review`;
    
    // Prepare email content
    const chiefHRCommentsSection = requisition.chief_hr_comments
      ? `
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px;">
          <h3 style="margin-top: 0; color: #92400e;">💬 Chief HR Comments:</h3>
          <p style="white-space: pre-wrap; color: #78350f; margin-bottom: 0;">${requisition.chief_hr_comments}</p>
        </div>
      `
      : "";

    const emailResponse = await resend.emails.send({
      from: "UNIQTalent <recruitment@unicconnect.org>",
      to: [hiringManager.email],
      cc: ["valente@unicc.org"],
      subject: `Action Required: Review Position Description for ${requisition.position_title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" 
               alt="UNIQTalent Logo" 
               style="max-width: 200px; margin-bottom: 20px;" />
          <h1 style="color: #0066cc;">Action Required: Position Description Review</h1>
          
          <p>Dear ${hiringManager.name},</p>
          
          <p>The Chief of HR has completed their review of your Position Description and it is now ready for your confirmation:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #333;">📋 ${requisition.position_title}</h2>
            <p style="margin: 5px 0;"><strong>Reference:</strong> ${requisition.reference_number || 'Pending'}</p>
            <p style="margin: 5px 0;"><strong>Unit/Section:</strong> ${requisition.unit_section_division}</p>
            <p style="margin: 5px 0;"><strong>Position Type:</strong> ${requisition.nature_of_position}</p>
          </div>
          
          ${chiefHRCommentsSection}
          
          <div style="background-color: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #1e40af;">Your Action Required:</h3>
            <ol style="margin: 10px 0; padding-left: 20px; color: #1e3a8a;">
              <li style="margin: 5px 0;">Review the changes made by HR</li>
              <li style="margin: 5px 0;">Make any necessary adjustments</li>
              <li style="margin: 5px 0;">Submit back to HR for the final clean version</li>
            </ol>
          </div>
          
          <p>Once you've reviewed and confirmed the changes, HR will prepare the final clean version for Chief of Division and Director approval.</p>
          
          <a href="${reviewLink}" 
             style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
            Review Position Description →
          </a>
          
          <p style="margin-top: 30px; color: #333;">
            Best regards,<br><br>
            <strong>UNIQTalent Team</strong>
          </p>
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from UNIQTalent.
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

    console.log("Email sent successfully:", emailResponse.data);

    // Log the email send to email_send_log
    const { error: logError } = await supabase
      .from("email_send_log")
      .insert({
        requisition_id: requisitionId,
        recipient_email: hiringManager.email,
        recipient_name: hiringManager.name,
        subject: `Action Required: Review Position Description for ${requisition.position_title}`,
        template_slug: "chief_hr_review_complete",
        status: "sent",
        sent_at: new Date().toISOString(),
        variables: {
          hiringManagerName: hiringManager.name,
          positionTitle: requisition.position_title,
          referenceNumber: requisition.reference_number,
          chiefHRComments: requisition.chief_hr_comments,
          reviewLink,
        },
      });

    if (logError) {
      console.error("Error logging email:", logError);
    }

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-chief-hr-review-notification function:", error);
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
