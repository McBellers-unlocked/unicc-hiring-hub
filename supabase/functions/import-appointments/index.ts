import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AppointmentRow {
  last_name: string;
  first_name: string;
  email: string;
  operation_type: string;
  tentative_date: string;
  effective_date: string;
  job_title: string;
  grade: string;
  contract_type: string;
  duty_station: string;
  section_unit: string;
  supervisor: string;
  old_po: string;
  new_po: string;
  vacancy_reference: string;
  main_hr_focal_point: string;
  recruitment_type: string;
  is_international: boolean;
  notice_days_required: number;
  comments: string;
  onboarding_comments: string;
  actions_in_hr_plan: string;
}

Deno.serve(async (req) => {
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

    console.log('Received CSV data for appointments import, parsing...');

    // Parse CSV
    const lines = csvData.split('\n');
    const { headerIndex, headers } = findHeaderRow(lines);
    console.log(`Found header row at line ${headerIndex + 1}`);
    console.log('Headers found:', headers);

    // Column mapping (case-insensitive, flexible matching)
    const findColumn = (patterns: string[]): number => {
      return headers.findIndex(h => {
        const lower = h.toLowerCase().trim();
        return patterns.some(p => lower.includes(p));
      });
    };

    const lastNameIndex = findColumn(['last name', 'lastname', 'surname']);
    const firstNameIndex = findColumn(['first name', 'firstname', 'given name']);
    const emailIndex = findColumn(['email']);
    const operationTypeIndex = findColumn(['operation type', 'operation', 'type']);
    const tentativeDateIndex = findColumn(['tentative date', 'tentative', 'expected date', 'start date']);
    const effectiveDateIndex = findColumn(['effective date', 'effective', 'actual date']);
    const jobTitleIndex = findColumn(['job title', 'jobtitle', 'title', 'position']);
    const gradeIndex = findColumn(['grade', 'level']);
    const contractTypeIndex = findColumn(['contract type', 'contract']);
    const dutyStationIndex = findColumn(['duty station', 'location', 'station']);
    const sectionUnitIndex = findColumn(['section', 'unit']);
    const supervisorIndex = findColumn(['supervisor', 'manager', 'reports to']);
    const oldPoIndex = findColumn(['old po', 'previous po']);
    const newPoIndex = findColumn(['new po', 'po number']);
    const vacancyRefIndex = findColumn(['vacancy', 'reference', 'vacancy ref']);
    const hrFocalPointIndex = findColumn(['hr focal', 'focal point', 'hr contact']);
    const recruitmentTypeIndex = findColumn(['recruitment type', 'recruitment']);
    const internationalIndex = findColumn(['international', 'intl']);
    const noticeDaysIndex = findColumn(['notice days', 'notice period']);
    const commentsIndex = findColumn(['comments', 'notes']);
    const onboardingCommentsIndex = findColumn(['onboarding comments', 'onboarding notes']);
    const actionsIndex = findColumn(['actions', 'hr plan', 'action items']);

    console.log('Column indices:', { lastNameIndex, firstNameIndex, operationTypeIndex });

    if (lastNameIndex === -1 && firstNameIndex === -1) {
      // Try to find a combined "Name" column
      const nameIndex = findColumn(['name']);
      if (nameIndex === -1) {
        return new Response(JSON.stringify({ 
          error: 'Could not find Name columns in CSV',
          headers: headers
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Parse rows
    const appointmentData: AppointmentRow[] = [];
    const warnings: string[] = [];

    for (let i = headerIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const values = parseCSVLine(line);
      
      // Extract name
      let lastName = lastNameIndex !== -1 ? values[lastNameIndex]?.trim() : '';
      let firstName = firstNameIndex !== -1 ? values[firstNameIndex]?.trim() : '';
      
      // If no separate columns, try combined name
      if (!lastName && !firstName) {
        const nameIndex = findColumn(['name']);
        if (nameIndex !== -1) {
          const fullName = values[nameIndex]?.trim() || '';
          const parts = fullName.split(/\s+/);
          if (parts.length >= 2) {
            lastName = parts[0];
            firstName = parts.slice(1).join(' ');
          } else {
            lastName = fullName;
          }
        }
      }
      
      if (!lastName || !firstName) {
        warnings.push(`Row ${i + 1}: Missing required name field (last: "${lastName}", first: "${firstName}"), skipped`);
        continue;
      }

      // Parse operation type
      let operationType = 'Appointment';
      if (operationTypeIndex !== -1) {
        operationType = normalizeOperationType(values[operationTypeIndex]?.trim() || '');
      }

      // Parse dates
      const tentativeDate = tentativeDateIndex !== -1 
        ? parseDate(values[tentativeDateIndex]?.trim()) 
        : '';
      const effectiveDate = effectiveDateIndex !== -1 
        ? parseDate(values[effectiveDateIndex]?.trim()) 
        : '';

      // Parse boolean for international
      let isInternational = false;
      if (internationalIndex !== -1) {
        const intlValue = values[internationalIndex]?.trim().toLowerCase();
        isInternational = intlValue === 'yes' || intlValue === 'true' || intlValue === '1' || intlValue === 'y';
      }

      // Parse notice days
      let noticeDays = 30;
      if (noticeDaysIndex !== -1) {
        const parsed = parseInt(values[noticeDaysIndex]?.trim());
        if (!isNaN(parsed)) noticeDays = parsed;
      }

      appointmentData.push({
        last_name: lastName,
        first_name: firstName,
        email: emailIndex !== -1 ? values[emailIndex]?.trim().toLowerCase() : '',
        operation_type: operationType,
        tentative_date: tentativeDate,
        effective_date: effectiveDate,
        job_title: jobTitleIndex !== -1 ? values[jobTitleIndex]?.trim() : '',
        grade: gradeIndex !== -1 ? values[gradeIndex]?.trim() : '',
        contract_type: contractTypeIndex !== -1 ? values[contractTypeIndex]?.trim() : '',
        duty_station: dutyStationIndex !== -1 ? values[dutyStationIndex]?.trim() : '',
        section_unit: sectionUnitIndex !== -1 ? values[sectionUnitIndex]?.trim() : '',
        supervisor: supervisorIndex !== -1 ? values[supervisorIndex]?.trim() : '',
        old_po: oldPoIndex !== -1 ? values[oldPoIndex]?.trim() : '',
        new_po: newPoIndex !== -1 ? values[newPoIndex]?.trim() : '',
        vacancy_reference: vacancyRefIndex !== -1 ? values[vacancyRefIndex]?.trim() : '',
        main_hr_focal_point: hrFocalPointIndex !== -1 ? values[hrFocalPointIndex]?.trim() : '',
        recruitment_type: recruitmentTypeIndex !== -1 ? values[recruitmentTypeIndex]?.trim() || 'Newcomer' : 'Newcomer',
        is_international: isInternational,
        notice_days_required: noticeDays,
        comments: commentsIndex !== -1 ? values[commentsIndex]?.trim() : '',
        onboarding_comments: onboardingCommentsIndex !== -1 ? values[onboardingCommentsIndex]?.trim() : '',
        actions_in_hr_plan: actionsIndex !== -1 ? values[actionsIndex]?.trim() : '',
      });
    }

    console.log(`Parsed ${appointmentData.length} appointment records`);

    // Insert appointments
    let created = 0;
    let linked = 0;
    const errors: string[] = [];

    for (const apt of appointmentData) {
      // Check if user exists by email
      let userId: string | null = null;
      if (apt.email) {
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .ilike('email', apt.email)
          .maybeSingle();
        if (existingUser) {
          userId = existingUser.id;
          linked++;
        }
      }

      const insertData: Record<string, unknown> = {
        last_name: apt.last_name,
        first_name: apt.first_name,
        operation_type: apt.operation_type,
        status: 'Not started',
        created_by: user.id,
      };

      // Only add optional fields if they have values
      if (apt.email) insertData.email = apt.email;
      if (userId) insertData.user_id = userId;
      if (apt.tentative_date) insertData.tentative_date = apt.tentative_date;
      if (apt.effective_date) insertData.effective_date = apt.effective_date;
      if (apt.job_title) insertData.job_title = apt.job_title;
      if (apt.grade) insertData.grade = apt.grade;
      if (apt.contract_type) insertData.contract_type = apt.contract_type;
      if (apt.duty_station) insertData.duty_station = apt.duty_station;
      if (apt.section_unit) insertData.section_unit = apt.section_unit;
      if (apt.supervisor) insertData.supervisor = apt.supervisor;
      if (apt.old_po) insertData.old_po = apt.old_po;
      if (apt.new_po) insertData.new_po = apt.new_po;
      if (apt.vacancy_reference) insertData.vacancy_reference = apt.vacancy_reference;
      if (apt.main_hr_focal_point) insertData.main_hr_focal_point = apt.main_hr_focal_point;
      if (apt.recruitment_type) insertData.recruitment_type = apt.recruitment_type;
      insertData.is_international = apt.is_international;
      insertData.notice_days_required = apt.notice_days_required;
      if (apt.comments) insertData.comments = apt.comments;
      if (apt.onboarding_comments) insertData.onboarding_comments = apt.onboarding_comments;
      if (apt.actions_in_hr_plan) insertData.actions_in_hr_plan = apt.actions_in_hr_plan;

      const { error } = await supabase
        .from('hr_appointments')
        .insert(insertData);

      if (error) {
        console.error(`Error inserting ${apt.last_name} ${apt.first_name}:`, error);
        errors.push(`${apt.last_name} ${apt.first_name}: ${error.message}`);
      } else {
        created++;
      }
    }

    console.log(`Import complete: ${created} created, ${linked} linked to users, ${errors.length} errors`);

    return new Response(JSON.stringify({
      success: true,
      summary: {
        total_processed: appointmentData.length,
        created,
        linked,
        warnings: warnings.length,
        errors: errors.length,
      },
      warnings: warnings.slice(0, 10),
      errors: errors.slice(0, 10),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in import-appointments:', error);
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

// Find the header row by scanning first 10 lines
function findHeaderRow(lines: string[]): { headerIndex: number; headers: string[] } {
  const maxScan = Math.min(10, lines.length);
  
  for (let i = 0; i < maxScan; i++) {
    const headers = parseCSVLine(lines[i]);
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
    
    // Check for expected column names
    const hasName = normalizedHeaders.some(h => 
      h.includes('name') || h.includes('last') || h.includes('first')
    );
    const hasDateOrType = normalizedHeaders.some(h => 
      h.includes('date') || h.includes('type') || h.includes('operation')
    );
    
    if (hasName && hasDateOrType) {
      return { headerIndex: i, headers };
    }
  }
  
  // Fallback: first row
  return { headerIndex: 0, headers: parseCSVLine(lines[0]) };
}

// Normalize operation type to valid enum value
function normalizeOperationType(value: string): string {
  const lower = value.toLowerCase().trim();
  if (lower.includes('cb') || lower.includes('return')) return 'Appointment (CB)';
  if (lower.includes('direct')) return 'Direct Appointment';
  return 'Appointment';
}

// Parse various date formats
function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  
  const trimmed = dateStr.trim();
  
  // 1. Check for Excel serial date (5-digit number like 45210)
  const numericDate = parseFloat(trimmed);
  if (!isNaN(numericDate) && numericDate > 1000 && numericDate < 100000) {
    // Excel epoch is December 30, 1899
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + numericDate * 86400000);
    if (!isNaN(date.getTime())) {
      const result = date.toISOString().substring(0, 10);
      // Validate the year is reasonable (2000-2100)
      const year = parseInt(result.substring(0, 4));
      if (year >= 2000 && year <= 2100) {
        return result;
      }
    }
    return ''; // Invalid Excel date
  }
  
  // 2. Try ISO format (YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  
  // 3. Try DD/MM/YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // 4. Try DD-Mon-YY format
  const monthNames: Record<string, string> = {
    'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
    'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
    'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
  };
  const shortDateMatch = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (shortDateMatch) {
    const [, day, month, year] = shortDateMatch;
    const monthNum = monthNames[month.toLowerCase()];
    if (monthNum) {
      const fullYear = year.length === 2 
        ? (parseInt(year) > 50 ? `19${year}` : `20${year}`)
        : year;
      return `${fullYear}-${monthNum}-${day.padStart(2, '0')}`;
    }
  }
  
  // 5. Don't fallback to new Date() - too risky for malformed data
  return '';
}
