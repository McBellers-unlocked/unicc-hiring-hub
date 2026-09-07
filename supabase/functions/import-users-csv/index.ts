import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

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

    // Build an in-memory map of existing auth users (email -> id) to avoid per-user lookups
    const authUserMap = new Map<string, string>();
    try {
      const perPage = 1000;
      let page = 1;
      while (true) {
        const { data, error } = await supabaseClient.auth.admin.listUsers({ page, perPage });
        if (error) {
          console.error('Error listing auth users for cache:', error);
          break;
        }
        const users = data?.users ?? [];
        for (const u of users) {
          if (u.email) {
            authUserMap.set(u.email.toLowerCase(), u.id);
          }
        }
        if (users.length < perPage) break;
        page++;
      }
      console.log('Cached', authUserMap.size, 'auth users for import');
    } catch (authCacheError: any) {
      console.error('Error building auth user cache:', authCacheError);
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
          // Try to resolve auth user from cache first
          let authUserId: string | undefined = authUserMap.get(user.email);

          // Create auth account if it doesn't exist
          if (!authUserId) {
            console.log(`Creating auth account for ${user.email}`);
            try {
              const { data: newAuthUser, error: authError } = await supabaseClient.auth.admin.createUser({
                email: user.email,
                password: 'UN1CC0nnect',
                email_confirm: true,
                user_metadata: {
                  name: user.name
                }
              });

              if (authError) {
                // If error is "email_exists", user already has auth account
                if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
                  console.log(`Auth account exists for ${user.email}, using cached auth user if available`);
                  const cachedId = authUserMap.get(user.email);
                  if (cachedId) {
                    authUserId = cachedId;
                  } else {
                    // Fallback: resolve auth user id via existing users row by email
                    const { data: existingUserByEmail } = await supabaseClient
                      .from('users')
                      .select('id')
                      .eq('email', user.email)
                      .single();
                    if (existingUserByEmail) {
                      authUserId = existingUserByEmail.id;
                    }
                  }
                } else {
                  console.error('Error creating auth user:', user.email, authError);
                  errors++;
                  continue;
                }
              } else if (newAuthUser?.user) {
                authUserId = newAuthUser.user.id;
                authUserMap.set(user.email, authUserId);
                console.log(`Created auth account for ${user.email}`);
              }
            } catch (createError: any) {
              console.error('Exception creating auth user:', user.email, createError);
              errors++;
              continue;
            }
          }

          // Only proceed if we have an auth user ID
          if (!authUserId) {
            // Final fallback: try to resolve auth user id from existing users row
            const { data: existingUserByEmail } = await supabaseClient
              .from('users')
              .select('id')
              .eq('email', user.email)
              .single();

            if (existingUserByEmail) {
              authUserId = existingUserByEmail.id;
            }
          }

          if (!authUserId) {
            console.error(`Could not get auth user ID for ${user.email}`);
            errors++;
            continue;
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
              id: authUserId
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
        } catch (error: any) {
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
  } catch (error: any) {
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
