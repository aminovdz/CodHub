const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  console.log("Fetching API definition with Service Role Key from:", `${url}/rest/v1/`);
  const response = await fetch(`${url}/rest/v1/`, {
    headers: {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`
    }
  });
  
  if (!response.ok) {
    console.error("Failed to fetch API definition:", response.status, await response.text());
    return;
  }
  
  const schema = await response.json();
  console.log("Paths found:", Object.keys(schema.paths).filter(p => p.startsWith('/rpc/')));
}

run();
