const fs = require('fs');

const filesToPatch = [
  './src/app/[store]/(funnel)/checkout/page.tsx',
  './src/app/[store]/(funnel)/promo/[slug]/page.tsx',
  './src/app/[store]/(funnel)/thank-you/page.tsx',
  './src/app/[store]/(storefront)/products/[slug]/page.tsx',
  './src/app/[store]/(storefront)/legal/[policy]/page.tsx',
  './src/app/[store]/(storefront)/page.tsx'
];

filesToPatch.forEach(path => {
  if (fs.existsSync(path)) {
    let code = fs.readFileSync(path, 'utf8');
    code = code.replace(/const basePath = isCustomDomain \? '' : \`\/\$\{region\}\`;/g, "const basePath = isCustomDomain ? '' : `/${storeSlug}`;");
    fs.writeFileSync(path, code);
  }
});
