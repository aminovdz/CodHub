const fs = require('fs');
const envFile = fs.readFileSync('.env', 'utf8');
let url = '', key = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) key = line.split('=')[1].trim();
});
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(url, key);

async function check() {
  const { data, error } = await supabase.from('orders').select('id, status, notes').eq('id', '8a21f84a-c9b3-4b5c-9bbe-b4101321383d').limit(1);
  console.log('Order now:', data[0]);
}
check();
