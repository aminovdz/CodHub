import { slugify } from '../utils';

export function resolveStore(availableStores: any[], storeSlugOrRegion: string): any {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.replace('www.', '').split(':')[0];
    const found = availableStores.find(s => s.customDomain && s.customDomain.replace('www.', '').toLowerCase() === host.toLowerCase());
    if (found) return found;
  }
  
  if (!storeSlugOrRegion) return undefined;
  const lowerQuery = storeSlugOrRegion.toLowerCase();
  return availableStores.find(s => slugify(s.name) === lowerQuery || s.region.toLowerCase() === lowerQuery);
}
