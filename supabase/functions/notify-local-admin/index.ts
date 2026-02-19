import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATION_ADMIN_EMAILS: Record<string, string> = {
  "Valencia": "admin_vlc@unicc.org",
  "Geneva": "admin_gva@unicc.org",
  "Brindisi": "admin_bsi@unicc.org",
  "Rome": "admin_ROM@unicc.org",
  "New York": "admin_ny@unicc.org",
};

interface NotifyLocalAdminRequest {
  eventType: "arrival" | "departure" | "transfer" | "contract_break";
  dutyStation: string;
  firstName: string;
  lastName: string;
  grade?: string;
  contractType?: string;
  jobTitle?: string;
  divisionUnit?: string;
  supervisor?: string;
  tentativeDate?: string;
  startDate?: string;
  endDate?: string;
  newDutyStation?: string;
  newDivisionUnit?: string;
  breakType?: string;
  returnDate?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function getEventLabel(eventType: string): string {
  switch (eventType) {
    case "arrival": return "Arrival";
    case "departure": return "Departure";
    case "transfer": return "Transfer / Reassignment";
    case "contract_break": return "Contract Break";
    default: return eventType;
  }
}

function getEventIcon(eventType: string): string {
  switch (eventType) {
    case "arrival": return "✈️";
    case "departure": return "🚪";
    case "transfer": return "🔄";
    case "contract_break": return "⏸️";
    default: return "📋";
  }
}

function getSubject(req: NotifyLocalAdminRequest): string {
  const name = `${req.firstName} ${req.lastName}`;
  switch (req.eventType) {
    case "arrival":    return `New Arrival — ${name} | ${req.dutyStation}`;
    case "departure":  return `Departure Notification — ${name} | ${req.dutyStation}`;
    case "transfer":   return `Transfer / Reassignment — ${name} | ${req.dutyStation}`;
    case "contract_break": return `Contract Break — ${name} | ${req.dutyStation}`;
    default:           return `HR Movement — ${name} | ${req.dutyStation}`;
  }
}

function buildInfoRows(req: NotifyLocalAdminRequest): string {
  const row = (label: string, value?: string) =>
    `<p style="margin: 8px 0;"><strong>${label}:</strong> ${value || "—"}</p>`;

  const base = `
    ${row("Name", `${req.firstName} ${req.lastName}`)}
    ${row("Grade", req.grade)}
    ${row("Contract Type", req.contractType)}
    ${row("Job Title", req.jobTitle)}
    ${row("Division / Unit", req.divisionUnit)}
  `;

  switch (req.eventType) {
    case "arrival":
      return base + row("Supervisor", req.supervisor) + row("Duty Station", req.dutyStation) + row("Tentative Start Date", formatDate(req.tentativeDate));
    case "departure":
      return base + row("Supervisor", req.supervisor) + row("Duty Station", req.dutyStation) + row("Last Day of Contract", formatDate(req.tentativeDate));
    case "transfer":
      return `
        ${row("Name", `${req.firstName} ${req.lastName}`)}
        ${row("Grade", req.grade)}
        ${row("Contract Type", req.contractType)}
        ${row("Job Title", req.jobTitle)}
        ${row("From Duty Station", req.dutyStation)}
        ${row("To Duty Station", req.newDutyStation)}
        ${row("From Division / Unit", req.divisionUnit)}
        ${row("To Division / Unit", req.newDivisionUnit)}
        ${row("Supervisor", req.supervisor)}
        ${row("Start Date", formatDate(req.startDate))}
        ${req.endDate ? row("End Date", formatDate(req.endDate)) : ""}
      `;
    case "contract_break":
      return base +
        row("Supervisor", req.supervisor) +
        row("Break Type", req.breakType) +
        row("Break From", formatDate(req.tentativeDate)) +
        row("Expected Return", formatDate(req.returnDate));
    default:
      return base;
  }
}

function buildContractBreakBox(req: NotifyLocalAdminRequest): string {
  if (req.eventType !== "contract_break") return "";
  return `
  <div style="background-color: #fffbeb; border: 1px solid #f59e0b; padding: 16px 20px; margin: 20px 0; border-radius: 8px;">
    <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">⚠️ Break Period</p>
    <p style="margin: 4px 0; color: #78350f;">${formatDate(req.tentativeDate)} → ${formatDate(req.returnDate)}</p>
    ${req.breakType ? `<p style="margin: 4px 0; color: #78350f;"><strong>Break Type:</strong> ${req.breakType}</p>` : ""}
  </div>`;
}

function buildEmailHtml(req: NotifyLocalAdminRequest): string {
  const eventLabel = getEventLabel(req.eventType);
  const icon = getEventIcon(req.eventType);
  const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://staging.unicconnect.org";
  const systemLink = `${baseUrl}/operations/admin`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HR Movement Notification</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f7fafc;">
  <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    
    <!-- Logo -->
    <div style="text-align: center; padding: 30px 20px 20px;">
      <img src="https://staging.unicconnect.org/email-assets/unicc_logo.jpg" alt="UNICC Logo" style="height: 60px;">
    </div>

    <!-- Header -->
    <div style="background-color: #1a365d; padding: 24px 32px;">
      <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700;">
        HR Movement Notification — ${req.dutyStation}
      </h1>
    </div>

    <!-- Body -->
    <div style="padding: 32px;">
      <p>Dear ${req.dutyStation} Admin Team,</p>
      
      <p>A new <strong>${eventLabel}</strong> has been recorded in the UNICC HR System.</p>

      <!-- Info Panel -->
      <div style="background-color: #ebf8ff; border-left: 4px solid #3182ce; padding: 20px 24px; margin: 20px 0; border-radius: 0 6px 6px 0;">
        <h2 style="color: #2d3748; font-size: 18px; margin: 0 0 12px 0;">
          ${icon} ${req.firstName} ${req.lastName}
        </h2>
        ${buildInfoRows(req)}
      </div>

      ${buildContractBreakBox(req)}

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a href="${systemLink}" style="display: inline-block; background-color: #3182ce; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-weight: bold; font-size: 15px;">
          View in System →
        </a>
      </div>

      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

      <p style="font-size: 14px; color: #718096;">
        Best regards,<br>
        <strong>UNICC Human Resources</strong>
      </p>

      <p style="font-size: 12px; color: #a0aec0; margin-top: 16px;">
        This is an automated notification from the UNICC HR System. Please do not reply to this email.
      </p>
    </div>

  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: NotifyLocalAdminRequest = await req.json();
    const { eventType, dutyStation, firstName, lastName } = body;

    if (!eventType || !["arrival", "departure", "transfer", "contract_break"].includes(eventType)) {
      console.error("Unknown eventType:", eventType);
      return new Response(JSON.stringify({ success: false, error: "Unknown eventType" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const recipientEmail = STATION_ADMIN_EMAILS[dutyStation];
    if (!recipientEmail) {
      console.log(`No admin email mapping for duty station: ${dutyStation}. Skipping.`);
      return new Response(JSON.stringify({ success: true, skipped: true, reason: "No admin email for this duty station" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Sending ${eventType} notification for ${firstName} ${lastName} at ${dutyStation} to ${recipientEmail}`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "UNICC Recruitment <recruitment@unicconnect.org>",
        to: [recipientEmail],
        subject: getSubject(body),
        html: buildEmailHtml(body),
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Resend API error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const data = await res.json();
    console.log("Notification sent successfully:", data.id);

    return new Response(JSON.stringify({ success: true, messageId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-local-admin:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
