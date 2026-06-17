import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
async function check() {
  const { data } = await supabase.from('orders').select('id, notes, delivery_rate, upsell_total, claimed_by, custom_fields').limit(1);
  console.log(data);
}
check();
