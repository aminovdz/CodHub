import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log("Supabase Config:", { 
  url: supabaseUrl, 
  keyPrefix: supabaseAnonKey?.substring(0, 5) + "..." 
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
