require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase
    .from('landing_pages')
    .select('id, slug, html_content')
    .order('created_at', { ascending: false })
    .limit(1);
    
  if (error) console.error(error);
  else {
    const html = data[0].html_content;
    console.log(`Length: ${html.length}`);
    console.log(`Ends with: ${html.slice(-100)}`);
  }
}
main();
