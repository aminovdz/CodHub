const fs = require('fs');
const path = './src/app/[store]/layout.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  `import { createClient } from '@supabase/supabase-js';`,
  `import { createClient } from '@supabase/supabase-js';\nimport { slugify } from '@/lib/utils';`
);

code = code.replace(
  `export async function generateMetadata({ params }: { params: Promise<{ region: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const region = resolvedParams.region;
  
  const storeNames: Record<string, string> = {
    dz: 'COD Hub Algeria',
    ro: 'COD Hub Romania',
    co: 'COD Hub Colombia'
  };

  return {
    title: {
      template: \`%s | \${storeNames[region] || 'COD Hub'}\`,
      default: \`\${storeNames[region] || 'COD Hub'} - Premium Products, Pay on Delivery\`
    },
    description: 'Shop premium products with zero risk. Pay only when you receive your order.',
    openGraph: {
      title: \`\${storeNames[region] || 'COD Hub'} - Premium Products\`,
      description: 'Shop premium products with zero risk. Pay only when you receive your order.',
      type: 'website',
    }
  };
}`,
  `export async function generateMetadata({ params }: { params: Promise<{ store: string }> }): Promise<Metadata> {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;
  
  const { data: stores } = await supabase.from('stores').select('name, region');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const storeName = store?.name || 'COD Hub';

  return {
    title: {
      template: \`%s | \${storeName}\`,
      default: \`\${storeName} - Premium Products, Pay on Delivery\`
    },
    description: 'Shop premium products with zero risk. Pay only when you receive your order.',
    openGraph: {
      title: \`\${storeName} - Premium Products\`,
      description: 'Shop premium products with zero risk. Pay only when you receive your order.',
      type: 'website',
    }
  };
}`
);

code = code.replace(
  `export default async function RegionLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ region: string }>
}) {
  const resolvedParams = await params;
  const region = resolvedParams.region;

  // Query store configurations from Supabase to check chatbot toggle
  const { data: store } = await supabase
    .from('stores')
    .select('id, region, whatsapp_config, name')
    .ilike('region', region)
    .maybeSingle();`,
  `export default async function RegionLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ store: string }>
}) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;

  const { data: stores } = await supabase.from('stores').select('id, region, whatsapp_config, name');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const region = store?.region || storeSlug;`
);

// Fallback if it didn't match the exact query above
code = code.replace(
  `export default async function RegionLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ region: string }>
}) {
  const resolvedParams = await params;
  const region = resolvedParams.region;

  // Query store configurations from Supabase to check chatbot toggle
  const { data: store } = await supabase
    .from('stores')
    .select('id, region, whatsapp_config')
    .ilike('region', region)
    .maybeSingle();`,
  `export default async function RegionLayout({ 
  children,
  params
}: { 
  children: ReactNode,
  params: Promise<{ store: string }>
}) {
  const resolvedParams = await params;
  const storeSlug = resolvedParams.store;

  const { data: stores } = await supabase.from('stores').select('id, region, whatsapp_config, name');
  const store = stores?.find(s => slugify(s.name) === storeSlug.toLowerCase() || s.region.toLowerCase() === storeSlug.toLowerCase());
  const region = store?.region || storeSlug;`
);

fs.writeFileSync(path, code);
console.log("layout.tsx patched");
