require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run() {
  const sql = `ALTER TABLE public.staff_accounts ADD COLUMN IF NOT EXISTS email text;`;
  console.log("Running SQL migration to add 'email' column to 'staff_accounts'...");
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful!', data);
  }
}

run();
