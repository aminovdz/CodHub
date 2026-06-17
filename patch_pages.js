const fs = require('fs');

const filesToPatch = [
  './src/app/[store]/(funnel)/checkout/page.tsx',
  './src/app/[store]/(funnel)/promo/[slug]/page.tsx',
  './src/app/[store]/(funnel)/thank-you/page.tsx',
  './src/app/[store]/(storefront)/products/[slug]/page.tsx',
  './src/app/[store]/(storefront)/legal/[policy]/page.tsx',
  './src/app/[store]/(storefront)/page.tsx',
  './src/app/[store]/(storefront)/layout.tsx'
];

filesToPatch.forEach(path => {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    
    // Replace { region: string } -> { store: string }
    code = code.replace(/{ params: Promise<{ region: string }> }/g, '{ params: Promise<{ store: string }> }');
    code = code.replace(/{ params: { region: string } }/g, '{ params: { store: string } }');
    code = code.replace(/\{ params \}: \{ params: Promise<\{ region: string, slug: string \}> \}/g, '{ params }: { params: Promise<{ store: string, slug: string }> }');
    code = code.replace(/\{ params \}: \{ params: Promise<\{ region: string, policy: string \}> \}/g, '{ params }: { params: Promise<{ store: string, policy: string }> }');

    // Replace parameter extraction
    code = code.replace(/const region = resolvedParams\.region;/g, 'const storeSlug = resolvedParams.store;\n  const store = resolveStore(availableStores, storeSlug);\n  const region = store?.region || storeSlug;');
    
    // Some pages might not have useAdminStore or availableStores yet if it's SSR or we might need to add it.
    // Wait, let's do a more robust string replacement manually for each file structure if this fails.
    
    fs.writeFileSync(path, code);
    console.log(`Patched ${path}`);
  } else {
    console.log(`Not found: ${path}`);
  }
});
