import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { encrypt } from '@/lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const ADMIN_PIN = process.env.ADMIN_PIN || '1234';

export async function POST(req: Request) {
  try {
    const { username, pin, isSuperAdmin } = await req.json();

    if (!username || !pin) {
      return NextResponse.json({ error: 'Username and PIN are required' }, { status: 400 });
    }

    const usernameClean = username.trim().toLowerCase();
    let sessionPayload;

    if (isSuperAdmin) {
      if (usernameClean === 'admin' && pin === ADMIN_PIN) {
        sessionPayload = {
          username: 'admin',
          role: 'admin',
          storeIds: [],
          isSuperAdmin: true,
        };
      } else {
        return NextResponse.json({ error: 'Invalid Super Admin credentials' }, { status: 401 });
      }
    } else {
      // Query Supabase for staff account
      // Note: In a production system, passwords/PINs should be hashed.
      const { data: staffAccount, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .ilike('name', usernameClean)
        .eq('pin', pin)
        .single();

      if (error || !staffAccount) {
        return NextResponse.json({ error: 'Invalid staff username or PIN' }, { status: 401 });
      }

      // Get all stores to check global assignments in translations
      const { data: stores } = await supabase.from('stores').select('id, translations');
      
      let storeIds: string[] = [];
      if (staffAccount.store_id) {
        storeIds.push(staffAccount.store_id);
      }

      // Check global staffAssignments dictionary in any store's translations
      if (stores) {
        stores.forEach(store => {
          const assignments = (store.translations as any)?.staffAssignments;
          if (assignments && assignments[staffAccount.id]) {
            storeIds = [...storeIds, ...assignments[staffAccount.id]];
          }
        });
      }
      
      // Deduplicate
      storeIds = Array.from(new Set(storeIds));

      sessionPayload = {
        username: staffAccount.name,
        role: staffAccount.role,
        storeIds: storeIds,
        isSuperAdmin: false,
      };
    }

    // Generate JWT
    const token = await encrypt(sessionPayload as any);

    // Set HttpOnly Cookie
    cookies().set({
      name: 'codadmin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return NextResponse.json({ success: true, user: sessionPayload });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
