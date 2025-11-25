import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { jobId } = await req.json();

    console.log(`Simulating video submissions for job: ${jobId}`);

    // Get video question set for this job
    const { data: questionSet, error: qsError } = await supabase
      .from('video_question_sets')
      .select('id, questions')
      .eq('job_id', jobId)
      .single();

    if (qsError || !questionSet) {
      throw new Error('No video question set found for this job');
    }

    const questions = questionSet.questions as any[];
    console.log(`Found ${questions.length} questions`);

    // Get all applications in Pre-Recorded Video status for this job
    const { data: applications, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        candidate:candidates(name, email),
        video_assignments(id)
      `)
      .eq('job_id', jobId)
      .eq('status', 'Pre-Recorded Video');

    if (appsError) throw appsError;

    console.log(`Found ${applications?.length || 0} applications`);

    // Create video assignments for applications that don't have them
    const appsNeedingAssignments = applications?.filter(app => 
      !app.video_assignments || app.video_assignments.length === 0
    ) || [];

    if (appsNeedingAssignments.length > 0) {
      console.log(`Creating video assignments for ${appsNeedingAssignments.length} applications`);
      
      // Create video assignments
      const assignmentsToCreate = appsNeedingAssignments.map(app => ({
        application_id: app.id,
        question_set_id: questionSet.id,
        status: 'Sent',
        deadline_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        token: crypto.randomUUID(),
      }));

      const { data: newAssignments, error: assignError } = await supabase
        .from('video_assignments')
        .insert(assignmentsToCreate)
        .select('id, application_id');

      if (assignError) {
        console.error('Error creating assignments:', assignError);
        throw assignError;
      }

      console.log(`Created ${newAssignments?.length || 0} video assignments`);

      // Create a map of application_id to assignment_id
      const assignmentMap = new Map(
        newAssignments?.map(a => [a.application_id, a.id]) || []
      );

      // Update all applications to include their video assignments
      applications?.forEach(app => {
        const assignmentId = assignmentMap.get(app.id);
        if (assignmentId) {
          app.video_assignments = [{ id: assignmentId }];
        }
      });
    }

    // Sample transcripts for variety
    const sampleTranscripts = [
      "Yes, I'm familiar with UNICC. It's the United Nations International Computing Centre, which provides ICT solutions and services to UN organizations worldwide. I've followed their work in digital transformation and cloud services.",
      "UNICC is the UN's shared ICT service provider. I know they support various UN agencies with technology infrastructure, cybersecurity, and digital solutions. Their mission to enable UN organizations through technology resonates with my career goals.",
      "Absolutely. UNICC plays a crucial role in providing technology services to UN organizations. I'm particularly interested in their work on digital public goods and how they help agencies modernize their IT infrastructure while ensuring security and compliance.",
      "I've researched UNICC extensively. As the UN's International Computing Centre, they provide shared services including hosting, security, and application development. I'm impressed by their commitment to digital innovation within the UN system.",
      "UNICC is the technology backbone for many UN agencies. I understand they offer services ranging from data center operations to custom software development. Their focus on sustainable and secure IT solutions aligns with my professional values.",
    ];

    // Create video answers for each application and question
    const videoAnswers = [];
    for (const app of applications || []) {
      if (!app.video_assignments || app.video_assignments.length === 0) continue;

      for (const question of questions) {
        // Generate varied durations (60-180 seconds)
        const duration = Math.floor(Math.random() * 120) + 60;
        
        // Random transcript
        const transcript = sampleTranscripts[Math.floor(Math.random() * sampleTranscripts.length)];
        
        // Create a realistic timestamp within the last 2 days
        const hoursAgo = Math.floor(Math.random() * 48);
        const takenAt = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

        videoAnswers.push({
          application_id: app.id,
          question_id: question.id,
          url: `https://placeholder-video-url.example.com/${app.id}/${question.id}.mp4`,
          transcript: transcript,
          duration: duration,
          file_size: Math.floor(duration * 500000), // ~500KB per second
          taken_at: takenAt,
          processing_status: 'completed',
          virus_scan_status: 'clean',
        });
      }
    }

    console.log(`Creating ${videoAnswers.length} video answers`);

    // Delete existing video answers for this job first
    const appIds = applications?.map(app => app.id) || [];
    if (appIds.length > 0) {
      const { error: deleteError } = await supabase
        .from('video_answers')
        .delete()
        .in('application_id', appIds);

      if (deleteError) {
        console.error('Error deleting existing answers:', deleteError);
      }
    }

    // Insert video answers in batches
    const batchSize = 100;
    let inserted = 0;
    
    for (let i = 0; i < videoAnswers.length; i += batchSize) {
      const batch = videoAnswers.slice(i, i + batchSize);
      const { error: insertError } = await supabase
        .from('video_answers')
        .insert(batch);

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize}:`, insertError);
        throw insertError;
      }
      
      inserted += batch.length;
      console.log(`Inserted ${inserted}/${videoAnswers.length} video answers`);
    }

    // Update video assignments to completed status
    const assignmentIds = applications
      ?.flatMap(app => app.video_assignments?.map((va: any) => va.id))
      .filter(Boolean) || [];

    if (assignmentIds.length > 0) {
      const { error: updateError } = await supabase
        .from('video_assignments')
        .update({
          status: 'Completed',
          started_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          completed_at: new Date().toISOString(),
        })
        .in('id', assignmentIds);

      if (updateError) {
        console.error('Error updating assignments:', updateError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created ${videoAnswers.length} video answers for ${applications?.length} candidates`,
        questionsPerCandidate: questions.length,
        totalCandidates: applications?.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});