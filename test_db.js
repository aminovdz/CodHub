import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data: products } = await supabase.from('products').select('*');
  console.log("Products in DB:", products?.map(p => ({ title: p.title, seo_slug: p.seo_slug })));
}
run();
