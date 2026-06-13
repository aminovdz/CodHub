'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

export async function updateAdminOrder(orderId: string, updates: any) {
  try {
    const { error } = await supabaseAdmin.from('orders').update(updates).eq('id', orderId);
    if (error) {
      console.error("Admin order update error:", error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.error("Admin order update exception:", err);
    return { success: false, error: err.message };
  }
}
