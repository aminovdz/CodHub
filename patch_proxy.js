const fs = require('fs');
const path = './src/proxy.ts';
let code = fs.readFileSync(path, 'utf8');

const slugifyFunc = `
function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\\u0300-\\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\\s+/g, '-')
    .replace(/[^\\w\\-]+/g, '')
    .replace(/\\-\\-+/g, '-');
}
`;

if (!code.includes('slugify(text')) {
  code = code.replace(
    "const SUPPORTED_REGIONS = ['dz', 'ro', 'co'];",
    "const SUPPORTED_REGIONS = ['dz', 'ro', 'co'];\n" + slugifyFunc
  );
}

// Replace the rewrite logic for SUPPORTED_REGIONS (optional, but keep it for backward compat if they use subdomains)
// But for custom domains:
const oldFetch = `      const res = await fetch(
        \`\${supabaseUrl}/rest/v1/stores?custom_domain=eq.\${host}&select=region\`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: \`Bearer \${supabaseKey}\`,
          },
          next: { revalidate: 60 }
        }
      );
      if (res.ok) {
        const stores = await res.json();
        if (stores && stores.length > 0) {
          const region = stores[0].region.toLowerCase();
          return NextResponse.rewrite(new URL(\`/\${region}\${url.pathname}\`, req.url));
        }
      }`;

const newFetch = `      const res = await fetch(
        \`\${supabaseUrl}/rest/v1/stores?custom_domain=eq.\${host}&select=name,region\`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: \`Bearer \${supabaseKey}\`,
          },
          next: { revalidate: 60 }
        }
      );
      if (res.ok) {
        const stores = await res.json();
        if (stores && stores.length > 0) {
          const storeSlug = slugify(stores[0].name) || stores[0].region.toLowerCase();
          return NextResponse.rewrite(new URL(\`/\${storeSlug}\${url.pathname}\`, req.url));
        }
      }`;

code = code.replace(oldFetch, newFetch);
fs.writeFileSync(path, code);
console.log("proxy.ts patched");
