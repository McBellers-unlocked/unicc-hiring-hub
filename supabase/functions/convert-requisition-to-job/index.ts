import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SALARY_RANGES: Record<string, string> = {
  'D-2': 'USD 171,094 - USD 205,942', 'D-1': 'USD 152,417 - USD 193,215', 'D1': 'USD 152,417 - USD 193,215',
  'P-5': 'USD 131,486 - USD 165,076', 'P-4': 'USD 107,389 - USD 131,071', 'P-3': 'USD 87,779 - USD 108,653',
  'P-2': 'USD 67,978 - USD 86,037', 'P-1': 'USD 52,163 - USD 67,495', 'G-7': 'USD 73,650 - USD 85,280',
  'G-6': 'USD 64,920 - USD 75,180', 'G-5': 'USD 56,840 - USD 66,350', 'G-4': 'USD 49,520 - USD 58,300',
  'G-3': 'USD 43,260 - USD 51,490', 'G-2': 'USD 37,840 - USD 45,680', 'G-1': 'USD 32,950 - USD 40,250',
  'NO-D': 'USD 75,000 - USD 95,000', 'NO-C': 'USD 60,000 - USD 80,000', 'NO-B': 'USD 48,000 - USD 68,000',
  'NO-A': 'USD 38,000 - USD 55,000', 'FS-7': 'USD 92,500 - USD 115,000', 'FS-6': 'USD 80,000 - USD 100,000',
  'FS-5': 'USD 68,000 - USD 88,000', 'FS-4': 'USD 57,000 - USD 76,000', 'FS-3': 'USD 48,000 - USD 66,000'
};

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Auth guard: require authenticated HR staff
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { requisitionId } = await req.json();

    if (!requisitionId) {
      return new Response(JSON.stringify({ error: 'Requisition ID is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: req_data, error: fetchError } = await supabase
      .from('job_requisitions').select('*').eq('id', requisitionId).eq('director_approval', true).single();

    if (fetchError || !req_data) {
      return new Response(JSON.stringify({ error: 'Requisition not found or not approved' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (req_data.converted_to_job_id) {
      return new Response(JSON.stringify({ success: true, jobId: req_data.converted_to_job_id, message: 'Requisition already converted to job' }), 
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const jobType = { 'Fixed term': 'Fixed-term', 'Fixed Term': 'Fixed-term', 'Individual Consultant': 'Consultant' }[req_data.nature_of_position] || req_data.nature_of_position;
    
    let langReq = '# Language Requirements\n\n- English: Expert knowledge is required\n';
    if (req_data.language_requirements?.additional_languages) {
      req_data.language_requirements.additional_languages.forEach((l: any) => {
        if (l.name && l.level) {
          // For UN languages, use "Desirable / an advantage" instead of the level text
          const levelText = (l.name === 'Any UN language' || l.name?.includes('UN language')) 
            ? 'Desirable / an advantage' 
            : l.level;
          langReq += `- ${l.name}: ${levelText}\n`;
        }
      });
    }
    // Add local language advantage for G positions
    if (req_data.language_requirements?.local_language_advantage && req_data.grade?.match(/^G[-\s]?\d+$/i)) {
      langReq += '- Knowledge of the local language of the Duty Station would be an advantage\n';
    }
    // Add UN language advantage for P positions
    if (req_data.language_requirements?.un_language_advantage) {
      langReq += '- Knowledge of another UN language would be an advantage\n';
    }

    // Normalize grade format for salary lookup (handle both "P3" and "P-3" formats)
    const normalizeGrade = (grade: string) => {
      if (!grade) return '';
      // If grade doesn't have a hyphen and matches pattern like P3, G5, etc., add hyphen
      if (/^[A-Z]+\d+$/.test(grade)) {
        return grade.replace(/([A-Z]+)(\d+)/, '$1-$2');
      }
      return grade;
    };
    const normalizedGrade = normalizeGrade(req_data.grade);
    const salaryEstimate = SALARY_RANGES[normalizedGrade] || SALARY_RANGES[req_data.grade] || req_data.grade || '';

    // Format location with remote region if applicable
    let formattedLocation = req_data.duty_station;
    if (req_data.comments?.remote_region && req_data.duty_station) {
      try {
        const dutyStations = typeof req_data.duty_station === 'string' ? JSON.parse(req_data.duty_station) : req_data.duty_station;
        if (Array.isArray(dutyStations) && dutyStations.includes('Remote')) {
          // Replace "Remote" with "Remote (region)"
          const updatedStations = dutyStations.map((station: string) => 
            station === 'Remote' ? `Remote (${req_data.comments.remote_region})` : station
          );
          formattedLocation = JSON.stringify(updatedStations);
        }
      } catch (e) {
        console.error('Error formatting location:', e);
      }
    }

    // Generate slug from title with sequential numbering
    const baseSlug = req_data.position_title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Check for existing slugs
    const { data: existingSlugs } = await supabase
      .from('jobs')
      .select('slug')
      .like('slug', `${baseSlug}%`);

    let finalSlug = baseSlug;
    if (existingSlugs && existingSlugs.length > 0) {
      const slugList = existingSlugs.map(j => j.slug).filter(Boolean) as string[];
      if (slugList.includes(baseSlug)) {
        // Find highest number suffix
        const escapedSlug = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`^${escapedSlug}(-\\d+)?$`);
        const matchingSlugs = slugList.filter(s => pattern.test(s));
        let maxNumber = 1;
        matchingSlugs.forEach(slug => {
          const match = slug.match(/-(\d+)$/);
          if (match) maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
        });
        finalSlug = `${baseSlug}-${maxNumber + 1}`;
      }
    }

    const { data: newJob, error: jobError } = await supabase.from('jobs').insert({
      title: req_data.position_title,
      slug: finalSlug,
      notice_no: req_data.reference_number,
      grade: req_data.grade,
      type: jobType,
      location: formattedLocation,
      org_unit: req_data.unit_section_division,
      positions: req_data.positions_available,
      essential_education_level: req_data.essential_education_level,
      description_md: `# Purpose of the Position\n\n${req_data.purpose_of_position || ''}\n\n# Objectives of the Programme\n\n${req_data.objectives_of_programme || ''}\n\n# Main Duties and Responsibilities\n\n${req_data.main_duties_responsibilities || ''}`.trim(),
      requirements_md: `# Essential Experience\n\n${req_data.essential_experience || ''}\n\n# Desirable Experience\n\n${req_data.desirable_experience || ''}\n\n# Essential Education\n\n${req_data.essential_education || ''}\n\n# Desirable Education\n\n${req_data.desirable_education || ''}`.trim(),
      language_requirements: langReq,
      competencies: '',
      status: 'paused',
      category: 'Professional',
      salary_estimate: salaryEstimate,
      timezone: 'Europe/Zurich',
      privacy_notice_url: 'https://www.unicc.org/unicc-privacy-notice-for-applicants/',
      internal_only: req_data.internal_only || false
    }).select().single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return new Response(JSON.stringify({ error: 'Failed to create job posting' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const comps = [];
    const mandatoryComps = ['Teamwork', 'Communicating', 'Respecting and promoting individual and cultural differences'];
    if (req_data.management_competencies?.includes('Creating an empowering and motivating environment') || 
        req_data.core_competencies?.includes('Creating an empowering and motivating environment')) {
      mandatoryComps.push('Creating an empowering and motivating environment');
    }

    let idx = 0;
    [...mandatoryComps, ...(req_data.core_competencies || []), ...(req_data.management_competencies || []), ...(req_data.leadership_competencies || [])]
      .filter((c, i, a) => a.indexOf(c) === i && (!mandatoryComps.includes(c) || i < mandatoryComps.length))
      .forEach(name => {
        const def = COMP_DEFS[name];
        if (def) comps.push({ job_id: newJob.id, competency_type: def[0], competency_name: name, description: def[1], weight: 1, order_index: idx++ });
      });

    if (comps.length > 0) await supabase.from('job_competencies').insert(comps);

    // Create structured requirements from requisition fields
    const requirements = [];
    let reqIdx = 0;

    // Essential Experience
    if (req_data.essential_experience) {
      requirements.push({
        job_id: newJob.id,
        category: 'Essential Criteria',
        title: 'Essential Experience',
        description: req_data.essential_experience,
        must_have: true,
        weight: 3,
        order_index: reqIdx++
      });
    }

    // Essential Education Details
    if (req_data.essential_education) {
      requirements.push({
        job_id: newJob.id,
        category: 'Essential Criteria',
        title: 'Essential Education',
        description: req_data.essential_education,
        must_have: true,
        weight: 3,
        order_index: reqIdx++
      });
    }

    // Desirable Experience
    if (req_data.desirable_experience) {
      requirements.push({
        job_id: newJob.id,
        category: 'Desirable Criteria',
        title: 'Desirable Experience',
        description: req_data.desirable_experience,
        must_have: false,
        weight: 2,
        order_index: reqIdx++
      });
    }

    // Desirable Education
    if (req_data.desirable_education) {
      requirements.push({
        job_id: newJob.id,
        category: 'Desirable Criteria',
        title: 'Desirable Education',
        description: req_data.desirable_education,
        must_have: false,
        weight: 2,
        order_index: reqIdx++
      });
    }

    // Overall Assessment criteria
    requirements.push(
      { 
        job_id: newJob.id, 
        category: 'Overall Assessment', 
        title: 'Overall fit to the organization', 
        description: 'Holistic assessment of cultural fit, values alignment, and long-term potential within the organization', 
        weight: 1, 
        order_index: reqIdx++ 
      },
      { 
        job_id: newJob.id, 
        category: 'Overall Assessment', 
        title: 'Potential', 
        description: 'Assessment of growth potential and capacity to exceed role requirements', 
        weight: 1, 
        order_index: reqIdx++ 
      }
    );

    if (requirements.length > 0) await supabase.from('job_requirements').insert(requirements);

    // Create language requirements
    const langRequirements = [];
    let langIdx = 0;

    // Always add English as essential
    langRequirements.push({
      job_id: newJob.id,
      language: 'English',
      level: 'Expert',
      is_essential: true,
      order_index: langIdx++
    });

    // Add additional languages from requisition
    if (req_data.language_requirements?.additional_languages) {
      req_data.language_requirements.additional_languages.forEach((l: any) => {
        if (l.name && l.level) {
          // UN languages should always be non-essential (desirable/advantage)
          const isUnLanguage = l.name === 'Any UN language' || 
                               l.name?.toLowerCase().includes('un language') ||
                               l.name?.includes('French, Spanish, Arabic, Chinese, Russian');
          
          langRequirements.push({
            job_id: newJob.id,
            language: l.name,
            level: l.level,
            is_essential: isUnLanguage ? false : (l.is_essential || false),
            order_index: langIdx++
          });
        }
      });
    }

    // Add UN language advantage if specified
    if (req_data.language_requirements?.un_language_advantage) {
      langRequirements.push({
        job_id: newJob.id,
        language: 'Any UN Language (French, Spanish, Arabic, Chinese, Russian)',
        level: 'Working',
        is_essential: false,
        order_index: langIdx++
      });
    }

    if (langRequirements.length > 0) await supabase.from('job_language_requirements').insert(langRequirements);

    await supabase.from('job_requisitions').update({ converted_to_job_id: newJob.id, status: 'converted' }).eq('id', requisitionId);
    await supabase.functions.invoke('create-audit-log', { body: { action: 'REQUISITION_CONVERTED', entity: 'job_requisitions', entityId: requisitionId, after: { converted_to_job_id: newJob.id } } });

    return new Response(JSON.stringify({ success: true, jobId: newJob.id, message: 'Requisition successfully converted to job posting' }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error converting requisition:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
