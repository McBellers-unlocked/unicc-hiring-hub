import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { requisitionId } = await req.json()

    if (!requisitionId) {
      return new Response(
        JSON.stringify({ error: 'Requisition ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Fetch the approved requisition
    const { data: requisition, error: fetchError } = await supabaseClient
      .from('job_requisitions')
      .select('*')
      .eq('id', requisitionId)
      .eq('director_approval', true)
      .single()

    if (fetchError || !requisition) {
      return new Response(
        JSON.stringify({ error: 'Requisition not found or not approved' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Check if already converted
    if (requisition.converted_to_job_id) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          jobId: requisition.converted_to_job_id,
          message: 'Requisition already converted to job'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Convert requisition data to job format
    // Map nature_of_position to correct job type
    let jobType = requisition.nature_of_position;
    switch (requisition.nature_of_position) {
      case 'Fixed term':
      case 'Fixed Term':
        jobType = 'Fixed-term';
        break;
      case 'Individual Consultant':
        jobType = 'Consultant';
        break;
      case 'Temporary':
        jobType = 'Temporary';
        break;
      case 'Intern':
        jobType = 'Intern';
        break;
      default:
        jobType = requisition.nature_of_position;
    }

    const jobData = {
      title: requisition.position_title,
      notice_no: requisition.reference_number,
      grade: requisition.grade,
      type: jobType,
      location: requisition.duty_station,
      org_unit: requisition.unit_section_division,
      positions: requisition.positions_available,
      description_md: `
# Purpose of the Position

${requisition.purpose_of_position || ''}

# Objectives of the Programme

${requisition.objectives_of_programme || ''}

# Main Duties and Responsibilities

${requisition.main_duties_responsibilities || ''}
      `.trim(),
      requirements_md: `
# Essential Experience

${requisition.essential_experience || ''}

# Desirable Experience

${requisition.desirable_experience || ''}

# Essential Education

${requisition.essential_education || ''}

# Desirable Education

${requisition.desirable_education || ''}
      `.trim(),
      language_requirements: (() => {
        let langReq = '# Language Requirements\n\n- English: Expert knowledge is required\n';
        // Check for UN language advantage from requisition data
        const hasUnAdvantage = requisition.language_requirements?.un_language_advantage || 
                              (typeof requisition.language_requirements === 'object' && 
                               Object.hasOwnProperty.call(requisition.language_requirements, 'un_language_advantage') && 
                               requisition.language_requirements.un_language_advantage);
        
        if (hasUnAdvantage) {
          langReq += '- Knowledge of another UN language would be an advantage\n';
        }
        if (requisition.language_requirements) {
          if (typeof requisition.language_requirements === 'object') {
            const additional = Object.entries(requisition.language_requirements)
              .filter(([lang]) => lang.toLowerCase() !== 'english' && lang !== 'un_language_advantage')
              .map(([lang, level]) => `- ${lang.charAt(0).toUpperCase() + lang.slice(1)}: ${level}`)
              .join('\n');
            if (additional) langReq += additional;
          } else {
            langReq += requisition.language_requirements;
          }
        }
        return langReq;
      })(),
      competencies: (() => {
        const competencyGroups = [];
        
        // Add mandatory competencies first
        const mandatoryCompetencies = [
          'Teamwork: Develops and promotes effective relationships with colleagues and team members. Deals constructively with conflicts.',
          'Communicating: Expresses oneself clearly in conversations and interactions with others; listens actively. Produces effective written communications. Ensures that information is shared.',
          'Respecting and promoting individual and cultural differences: Demonstrates the ability to work constructively with people of all backgrounds and orientations. Respects differences and ensures that all can contribute.',
          'Creating an empowering and motivating environment (only for Supervisors please select if the position is meant to hold formal hierarchy under it) Guides and motivates staff towards meeting challenges and achieving objectives. Promotes ownership and responsibility for desired outcomes at all levels.'
        ];
        
        competencyGroups.push('# Mandatory Competencies\n\n' + mandatoryCompetencies.map(comp => `- ${comp}`).join('\n'));
        
        if (requisition.global_competencies?.length) {
          competencyGroups.push('# Global Competencies\n\n' + requisition.global_competencies.map((comp: any) => `- ${comp}`).join('\n'));
        }
        
        // Helper function to get full competency definitions
        const getCompetencyDefinition = (compName: string, type: string) => {
          const definitions: { [key: string]: string[] } = {
            core: [
              'Knowing and managing yourself: Manages ambiguity and pressure in a self-reflective way. Uses criticism as a development opportunity. Seeks opportunities for continuous learning and professional growth.',
              'Producing results: Produces and delivers quality results. Is action oriented and committed to achieving outcomes.',
              'Moving forward in a changing environment: Is open to and proposes new approaches and ideas. Adapts and responds positively to change.',
              'Setting an example: Acts within UNICC\'s / WHO\'s professional, ethical and legal boundaries and encourages others to adhere to these. Behaves consistently in accordance with clear personal ethics and values.'
            ],
            management: [
              'Ensuring effective use of resources: Identifies priorities in accordance with UNICC\'s strategic directions. Develops and implements action plans, organizes the necessary resources and monitors outcomes.',
              'Building and promoting partnerships across the Organization and beyond: Develops and strengthens internal and external partnerships that can provide information, assistance and support to UNICC. Identifies and uses synergies across the Organization and with external partners.'
            ],
            leadership: [
              'Driving UNICC to a successful future: Demonstrates a broad-based understanding of the growing complexities of ICT issues and activities. Creates a compelling vision of shared goals, and develops a roadmap for successfully achieving real progress in improving ICT services.',
              'Promoting innovation and Organizational learning: Invigorates the Organization by building a culture which encourages learning and development. Sponsors innovative approaches and solutions.',
              'Promoting UNICC\'s position: Positions UNICC as a leader in ICT services. Gains support for UNICC\'s mission. Coordinates plans and communicates in a way that attracts support from intended audiences.'
            ]
          };
          
          const typeDefinitions = definitions[type] || [];
          return typeDefinitions.find((def: string) => def.startsWith(compName)) || compName;
        };
        
        if (requisition.core_competencies?.length) {
          const coreWithDefinitions = requisition.core_competencies.map((comp: any) => 
            getCompetencyDefinition(comp, 'core')
          );
          competencyGroups.push('# Core Competencies\n\n' + coreWithDefinitions.map((comp: string) => `- ${comp}`).join('\n'));
        }
        
        
        if (requisition.management_competencies?.length) {
          const managementWithDefinitions = requisition.management_competencies.map((comp: any) => 
            getCompetencyDefinition(comp, 'management')
          );
          competencyGroups.push('# Management Competencies\n\n' + managementWithDefinitions.map((comp: string) => `- ${comp}`).join('\n'));
        }
        
        
        if (requisition.leadership_competencies?.length) {
          const leadershipWithDefinitions = requisition.leadership_competencies.map((comp: any) => 
            getCompetencyDefinition(comp, 'leadership')
          );
          competencyGroups.push('# Leadership Competencies\n\n' + leadershipWithDefinitions.map((comp: string) => `- ${comp}`).join('\n'));
        }
        
        return competencyGroups.join('\n\n') || '';
      })(),
      status: 'paused', // Set to paused status until HR publishes through job wizard
      category: 'Professional',
      salary_estimate: requisition.grade,
      timezone: 'Europe/Zurich',
      privacy_notice_url: 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
    }

    // Create the job
    const { data: newJob, error: jobError } = await supabaseClient
      .from('jobs')
      .insert(jobData)
      .select()
      .single()

    if (jobError) {
      console.error('Error creating job:', jobError)
      return new Response(
        JSON.stringify({ error: 'Failed to create job posting' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Update the requisition with the job ID
    const { error: updateError } = await supabaseClient
      .from('job_requisitions')
      .update({ 
        converted_to_job_id: newJob.id,
        status: 'converted'
      })
      .eq('id', requisitionId)

    if (updateError) {
      console.error('Error updating requisition:', updateError)
    }

    // Log the conversion
    await supabaseClient.functions.invoke('create-audit-log', {
      body: {
        action: 'REQUISITION_CONVERTED',
        entity: 'job_requisitions',
        entityId: requisitionId,
        after: { converted_to_job_id: newJob.id }
      }
    })

    return new Response(
      JSON.stringify({ 
        success: true, 
        jobId: newJob.id,
        message: 'Requisition successfully converted to job posting'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error converting requisition:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})