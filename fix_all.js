const fs = require('fs');

function fixCheckout() {
  const path = './src/app/[store]/(funnel)/checkout/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  // At the top, we want to REMOVE useTranslation(region) and move it below useAdminStore.
  // Actually, useTranslation requires region. useAdminStore requires no args, then resolveStore gives store, then store.region.
  code = code.replace(
    /const storeSlug = resolvedParams\.store;\n  const \{ t \} = useTranslation\(region\);\n/g,
    'const storeSlug = resolvedParams.store;\n'
  );
  code = code.replace(
    /const \{ availableStores, shippingZones, checkoutConfigs, setOrders, products, setProducts, setAbandonedCarts, coupons, setCoupons, addActivityLog \} = useAdminStore\(\);\n  const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g,
    `const { availableStores, shippingZones, checkoutConfigs, setOrders, products, setProducts, setAbandonedCarts, coupons, setCoupons, addActivityLog } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);`
  );
  
  // also checkout had an old region declaration
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  fs.writeFileSync(path, code);
}

function fixThankYou() {
  const path = './src/app/[store]/(funnel)/thank-you/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /const storeSlug = resolvedParams\.store;\n  const \{ t \} = useTranslation\(region\);\n/g,
    'const storeSlug = resolvedParams.store;\n'
  );
  code = code.replace(
    /const \{ availableStores, products \} = useAdminStore\(\);\n  const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g,
    `const { availableStores, products } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);`
  );
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  fs.writeFileSync(path, code);
}

function fixStorefrontLayout() {
  const path = './src/app/[store]/(storefront)/layout.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /export default async function StorefrontLayout\(\{ children, params \}: \{ children: ReactNode, params: Promise<\{ region: string \}> \}\) \{/g,
    'export default async function StorefrontLayout({ children, params }: { children: ReactNode, params: Promise<{ store: string }> }) {'
  );
  code = code.replace(
    /const resolvedParams = await params;\n  const region = resolvedParams\.region;/g,
    'const resolvedParams = await params;\n  const storeSlug = resolvedParams.store;\n  // No store needed here directly unless it used region'
  );
  code = code.replace(/<GlobalHeader region=\{region\} \/>/g, '<GlobalHeader region={storeSlug} />');
  code = code.replace(/<GlobalFooter region=\{region\} \/>/g, '<GlobalFooter region={storeSlug} />');
  fs.writeFileSync(path, code);
}

function fixPromo() {
  const path = './src/app/[store]/(funnel)/promo/[slug]/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  code = code.replace(/const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g, '');
  code = code.replace(/const \{ availableStores, landingPages, products \} = useAdminStore\(\);/g, 
    'const { availableStores, landingPages, products } = useAdminStore();\n  const store = resolveStore(availableStores, storeSlug);\n  const region = store?.region || storeSlug;'
  );
  code = code.replace(/const storeSlug = resolvedParams\.store;/g, 'const storeSlug = resolvedParams.store;');
  fs.writeFileSync(path, code);
}

function fixLegal() {
  const path = './src/app/[store]/(storefront)/legal/[policy]/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  code = code.replace(/const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g, '');
  code = code.replace(/const \{ availableStores, storePolicies \} = useAdminStore\(\);/g, 
    'const { availableStores, storePolicies } = useAdminStore();\n  const store = resolveStore(availableStores, storeSlug);\n  const region = store?.region || storeSlug;'
  );
  fs.writeFileSync(path, code);
}

function fixStorefrontPage() {
  const path = './src/app/[store]/(storefront)/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /const storeSlug = resolvedParams\.store;\n  const \{ t \} = useTranslation\(region\);\n/g,
    'const storeSlug = resolvedParams.store;\n'
  );
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  code = code.replace(
    /const \{ availableStores, homepages, products \} = useAdminStore\(\);\n  const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g,
    `const { availableStores, homepages, products } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);`
  );
  fs.writeFileSync(path, code);
}

function fixProducts() {
  const path = './src/app/[store]/(storefront)/products/[slug]/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(
    /const storeSlug = resolvedParams\.store;\n  const \{ t \} = useTranslation\(region\);\n/g,
    'const storeSlug = resolvedParams.store;\n'
  );
  code = code.replace(/const region = resolvedParams\.region;/g, '');
  code = code.replace(
    /const \{ availableStores, products \} = useAdminStore\(\);\n  const store = resolveStore\(availableStores, storeSlug\);\n  const region = store\?\.region \|\| storeSlug;/g,
    `const { availableStores, products } = useAdminStore();
  const store = resolveStore(availableStores, storeSlug);
  const region = store?.region || storeSlug;
  const { t } = useTranslation(region);`
  );
  fs.writeFileSync(path, code);
}

fixCheckout();
fixThankYou();
fixStorefrontLayout();
fixPromo();
fixLegal();
fixStorefrontPage();
fixProducts();

console.log("Fixed manually via JS");
