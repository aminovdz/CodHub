const fs = require('fs');
const path = './src/lib/store/useAdminStore.ts';
let code = fs.readFileSync(path, 'utf8');

// Add import
if (!code.includes("import { slugify }")) {
  code = code.replace(
    "import { create } from 'zustand';",
    "import { create } from 'zustand';\nimport { slugify } from '../utils';"
  );
}

// Replace resolveStore
const oldResolveStore = `export function resolveStore(availableStores: Store[], region: string): Store | undefined {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.replace('www.', '').split(':')[0];
    const found = availableStores.find(s => s.customDomain && s.customDomain.replace('www.', '').toLowerCase() === host.toLowerCase());
    if (found) return found;
  }
  return availableStores.find(s => s.region.toLowerCase() === region.toLowerCase());
}`;

const newResolveStore = `export function resolveStore(availableStores: Store[], storeSlugOrRegion: string): Store | undefined {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.replace('www.', '').split(':')[0];
    const found = availableStores.find(s => s.customDomain && s.customDomain.replace('www.', '').toLowerCase() === host.toLowerCase());
    if (found) return found;
  }
  
  if (!storeSlugOrRegion) return undefined;
  const lowerQuery = storeSlugOrRegion.toLowerCase();
  return availableStores.find(s => slugify(s.name) === lowerQuery || s.region.toLowerCase() === lowerQuery);
}`;

if (code.includes(oldResolveStore)) {
  code = code.replace(oldResolveStore, newResolveStore);
  fs.writeFileSync(path, code);
  console.log("resolveStore patched successfully.");
} else {
  console.log("Could not find oldResolveStore to patch.");
}
