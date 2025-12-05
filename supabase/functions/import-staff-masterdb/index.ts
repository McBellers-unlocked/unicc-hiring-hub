import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StaffRow {
  email: string;
  job_title: string;
  entry_on_duty_date: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify JWT and check user role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user has Admin or HR role
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !['Admin', 'HR Assistant', 'Chief of HR', 'Director'].includes(userData?.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized. Admin or HR role required.' }), {
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

    console.log('Received CSV data, parsing...');

    // Parse CSV - handle quoted fields properly
    const lines = csvData.split('\n');
    const headers = parseCSVLine(lines[0]);
    
    console.log('Headers found:', headers);

    // Find column indices (case-insensitive, partial match)
    const emailIndex = headers.findIndex(h => 
      h.toLowerCase().includes('email') && h.toLowerCase().includes('address')
    );
    const jobTitleIndex = headers.findIndex(h => 
      h.toLowerCase().includes('job') && h.toLowerCase().includes('title')
    );
    const entryDateIndex = headers.findIndex(h => 
      h.toLowerCase().includes('entry') && h.toLowerCase().includes('duty')
    );

    console.log('Column indices:', { emailIndex, jobTitleIndex, entryDateIndex });

    if (emailIndex === -1) {
      return new Response(JSON.stringify({ 
        error: 'Could not find Email Address column in CSV',
        headers: headers
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse rows
    const staffData: StaffRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const email = values[emailIndex]?.trim().toLowerCase();
      
      if (!email || !email.includes('@')) continue;

      const jobTitle = jobTitleIndex !== -1 ? values[jobTitleIndex]?.trim() : '';
      const entryDateRaw = entryDateIndex !== -1 ? values[entryDateIndex]?.trim() : '';
      
      // Parse date - handle various formats
      let entryDate = '';
      if (entryDateRaw) {
        entryDate = parseDate(entryDateRaw);
      }

      staffData.push({
        email,
        job_title: jobTitle,
        entry_on_duty_date: entryDate,
      });
    }

    console.log(`Parsed ${staffData.length} staff records`);

    // Update users in batches
    let updated = 0;
    let notFound = 0;
    const errors: string[] = [];
    const notFoundEmails: string[] = [];

    for (const staff of staffData) {
      const updateData: Record<string, string> = {};
      
      if (staff.job_title) {
        updateData.job_title = staff.job_title;
      }
      if (staff.entry_on_duty_date) {
        updateData.entry_on_duty_date = staff.entry_on_duty_date;
      }

      if (Object.keys(updateData).length === 0) continue;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('email', staff.email)
        .select('id');

      if (error) {
        console.error(`Error updating ${staff.email}:`, error);
        errors.push(`${staff.email}: ${error.message}`);
      } else if (data && data.length > 0) {
        updated++;
      } else {
        notFound++;
        notFoundEmails.push(staff.email);
      }
    }

    console.log(`Import complete: ${updated} updated, ${notFound} not found, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_processed: staffData.length,
        updated,
        not_found: notFound,
        errors: errors.length,
      },
      not_found_emails: notFoundEmails.slice(0, 20), // First 20 for debugging
      errors: errors.slice(0, 10), // First 10 errors
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-staff-masterdb:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Parse a CSV line handling quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  
  return result.map(v => v.trim().replace(/^"|"$/g, ''));
}

// Parse various date formats
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    return dateStr.substring(0, 10);
  }
  
  // Try DD/MM/YYYY or MM/DD/YYYY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, a, b, year] = slashMatch;
    // Assume DD/MM/YYYY (European format)
    const day = a.padStart(2, '0');
    const month = b.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try Excel serial date number
  const numericDate = parseFloat(dateStr);
  if (!isNaN(numericDate) && numericDate > 1000 && numericDate < 100000) {
    // Excel date serial: days since 1900-01-01 (with leap year bug)
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
    return date.toISOString().substring(0, 10);
  }
  
  // Try parsing as date string
  try {
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().substring(0, 10);
    }
  } catch {
    // Ignore parsing errors
  }
  
  return '';
}
