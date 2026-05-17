/**
 * Sanitizes user input to prevent XSS/injection in PDF rendering
 */
export function escapeHtml(text: string | undefined): string {
  if (!text) return '';
  
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Truncates text safely while preserving words
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace === -1) return truncated + '...';
  return truncated.substring(0, lastSpace) + '...';
}

/**
 * Validates email doesn't contain injection patterns
 */
export function validateEmailSafety(email: string): boolean {
  const dangerousPatterns = [';', '--', '/*', '*/', 'DROP', 'INSERT', 'DELETE'];
  return !dangerousPatterns.some(pattern => 
    email.toUpperCase().includes(pattern)
  );
}
