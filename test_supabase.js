require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: orders } = await supabase.from('orders').select('id, status, notes').limit(1);
  if (!orders || orders.length === 0) {
    console.log("No orders found");
    return;
  }
  const orderId = orders[0].id;
  console.log("Testing with order:", orderId);
  
  const { data, error } = await supabase.from('orders').update({ status: 'TEST' }).eq('id', orderId);
  console.log("Update status error:", error);
  
  const { data: data2, error: error2 } = await supabase.from('orders').update({ notes: [] }).eq('id', orderId);
  console.log("Update notes error:", error2);
}

test();
