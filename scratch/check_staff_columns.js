require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function check() {
  console.log("Selecting one row from staff_accounts...");
  const { data, error } = await supabase.from('staff_accounts').select('*').limit(1);
  if (error) {
    console.error("Error selecting from staff_accounts:", error);
  } else {
    console.log("Success! Row keys:", data.length > 0 ? Object.keys(data[0]) : "No rows found");
  }
}

check();
