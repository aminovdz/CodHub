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
  const p = products[0];
  
  // Create a row exactly like productToRow would
  const cleanRow = { ...p, title: p.title + " test" };
  delete cleanRow.id;
  delete cleanRow.created_at;
  delete cleanRow.updated_at;
  
  // Wait, I should import productToRow and test it
  // But I can't easily import it because of next/jest/zustand environment...
  // Let me just send the exact row that failed. How do I know?
  // Let's modify useAdminStore.ts to console.error(JSON.stringify(error))!
}
test();
