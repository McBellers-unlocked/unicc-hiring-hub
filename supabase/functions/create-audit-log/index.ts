import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AuditLogRequest {
  action: string;
  entity: string;
  entityId: string;
  before?: any;
  after?: any;
  actorId?: string;
  metadata?: any;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const {
      action,
      entity,
      entityId,
      before,
      after,
      actorId,
      metadata
    }: AuditLogRequest = await req.json();

    console.log("Creating audit log entry:", { action, entity, entityId });

    // Create audit log entry
    const { error } = await supabase
      .from('audit_logs')
      .insert({
        actor_id: actorId,
        action,
        entity,
        entity_id: entityId,
        before: before || null,
        after: after || null,
        metadata: metadata || {}
      });

    if (error) {
      console.error("Error creating audit log:", error);
      throw error;
    }

    console.log("Audit log entry created successfully");

    return new Response(
      JSON.stringify({ success: true, message: "Audit log created" }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in create-audit-log function:", error);
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