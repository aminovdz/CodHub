const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const slug = 'طقم-4-عجلات-هادئة-لحماية-السيراميك-ومعالجة-ثقل-الأبواب';
  const { data, error } = await supabase.from('landing_pages').select('id, title, slug, store_id').ilike('slug', slug);
  console.log("ilike match:", data);
  
  const { data: dataEq, error: errorEq } = await supabase.from('landing_pages').select('id, title, slug, store_id').eq('slug', slug);
  console.log("eq match:", dataEq);
}
check();
