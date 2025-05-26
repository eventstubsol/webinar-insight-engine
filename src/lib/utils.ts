
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a webinar ID to display as "XXX XXXX XXXX" pattern
 * @param webinarId - The raw webinar ID string
 * @returns Formatted webinar ID with spaces
 */
export function formatWebinarId(webinarId: string): string {
  if (!webinarId) return '';
  
  // Remove any existing spaces or formatting
  const cleanId = webinarId.replace(/\s/g, '');
  
  // If the ID is 11 digits, format as XXX XXXX XXXX
  if (cleanId.length === 11) {
    return `${cleanId.slice(0, 3)} ${cleanId.slice(3, 7)} ${cleanId.slice(7)}`;
  }
  
  // For other lengths, try to format in groups of 3-4-4 if possible
  if (cleanId.length >= 8) {
    const firstPart = cleanId.slice(0, 3);
    const remaining = cleanId.slice(3);
    const midLength = Math.ceil(remaining.length / 2);
    const secondPart = remaining.slice(0, midLength);
    const thirdPart = remaining.slice(midLength);
    
    return `${firstPart} ${secondPart} ${thirdPart}`;
  }
  
  // For shorter IDs, return as-is
  return cleanId;
}
