import { z } from 'zod';
import { validateEmailSafety } from './sanitizer';

/**
 * Normalizes a URL input by ensuring it has a protocol (defaults to https://)
 */
export function normalizeUrl(url: string): string {
  let cleaned = url.trim();
  if (!cleaned) return '';
  
  // If it doesn't start with http:// or https://, prepend https://
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }
  
  try {
    const parsed = new URL(cleaned);
    return parsed.toString();
  } catch {
    return '';
  }
}

/**
 * Extracts a clean root domain (e.g., "google.com") from a URL string
 */
export function extractDomain(url: string): string {
  const normalized = normalizeUrl(url);
  if (!normalized) return '';
  
  try {
    const parsed = new URL(normalized);
    // Remove "www." if present
    let hostname = parsed.hostname;
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4);
    }
    return hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Lead Form Intake validation schema
 */
export const leadIntakeSchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(1, 'Company name cannot be empty')
    .max(100, 'Company name is too long'),
  
  website: z
    .string({ required_error: 'Company website is required' })
    .trim()
    .min(1, 'Company website cannot be empty')
    .transform((val: string) => normalizeUrl(val))
    .refine((val: string) => {
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, { message: 'Invalid company website URL' }),

  industry: z
    .string({ required_error: 'Industry is required' })
    .trim()
    .min(1, 'Industry cannot be empty'),

  contactName: z
    .string({ required_error: 'Your name is required' })
    .trim()
    .min(1, 'Contact name cannot be empty')
    .max(100, 'Contact name is too long')
    .transform(val => val.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ')),

  email: z
    .string({ required_error: 'Your email is required' })
    .trim()
    .min(1, 'Email cannot be empty')
    .email('Invalid email address format')
    .refine(validateEmailSafety, { 
      message: 'Email contains invalid characters' 
    })
});

export type LeadInput = z.infer<typeof leadIntakeSchema>;
