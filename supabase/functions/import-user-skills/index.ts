import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SkillRow {
  firstName: string;
  surname: string;
  email: string;
  skill: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and check user role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin role
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !['Admin', 'HR Assistant', 'Chief of HR'].includes(userData?.role)) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(JSON.stringify({ error: 'No CSV data provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting skills import...');

    // Parse CSV
    const lines = csvData.split('\n');
    const header = lines[0];
    console.log('CSV header:', header);
    
    const rows: SkillRow[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Parse CSV with quoted fields support
      const fields: string[] = [];
      let field = '';
      let inQuotes = false;
      
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          fields.push(field.trim());
          field = '';
        } else {
          field += char;
        }
      }
      fields.push(field.trim());
      
      if (fields.length >= 4) {
        const email = fields[2]?.toLowerCase().trim();
        const skill = fields[3]?.trim();
        
        if (email && skill) {
          rows.push({
            firstName: fields[0]?.trim() || '',
            surname: fields[1]?.trim() || '',
            email,
            skill,
          });
        }
      }
    }

    console.log(`Parsed ${rows.length} skill rows`);

    // Aggregate skills by email
    const skillsByEmail = new Map<string, Set<string>>();
    
    for (const row of rows) {
      if (!skillsByEmail.has(row.email)) {
        skillsByEmail.set(row.email, new Set());
      }
      skillsByEmail.get(row.email)!.add(row.skill);
    }

    console.log(`Found skills for ${skillsByEmail.size} unique emails`);

    // Update users in batches
    let updated = 0;
    let notFound = 0;
    let errors = 0;
    const notFoundEmails: string[] = [];

    for (const [email, skillsSet] of skillsByEmail) {
      const skills = Array.from(skillsSet).sort();
      
      try {
        const { data, error } = await supabaseClient
          .from('users')
          .update({ skills })
          .eq('email', email)
          .select('id');

        if (error) {
          console.error(`Error updating ${email}:`, error);
          errors++;
        } else if (!data || data.length === 0) {
          notFoundEmails.push(email);
          notFound++;
        } else {
          updated++;
        }
      } catch (err: any) {
        console.error(`Exception updating ${email}:`, err);
        errors++;
      }
    }

    console.log(`Import complete: ${updated} updated, ${notFound} not found, ${errors} errors`);
    if (notFoundEmails.length > 0 && notFoundEmails.length <= 10) {
      console.log('Not found emails sample:', notFoundEmails.slice(0, 10));
    }

    return new Response(
      JSON.stringify({
        success: true,
        totalSkillRows: rows.length,
        uniqueUsers: skillsByEmail.size,
        updated,
        notFound,
        errors,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
