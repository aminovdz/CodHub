/**
 * Helper to get a shortened, user-friendly order ID from a full UUID.
 * Keeps UUID database keys clean while presenting nice tags to customers/agents.
 */
export function getShortOrderId(id: string | null | undefined): string {
  if (!id) return 'N/A';
  // If it's already a short format (or doesn't look like a full uuid), return it
  if (id.length < 15) return id.toUpperCase();
  // Extract the last 6 characters of the UUID
  return id.slice(-6).toUpperCase();
}
