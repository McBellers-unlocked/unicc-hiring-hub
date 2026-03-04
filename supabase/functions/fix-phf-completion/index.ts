import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Auth guard: require Admin or HR role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: profile } = await supabaseClient.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Find applications where PHF data exists but phf_completed is false
    const { data: applicationsToFix, error: queryError } = await supabaseClient
      .from('applications')
      .select('id, phf_data, phf_completed')
      .eq('phf_completed', false)

    if (queryError) {
      throw queryError;
    }

    console.log(`Found ${applicationsToFix?.length || 0} applications to check`);

    const fixedApplications = [];

    for (const application of applicationsToFix || []) {
      // Check if PHF data is substantial (more than just empty object)
      const hasSignificantPHFData = application.phf_data && 
        typeof application.phf_data === 'object' &&
        Object.keys(application.phf_data).length > 0 &&
        // Check for key sections that indicate completion
        (application.phf_data.personalDetails?.familyName || 
         application.phf_data.certification?.certify_true_complete_correct);

      if (hasSignificantPHFData) {
        const { error: updateError } = await supabaseClient
          .from('applications')
          .update({ phf_completed: true })
          .eq('id', application.id);

        if (updateError) {
          console.error(`Error updating application ${application.id}:`, updateError);
        } else {
          fixedApplications.push(application.id);
          console.log(`Fixed application ${application.id}`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Fixed ${fixedApplications.length} applications`,
        fixedApplicationIds: fixedApplications
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error in fix-phf-completion function:', error)
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})