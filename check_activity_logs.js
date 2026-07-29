const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://tfdwesvpxjfcesdncccc.supabase.co';
const supabaseServiceKey = 'sb_secret_stWwJJs_a7RbA8Y0ZmQwjg_Gjqy9saA';

async function main() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log("Checking if RPC exec_sql exists...");
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: 'SELECT 1' });
  console.log("exec_sql result:", { data, error });
}

main();
