import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Get the public-facing site URL for external links
 * Uses VITE_PUBLIC_SITE_URL in production, falls back to current origin
 */
export function getPublicSiteUrl(): string {
  return import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
}

/**
 * Generate a unique slug with sequential numbering for duplicates
 * @param baseSlug - The base slug to check
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug, potentially with -2, -3, etc. suffix
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  // Find all slugs that match pattern: baseSlug or baseSlug-{number}
  const escapedSlug = baseSlug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`^${escapedSlug}(-\\d+)?$`);
  const matchingSlugs = existingSlugs.filter(s => pattern.test(s));
  
  // Find the highest number suffix
  let maxNumber = 1;
  matchingSlugs.forEach(slug => {
    const match = slug.match(/-(\d+)$/);
    if (match) {
      maxNumber = Math.max(maxNumber, parseInt(match[1], 10));
    }
  });
  
  return `${baseSlug}-${maxNumber + 1}`;
}

// Fix common markdown formatting issues
export function fixMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // Normalize line endings and non-breaking spaces
  let result = text.replace(/\r\n/g, '\n').replace(/\u00A0/g, ' ');
  
  // Split by fenced code blocks to preserve them
  const fencePattern = /(```[\s\S]*?```)/g;
  const parts = result.split(fencePattern);
  
  result = parts.map((part, index) => {
    // Odd indices are fenced code blocks - preserve them
    if (index % 2 === 1) return part;
    
    // Process non-code segments
    let processed = part;
    
    // Convert Word-style bullets to markdown lists
    // Matches lines starting with optional whitespace + bullet characters
    processed = processed.replace(/^[ \t]*[·•‧∙●○◦▪▸►]\s*/gm, '- ');
    
    // Remove leading indentation that would create code blocks (4+ spaces/tabs)
    // But preserve intentional nested list indentation (2-3 spaces)
    processed = processed.split('\n').map(line => {
      // If line starts with 4+ spaces/tabs and is not a list continuation
      const match = line.match(/^([ \t]{4,})(.*)/);
      if (match) {
        const content = match[2];
        // If content starts with a list marker, keep 2 spaces for nesting
        if (/^[-*+]\s/.test(content)) {
          return '  ' + content;
        }
        // Otherwise remove all leading indentation
        return content;
      }
      return line;
    }).join('\n');
    
    return processed;
  }).join('');
  
  // Fix bold formatting with spaces before closing markers
  // **text ** -> **text**
  result = result.replace(/(\*\*[^*]+?)\s+(\*\*)/g, '$1$2');
  
  return result;
}
