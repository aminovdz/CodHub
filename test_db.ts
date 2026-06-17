import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function testInsert() {
  const { data: store } = await supabase.from('stores').select('id, name').limit(1).single();
  if (!store) return console.log("No store");

  const payload = {
    store_id: store.id,
    customer: 'Test',
    phone: '0123456789',
    address: 'Test Addr',
    wilaya: 'Test Wilaya',
    product: 'Test Prod',
    total: 100,
    status: 'PENDING_AGENT_CONFIRMATION',
    claimed_by: null,
    notes: [{ author: 'System', text: 'test', createdAt: new Date().toISOString() }],
    custom_fields: { step: 'Completed' }
  };

  console.log("Inserting payload:", payload);
  const { data, error } = await supabase.from('orders').insert(payload).select();
  if (error) {
    console.error("INSERT ERROR:", error);
  } else {
    console.log("INSERT SUCCESS:", data);
  }
}
testInsert();
