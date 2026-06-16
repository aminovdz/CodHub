require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const sql = fs.readFileSync('supabase/schema.sql', 'utf8');
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    // If rpc exec_sql doesn't exist, we might need a workaround or user to run it from dashboard
    console.error('Migration failed:', error);
  } else {
    console.log('Migration successful:', data);
  }
}

run();
