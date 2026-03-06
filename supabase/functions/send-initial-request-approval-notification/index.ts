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

    // Fetch requisition with creator (hiring manager)
    const { data: requisition, error } = await supabase
      .from("job_requisitions")
      .select(`
        id, reference_number, position_title, unit_section_division,
        grade, nature_of_position, initial_request_approved_at, initial_request_approved_by,
        chief_of_division_approved_at, chief_of_division_approved_by,
        users!job_requisitions_created_by_fkey(name, email)
      `)
      .eq("id", requisitionId)
      .single();

    if (error || !requisition) {
      console.error("Requisition not found:", error);
      throw new Error("Requisition not found");
    }

    const hiringManager = requisition.users as { name: string; email: string };
    
    // Fetch chief name
    let chiefName = "Chief of Division";
    const chiefId = requisition.chief_of_division_approved_by || requisition.initial_request_approved_by;
    if (chiefId) {
      const { data: chiefData } = await supabase
        .from("users")
        .select("name")
        .eq("id", chiefId)
        .single();
      if (chiefData?.name) {
        chiefName = chiefData.name;
      }
    }

    const approvedDate = (requisition.chief_of_division_approved_at || requisition.initial_request_approved_at)
      ? new Date(requisition.chief_of_division_approved_at || requisition.initial_request_approved_at).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric"
        })
      : new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const pdEditUrl = `https://hrisspoc.lovable.app/requisitions/${requisitionId}/edit`;

    const emailResponse = await resend.emails.send({
      from: "UNIQTalent <recruitment@unicconnect.org>",
      to: [hiringManager.email],
      cc: ["HRSelection@unicc.org"],
      subject: `Initial Request Approved: ${requisition.position_title} - Ready for Full PD`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <img src="https://cxpnvbphjpntrvvgjhli.supabase.co/storage/v1/object/public/application-files/unicc_logo.jpg" 
               alt="UNIQTalent Logo" style="max-width: 200px; margin-bottom: 20px;" />
          
          <h1 style="color: #0066cc;">Initial Request Approved!</h1>
          
          <p>Dear ${hiringManager.name},</p>
          
          <p>Great news! Your initial request has been approved by the Chief of Division 
             (<strong>${chiefName}</strong>).</p>
          
          <p>You can now proceed to create the full Position Description.</p>
          
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #065f46;">✓ Initial Request Approved</h3>
            <p style="margin-bottom: 0; color: #047857;">Approved on ${approvedDate}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px;">
            <h2 style="margin-top: 0;">📋 ${requisition.position_title}</h2>
            ${requisition.reference_number ? `<p><strong>Reference:</strong> ${requisition.reference_number}</p>` : ''}
            <p><strong>Grade:</strong> ${requisition.grade || 'N/A'}</p>
            <p><strong>Type:</strong> ${requisition.nature_of_position || 'N/A'}</p>
            <p><strong>Unit/Section:</strong> ${requisition.unit_section_division || 'N/A'}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${pdEditUrl}" 
               style="background-color: #0066cc; color: white; padding: 15px 30px; 
                      text-decoration: none; border-radius: 5px; font-weight: bold; 
                      display: inline-block;">
              Continue to Full PD →
            </a>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin-top: 0; color: #1e40af;">Next Steps:</h3>
            <ol style="margin-bottom: 0; color: #1e40af;">
              <li>Complete the full Position Description</li>
              <li>Submit for HR review</li>
              <li>Once approved by Chief and Director, the job will be published</li>
            </ol>
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

    console.log("Initial request approval notification sent:", emailResponse);

    await supabase.from("email_send_log").insert({
      requisition_id: requisitionId,
      recipient_email: hiringManager.email,
      recipient_name: hiringManager.name,
      subject: `Initial Request Approved: ${requisition.position_title}`,
      template_slug: "initial_request_approval",
      status: "sent",
      sent_at: new Date().toISOString()
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error: any) {
    console.error("Error sending initial request approval notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  }
};

serve(handler);
