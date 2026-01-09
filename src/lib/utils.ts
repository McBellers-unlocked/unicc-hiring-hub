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
  
  // Fix bold formatting with spaces before closing markers
  // **text ** -> **text**
  return text.replace(/(\*\*[^*]+?)\s+(\*\*)/g, '$1$2');
}
