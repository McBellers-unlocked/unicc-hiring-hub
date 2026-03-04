import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    // Verify caller is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const {
      name, email, affiliate_type, division, unit, job_title,
      line_manager, duty_station, current_grade, staff_number,
      nationality, gender, first_incumbency_date,
      samsaran_pr, contract_start_date, contract_end_date, days_worked,
    } = body;

    if (!name || !email || !affiliate_type) {
      return new Response(JSON.stringify({ error: 'name, email, and affiliate_type are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if a user with this email already exists in public.users
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let userId: string;

    if (existingUser) {
      // Update existing user to affiliate
      userId = existingUser.id;
      const { error } = await supabase
        .from('users')
        .update({
          name,
          personnel_type: 'Affiliate',
          affiliate_type,
          division: division || null,
          unit: unit || null,
          job_title: job_title || null,
          line_manager: line_manager || null,
          duty_station: duty_station || null,
          current_grade: current_grade || null,
          staff_number: staff_number || null,
          nationality: nationality || null,
          gender: gender || null,
          first_incumbency_date: first_incumbency_date || null,
        })
        .eq('id', userId);

      if (error) throw error;
    } else {
      // Create auth user first (generates the id that users FK references)
      const randomPassword = crypto.randomUUID() + '!' + Math.random().toString(36);
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { created_as_affiliate: true },
      });

      if (authError) throw authError;
      userId = authData.user.id;

      // The handle_new_user trigger creates a basic row in public.users.
      // Now update it with affiliate details.
      // Small delay to let the trigger fire
      await new Promise(r => setTimeout(r, 500));

      const { error } = await supabase
        .from('users')
        .update({
          name,
          personnel_type: 'Affiliate',
          affiliate_type,
          division: division || null,
          unit: unit || null,
          job_title: job_title || null,
          line_manager: line_manager || null,
          duty_station: duty_station || null,
          current_grade: current_grade || null,
          staff_number: staff_number || null,
          nationality: nationality || null,
          gender: gender || null,
          first_incumbency_date: first_incumbency_date || null,
        })
        .eq('id', userId);

      if (error) throw error;
    }

    // Upsert contract history if any contract field is provided
    if (samsaran_pr || contract_start_date || contract_end_date || days_worked != null) {
      const pr = samsaran_pr || null;

      // Check for existing record
      let query = supabase
        .from('affiliate_contract_history')
        .select('id')
        .eq('user_id', userId);

      if (pr) {
        query = query.eq('samsaran_pr', pr);
      } else {
        query = query.is('samsaran_pr', null);
      }

      const { data: existingRecord } = await query.maybeSingle();

      if (existingRecord) {
        await supabase
          .from('affiliate_contract_history')
          .update({
            start_date: contract_start_date || null,
            end_date: contract_end_date || null,
            days_worked: days_worked ?? null,
            samsaran_pr: pr,
          })
          .eq('id', existingRecord.id);
      } else {
        await supabase
          .from('affiliate_contract_history')
          .insert({
            user_id: userId,
            record_number: '',
            start_date: contract_start_date || null,
            end_date: contract_end_date || null,
            days_worked: days_worked ?? null,
            samsaran_pr: pr,
          });
      }
    }

    return new Response(JSON.stringify({ success: true, userId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('create-affiliate error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
