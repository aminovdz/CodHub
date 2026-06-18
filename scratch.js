require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('landing_pages')
    .select('id, slug, title, created_at')
    .order('created_at', { ascending: false })
    .limit(5);
    
  if (error) console.error(error);
  else console.log(data);
}
main();
