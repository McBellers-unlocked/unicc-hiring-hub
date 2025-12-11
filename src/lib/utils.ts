import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function isValidUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

// Fix common markdown formatting issues
export function fixMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // Fix bold formatting with spaces before closing markers
  // **text ** -> **text**
  return text.replace(/(\*\*[^*]+?)\s+(\*\*)/g, '$1$2');
}
