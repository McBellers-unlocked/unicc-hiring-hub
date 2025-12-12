/**
 * Email template variable processing utility
 * Replaces placeholders like {{candidate_name}} with actual values
 */

export interface TemplateVariables {
  candidate_name: string;
  candidate_email: string;
}

/**
 * Extract first name from full name
 */
export function extractFirstName(fullName: string): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || fullName;
}

/**
 * Process email content and replace template variables
 */
export function processEmailVariables(
  content: string,
  variables: TemplateVariables
): string {
  if (!content) return content;
  
  const { candidate_name, candidate_email } = variables;
  const candidate_first_name = extractFirstName(candidate_name);
  
  return content
    .replace(/\{\{candidate_first_name\}\}/gi, candidate_first_name)
    .replace(/\{\{candidate_name\}\}/gi, candidate_name || "")
    .replace(/\{\{candidate_email\}\}/gi, candidate_email || "");
}

/**
 * Available template variables for the UI
 */
export const AVAILABLE_VARIABLES = [
  {
    variable: "{{candidate_first_name}}",
    description: "Candidate's first name",
    example: "Matt",
  },
  {
    variable: "{{candidate_name}}",
    description: "Candidate's full name",
    example: "Matt Johnson",
  },
  {
    variable: "{{candidate_email}}",
    description: "Candidate's email address",
    example: "matt.johnson@example.com",
  },
];
