require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  console.log("Fetching stores...");
  const { data: stores, error: storesError } = await supabase.from('stores').select('id, name, region, generic_webhook_url');
  if (storesError) {
    console.error("Error fetching stores:", storesError);
  } else {
    console.log("Stores:", JSON.stringify(stores, null, 2));
  }

  console.log("\nFetching recent orders...");
  const { data: orders, error: ordersError } = await supabase.from('orders').select('id, store_id, customer, phone, status, total, product, date').order('date', { ascending: false }).limit(10);
  if (ordersError) {
    console.error("Error fetching orders:", ordersError);
  } else {
    console.log("Recent Orders:", JSON.stringify(orders, null, 2));
  }
}

test();
