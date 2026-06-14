import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://tfdwesvpxjfcesdncccc.supabase.co';
const supabaseKey = 'sb_publishable_uEbGENqufGv8mmhiW2EM8Q_PKksXcX4';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: products, error: fetchError } = await supabase.from('products').select('*').limit(1);
  if (fetchError) {
    console.error("Fetch error", fetchError);
    return;
  }
  if (!products || products.length === 0) {
    console.log("No products");
    return;
  }
  const p = products[0];
  console.log("Fetched product:", p.id);
  
  const { error: updateError } = await supabase.from('products').update({
    title: p.title + " test"
  }).eq('id', p.id);
  
  if (updateError) {
    console.error("Update error", updateError);
  } else {
    console.log("Update success");
  }
}
test();
