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
    const jobData = {
      title: requisition.position_title,
      notice_no: `${requisition.reference_number}-JOB`,
      grade: requisition.grade,
      type: requisition.nature_of_position,
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

# Language Requirements

${JSON.stringify(requisition.language_requirements, null, 2)}
      `.trim(),
      status: 'draft',
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