import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || '', process.env.SUPABASE_SERVICE_ROLE_KEY || '');
async function run() {
  const { data, error } = await supabase.from('landing_pages').select('*');
  console.log(error ? error : data);
}
run();
