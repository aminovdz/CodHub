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

    // Remove the bad injected block at the top
    code = code.replace(
      /  const storeSlug = resolvedParams\.store;\n  const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g,
      '  const storeSlug = resolvedParams.store;'
    );

    // Some files might have `store = resolveStore(availableStores, region)` further down. We should change that `region` to `storeSlug`
    code = code.replace(/resolveStore\(availableStores, region\)/g, 'resolveStore(availableStores, storeSlug)');
    
    // In files like checkout/page.tsx, we have `const region = ...` further down, or missing.
    // If it relies on region, we need to extract region AFTER useAdminStore.
    // We can just add `const region = store?.region || storeSlug;` right after `const store = resolveStore(...)`
    code = code.replace(
      /const store = resolveStore\(availableStores, storeSlug\);/g,
      'const store = resolveStore(availableStores, storeSlug);\n  const region = store?.region || storeSlug;'
    );

    // Let's also fix useTranslation if it was at the top.
    // Wait, useTranslation is a hook. It MUST be called at the top.
    // BUT we need `region`. If we don't know `region` until we call `useAdminStore()`, we can just call `useAdminStore` at the very top!
    
    // Actually, it's easier to just move `useAdminStore` up to the top.
    // Or, since `useAdminStore` is global, we can just extract `availableStores` early.
    // Let's just do a manual replace for each file via regex.
    fs.writeFileSync(path, code);
  }
});
