import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();

    if (!jobId) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the requisition for this job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if job already has competencies
    const { data: existingComps, error: checkError } = await supabase
      .from('job_competencies')
      .select('id')
      .eq('job_id', jobId);

    if (checkError) {
      console.error('Error checking existing competencies:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check existing competencies' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingComps && existingComps.length > 0) {
      return new Response(
        JSON.stringify({ message: 'Job already has competencies', count: existingComps.length }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get requisition data
    const { data: requisition, error: reqError } = await supabase
      .from('job_requisitions')
      .select('core_competencies, management_competencies, leadership_competencies')
      .eq('converted_to_job_id', jobId)
      .single();

    if (reqError || !requisition) {
      return new Response(
        JSON.stringify({ error: 'No requisition found for this job' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Competency definitions
    const COMP_DEFS: Record<string, [string, string]> = {
      'Teamwork': ['Core', 'Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.'],
      'Communicating': ['Core', 'Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.'],
      'Respecting and promoting individual and cultural differences': ['Core', 'Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.'],
      'Creating an empowering and motivating environment': ['Management', 'Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.'],
      'Knowing and managing yourself': ['Core', 'Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.'],
      'Producing results': ['Core', 'Produces and delivers quality results. Is action oriented and committed to achieving outcomes.'],
      'Moving forward in a changing environment': ['Core', 'Is open to and proposes new approaches and ideas. Adapts and responds positively to change.'],
      'Setting an example': ['Core', 'Acts within UNICC\'s / WHO\'s professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.'],
      'Ensuring effective use of resources': ['Management', 'Identifies priorities in accordance with UNICC\'s strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.'],
      'Building and promoting partnerships across the Organization and beyond': ['Management', 'Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.'],
      'Driving UNICC to a successful future': ['Leadership', 'Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.'],
      'Promoting innovation and Organizational learning': ['Leadership', 'Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.'],
      'Promoting UNICC\'s position': ['Leadership', 'Positions UNICC as a leader in ICT services. Gains support for UNICC\'s mission. Coordinates plans and communicates in a way that attracts support from intended audiences.']
    };

    // Build competencies list
    const comps = [];
    const mandatoryComps = ['Teamwork', 'Communicating', 'Respecting and promoting individual and cultural differences'];
    
    if (requisition.management_competencies?.includes('Creating an empowering and motivating environment') || 
        requisition.core_competencies?.includes('Creating an empowering and motivating environment')) {
      mandatoryComps.push('Creating an empowering and motivating environment');
    }

    let idx = 0;
    const allComps = [
      ...mandatoryComps, 
      ...(requisition.core_competencies || []), 
      ...(requisition.management_competencies || []), 
      ...(requisition.leadership_competencies || [])
    ];

    // Remove duplicates
    const uniqueComps = allComps.filter((c, i, a) => 
      a.indexOf(c) === i && (!mandatoryComps.includes(c) || i < mandatoryComps.length)
    );

    uniqueComps.forEach(name => {
      const def = COMP_DEFS[name];
      if (def) {
        comps.push({
          job_id: jobId,
          competency_type: def[0],
          competency_name: name,
          description: def[1],
          weight: 1,
          order_index: idx++
        });
      }
    });

    if (comps.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No competencies to add', requisition }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert competencies
    const { error: insertError } = await supabase
      .from('job_competencies')
      .insert(comps);

    if (insertError) {
      console.error('Error inserting competencies:', insertError);
      return new Response(
        JSON.stringify({ error: 'Failed to insert competencies', details: insertError }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Successfully added ${comps.length} competencies`,
        competencies: comps.map(c => c.competency_name)
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
