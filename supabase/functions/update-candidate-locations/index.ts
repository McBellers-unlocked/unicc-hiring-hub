import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { jobId } = await req.json()

    // Get candidates for this job
    const { data: applications, error: appError } = await supabaseClient
      .from('applications')
      .select('candidate_id')
      .eq('job_id', jobId)

    if (appError) throw appError

    const candidateIds = applications.map(app => app.candidate_id)

    // Diverse location pairs (Present Location -> Permanent/Other Location)
    const locationPairs = [
      { present: { city: 'Geneva', country: 'Switzerland' }, permanent: { city: 'Paris', country: 'France' } },
      { present: { city: 'New York', country: 'United States' }, permanent: { city: 'Boston', country: 'United States' } },
      { present: { city: 'London', country: 'United Kingdom' }, permanent: { city: 'Manchester', country: 'United Kingdom' } },
      { present: { city: 'Brussels', country: 'Belgium' }, permanent: { city: 'Amsterdam', country: 'Netherlands' } },
      { present: { city: 'Vienna', country: 'Austria' }, permanent: { city: 'Berlin', country: 'Germany' } },
      { present: { city: 'Copenhagen', country: 'Denmark' }, permanent: { city: 'Stockholm', country: 'Sweden' } },
      { present: { city: 'Rome', country: 'Italy' }, permanent: { city: 'Milan', country: 'Italy' } },
      { present: { city: 'Tokyo', country: 'Japan' }, permanent: { city: 'Osaka', country: 'Japan' } },
      { present: { city: 'Singapore', country: 'Singapore' }, permanent: { city: 'Kuala Lumpur', country: 'Malaysia' } },
      { present: { city: 'Nairobi', country: 'Kenya' }, permanent: { city: 'Kampala', country: 'Uganda' } },
      { present: { city: 'Dubai', country: 'United Arab Emirates' }, permanent: { city: 'Abu Dhabi', country: 'United Arab Emirates' } },
      { present: { city: 'Sydney', country: 'Australia' }, permanent: { city: 'Melbourne', country: 'Australia' } },
      { present: { city: 'Toronto', country: 'Canada' }, permanent: { city: 'Vancouver', country: 'Canada' } },
      { present: { city: 'Madrid', country: 'Spain' }, permanent: { city: 'Barcelona', country: 'Spain' } },
      { present: { city: 'Bangkok', country: 'Thailand' }, permanent: { city: 'Chiang Mai', country: 'Thailand' } },
      { present: { city: 'Cairo', country: 'Egypt' }, permanent: { city: 'Alexandria', country: 'Egypt' } },
      { present: { city: 'Buenos Aires', country: 'Argentina' }, permanent: { city: 'Córdoba', country: 'Argentina' } },
      { present: { city: 'Mumbai', country: 'India' }, permanent: { city: 'Delhi', country: 'India' } },
      { present: { city: 'São Paulo', country: 'Brazil' }, permanent: { city: 'Rio de Janeiro', country: 'Brazil' } },
      { present: { city: 'Johannesburg', country: 'South Africa' }, permanent: { city: 'Cape Town', country: 'South Africa' } },
    ]

    // Update each candidate with a location pair
    const updates = candidateIds.map((candidateId, index) => {
      const locationPair = locationPairs[index % locationPairs.length]
      return supabaseClient
        .from('candidates')
        .update({
          present_city: locationPair.present.city,
          present_country: locationPair.present.country,
          permanent_city: locationPair.permanent.city,
          permanent_country: locationPair.permanent.country,
        })
        .eq('id', candidateId)
    })

    await Promise.all(updates)

    return new Response(
      JSON.stringify({ 
        success: true, 
        updated: candidateIds.length 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
