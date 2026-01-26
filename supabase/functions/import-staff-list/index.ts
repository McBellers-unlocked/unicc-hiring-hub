import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImportResult {
  staffCreated: number;
  staffUpdated: number;
  affiliatesCreated: number;
  affiliatesUpdated: number;
  errors: number;
  errorDetails: string[];
  warnings: number;
  warningDetails: string[];
  rowsWithWarnings: number;
  affiliateBreakdown: {
    IC: { created: number; updated: number };
    Intern: { created: number; updated: number };
    UNV: { created: number; updated: number };
  };
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Validate a row and return errors/warnings
function validateRow(
  rowNumber: number,
  email: string,
  unit: string,
  division: string,
  lineManager: string,
  jobTitle: string,
  nationality: string
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Critical: Email is required
  if (!email || !email.includes('@')) {
    errors.push(`Row ${rowNumber}: Missing or invalid email`);
  }
  
  // Warnings for recommended fields
  if (!unit) {
    warnings.push(`Row ${rowNumber}: Missing unit`);
  }
  if (!division) {
    warnings.push(`Row ${rowNumber}: Missing division`);
  }
  if (!lineManager) {
    warnings.push(`Row ${rowNumber}: Missing line manager`);
  }
  if (!jobTitle) {
    warnings.push(`Row ${rowNumber}: Missing job title`);
  }
  if (!nationality) {
    warnings.push(`Row ${rowNumber}: Missing nationality`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Flexible column finder
function findColumn(headers: string[], patterns: string[]): number {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, ' '));
  
  for (const pattern of patterns) {
    const normalizedPattern = pattern.toLowerCase().trim();
    
    // Exact match first
    const exactIdx = normalizedHeaders.findIndex(h => h === normalizedPattern);
    if (exactIdx !== -1) return exactIdx;
    
    // Contains match
    const containsIdx = normalizedHeaders.findIndex(h => h.includes(normalizedPattern));
    if (containsIdx !== -1) return containsIdx;
  }
  
  return -1;
}

// Parse date from various formats
function parseDate(dateStr: string | undefined): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const cleaned = dateStr.trim();
  
  // Try ISO format first (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    return cleaned.split('T')[0];
  }
  
  // Try DD/MM/YYYY
  const dmyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, day, month, year] = dmyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // Try MM/DD/YYYY
  const mdyMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

// Detect personnel type and affiliate type
function detectPersonnelType(personnelTypeValue: string | undefined, workerTypeValue: string | undefined): { personnelType: string; affiliateType: string | null } {
  let personnelType = 'Staff';
  let affiliateType: string | null = null;
  
  const pType = (personnelTypeValue || '').trim().toLowerCase();
  const wType = (workerTypeValue || '').trim().toUpperCase();
  
  // Check if explicitly marked as Affiliate
  if (pType === 'affiliate' || pType.includes('affiliate')) {
    personnelType = 'Affiliate';
  }
  
  // Check worker type for affiliate indicators
  if (wType === 'IC' || wType.includes('INDIVIDUAL CONSULTANT') || wType.includes('CONSULTANT')) {
    personnelType = 'Affiliate';
    affiliateType = 'IC';
  } else if (wType === 'INTERN' || wType.includes('INTERN')) {
    personnelType = 'Affiliate';
    affiliateType = 'Intern';
  } else if (wType === 'UNV' || wType.includes('UN VOLUNTEER') || wType.includes('VOLUNTEER')) {
    personnelType = 'Affiliate';
    affiliateType = 'UNV';
  }
  
  // If personnel type is Affiliate but no affiliate type detected, try to infer
  if (personnelType === 'Affiliate' && !affiliateType) {
    // Default to IC if no specific type found
    affiliateType = 'IC';
  }
  
  return { personnelType, affiliateType };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    const { csvData } = await req.json();
    
    if (!csvData) {
      return new Response(
        JSON.stringify({ error: 'No CSV data provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse CSV
    const lines = csvData.split('\n').filter((line: string) => line.trim());
    if (lines.length < 2) {
      return new Response(
        JSON.stringify({ error: 'CSV must have headers and at least one data row' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const headers = lines[0].split(',').map((h: string) => h.replace(/"/g, '').trim());
    console.log('CSV Headers:', headers);

    // Find column indices with flexible matching
    const columnMap = {
      email: findColumn(headers, ['email', 'email address', 'e-mail', 'mail']),
      firstName: findColumn(headers, ['first name', 'firstname', 'given name', 'first_name']),
      lastName: findColumn(headers, ['last name', 'lastname', 'family name', 'surname', 'last_name']),
      gender: findColumn(headers, ['gender', 'sex']),
      staffNumber: findColumn(headers, ['staff number', 'staff_number', 'staff no', 'employee id', 'employee number']),
      personnelType: findColumn(headers, ['personnel type', 'personnel_type', 'type of personnel', 'employee type']),
      workerType: findColumn(headers, ['worker type', 'worker_type', 'app type short', 'contract type', 'affiliate type']),
      unit: findColumn(headers, ['unit', 'unit name', 'section', 'team']),
      division: findColumn(headers, ['division', 'department', 'div']),
      jobTitle: findColumn(headers, ['job title', 'job_title', 'title', 'position', 'position title']),
      lineManager: findColumn(headers, ['line manager', 'line_manager', 'manager', 'supervisor', 'reports to']),
      dutyStation: findColumn(headers, ['ds short', 'duty station', 'duty_station', 'office location', 'location', 'office']),
      nationality: findColumn(headers, ['nationality', 'country', 'citizenship']),
      currentGrade: findColumn(headers, ['current grade', 'current_grade', 'grade', 'level']),
      contractStartDate: findColumn(headers, ['contract start date', 'contract_start_date', 'start date', 'hire date']),
      contractEndDate: findColumn(headers, ['contract end date', 'contract_end_date', 'end date', 'expiry date']),
      entryOnDutyDate: findColumn(headers, ['entry on duty date', 'entry_on_duty_date', 'eod', 'joining date']),
    };

    console.log('Column mapping:', columnMap);

    if (columnMap.email === -1) {
      return new Response(
        JSON.stringify({ error: 'Could not find email column in CSV' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result: ImportResult = {
      staffCreated: 0,
      staffUpdated: 0,
      affiliatesCreated: 0,
      affiliatesUpdated: 0,
      errors: 0,
      errorDetails: [],
      warnings: 0,
      warningDetails: [],
      rowsWithWarnings: 0,
      affiliateBreakdown: {
        IC: { created: 0, updated: 0 },
        Intern: { created: 0, updated: 0 },
        UNV: { created: 0, updated: 0 },
      },
    };

    // Process each row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV row (handling quoted values)
      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (const char of line) {
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const getValue = (idx: number): string => {
        if (idx === -1 || idx >= values.length) return '';
        return values[idx]?.replace(/"/g, '').trim() || '';
      };

      const email = getValue(columnMap.email).toLowerCase();
      const firstName = getValue(columnMap.firstName);
      const lastName = getValue(columnMap.lastName);
      const unit = getValue(columnMap.unit);
      const division = getValue(columnMap.division);
      const lineManager = getValue(columnMap.lineManager);
      const jobTitle = getValue(columnMap.jobTitle);
      const nationality = getValue(columnMap.nationality);

      // Validate the row
      const validation = validateRow(
        i + 1,
        email,
        unit,
        division,
        lineManager,
        jobTitle,
        nationality
      );

      // If critical errors, skip this row
      if (!validation.isValid) {
        result.errors++;
        result.errorDetails.push(...validation.errors);
        continue;
      }

      // Track warnings but continue with import
      if (validation.warnings.length > 0) {
        result.warnings += validation.warnings.length;
        result.warningDetails.push(...validation.warnings);
        result.rowsWithWarnings++;
      }

      const name = firstName && lastName 
        ? `${firstName} ${lastName}` 
        : firstName || lastName || email.split('@')[0];

      const { personnelType, affiliateType } = detectPersonnelType(
        getValue(columnMap.personnelType),
        getValue(columnMap.workerType)
      );

      // Build base user data - role is only set for NEW users
      const baseUserData: Record<string, any> = {
        name,
        email,
      };

      // Helper to conditionally add fields only if CSV has value
      const addIfPresent = (field: string, value: string | null) => {
        if (value) baseUserData[field] = value;
      };

      addIfPresent('gender', getValue(columnMap.gender));
      addIfPresent('staff_number', getValue(columnMap.staffNumber));
      addIfPresent('personnel_type', personnelType);
      addIfPresent('affiliate_type', affiliateType);
      addIfPresent('unit', getValue(columnMap.unit));
      addIfPresent('division', getValue(columnMap.division));
      addIfPresent('job_title', getValue(columnMap.jobTitle));
      addIfPresent('line_manager', getValue(columnMap.lineManager));
      addIfPresent('duty_station', getValue(columnMap.dutyStation));
      addIfPresent('nationality', getValue(columnMap.nationality));
      addIfPresent('current_grade', getValue(columnMap.currentGrade));

      // Handle dates - only add if valid
      const contractStart = parseDate(getValue(columnMap.contractStartDate));
      const contractEnd = parseDate(getValue(columnMap.contractEndDate));
      const entryOnDuty = parseDate(getValue(columnMap.entryOnDutyDate));
      if (contractStart) baseUserData.contract_start_date = contractStart;
      if (contractEnd) baseUserData.contract_end_date = contractEnd;
      if (entryOnDuty) baseUserData.entry_on_duty_date = entryOnDuty;

      try {
        // Check if user exists - fetch fields we want to preserve
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id, skills, role')
          .eq('email', email)
          .maybeSingle();

        if (checkError) {
          throw new Error(`Database check error: ${checkError.message}`);
        }

        if (existingUser) {
          // Update existing user - NEVER overwrite role or skills
          // baseUserData does NOT include role, so existing role is preserved
          const { error: updateError } = await supabase
            .from('users')
            .update(baseUserData)
            .eq('id', existingUser.id);

          if (updateError) {
            throw new Error(`Update error: ${updateError.message}`);
          }

          if (personnelType === 'Staff') {
            result.staffUpdated++;
          } else {
            result.affiliatesUpdated++;
            if (affiliateType && affiliateType in result.affiliateBreakdown) {
              result.affiliateBreakdown[affiliateType as keyof typeof result.affiliateBreakdown].updated++;
            }
          }
        } else {
          // Create new auth user
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { name },
          });

          // For NEW users, add role
          const insertData = { ...baseUserData, role: 'Hiring Manager' };

          if (authError) {
            // User might exist in auth but not in users table
            if (authError.message.includes('already been registered')) {
              // Try to get the auth user
              const { data: { users: existingAuthUsers } } = await supabase.auth.admin.listUsers();
              const authUserFound = existingAuthUsers?.find(u => u.email === email);
              
              if (authUserFound) {
                // Check if user already exists in users table by ID (fix for duplicate key errors)
                const { data: existingById } = await supabase
                  .from('users')
                  .select('id, role')
                  .eq('id', authUserFound.id)
                  .maybeSingle();

                if (existingById) {
                  // User exists by ID - UPDATE instead of INSERT (preserves role)
                  const { error: updateError } = await supabase
                    .from('users')
                    .update(baseUserData)
                    .eq('id', authUserFound.id);

                  if (updateError) {
                    throw new Error(`Update error: ${updateError.message}`);
                  }

                  if (personnelType === 'Staff') {
                    result.staffUpdated++;
                  } else {
                    result.affiliatesUpdated++;
                    if (affiliateType && affiliateType in result.affiliateBreakdown) {
                      result.affiliateBreakdown[affiliateType as keyof typeof result.affiliateBreakdown].updated++;
                    }
                  }
                } else {
                  // User doesn't exist by ID - safe to INSERT
                  const { error: insertError } = await supabase
                    .from('users')
                    .insert({ ...insertData, id: authUserFound.id });

                  if (insertError) {
                    throw new Error(`Insert error: ${insertError.message}`);
                  }

                  if (personnelType === 'Staff') {
                    result.staffCreated++;
                  } else {
                    result.affiliatesCreated++;
                    if (affiliateType && affiliateType in result.affiliateBreakdown) {
                      result.affiliateBreakdown[affiliateType as keyof typeof result.affiliateBreakdown].created++;
                    }
                  }
                }
              } else {
                throw new Error(`Could not find or create auth user`);
              }
            } else {
              throw new Error(`Auth error: ${authError.message}`);
            }
          } else if (authUser?.user) {
            // Insert user record with new auth user ID
            const { error: insertError } = await supabase
              .from('users')
              .insert({ ...insertData, id: authUser.user.id });

            if (insertError) {
              throw new Error(`Insert error: ${insertError.message}`);
            }

            if (personnelType === 'Staff') {
              result.staffCreated++;
            } else {
              result.affiliatesCreated++;
              if (affiliateType && affiliateType in result.affiliateBreakdown) {
                result.affiliateBreakdown[affiliateType as keyof typeof result.affiliateBreakdown].created++;
              }
            }
          }
        }
      } catch (err: any) {
        result.errors++;
        result.errorDetails.push(`Row ${i + 1} (${email}): ${err.message}`);
        console.error(`Error processing row ${i + 1}:`, err);
      }
    }

    console.log('Import result:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
