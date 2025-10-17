import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Fix common markdown formatting issues
export function fixMarkdownFormatting(text: string): string {
  if (!text) return text;
  
  // Fix bold formatting with spaces before closing markers
  // **text ** -> **text**
  return text.replace(/(\*\*[^*]+?)\s+(\*\*)/g, '$1$2');
}
