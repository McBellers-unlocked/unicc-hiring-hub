import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AffiliateRow {
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  gender: string;
  staff_number: string;
  affiliate_type: string;
  unit: string;
  job_title: string;
  line_manager: string;
  duty_station: string;
  division: string;
  nationality: string;
  contract_start_date: string;
  contract_end_date: string;
  current_grade: string;
  first_incumbency_date: string;
  samsaran_pr: string;
  samsaran_po: string;
  gsm_reg_number: string;
  gsm_po: string;
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

    if (userError || !['Admin', 'HR Assistant', 'Chief of HR'].includes(userData?.role)) {
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

    console.log('Received CSV data for affiliate personnel import, parsing...');

    // Parse CSV - handle quoted fields properly
    const lines = csvData.split('\n');
    
    // Auto-detect the actual header row by scanning first 10 lines
    const { headerIndex, headers } = findHeaderRow(lines);
    console.log(`Found header row at line ${headerIndex + 1}`);
    console.log('Headers found:', headers);

    // Find column indices (case-insensitive, flexible matching)
    const findColumn = (patterns: string[]): number => {
      return headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return patterns.some(p => lower.includes(p));
      });
    };

    const emailIndex = findColumn(['email']);
    const firstNameIndex = findColumn(['first name', 'firstname']);
    const lastNameIndex = findColumn(['last name', 'lastname']);
    const genderIndex = findColumn(['gender']);
    const staffNumberIndex = findColumn(['staff number', 'staffnumber']);
    const workerTypeIndex = findColumn(['worker type', 'workertype']);
    const appTypeShortIndex = findColumn(['app type short']);
    const unitIndex = findColumn(['unit']);
    const jobTitleIndex = findColumn(['job title', 'jobtitle']);
    const lineManagerIndex = findColumn(['line manager', 'linemanager']);
    const officeLocationIndex = findColumn(['office location']);
    const dsShortIndex = findColumn(['ds short']);
    const divisionIndex = findColumn(['division']);
    const nationalityIndex = findColumn(['nationality']);
    const contractStartIndex = findColumn(['contract start']);
    const contractEndIndex = findColumn(['contract end']);
    const currentGradeIndex = findColumn(['current grade', 'grade']);
    const firstIncumbencyIndex = findColumn(['first incumbency', 'first_incumbency', 'original start', 'first start']);
    const officialDutyStationIndex = findColumn(['official duty station']);
    const samsaranPrIndex = findColumn(['samsaran pr']);
    const samsaranPoIndex = findColumn(['samsaran po']);
    const gsmRegNumberIndex = findColumn(['gsm reg']);
    const gsmPoIndex = findColumn(['gsm po']);

    console.log('Column indices:', { emailIndex, firstNameIndex, lastNameIndex, workerTypeIndex, appTypeShortIndex });

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
    const affiliateData: AffiliateRow[] = [];
    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      const email = values[emailIndex]?.trim().toLowerCase();
      
      if (!email || !email.includes('@')) continue;

      const firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : '';
      const lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : '';
      const fullName = [firstName, lastName].filter(Boolean).join(' ') || email.split('@')[0];
      
      // Determine affiliate type from worker type or app type short
      let affiliateType = '';
      const workerType = workerTypeIndex !== -1 ? values[workerTypeIndex]?.trim().toUpperCase() : '';
      const appTypeShort = appTypeShortIndex !== -1 ? values[appTypeShortIndex]?.trim().toUpperCase() : '';
      
      if (workerType === 'IC' || appTypeShort === 'IC') {
        affiliateType = 'IC';
      } else if (workerType === 'INTERN' || appTypeShort === 'INTERN' || workerType.includes('INTERN')) {
        affiliateType = 'Intern';
      } else if (workerType === 'UNV' || appTypeShort === 'UNV') {
        affiliateType = 'UNV';
      } else if (workerType || appTypeShort) {
        affiliateType = workerType || appTypeShort;
      }

      // Parse duty station from office location or ds short
      const officeLocation = officeLocationIndex !== -1 ? values[officeLocationIndex]?.trim() : '';
      const dsShort = dsShortIndex !== -1 ? values[dsShortIndex]?.trim() : '';
      const officialDutyStation = officialDutyStationIndex !== -1 
        ? values[officialDutyStationIndex]?.trim() 
        : '';

      // Build duty station - for Remote workers, append official duty station
      let dutyStation = dsShort || officeLocation;
      if (dutyStation.toLowerCase() === 'remote' && officialDutyStation) {
        dutyStation = `Remote (${officialDutyStation})`;
      }

      affiliateData.push({
        email,
        first_name: firstName,
        last_name: lastName,
        name: fullName,
        gender: genderIndex !== -1 ? normalizeGender(values[genderIndex]?.trim()) : '',
        staff_number: staffNumberIndex !== -1 ? values[staffNumberIndex]?.trim() : '',
        affiliate_type: affiliateType,
        unit: unitIndex !== -1 ? values[unitIndex]?.trim() : '',
        job_title: jobTitleIndex !== -1 ? values[jobTitleIndex]?.trim() : '',
        line_manager: lineManagerIndex !== -1 ? values[lineManagerIndex]?.trim() : '',
        duty_station: dutyStation,
        division: divisionIndex !== -1 ? values[divisionIndex]?.trim() : '',
        nationality: nationalityIndex !== -1 ? values[nationalityIndex]?.trim() : '',
        contract_start_date: contractStartIndex !== -1 ? parseDate(values[contractStartIndex]?.trim()) : '',
        contract_end_date: contractEndIndex !== -1 ? parseDate(values[contractEndIndex]?.trim()) : '',
        current_grade: currentGradeIndex !== -1 ? values[currentGradeIndex]?.trim() : '',
        first_incumbency_date: firstIncumbencyIndex !== -1 ? parseDate(values[firstIncumbencyIndex]?.trim()) : '',
        samsaran_pr: samsaranPrIndex !== -1 ? values[samsaranPrIndex]?.trim() : '',
        samsaran_po: samsaranPoIndex !== -1 ? values[samsaranPoIndex]?.trim() : '',
        gsm_reg_number: gsmRegNumberIndex !== -1 ? values[gsmRegNumberIndex]?.trim() : '',
        gsm_po: gsmPoIndex !== -1 ? values[gsmPoIndex]?.trim() : '',
      });
    }

    console.log(`Parsed ${affiliateData.length} affiliate personnel records`);

    // Process affiliates - upsert by email
    let created = 0;
    let updated = 0;
    let contractsUpdated = 0;
    const errors: string[] = [];

    for (const affiliate of affiliateData) {
      // Check if user already exists in users table (case-insensitive)
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id, email')
        .ilike('email', affiliate.email)
        .maybeSingle();
      
      if (existingUserError) {
        console.error(`Error checking for existing user ${affiliate.email}:`, existingUserError);
      }

      const updateData: Record<string, any> = {
        name: affiliate.name,
        email: affiliate.email,
        personnel_type: 'Affiliate',
        affiliate_type: affiliate.affiliate_type,
        role: 'Hiring Manager', // Affiliates get Hiring Manager role
      };

      // Only set optional fields if they have values
      if (affiliate.gender) updateData.gender = affiliate.gender;
      if (affiliate.staff_number) updateData.staff_number = affiliate.staff_number;
      if (affiliate.unit) updateData.unit = affiliate.unit;
      if (affiliate.job_title) updateData.job_title = affiliate.job_title;
      if (affiliate.line_manager) updateData.line_manager = affiliate.line_manager;
      if (affiliate.duty_station) updateData.duty_station = affiliate.duty_station;
      if (affiliate.division) updateData.division = affiliate.division;
      if (affiliate.nationality) updateData.nationality = affiliate.nationality;
      if (affiliate.contract_start_date) updateData.contract_start_date = affiliate.contract_start_date;
      if (affiliate.contract_end_date) updateData.contract_end_date = affiliate.contract_end_date;
      if (affiliate.current_grade) updateData.current_grade = affiliate.current_grade;
      if (affiliate.first_incumbency_date) updateData.first_incumbency_date = affiliate.first_incumbency_date;

      // For NEW records only: auto-set first_incumbency_date if not provided
      const isNewRecord = !existingUser;
      if (isNewRecord && !updateData.first_incumbency_date && affiliate.contract_start_date) {
        updateData.first_incumbency_date = affiliate.contract_start_date;
        console.log(`Auto-setting first_incumbency_date for new affiliate ${affiliate.email}`);
      }

      if (existingUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update(updateData)
          .eq('id', existingUser.id);

        if (error) {
          console.error(`Error updating ${affiliate.email}:`, error);
          errors.push(`${affiliate.email}: ${error.message}`);
        } else {
          updated++;
        }
      } else {
        // Check if auth user already exists (handles case where auth exists but users table record doesn't)
        const { data: authListResponse } = await supabase.auth.admin.listUsers();
        const existingAuthUser = authListResponse?.users?.find(
          u => u.email?.toLowerCase() === affiliate.email.toLowerCase()
        );

        let authUserId: string;

        if (existingAuthUser) {
          // Auth user exists - use their ID
          authUserId = existingAuthUser.id;
          console.log(`Auth user already exists for ${affiliate.email}, using ID: ${authUserId}`);
        } else {
          // Create new auth user
          const tempPassword = generateTempPassword();
          
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: affiliate.email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: {
              name: affiliate.name,
            }
          });

          if (authError) {
            console.error(`Error creating auth user ${affiliate.email}:`, authError);
            errors.push(`${affiliate.email}: ${authError.message}`);
            continue;
          }
          authUserId = authUser.user.id;
        }

        // Use upsert to handle any edge cases (insert or update on conflict)
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: authUserId,
            ...updateData,
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) {
          console.error(`Error upserting user record ${affiliate.email}:`, upsertError);
          errors.push(`${affiliate.email}: ${upsertError.message}`);
        } else {
          created++;
        }
      }

      // Upsert contract history if any contract field is present
      const userId = existingUser?.id || (await supabase.from('users').select('id').ilike('email', affiliate.email).maybeSingle()).data?.id;
      const hasContractData = affiliate.samsaran_pr || affiliate.samsaran_po || affiliate.gsm_reg_number || affiliate.gsm_po || affiliate.contract_start_date || affiliate.contract_end_date;
      
      if (userId && hasContractData) {
        const contractData: Record<string, any> = { user_id: userId };
        if (affiliate.samsaran_pr) contractData.samsaran_pr = affiliate.samsaran_pr;
        if (affiliate.samsaran_po) contractData.samsaran_po = affiliate.samsaran_po;
        if (affiliate.gsm_reg_number) contractData.gsm_reg_number = affiliate.gsm_reg_number;
        if (affiliate.gsm_po) contractData.gsm_po = affiliate.gsm_po;
        if (affiliate.contract_start_date) contractData.start_date = affiliate.contract_start_date;
        if (affiliate.contract_end_date) contractData.end_date = affiliate.contract_end_date;

        // Look up existing record by user_id + samsaran_pr
        if (affiliate.samsaran_pr) {
          const { data: existingContract } = await supabase
            .from('affiliate_contract_history')
            .select('id')
            .eq('user_id', userId)
            .eq('samsaran_pr', affiliate.samsaran_pr)
            .maybeSingle();

          if (existingContract) {
            const { error: contractError } = await supabase
              .from('affiliate_contract_history')
              .update(contractData)
              .eq('id', existingContract.id);
            if (contractError) {
              errors.push(`${affiliate.email} contract: ${contractError.message}`);
            } else {
              contractsUpdated++;
            }
          } else {
            const { error: contractError } = await supabase
              .from('affiliate_contract_history')
              .insert(contractData);
            if (contractError) {
              errors.push(`${affiliate.email} contract: ${contractError.message}`);
            } else {
              contractsUpdated++;
            }
          }
        } else {
          // No samsaran_pr — insert a new record
          const { error: contractError } = await supabase
            .from('affiliate_contract_history')
            .insert(contractData);
          if (contractError) {
            errors.push(`${affiliate.email} contract: ${contractError.message}`);
          } else {
            contractsUpdated++;
          }
        }
      }
    }

    console.log(`Import complete: ${created} created, ${updated} updated, ${contractsUpdated} contracts, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_processed: affiliateData.length,
        created,
        updated,
        contracts_updated: contractsUpdated,
        errors: errors.length,
      },
      errors: errors.slice(0, 20),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-affiliate-personnel:', error);
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

// Find the actual header row by scanning first 10 lines for expected column names
function findHeaderRow(lines: string[]): { headerIndex: number; headers: string[] } {
  const maxScan = Math.min(10, lines.length);
  
  for (let i = 0; i < maxScan; i++) {
    const headers = parseCSVLine(lines[i]);
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check if this row contains expected column names
    const hasEmail = normalizedHeaders.some(h => h.includes('email'));
    const hasName = normalizedHeaders.some(h => 
      h.includes('first name') || h.includes('last name') || h === 'name'
    );
    
    if (hasEmail && hasName) {
      return { headerIndex: i, headers };
    }
  }
  
  // Fallback: look for row with just email
  for (let i = 0; i < maxScan; i++) {
    const headers = parseCSVLine(lines[i]);
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    if (normalizedHeaders.some(h => h.includes('email'))) {
      return { headerIndex: i, headers };
    }
  }
  
  // Last resort: first row
  return { headerIndex: 0, headers: parseCSVLine(lines[0]) };
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
    const day = a.padStart(2, '0');
    const month = b.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  // Try DD-Mon-YY format (10-Oct-23)
  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  const shortDateMatch = dateStr.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2})$/);
  if (shortDateMatch) {
    const [, day, month, year] = shortDateMatch;
    const monthNum = monthNames[month.toLowerCase()];
    if (monthNum) {
      const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // Try parsing as date string with time
  const dateTimeMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s/);
  if (dateTimeMatch) {
    return dateTimeMatch[1];
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

// Normalize gender values
function normalizeGender(gender: string): string {
  if (!gender) return '';
  const lower = gender.toLowerCase();
  if (lower === 'woman' || lower === 'female' || lower === 'f') return 'Female';
  if (lower === 'man' || lower === 'male' || lower === 'm') return 'Male';
  return gender;
}

// Generate a temporary password
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!';
}
