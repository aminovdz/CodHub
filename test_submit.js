const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data: store } = await supabase.from('stores').select('id, name, region').limit(1).single();
    console.log("Found store:", store);

    const payloadObj = {
      store_id: store.id,
      customer: "Test",
      phone: "0123456789",
      address: "Test",
      wilaya: "Test",
      product: "Test",
      total: 100,
      status: 'PENDING_AGENT_CONFIRMATION'
    };

    const { data, error } = await supabase.from('orders').insert(payloadObj).select('id').single();
    if (error) {
        console.error("Insert error:", error);
    } else {
        console.log("Inserted:", data);
    }
}
run();
