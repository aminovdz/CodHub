import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { submitOrder } from './src/lib/actions/funnelActions';

async function run() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: store } = await supabase.from('stores').select('id, name, region').limit(1).single();
  
  try {
    const res = await submitOrder('ORD-TEST-1234', store.region, {
      customerName: 'Test2',
      phone: '0123456789',
      address: 'Test Addr',
      instructions: '',
      cart: [{ id: '1', name: 'Test Prod', price: 100, isUpsell: false }],
      storeId: store.id 
    });
    console.log(res);
  } catch (e) {
    console.error("submitOrder Error:", e);
  }
}
run();
