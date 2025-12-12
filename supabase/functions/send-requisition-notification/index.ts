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
  title: string;
  requestedBy: string;
  referenceNumber?: string;
  natureOfPosition: string;
  unitSection: string;
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
      title, 
      requestedBy, 
      referenceNumber, 
      natureOfPosition, 
      unitSection 
    }: RequisitionNotificationRequest = await req.json();

    console.log("Sending requisition notification for:", requisitionId);

    const emailResponse = await resend.emails.send({
      from: "UNICC Recruitment <recruitment@unicconnect.org>",
      to: ["valente@unicc.org"],
      subject: `New Job Requisition Submitted: ${title}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #0066cc;">New Job Requisition Submitted</h1>
          
          <p>A new job requisition has been submitted for your review:</p>
          
          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h2 style="margin-top: 0;">${title}</h2>
            ${referenceNumber ? `<p><strong>Reference:</strong> ${referenceNumber}</p>` : ''}
            <p><strong>Position Type:</strong> ${natureOfPosition}</p>
            <p><strong>Unit/Section:</strong> ${unitSection}</p>
            <p><strong>Requested by:</strong> ${requestedBy}</p>
          </div>
          
          <p>Please log into the system to review this requisition:</p>
          <a href="https://cxpnvbphjpntrvvgjhli.supabase.co/requisitions/${requisitionId}" 
             style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Review Requisition
          </a>
          
          <p style="margin-top: 30px; color: #666; font-size: 12px;">
            This is an automated notification from the UNICC Job Management System.
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