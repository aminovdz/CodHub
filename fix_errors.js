const fs = require('fs');

function addT(path) {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    // we need to add const { t } = useTranslation(region); right after region is defined
    if (!code.includes('useTranslation(region)')) {
      code = code.replace(/const region = store\?\.region \|\| storeSlug;/g, 'const region = store?.region || storeSlug;\n  const { t } = useTranslation(region);');
    }
    fs.writeFileSync(path, code);
  }
}

addT('./src/app/[store]/(funnel)/thank-you/page.tsx');
addT('./src/app/[store]/(storefront)/page.tsx');
addT('./src/app/[store]/(storefront)/products/[slug]/page.tsx');

function fixPromo() {
  const path = './src/app/[store]/(funnel)/promo/[slug]/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/params: Promise<\{ store: string; slug: string; \}>/g, 'params: Promise<{ store: string; slug: string; }>');
  code = code.replace(/\{ params \}: \{ params: Promise<\{ store: string, slug: string \}> \}/g, '{ params }: { params: Promise<{ store: string, slug: string }> }');
  
  // Actually, promo might have `params: { store: string; slug: string }` instead of Promise inside the type.
  code = code.replace(/\{ params \}: \{ params: \{ store: string; slug: string; \} \}/g, '{ params }: { params: Promise<{ store: string; slug: string }> }');
  
  // also fix property region does not exist
  code = code.replace(/const resolvedParams = await params;\n  const region = resolvedParams\.region;/g, 'const resolvedParams = await params;\n  const storeSlug = resolvedParams.store;');
  
  fs.writeFileSync(path, code);
}

function fixLegal() {
  const path = './src/app/[store]/(storefront)/legal/[policy]/page.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/const resolvedParams = await params;\n  const region = resolvedParams\.region;/g, 'const resolvedParams = await params;\n  const storeSlug = resolvedParams.store;');
  fs.writeFileSync(path, code);
}

function fixLayout() {
  const path = './src/app/[store]/(storefront)/layout.tsx';
  let code = fs.readFileSync(path, 'utf8');
  code = code.replace(/\{ children, params \}: \{ children: ReactNode, params: Promise<\{ region: string \}> \}/g, '{ children, params }: { children: ReactNode, params: Promise<{ store: string }> }');
  fs.writeFileSync(path, code);
}

fixPromo();
fixLegal();
fixLayout();

console.log("Fixed errors");
