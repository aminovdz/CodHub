import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { submitOrder } from './src/lib/actions/funnelActions';

async function run() {
  try {
    const res = await submitOrder('ORD-TEST-123', 'TEST', {
      customerName: 'Test',
      phone: '1234567890',
      address: 'Test Addr',
      instructions: '',
      cart: [{ id: '1', name: 'Test Prod', price: 100, isUpsell: false }],
      storeId: 'f0c0ee3e-e6ec-4581-9b6d-a1c62f277a11' // Try to see what happens
    });
    console.log(res);
  } catch (e) {
    console.error(e);
  }
}
run();
