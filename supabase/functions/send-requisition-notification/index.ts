import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RequisitionNotificationRequest {
  requisitionId: string;
  slug?: string;
  title: string;
  requestedBy: string;
  referenceNumber?: string;
  natureOfPosition: string;
  unitSection: string;
  grade?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("Received requisition notification request");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      requisitionId, 
      slug,
      title, 
      requestedBy, 
      referenceNumber, 
      natureOfPosition, 
      unitSection,
      grade
    }: RequisitionNotificationRequest = await req.json();

    console.log("Sending requisition notification for:", requisitionId, "slug:", slug);

    const reviewUrl = `https://staging.unicconnect.org/requisitions/${slug || requisitionId}/hr-edit`;
    const submissionDate = new Date().toLocaleDateString('en-GB', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });

    const emailResponse = await resend.emails.send({
      from: "UNIQTalent <recruitment@unicconnect.org>",
      to: ["HRselection@unicc.org"],
      subject: `New Position Description Submitted: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <img src="https://staging.unicconnect.org/email-assets/unicc_logo.jpg" alt="UNIQTalent Logo" style="max-width: 180px; margin-bottom: 20px;" />
          
          <h1 style="color: #0066cc; margin-bottom: 20px;">New Position Description Submitted</h1>
          
          <p style="font-size: 15px; color: #333;">Dear HR Selection Team,</p>
          
          <p style="font-size: 15px; color: #333;">A new Position Description has been submitted and is ready for your review.</p>
          
          <div style="background-color: #d1fae5; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <h3 style="margin: 0 0 5px 0; color: #065f46; font-size: 16px;">✓ PD Submitted for Review</h3>
            <p style="margin: 0; color: #047857; font-size: 14px;">Submitted on ${submissionDate}</p>
          </div>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">📋 ${title}</h2>
            ${grade ? `<p style="margin: 8px 0; font-size: 14px;"><strong>Grade:</strong> ${grade}</p>` : ''}
            <p style="margin: 8px 0; font-size: 14px;"><strong>Position Type:</strong> ${natureOfPosition}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Unit/Section:</strong> ${unitSection}</p>
            <p style="margin: 8px 0; font-size: 14px;"><strong>Requested by:</strong> ${requestedBy}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${reviewUrl}" 
               style="background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px;">
              Review Position Description →
            </a>
          </div>
          
          <div style="background-color: #dbeafe; padding: 15px; margin: 20px 0; border-radius: 6px;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af; font-size: 15px;">Next Step:</h3>
            <p style="margin: 0; color: #1e3a8a; font-size: 14px;">Please review and process this requisition. Once approved, it will proceed through the Chief and Director approval workflow.</p>
          </div>
          
          <p style="margin-top: 30px; font-size: 15px; color: #333;">Best regards,<br><strong>UNIQTalent</strong></p>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from UNIQTalent.
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-requisition-notification function:", error);
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