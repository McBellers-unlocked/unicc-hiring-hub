import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth guard: require Admin or HR role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (!profile || !['Admin', 'HR Assistant', 'Chief of HR'].includes(profile.role)) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { emails } = await req.json();

    if (!emails || !Array.isArray(emails)) {
      throw new Error('emails array is required');
    }

    console.log(`Processing ${emails.length} candidates for fake video responses`);

    const results = [];

    for (const email of emails) {
      console.log(`Processing candidate: ${email}`);

      // Find the candidate and their application
      const { data: candidate, error: candidateError } = await supabase
        .from('candidates')
        .select('id, name')
        .eq('email', email)
        .single();

      if (candidateError || !candidate) {
        console.error(`Candidate not found: ${email}`);
        results.push({ email, success: false, error: 'Candidate not found' });
        continue;
      }

      // Find their application (assuming latest one)
      const { data: application, error: appError } = await supabase
        .from('applications')
        .select('id, job_id')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (appError || !application) {
        console.error(`Application not found for: ${email}`);
        results.push({ email, success: false, error: 'Application not found' });
        continue;
      }

      // Check if video assignment exists
      const { data: assignment, error: assignmentError } = await supabase
        .from('video_assignments')
        .select('id')
        .eq('application_id', application.id)
        .maybeSingle();

      if (assignmentError) {
        console.error(`Error checking assignment for ${email}:`, assignmentError);
        results.push({ email, success: false, error: 'Error checking assignment' });
        continue;
      }

      if (!assignment) {
        console.log(`No video assignment found for ${email}, creating one...`);
        
        // Create assignment
        const { data: newAssignment, error: createError } = await supabase
          .from('video_assignments')
          .insert({
            application_id: application.id,
            status: 'InProgress',
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            max_attempts: 1,
            attempts_used: 0,
          })
          .select()
          .single();

        if (createError) {
          console.error(`Error creating assignment for ${email}:`, createError);
          results.push({ email, success: false, error: 'Error creating assignment' });
          continue;
        }
      }

      // Get video questions for this job
      const { data: questionSet, error: questionsError } = await supabase
        .from('video_question_sets')
        .select('questions')
        .eq('job_id', application.job_id)
        .maybeSingle();

      if (questionsError || !questionSet) {
        console.error(`No video questions found for job`);
        results.push({ email, success: false, error: 'No video questions configured' });
        continue;
      }

      const questions = questionSet.questions as any[];

      if (!questions || questions.length === 0) {
        console.error(`No questions in question set`);
        results.push({ email, success: false, error: 'No questions configured' });
        continue;
      }

      // Delete existing video answers for this application
      await supabase
        .from('video_answers')
        .delete()
        .eq('application_id', application.id);

      // Create fake video answers for each question
      const videoAnswers = [];
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        
        videoAnswers.push({
          application_id: application.id,
          question_id: question.id,
          video_url: `https://example.com/fake-video-${candidate.id}-q${i + 1}.mp4`,
          transcript: `This is a simulated transcript for question ${i + 1}. The candidate discusses their experience and qualifications relevant to the role. They provide specific examples and demonstrate their expertise in the required areas.`,
          duration: 120 + Math.floor(Math.random() * 60), // Random duration between 120-180 seconds
          file_size: 5000000 + Math.floor(Math.random() * 3000000), // Random size
          attempt_number: 1,
          recorded_at: new Date().toISOString(),
        });
      }

      const { error: answersError } = await supabase
        .from('video_answers')
        .insert(videoAnswers);

      if (answersError) {
        console.error(`Error creating video answers for ${email}:`, answersError);
        results.push({ email, success: false, error: 'Error creating video answers' });
        continue;
      }

      // Update assignment status to Completed
      const { error: updateError } = await supabase
        .from('video_assignments')
        .update({
          status: 'Completed',
          completed_at: new Date().toISOString(),
          attempts_used: 1,
        })
        .eq('application_id', application.id);

      if (updateError) {
        console.error(`Error updating assignment for ${email}:`, updateError);
        results.push({ email, success: false, error: 'Error updating assignment' });
        continue;
      }

      console.log(`✓ Successfully created fake video responses for ${candidate.name}`);
      results.push({ 
        email, 
        success: true, 
        candidateName: candidate.name,
        questionsAnswered: questions.length 
      });
    }

    const successCount = results.filter(r => r.success).length;
    console.log(`Completed: ${successCount}/${emails.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Created fake video responses for ${successCount}/${emails.length} candidates`,
        results,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in generate-fake-video-responses:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
