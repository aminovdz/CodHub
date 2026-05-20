/**
 * Helper to get a shortened, user-friendly order ID from a full UUID.
 * Keeps UUID database keys clean while presenting nice tags to customers/agents.
 */
export function getShortOrderId(id: string | null | undefined): string {
  if (!id) return 'N/A';
  // If it's already a short format (or doesn't look like a full uuid), return it
  if (id.length < 15) return id.toUpperCase();
  // Extract the first block of the UUID
  return id.split('-')[0].toUpperCase();
}
