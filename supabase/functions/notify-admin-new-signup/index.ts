import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewSignupNotification {
  email: string;
  name: string;
  user_id: string;
  created_at: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, name, user_id, created_at }: NewSignupNotification = await req.json();

    console.log("New signup notification:", { email, name, user_id });

    // Send notification to admins
    // TODO: Update this email to your admin email(s)
    const adminEmails = ["admin@unicc.org"]; // Replace with actual admin emails

    const emailResponse = await resend.emails.send({
      from: "UNICCConnect <recruitment@unicconnect.org>",
      to: adminEmails,
      cc: ["valente@unicc.org"],
      subject: "New User Signup - UNICCConnect",
      html: `
        <h2>New User Registration</h2>
        <p>A new user has signed up on UNICCConnect:</p>
        <ul>
          <li><strong>Name:</strong> ${name}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>User ID:</strong> ${user_id}</li>
          <li><strong>Registered at:</strong> ${new Date(created_at).toLocaleString()}</li>
        </ul>
        <p>Please review this account for any suspicious activity.</p>
        <p><a href="https://supabase.com/dashboard/project/cxpnvbphjpntrvvgjhli/auth/users">View in Supabase Dashboard</a></p>
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

    console.log("Admin notification sent:", emailResponse.data);

    return new Response(
      JSON.stringify({ success: true, message: "Admin notification sent" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-admin-new-signup function:", error);
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
