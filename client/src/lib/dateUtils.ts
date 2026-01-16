/**
 * Parse a date string as a local date to avoid timezone issues
 *
 * When dates come from the backend as ISO strings (e.g., "2026-01-15T00:00:00.000Z"),
 * using `new Date()` interprets them as UTC and can shift the displayed date
 * by one day depending on the user's timezone.
 *
 * This function parses the date components and creates a Date object in the
 * local timezone, ensuring dates display correctly.
 */
export function parseLocalDate(dateString: string): Date {
  // Extract just the date part (YYYY-MM-DD)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  // Create date in local timezone (month is 0-indexed)
  return new Date(year, month - 1, day);
}

/**
 * Format a date string for display, parsing as local date
 */
export function formatLocalDate(dateString: string, formatStr: string): string {
  const date = parseLocalDate(dateString);

  // Simple formatting - can be extended
  if (formatStr === 'MMM dd, yyyy') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}, ${date.getFullYear()}`;
  }

  if (formatStr === 'MMMM dd, yyyy') {
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${months[date.getMonth()]} ${date.getDate().toString().padStart(2, '0')}, ${date.getFullYear()}`;
  }

  // Default: return ISO date
  return date.toISOString().split('T')[0];
}
