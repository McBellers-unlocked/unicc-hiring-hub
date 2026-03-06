import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import { Resend } from "npm:resend@4.0.0";
import { corsHeaders } from "../_shared/cors.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface ApprovalNotificationRequest {
  requisitionId: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { requisitionId }: ApprovalNotificationRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch requisition with creator
    const { data: requisition, error } = await supabase
      .from("job_requisitions")
      .select(`
        id, reference_number, position_title, unit_section_division,
        grade, nature_of_position, chief_pd_approved_at, chief_pd_comments, chief_pd_approved_by,
        users!job_requisitions_created_by_fkey(name, email)
      `)
      .eq("id", requisitionId)
      .single();

    if (error || !requisition) {
      console.error("Requisition not found:", error);
      throw new Error("Requisition not found");
    }

    const hiringManager = requisition.users as { name: string; email: string };
    
    // Fetch chief name separately if chief_pd_approved_by exists
    let chiefName = "Chief of Division";
    if (requisition.chief_pd_approved_by) {
      const { data: chiefData } = await supabase
        .from("users")
        .select("name")
        .eq("id", requisition.chief_pd_approved_by)
        .single();
      if (chiefData?.name) {
        chiefName = chiefData.name;
      }
    }

    const approvedDate = requisition.chief_pd_approved_at 
      ? new Date(requisition.chief_pd_approved_at).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const emailResponse = await resend.emails.send({
      from: "UNIQTalent <recruitment@unicconnect.org>",
      to: [hiringManager.email],
      cc: ["HRSelection@unicc.org", "valente@unicc.org"],
      subject: `Chief Approved: ${requisition.position_title} - Pending Director Approval`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" 
               alt="UNIQTalent Logo" style="max-width: 200px; margin-bottom: 20px;" />
          
          <h1 style="color: #0066cc;">Position Description Approved by Chief</h1>
          
          <p>Dear ${hiringManager.name},</p>
          
          <p>Great news! The Chief of Division (<strong>${chiefName}</strong>) has approved 
             your Position Description. It is now pending Director approval.</p>
          
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #065f46;">✓ Chief of Division Approved</h3>
            <p style="margin-bottom: 0; color: #047857;">Approved on ${approvedDate}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <h2 style="margin-top: 0;">📋 ${requisition.position_title}</h2>
            <p><strong>Reference:</strong> ${requisition.reference_number || 'Pending'}</p>
            <p><strong>Grade:</strong> ${requisition.grade || 'N/A'}</p>
            <p><strong>Unit/Section:</strong> ${requisition.unit_section_division || 'N/A'}</p>
          </div>
          
          ${requisition.chief_pd_comments ? `
            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
              <h3 style="margin-top: 0; color: #92400e;">💬 Chief's Comments:</h3>
              <p style="white-space: pre-wrap; margin-bottom: 0;">${requisition.chief_pd_comments}</p>
            </div>
          ` : ''}
          
          <div style="background-color: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #1e40af;">Next Step:</h3>
            <p style="margin-bottom: 0;">The Position Description is now with the Director for final approval.
               You will be notified once approved.</p>
          </div>
          
          <p style="margin-top: 30px;">Best regards,<br><strong>UNIQTalent Team</strong></p>
          <p style="color: #666; font-size: 12px;">This is an automated notification.</p>
        </div>
      `,
    });

    if (emailResponse.error) {
      console.error("Resend error:", emailResponse.error);
      throw emailResponse.error;
    }

    console.log("Chief PD approval notification sent:", emailResponse);

    await supabase.from("email_send_log").insert({
      requisition_id: requisitionId,
      recipient_email: hiringManager.email,
      recipient_name: hiringManager.name,
      subject: `Chief Approved: ${requisition.position_title}`,
      template_slug: "chief_pd_approval",
      status: "sent",
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error: any) {
    console.error("Error sending chief PD approval notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);
