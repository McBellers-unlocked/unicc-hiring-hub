import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const unOrganizations = [
  "UNICEF", "WHO (World Health Organization)", "UNHCR", "UNDP", "WFP (World Food Programme)",
  "UNESCO", "ILO (International Labour Organization)", "FAO", "UNEP", "UN-Habitat",
  "UNODC (UN Office on Drugs and Crime)", "UNOPS", "UN Women", "UNFPA", "UNICC",
  "ITU", "WMO (World Meteorological Organization)", "IMO", "WIPO", "IFAD"
];

function randomItem<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth guard: require Admin or HR role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { jobId } = await req.json();

    if (!jobId) {
      throw new Error("jobId is required");
    }

    console.log(`Updating candidates to have 40% UN experience for job: ${jobId}`);

    // Get all applications for this job with candidate data
    const { data: applications, error: fetchError } = await supabase
      .from('applications')
      .select('id, candidate_id, candidates(id, work_experience, un_experience, un_organizations_worked)')
      .eq('job_id', jobId);

    if (fetchError) throw fetchError;

    if (!applications || applications.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: "No applications found for this job",
          updated: 0
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCandidates = applications.length;
    const targetUNCount = Math.floor(totalCandidates * 0.4);

    console.log(`Total candidates: ${totalCandidates}, Target with UN experience: ${targetUNCount}`);

    // Shuffle applications to randomly select 40%
    const shuffled = [...applications].sort(() => 0.5 - Math.random());
    const candidatesToUpdate = shuffled.slice(0, targetUNCount);

    let updatedCount = 0;

    // Update each selected candidate
    for (const app of candidatesToUpdate) {
      const candidate = app.candidates as any;
      if (!candidate) continue;

      const workExperience = candidate.work_experience || [];
      
      // Check if already has UN experience
      const hasUNExp = workExperience.some((job: any) => 
        unOrganizations.some(org => job.company?.includes(org.split(' ')[0]))
      );

      if (hasUNExp) {
        console.log(`Candidate ${candidate.id} already has UN experience, skipping`);
        continue;
      }

      // Add UN experience - replace one of their existing jobs with a UN position
      if (workExperience.length > 0) {
        const randomJobIndex = Math.floor(Math.random() * Math.min(2, workExperience.length));
        const originalJob = workExperience[randomJobIndex];
        
        // Create UN job based on original position
        const unOrg = randomItem(unOrganizations);
        const unJob = {
          ...originalJob,
          company: unOrg,
          description: `Conducted security assessments and penetration testing for UN systems and infrastructure. Collaborated with international teams across multiple duty stations. Ensured compliance with UN security standards and policies. Provided security awareness training to UN staff members.`
        };

        // Replace the job at this index
        const updatedWorkExp = [...workExperience];
        updatedWorkExp[randomJobIndex] = unJob;

        // Update candidate
        const { error: updateError } = await supabase
          .from('candidates')
          .update({
            work_experience: updatedWorkExp,
            un_experience: true,
            un_organizations_worked: [unOrg]
          })
          .eq('id', candidate.id);

        if (updateError) {
          console.error(`Error updating candidate ${candidate.id}:`, updateError);
        } else {
          updatedCount++;
          console.log(`Updated candidate ${candidate.id} with UN experience at ${unOrg}`);
        }
      }
    }

    console.log(`Successfully updated ${updatedCount} candidates with UN experience`);

    return new Response(
      JSON.stringify({ 
        success: true,
        total_candidates: totalCandidates,
        target_count: targetUNCount,
        updated: updatedCount,
        percentage: ((updatedCount / totalCandidates) * 100).toFixed(1) + '%'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
};

serve(handler);
