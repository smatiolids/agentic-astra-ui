/**
 * Converts a string to a URL-friendly slug
 * - Converts to lowercase
 * - Replaces spaces and special characters with hyphens
 * - Removes multiple consecutive hyphens
 * - Trims hyphens from start and end
 */
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters except word chars, spaces, and hyphens
    .replace(/[\s_]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading and trailing hyphens
}

/**
 * Validates if a string is a valid slug
 */
export function isValidSlug(str: string): boolean {
  if (!str || str.length === 0) {
    return false;
  }
  // A valid slug should only contain lowercase letters, numbers, and hyphens
  // and should not start or end with a hyphen
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(str);
}
