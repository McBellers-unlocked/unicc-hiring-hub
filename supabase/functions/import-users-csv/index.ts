import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserRow {
  firstName: string;
  lastName: string;
  email: string;
  nationality?: string;
  gender?: string;
  workerType?: string;
  officeLocation?: string;
  division?: string;
  unit?: string;
  lineManager?: string;
  currentGrade?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    // Verify the user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { data: userData, error: roleError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const allowedRoles = ['Admin', 'Director', 'HR Assistant', 'Chief of HR'];
    if (roleError || !allowedRoles.includes(userData?.role)) {
      throw new Error('Only authorized personnel can import users');
    }

    const { csvData } = await req.json();
    
    console.log('Starting CSV import with', csvData?.length, 'rows');

    // Parse CSV data
    const rows: UserRow[] = [];
    const lines = csvData.split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Parse CSV line handling quoted fields
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      if (values.length >= 3) {
        rows.push({
          firstName: values[0] || '',
          lastName: values[1] || '',
          email: values[2] || '',
          nationality: values[3] || null,
          gender: values[4] || null,
          workerType: values[5] || null,
          officeLocation: values[6] || null,
          division: values[7] || null,
          unit: values[8] || null,
          lineManager: values[9] || null,
          currentGrade: values[10] || null,
        });
      }
    }

    console.log('Parsed', rows.length, 'user rows');

    // Prepare user records for insertion
    const usersToInsert = rows
      .filter(row => row.email && row.email.includes('@'))
      .map(row => {
        const baseUser = {
          email: row.email.toLowerCase(),
          name: `${row.firstName} ${row.lastName}`.trim(),
          nationality: row.nationality || null,
          gender: row.gender || null,
          worker_type: row.workerType || null,
          duty_station: row.officeLocation || null,
          division: row.division || null,
          unit: row.unit || null,
          line_manager: row.lineManager || null,
          current_grade: row.currentGrade || null,
          role: 'Hiring Manager' as const,
        };

        return baseUser;
      });

    console.log('Inserting', usersToInsert.length, 'users');

    // Batch insert users (upsert to handle existing emails)
    const batchSize = 50;
    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (let i = 0; i < usersToInsert.length; i += batchSize) {
      const batch = usersToInsert.slice(i, i + batchSize);
      
      for (const user of batch) {
        try {
          // Check if auth user exists
          const { data: authUsers } = await supabaseClient.auth.admin.listUsers();
          let authUser = authUsers?.users?.find(u => u.email === user.email);

          // Create auth account if it doesn't exist
          if (!authUser) {
            console.log(`Creating auth account for ${user.email}`);
            const { data: newAuthUser, error: authError } = await supabaseClient.auth.admin.createUser({
              email: user.email,
              password: 'UN1CC0nnect',
              email_confirm: true, // Skip email verification
              user_metadata: {
                name: user.name
              }
            });

            if (authError) {
              console.error('Error creating auth user:', user.email, authError);
              errors++;
              continue;
            }
            
            authUser = newAuthUser.user;
            console.log(`Created auth account for ${user.email}`);
          }

          // Check if user exists in users table
          const { data: existingUser } = await supabaseClient
            .from('users')
            .select('id, role')
            .eq('email', user.email)
            .single();

          // Preserve Admin, HR Assistant, Chief of HR, and Director roles
          const adminRoles = ['Admin', 'HR Assistant', 'Chief of HR', 'Director'];
          if (existingUser && adminRoles.includes(existingUser.role)) {
            // Update without changing the role
            const { role, ...userWithoutRole } = user;
            const { error } = await supabaseClient
              .from('users')
              .update(userWithoutRole)
              .eq('id', existingUser.id);

            if (error) {
              console.error('Error updating user:', user.email, error);
              errors++;
            } else {
              updated++;
            }
          } else {
            // Insert or update with Hiring Manager role, using auth user ID
            const userWithId = {
              ...user,
              id: authUser!.id
            };

            const { error } = await supabaseClient
              .from('users')
              .upsert(userWithId, { 
                onConflict: 'id',
                ignoreDuplicates: false 
              });

            if (error) {
              console.error('Error inserting user:', user.email, error);
              errors++;
            } else {
              if (existingUser) {
                updated++;
              } else {
                inserted++;
              }
            }
          }
        } catch (error) {
          console.error('Error processing user:', user.email, error);
          errors++;
        }
      }
    }

    console.log(`Import complete: ${inserted} inserted, ${updated} updated, ${errors} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        errors,
        total: usersToInsert.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error importing users:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
