import { createClient } from '@supabase/supabase-js';
const supabaseUrl = 'https://tfdwesvpxjfcesdncccc.supabase.co';
const supabaseKey = 'sb_publishable_uEbGENqufGv8mmhiW2EM8Q_PKksXcX4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: products } = await supabase.from('products').select('*').limit(1);
  if (products && products.length > 0) {
    console.log("Keys in Supabase products table:", Object.keys(products[0]));
  }
}
test();
