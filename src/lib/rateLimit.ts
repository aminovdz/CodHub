import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function checkRateLimit(ip: string, limit: number, windowMs: number): Promise<{ success: boolean; limit: number; remaining: number; reset: number }> {
  const now = Date.now();
  
  try {
    // 1. Fetch current rate limit info for this IP
    const { data, error } = await supabase
      .from('rate_limits')
      .select('*')
      .eq('ip', ip)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found. If it's a real error, fail open to avoid breaking production
      console.error('Rate limit fetch error:', error);
      return { success: true, limit, remaining: 1, reset: now + windowMs };
    }

    if (!data) {
      // Create new record
      await supabase.from('rate_limits').insert({
        ip,
        count: 1,
        reset_time: now + windowMs
      });
      return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
    }

    if (now > data.reset_time) {
      // Reset window
      await supabase.from('rate_limits').update({
        count: 1,
        reset_time: now + windowMs
      }).eq('ip', ip);
      return { success: true, limit, remaining: limit - 1, reset: now + windowMs };
    }

    if (data.count >= limit) {
      return { success: false, limit, remaining: 0, reset: data.reset_time };
    }

    // Increment
    await supabase.from('rate_limits').update({
      count: data.count + 1
    }).eq('ip', ip);
    
    return { success: true, limit, remaining: limit - (data.count + 1), reset: data.reset_time };

  } catch (err) {
    console.error('Rate limit error:', err);
    return { success: true, limit, remaining: 1, reset: now + windowMs };
  }
}
